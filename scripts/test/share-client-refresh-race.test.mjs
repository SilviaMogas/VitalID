import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const Module = require("node:module");
const React = require("react");
const ts = require("typescript");
const { act, create } = require("react-test-renderer");

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const componentPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../components/share/ShareClient.tsx",
);

const passThrough = ({ children }) => children ?? null;
const noop = () => null;
const translate = (key, params) =>
  key === "share.history" ? `share.history.${params?.count ?? 0}` : key;

function loadShareClient() {
  const source = fs.readFileSync(componentPath, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: componentPath,
  });
  const mocks = new Map([
    ["qrcode.react", { QRCodeSVG: noop }],
    [
      "@/components/providers/LocaleProvider",
      {
        useLocale: () => ({ d: (value) => value, locale: "en", t: translate }),
      },
    ],
    ["@/components/providers/AuthProvider", { useAuth: () => ({ account: null }) }],
    ["@/components/providers/MembershipProvider", { useMembership: () => ({ hasFeature: () => false }) }],
    ["@/components/membership/LockedFeature", { LockedFeature: passThrough }],
    ["@/components/membership/UpgradeChip", { LockIcon: noop, UpgradeChip: noop }],
    ["@/components/vital-id/VitalIdSections", { SectionTitle: passThrough }],
    ["@/components/mascot/MascotNote", { MascotNote: passThrough }],
    ["@/components/companions/Companion", { Companion: noop }],
    [
      "@/lib/sharing",
      {
        PURPOSE_PRESETS: { doctor: ["identity"] },
        SHARE_DURATIONS: [60],
        SHARE_FIELDS: ["identity"],
        SHARE_PURPOSES: ["doctor"],
      },
    ],
    ["@/lib/insurers", { getInsurer: () => undefined, INSURERS: [] }],
    ["@/components/share/InsurerBadge", { InsurerMonogram: noop, resolveRecipients: () => [] }],
  ]);
  const componentModule = new Module(componentPath);
  componentModule.filename = componentPath;
  componentModule.paths = Module._nodeModulePaths(path.dirname(componentPath));
  const originalLoad = Module._load;
  Module._load = function load(request, parent, isMain) {
    if (parent?.filename === componentPath && mocks.has(request)) return mocks.get(request);
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    componentModule._compile(outputText, componentPath);
    return componentModule.exports.default;
  } finally {
    Module._load = originalLoad;
  }
}

const ShareClient = loadShareClient();

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

function okResponse(body) {
  return { json: async () => body, ok: true, status: 200 };
}

function deferredResponse(body, onRead) {
  return {
    json: () => {
      onRead();
      return body.promise;
    },
    ok: true,
    status: 200,
  };
}

function deferredInitialList(body, onRead, nextResponse) {
  let calls = 0;
  return {
    get calls() {
      return calls;
    },
    next() {
      calls += 1;
      return calls === 1 ? deferredResponse(body, onRead) : nextResponse(calls);
    },
  };
}

function shareCreationFetch(result, listResponse) {
  return async (input, init = {}) => {
    const url = String(input);
    if (url === "/api/share/preview") return okResponse({ snapshot: result.snapshot });
    if (url === "/api/share" && init.method === "POST") return okResponse(result);
    if (url === "/api/share" && (!init.method || init.method === "GET")) return listResponse();
    throw new Error(`Unexpected fetch: ${url}`);
  };
}

function textOf(node) {
  return node.children
    .map((child) => (typeof child === "string" || typeof child === "number" ? String(child) : textOf(child)))
    .join("");
}

function buttonsWithText(renderer, text) {
  return renderer.root.findAllByType("button").filter((button) => textOf(button) === text);
}

function checkboxInputs(renderer) {
  return renderer.root.findAllByType("input").filter((input) => input.props.type === "checkbox");
}

function waitFor(condition) {
  const deadline = Date.now() + 2000;
  return new Promise((resolve, reject) => {
    const check = () => {
      if (condition()) {
        resolve();
      } else if (Date.now() >= deadline) {
        reject(new Error("Timed out waiting for component state"));
      } else {
        setTimeout(check, 0);
      }
    };
    check();
  });
}

async function flush() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

const activeShare = {
  createdAt: "2026-01-01T00:00:00.000Z",
  expiresAt: "2099-01-01T00:00:00.000Z",
  id: "share-race-1",
  purpose: "doctor",
  revoked: false,
  selectedFields: ["identity"],
};

function shareSummary(id) {
  return { ...activeShare, id };
}

function shareResult(id) {
  return {
    ...shareSummary(id),
    snapshot: { identity: { fullName: "Owner" } },
  };
}

function shareRow(renderer, id) {
  const idLabel = renderer.root.findAllByType("span").find((span) => textOf(span) === id);
  return idLabel?.parent?.parent?.parent;
}

function revokeButtonFor(renderer, id) {
  const row = shareRow(renderer, id);
  return buttonsWithText(renderer, "share.revoke").find((button) => button.parent.parent === row);
}

async function createShare(renderer) {
  const [fieldCheckbox] = checkboxInputs(renderer);
  await act(async () => fieldCheckbox.props.onChange({}));
  await flush();

  const recipientInput = renderer.root
    .findAllByType("input")
    .find((input) => input.props.type !== "checkbox");
  await act(async () => {
    recipientInput.props.onChange({
      target: { value: "00000000-0000-4000-8000-00000000000b" },
    });
  });
  await act(async () => {
    checkboxInputs(renderer)[1].props.onChange({ target: { checked: true } });
  });

  const generateButton = buttonsWithText(renderer, "share.generate").find((button) => !button.props.disabled);
  assert.ok(generateButton);
  await act(async () => generateButton.props.onClick());
}

async function withShareClient(fetchHandler, run, { confirm = () => true } = {}) {
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  let renderer;
  globalThis.fetch = fetchHandler;
  globalThis.window = {
    ...(originalWindow ?? {}),
    confirm,
    location: originalWindow?.location ?? { origin: "http://localhost" },
  };
  try {
    await act(async () => {
      renderer = create(React.createElement(ShareClient));
    });
    await run(renderer);
  } finally {
    if (renderer) await act(async () => renderer.unmount());
    globalThis.fetch = originalFetch;
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  }
}

test("stale active refresh cannot undo confirmed revoke after a failed latest refresh", async () => {
  const staleBody = deferred();
  const result = shareResult(activeShare.id);
  let mountBodyRead = false;
  let listCalls = 0;

  await withShareClient(async (input, init = {}) => {
    const url = String(input);
    if (url === "/api/share/preview") return okResponse({ snapshot: result.snapshot });
    if (url === "/api/share" && init.method === "POST") return okResponse(result);
    if (url === "/api/share" && (!init.method || init.method === "GET")) {
      listCalls += 1;
      if (listCalls === 1) {
        return {
          json: () => {
            mountBodyRead = true;
            return staleBody.promise;
          },
          ok: true,
          status: 200,
        };
      }
      if (listCalls === 2) return okResponse([activeShare]);
      throw new Error("post-revoke refresh failed");
    }
    if (url === `/api/share/${activeShare.id}/revoke`) return okResponse({});
    throw new Error(`Unexpected fetch: ${url}`);
  }, async (renderer) => {
    await waitFor(() => mountBodyRead);
    await createShare(renderer);
    await waitFor(() => listCalls === 2);
    await flush();
    assert.equal(buttonsWithText(renderer, "share.revoke").length, 2);

    await act(async () => buttonsWithText(renderer, "share.revoke")[0].props.onClick());
    await waitFor(() => listCalls === 3);
    await flush();
    assert.equal(buttonsWithText(renderer, "share.revoke").length, 0);

    staleBody.resolve([activeShare]);
    await flush();
    assert.equal(buttonsWithText(renderer, "share.revoke").length, 0);
    assert.match(textOf(renderer.root), /share\.status\.revoked/);
  });
});

test("failed revoke does not mark the share as revoked", async () => {
  await withShareClient(async (input, init = {}) => {
    const url = String(input);
    if (url === "/api/share" && (!init.method || init.method === "GET")) {
      return okResponse([activeShare]);
    }
    if (url === `/api/share/${activeShare.id}/revoke`) return { json: async () => ({}), ok: false, status: 500 };
    throw new Error(`Unexpected fetch: ${url}`);
  }, async (renderer) => {
    await flush();
    assert.equal(buttonsWithText(renderer, "share.revoke").length, 1);

    await act(async () => buttonsWithText(renderer, "share.revoke")[0].props.onClick());
    assert.equal(buttonsWithText(renderer, "share.revoke").length, 1);
    assert.doesNotMatch(textOf(renderer.root), /share\.status\.revoked/);
  });
});

test("an earlier initial list recovers after the post-create refresh fails", async () => {
  const initialBody = deferred();
  const created = shareResult("share-created");
  const existing = [shareSummary("share-a"), shareSummary("share-b")];
  let initialBodyRead = false;
  const lists = deferredInitialList(
    initialBody,
    () => {
      initialBodyRead = true;
    },
    () => {
      throw new Error("post-create refresh failed");
    },
  );

  await withShareClient(shareCreationFetch(created, () => lists.next()), async (renderer) => {
    await waitFor(() => initialBodyRead);
    await createShare(renderer);
    await waitFor(() => lists.calls === 2);
    await flush();
    assert.equal(buttonsWithText(renderer, "share.revoke").length, 1);

    initialBody.resolve(existing);
    await flush();
    for (const share of existing) {
      assert.ok(shareRow(renderer, share.id));
      assert.ok(revokeButtonFor(renderer, share.id));
    }
    assert.equal(buttonsWithText(renderer, "share.revoke").length, 3);
  });
});

test("an older late list cannot replace a newer successful list", async () => {
  const initialBody = deferred();
  const created = shareResult("share-created");
  const older = shareSummary("share-older");
  const newer = shareSummary("share-newer");
  let initialBodyRead = false;
  const lists = deferredInitialList(
    initialBody,
    () => {
      initialBodyRead = true;
    },
    () => okResponse([newer]),
  );

  await withShareClient(shareCreationFetch(created, () => lists.next()), async (renderer) => {
    await waitFor(() => initialBodyRead);
    await createShare(renderer);
    await waitFor(() => lists.calls === 2);
    await flush();
    assert.ok(revokeButtonFor(renderer, newer.id));

    initialBody.resolve([older]);
    await flush();
    assert.ok(shareRow(renderer, newer.id));
    assert.equal(shareRow(renderer, older.id), undefined);
    assert.ok(revokeButtonFor(renderer, newer.id));
  });
});

test("reset prevents a pre-reset list response from restoring cleared shares", async () => {
  const initialBody = deferred();
  const stale = shareSummary("share-before-reset");
  let initialBodyRead = false;
  const lists = deferredInitialList(
    initialBody,
    () => {
      initialBodyRead = true;
    },
    () => {
      throw new Error("post-reset refresh failed");
    },
  );

  await withShareClient(async (input, init = {}) => {
    const url = String(input);
    if (url === "/api/share/reset" && init.method === "POST") return okResponse({});
    if (url === "/api/share" && (!init.method || init.method === "GET")) return lists.next();
    throw new Error(`Unexpected fetch: ${url}`);
  }, async (renderer) => {
    await waitFor(() => initialBodyRead);
    await act(async () => buttonsWithText(renderer, "share.reset")[0].props.onClick());
    await waitFor(() => lists.calls === 2);
    await flush();

    initialBody.resolve([stale]);
    await flush();
    assert.equal(shareRow(renderer, stale.id), undefined);
    assert.equal(buttonsWithText(renderer, "share.revoke").length, 0);
    assert.match(textOf(renderer.root), /share\.noShares/);
  }, { confirm: () => true });
});

test("a confirmed revoke overlays a delayed list when the share exists only in the result", async () => {
  const delayedBody = deferred();
  const created = shareResult("share-result-only");
  let delayedBodyRead = false;
  let listCalls = 0;

  await withShareClient(async (input, init = {}) => {
    const url = String(input);
    if (url === "/api/share/preview") return okResponse({ snapshot: created.snapshot });
    if (url === "/api/share" && init.method === "POST") return okResponse(created);
    if (url === `/api/share/${created.id}/revoke`) return okResponse({});
    if (url === "/api/share" && (!init.method || init.method === "GET")) {
      listCalls += 1;
      if (listCalls === 1) return okResponse([]);
      if (listCalls === 2) return deferredResponse(delayedBody, () => {
        delayedBodyRead = true;
      });
      throw new Error("post-revoke refresh failed");
    }
    throw new Error(`Unexpected fetch: ${url}`);
  }, async (renderer) => {
    await flush();
    await createShare(renderer);
    await waitFor(() => listCalls === 2);
    await waitFor(() => delayedBodyRead);
    assert.equal(buttonsWithText(renderer, "share.revoke").length, 1);

    await act(async () => buttonsWithText(renderer, "share.revoke")[0].props.onClick());
    await waitFor(() => listCalls === 3);
    await flush();
    delayedBody.resolve([created]);
    await flush();

    const row = shareRow(renderer, created.id);
    assert.ok(row);
    assert.match(textOf(row), /share\.status\.revoked/);
    assert.equal(revokeButtonFor(renderer, created.id), undefined);
  });
});
