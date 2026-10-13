import assert from "node:assert/strict";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { loadTranspiledModule } from "./transpile-component.mjs";

const require = createRequire(import.meta.url);
const React = require("react");
const { act, create } = require("react-test-renderer");

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const componentPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../components/community/CommunityView.tsx",
);

const translate = (key, params) => {
  const values = {
    "community.alias": "Alias",
    "community.aliasHint": "Use an alias",
    "community.cancel": "Cancel",
    "community.comments": `Comments ${params?.count ?? 0}`,
    "community.confirmDelete": "Confirm delete",
    "community.delete": "Delete",
    "community.emptyFeed": "No posts",
    "community.filter.all": "All",
    "community.filter.city": "Cities",
    "community.filter.general": "General",
    "community.filter.hobby": "Hobbies",
    "community.filter.joined": "Joined",
    "community.group.general": "General",
    "community.group.hobbyWorld": "Hobby",
    "community.groups": "Groups",
    "community.join": "Join",
    "community.joined": "Joined",
    "community.leave": "Leave",
    "community.loadMore": "Load more",
    "community.memberCount": `${params?.count ?? 0} members`,
    "community.membersOnly": "Members only",
    "community.newComment": "New comment",
    "community.newPost": "New post",
    "community.noJoined": "No joined groups",
    "community.postHint": "Share",
    "community.postingAs": "Posting as",
    "community.privacy": "Private community",
    "community.publish": "Publish",
    "community.reason.other": "Other",
    "community.reason.privacy": "Privacy",
    "community.reason.spam": "Spam",
    "community.reason.unsafe": "Unsafe",
    "community.report": "Report",
    "community.rules": "I accept the rules",
    "community.send": "Send",
    "community.signInNotice": "Sign in",
    "community.subtitle": "Shared interests",
    "community.title": "Community",
    "common.loading": "Loading",
  };
  return values[key] ?? key;
};

const authState = {
  account: { userId: "00000000-0000-4000-8000-0000000000a1" },
  status: "member",
};

const Link = ({ children, ...props }) => React.createElement("a", props, children);
const CommunityView = loadTranspiledModule(
  componentPath,
  new Map([
    ["next/link", { __esModule: true, default: Link }],
    ["@/components/companions/Companion", { Companion: () => null }],
    ["@/components/mascot/WellnessArt", { WellnessRibbon: () => null }],
    ["@/components/providers/AuthProvider", { useAuth: () => authState }],
    ["@/components/providers/LocaleProvider", {
      useLocale: () => ({ d: (value) => value, locale: "en", t: translate }),
    }],
    ["@/lib/community", { CITIES: [] }],
  ]),
).CommunityView;

function response(body, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

function textOf(node) {
  if (node === null || node === undefined) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  return (node.children ?? []).map(textOf).join("");
}

function dateFor(index) {
  return new Date(Date.UTC(2026, 0, 1, 0, index, 0)).toISOString();
}

function post(group, index, { comments = 0, mine = false } = {}) {
  return {
    id: `${group}-post-${index}`,
    alias: `Alias ${index}`,
    body: `${group === "general" ? "Post" : "Other group post"} ${index}`,
    createdAt: dateFor(index),
    mine,
    comments,
  };
}

function comment(index, { mine = false } = {}) {
  return {
    id: `comment-${index}`,
    alias: `Commenter ${index}`,
    body: index === 60 ? "Mine comment" : index === 59 ? "Reported comment" : `Comment ${index}`,
    createdAt: dateFor(index),
    mine,
  };
}

function createdComment() {
  return {
    id: "comment-created",
    alias: "Synthetic alias",
    body: "New synthetic comment",
    createdAt: dateFor(61),
    mine: true,
  };
}

function createCommunityFetch({ deferredRefresh = false, failRefresh = false, failPostReload = false } = {}) {
  const mutations = [];
  const firstGeneral = Array.from({ length: 30 }, (_, offset) => {
    const index = 60 - offset;
    return post("general", index);
  });
  const secondGeneral = Array.from({ length: 30 }, (_, offset) => {
    const index = 30 - offset;
    return post("general", index, { comments: index === 15 ? 60 : 0, mine: index === 15 });
  });
  const groupTwo = Array.from({ length: 30 }, (_, offset) => post("hobby", 30 - offset));
  let targetCommentCount = 60;
  let commentRows = Array.from({ length: 60 }, (_, offset) => {
    const index = 60 - offset;
    return comment(index, { mine: index === 60 });
  });
  const hiddenComments = new Set();
  let generalRefreshDeferred = deferredRefresh;
  let generalRefreshFailed = failRefresh;
  let failNextPostReload = failPostReload;
  let postReloadFailurePending = false;
  let createdGeneralPost = null;
  let deferredResponsePromise = null;
  let generalFeedRequests = 0;
  let generalFeedCursorRequests = 0;

  function feedPage(group, beforeId) {
    const items = group === "general"
      ? [...(createdGeneralPost ? [createdGeneralPost] : []), ...firstGeneral, ...secondGeneral]
      : groupTwo;
    if (group === "general" && beforeId) generalFeedCursorRequests += 1;
    else if (group === "general") generalFeedRequests += 1;
    const cursorIndex = beforeId ? items.findIndex((item) => item.id === beforeId) : -1;
    const start = cursorIndex >= 0 ? cursorIndex + 1 : 0;
    return {
      posts: items.slice(start, start + 31).map((item) => (
        item.id === "general-post-15" ? { ...item, comments: targetCommentCount } : { ...item }
      )),
    };
  }

  const fetchHandler = async (input, init = {}) => {
    const rawUrl = String(input);
    const url = new URL(rawUrl, "http://localhost");
    if (url.pathname !== "/api/community") throw new Error(`Unexpected request: ${rawUrl}`);

    if (init.method === "POST") {
      const body = JSON.parse(init.body);
      mutations.push(body);
      if (body.action === "post") {
        createdGeneralPost = post("general", 61, { mine: true });
        postReloadFailurePending = failNextPostReload;
        failNextPostReload = false;
      } else if (body.action === "comment") {
        commentRows.unshift({ ...createdComment(), body: body.body });
        targetCommentCount += 1;
      } else if (body.action === "delete_comment") {
        const index = commentRows.findIndex((item) => item.id === body.entityId);
        if (index >= 0) {
          commentRows.splice(index, 1);
          targetCommentCount -= 1;
        }
      } else if (body.action === "report_comment" && !hiddenComments.has(body.entityId)) {
        hiddenComments.add(body.entityId);
        targetCommentCount -= 1;
      }
      return response({ ok: true, id: "created-comment" });
    }

    const view = url.searchParams.get("view");
    if (!view) {
      return response({
        groups: [
          { id: "general", members: 60, joined: true, alias: "Synthetic alias" },
          { id: "hobby:running", members: 30, joined: true, alias: "Runner alias" },
        ],
      });
    }

    const group = url.searchParams.get("group") === "hobby:running" ? "hobby" : "general";
    const beforeId = url.searchParams.get("beforeId");
    if (view === "feed") {
      if (group === "general" && !beforeId && postReloadFailurePending) {
        postReloadFailurePending = false;
        return response({ error: "synthetic post refresh failure" }, 500);
      }
      if (group === "general" && !beforeId && generalFeedRequests > 0 && generalRefreshDeferred) {
        generalRefreshDeferred = false;
        deferredResponsePromise = deferred();
        return { ok: true, status: 200, json: () => deferredResponsePromise.promise };
      }
      if (group === "general" && !beforeId && generalFeedRequests > 0 && generalRefreshFailed) {
        generalRefreshFailed = false;
        return response({ error: "synthetic refresh failure" }, 500);
      }
      return response(feedPage(group, beforeId));
    }

    if (view === "comments") {
      const visible = commentRows.filter((item) => !hiddenComments.has(item.id));
      const cursorIndex = beforeId ? visible.findIndex((item) => item.id === beforeId) : -1;
      const start = cursorIndex >= 0 ? cursorIndex + 1 : 0;
      return response({ comments: visible.slice(start, start + 31) });
    }

    throw new Error(`Unexpected view: ${view}`);
  };

  return {
    fetchHandler,
    get deferredResponsePromise() {
      return deferredResponsePromise;
    },
    get generalFeedRequests() {
      return generalFeedRequests;
    },
    get generalFeedCursorRequests() {
      return generalFeedCursorRequests;
    },
    mutations,
  };
}

function deferred() {
  let resolve;
  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function posts(renderer) {
  return renderer.root.findAllByProps({ "data-testid": "community-post" });
}

function postByBody(renderer, body) {
  return posts(renderer).find((item) => textOf(item).includes(body));
}

async function flush() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

async function waitFor(condition) {
  const deadline = Date.now() + 3000;
  while (Date.now() < deadline) {
    try {
      if (condition()) return;
    } catch {
      // The tree may still be in its initial effect pass.
    }
    await flush();
  }
  throw new Error("Timed out waiting for community state");
}

async function withCommunity(fetchState, run) {
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  let renderer;
  globalThis.fetch = fetchState.fetchHandler;
  globalThis.window = {
    ...(originalWindow ?? {}),
    matchMedia: () => ({ matches: false }),
  };
  try {
    await act(async () => {
      renderer = create(React.createElement(CommunityView));
    });
    await waitFor(() => posts(renderer).length === 30);
    await run(renderer, fetchState);
  } finally {
    if (renderer) await act(async () => renderer.unmount());
    globalThis.fetch = originalFetch;
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  }
}

async function loadSecondPostPage(renderer) {
  const loadMore = renderer.root.findAllByType("button").find((button) => textOf(button) === "Load more");
  assert.ok(loadMore);
  await act(async () => loadMore.props.onClick());
  await waitFor(() => posts(renderer).length === 60);
}

function postForm(renderer) {
  return renderer.root.findAllByType("form").find((form) => (
    form.findAllByProps({ id: "community-post" }).length > 0
  ));
}

async function fillPostForm(form, body) {
  const input = form.findByProps({ id: "community-post" });
  await act(async () => input.props.onChange({ target: { value: body } }));
}

test("loaded posts, open threads and comment pages survive comment mutations", async () => {
  const fetchState = createCommunityFetch();
  await withCommunity(fetchState, async (renderer) => {
    assert.equal(postByBody(renderer, "Post 15"), undefined);
    await loadSecondPostPage(renderer);
    const post15 = postByBody(renderer, "Post 15");
    assert.ok(post15);
    const commentsToggle = post15.findAllByType("button").find((button) => textOf(button) === "Comments 60");
    assert.ok(commentsToggle);
    await act(async () => commentsToggle.props.onClick());
    await waitFor(() => postByBody(renderer, "Post 15").findAllByProps({ "data-testid": "community-comment" }).length === 30);

    const postWithComments = postByBody(renderer, "Post 15");
    const loadMore = postWithComments.findAllByType("button").find((button) => textOf(button) === "Load more");
    assert.ok(loadMore);
    await act(async () => loadMore.props.onClick());
    await waitFor(() => postByBody(renderer, "Post 15").findAllByProps({ "data-testid": "community-comment" }).length === 60);

    const form = postByBody(renderer, "Post 15").findAllByType("form")[0];
    const input = form.findByProps({ id: "comment-general-post-15" });
    await act(async () => input.props.onChange({ target: { value: "New synthetic comment" } }));
    await act(async () => form.props.onSubmit({ preventDefault() {} }));
    await waitFor(() => textOf(postByBody(renderer, "Post 15")).includes("Comments 61"));
    assert.equal(posts(renderer).length, 60);
    assert.ok(postByBody(renderer, "Post 1"));
    const postAfterCreate = postByBody(renderer, "Post 15");
    assert.equal(postAfterCreate.findAllByProps({ "data-testid": "community-comment" }).length, 60);
    assert.ok(textOf(postAfterCreate).includes("New synthetic comment"));
    assert.ok(postAfterCreate.findAllByType("button").some((button) => textOf(button) === "Load more"));

    const mineComment = postAfterCreate
      .findAllByProps({ "data-testid": "community-comment" })
      .find((item) => textOf(item).includes("Mine comment"));
    assert.ok(mineComment);
    await act(async () => mineComment.findAllByType("button").find((button) => textOf(button) === "Delete").props.onClick());
    await act(async () => mineComment.findAllByType("button").find((button) => textOf(button) === "Confirm delete").props.onClick());
    await waitFor(() => textOf(postByBody(renderer, "Post 15")).includes("Comments 60"));
    const postAfterDelete = postByBody(renderer, "Post 15");
    assert.equal(postAfterDelete.findAllByProps({ "data-testid": "community-comment" }).length, 60);
    assert.doesNotMatch(textOf(postAfterDelete), /Mine comment/);
    assert.ok(postByBody(renderer, "Post 1"));

    const reportedComment = postAfterDelete
      .findAllByProps({ "data-testid": "community-comment" })
      .find((item) => textOf(item).includes("Reported comment"));
    assert.ok(reportedComment);
    await act(async () => reportedComment.findAllByType("button").find((button) => textOf(button) === "Report").props.onClick());
    await act(async () => reportedComment.findAllByType("button").find((button) => textOf(button) === "Spam").props.onClick());
    await waitFor(() => textOf(postByBody(renderer, "Post 15")).includes("Comments 59"));

    const finalPost15 = postByBody(renderer, "Post 15");
    assert.equal(finalPost15.findAllByProps({ "data-testid": "community-comment" }).length, 59);
    assert.equal(finalPost15.findAllByType("button").find((button) => textOf(button).startsWith("Comments"))?.props["aria-expanded"], true);
    assert.ok(textOf(finalPost15).includes("New synthetic comment"));
    assert.ok(textOf(finalPost15).includes("Comment 1"));
    assert.doesNotMatch(textOf(finalPost15), /Mine comment|Reported comment/);
    assert.ok(fetchState.mutations.some((mutation) => mutation.action === "comment"));
    assert.ok(fetchState.mutations.some((mutation) => mutation.action === "delete_comment"));
    assert.ok(fetchState.mutations.some((mutation) => mutation.action === "report_comment"));
  });
});

test("failed publish reload preserves two loaded feed pages until a comment refresh succeeds", async () => {
  const fetchState = createCommunityFetch({ failPostReload: true });
  await withCommunity(fetchState, async (renderer) => {
    await loadSecondPostPage(renderer);
    const targetPost = postByBody(renderer, "Post 15");
    await act(async () => targetPost.findAllByType("button").find((button) => textOf(button) === "Comments 60").props.onClick());
    await waitFor(() => postByBody(renderer, "Post 15").findAllByProps({ "data-testid": "community-comment" }).length === 30);
    const commentMore = postByBody(renderer, "Post 15").findAllByType("button").find((button) => textOf(button) === "Load more");
    await act(async () => commentMore.props.onClick());
    await waitFor(() => postByBody(renderer, "Post 15").findAllByProps({ "data-testid": "community-comment" }).length === 60);

    const form = postForm(renderer);
    await fillPostForm(form, "Synthetic new post");
    await act(async () => form.props.onSubmit({ preventDefault() {} }));
    await waitFor(() => renderer.root.findAllByProps({ role: "alert" }).length > 0);
    assert.equal(posts(renderer).length, 60);
    assert.ok(postByBody(renderer, "Post 15"));
    assert.equal(postByBody(renderer, "Post 15").findAllByType("button").find((button) => textOf(button).startsWith("Comments"))?.props["aria-expanded"], true);
    assert.equal(postByBody(renderer, "Post 15").findAllByProps({ "data-testid": "community-comment" }).length, 60);

    const post15 = postByBody(renderer, "Post 15");
    const commentForm = post15.findAllByType("form")[0];
    const commentInput = commentForm.findByProps({ id: "comment-general-post-15" });
    await act(async () => commentInput.props.onChange({ target: { value: "Comment after failed post refresh" } }));
    await act(async () => commentForm.props.onSubmit({ preventDefault() {} }));
    await waitFor(() => textOf(postByBody(renderer, "Post 15")).includes("Comments 61"));

    const refreshedPost = postByBody(renderer, "Post 15");
    assert.equal(posts(renderer).length, 60);
    assert.equal(refreshedPost.findAllByType("button").find((button) => textOf(button).startsWith("Comments"))?.props["aria-expanded"], true);
    assert.equal(refreshedPost.findAllByProps({ "data-testid": "community-comment" }).length, 60);
    assert.ok(textOf(refreshedPost).includes("Comment after failed post refresh"));
    assert.ok(refreshedPost.findAllByType("button").some((button) => textOf(button) === "Load more"));
  });
});

test("successful nonappend post reload resets the loaded page count to one", async () => {
  const fetchState = createCommunityFetch();
  await withCommunity(fetchState, async (renderer) => {
    await loadSecondPostPage(renderer);
    assert.equal(fetchState.generalFeedCursorRequests, 1);
    await fillPostForm(postForm(renderer), "Synthetic new post");
    await act(async () => postForm(renderer).props.onSubmit({ preventDefault() {} }));
    await waitFor(() => posts(renderer).length === 30 && postByBody(renderer, "Post 61"));
    assert.equal(postByBody(renderer, "Post 15"), undefined);

    const visiblePost = postByBody(renderer, "Post 45");
    const commentsToggle = visiblePost.findAllByType("button").find((button) => textOf(button).startsWith("Comments"));
    await act(async () => commentsToggle.props.onClick());
    await waitFor(() => visiblePost.findAllByProps({ "data-testid": "community-comment" }).length === 30);
    const form = visiblePost.findAllByType("form")[0];
    const input = form.findByProps({ id: "comment-general-post-45" });
    await act(async () => input.props.onChange({ target: { value: "Refresh one page" } }));
    await act(async () => form.props.onSubmit({ preventDefault() {} }));
    await waitFor(() => fetchState.mutations.some((mutation) => mutation.action === "comment"));
    assert.equal(posts(renderer).length, 30);
    assert.equal(postByBody(renderer, "Post 15"), undefined);
    assert.equal(fetchState.generalFeedCursorRequests, 1);
  });
});

test("a superseded nonappend publish reload keeps the loaded page count", async () => {
  const fetchState = createCommunityFetch({ deferredRefresh: true });
  await withCommunity(fetchState, async (renderer) => {
    await loadSecondPostPage(renderer);
    const post15 = postByBody(renderer, "Post 15");
    await act(async () => post15.findAllByType("button").find((button) => textOf(button) === "Comments 60").props.onClick());
    await waitFor(() => postByBody(renderer, "Post 15").findAllByProps({ "data-testid": "community-comment" }).length === 30);

    const form = postForm(renderer);
    await fillPostForm(form, "Synthetic new post");
    let publish;
    await act(async () => {
      publish = form.props.onSubmit({ preventDefault() {} });
    });
    await waitFor(() => fetchState.deferredResponsePromise !== null);

    const commentForm = postByBody(renderer, "Post 15").findAllByType("form")[0];
    const commentInput = commentForm.findByProps({ id: "comment-general-post-15" });
    await act(async () => commentInput.props.onChange({ target: { value: "Comment supersedes reload" } }));
    await act(async () => commentForm.props.onSubmit({ preventDefault() {} }));
    await waitFor(() => textOf(postByBody(renderer, "Post 15")).includes("Comments 61"));
    fetchState.deferredResponsePromise.resolve({ posts: [] });
    await act(async () => publish);

    assert.equal(posts(renderer).length, 60);
    assert.ok(postByBody(renderer, "Post 15"));
    assert.equal(postByBody(renderer, "Post 15").findAllByType("button").find((button) => textOf(button).startsWith("Comments"))?.props["aria-expanded"], true);
    assert.equal(fetchState.generalFeedCursorRequests, 2);
  });
});

test("a superseded refresh cannot replace a switched group, and failed refresh keeps old posts", async () => {
  const fetchState = createCommunityFetch({ deferredRefresh: true });
  await withCommunity(fetchState, async (renderer) => {
    assert.equal(postByBody(renderer, "Post 15"), undefined);
    await loadSecondPostPage(renderer);
    const post15 = postByBody(renderer, "Post 15");
    await act(async () => post15.findAllByType("button").find((button) => textOf(button) === "Delete").props.onClick());
    await act(async () => {
      void post15.findAllByType("button").find((button) => textOf(button) === "Confirm delete").props.onClick();
    });
    await waitFor(() => fetchState.deferredResponsePromise !== null);

    const hobbyButton = renderer.root.findAllByType("button").find(
      (button) => textOf(button).startsWith("Hobby") && button.props["aria-pressed"] === undefined,
    );
    assert.ok(hobbyButton);
    await act(async () => hobbyButton.props.onClick());
    await waitFor(() => textOf(renderer.root).includes("Other group post 30"));
    fetchState.deferredResponsePromise.resolve({ posts: [] });
    await flush();
    assert.doesNotMatch(textOf(renderer.root), /Post 45/);

    const generalButton = renderer.root.findAllByType("button").find(
      (button) => textOf(button).startsWith("General") && button.props["aria-pressed"] === undefined,
    );
    assert.ok(generalButton);
    await act(async () => generalButton.props.onClick());
    await waitFor(() => posts(renderer).length === 30);

    const failing = createCommunityFetch({ failRefresh: true });
    const originalFetch = globalThis.fetch;
    globalThis.fetch = failing.fetchHandler;
    try {
      authState.account = { userId: "00000000-0000-4000-8000-0000000000b1" };
      await act(async () => {
        renderer.update(React.createElement(CommunityView));
      });
      await waitFor(() => posts(renderer).length === 30);
      await loadSecondPostPage(renderer);
      const failingPost = postByBody(renderer, "Post 15");
      await act(async () => failingPost.findAllByType("button").find((button) => textOf(button) === "Delete").props.onClick());
      await act(async () => failingPost.findAllByType("button").find((button) => textOf(button) === "Confirm delete").props.onClick());
      await waitFor(() => renderer.root.findAllByProps({ role: "alert" }).length > 0);
      assert.ok(postByBody(renderer, "Post 45"));
      assert.equal(posts(renderer).length, 60);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
