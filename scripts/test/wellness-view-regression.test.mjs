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
  "../../components/wellness/WellnessView.tsx",
);

const translate = (key, params) => {
  const values = {
    "community.cancel": "Cancel",
    "community.confirmDelete": "Confirm delete",
    "community.delete": "Delete",
    "common.loading": "Loading",
    "wellness.consentNeeded": "Health-data consent is required",
    "wellness.deleteOnlyConfirm": "Delete this numbered record permanently?",
    "wellness.deleteOnlyCreated": `Created ${params?.date ?? ""}`,
    "wellness.deleteOnlyEmpty": "No private entries are available to delete.",
    "wellness.deleteOnlyHint": "Only a number and creation date are shown here.",
    "wellness.deleteOnlyRecord": `Record ${params?.number ?? ""}`,
    "wellness.deleteOnlyRetry": "Refresh deletion list",
    "wellness.deleteOnlyTitle": "Delete private entries",
    "wellness.deleteOnlyUnavailable": "The deletion list is temporarily unavailable.",
    "wellness.deleted": "Entry deleted.",
    "wellness.edit": "Edit",
    "wellness.enable": "Save consent and continue",
    "wellness.reloadLatest": "Load latest (discard my edits)",
    "wellness.save": "Save",
    "wellness.unavailable": "Unavailable",
  };
  return values[key] ?? key;
};

const localeProviderMock = {
  useLocale: () => ({ d: (value) => value, locale: "en", t: translate }),
};

const authState = {
  account: { userId: "00000000-0000-4000-8000-0000000000a1" },
  status: "member",
};

const Link = ({ children, ...props }) => React.createElement("a", props, children);
const HealthDataConsent = ({ id, checked, onChange }) => React.createElement(
  "label",
  null,
  React.createElement("input", {
    id,
    type: "checkbox",
    checked,
    onChange: (event) => onChange(event.target.checked),
  }),
);
const WellnessArt = () => null;

const WellnessView = loadTranspiledModule(
  componentPath,
  new Map([
    ["next/link", { __esModule: true, default: Link }],
    ["@/components/legal/HealthDataConsent", { HealthDataConsent }],
    ["@/components/mascot/WellnessArt", { WellnessArt }],
    ["@/components/providers/AuthProvider", { useAuth: () => authState }],
    ["@/components/providers/LocaleProvider", localeProviderMock],
  ]),
).WellnessView;

function response(body, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

function textOf(node) {
  if (node === null || node === undefined) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  return (node.children ?? []).map(textOf).join("");
}

function buttonsWithText(renderer, text) {
  return renderer.root.findAllByType("button").filter((button) => textOf(button) === text);
}

function deferred() {
  let resolve;
  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

async function flush() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

async function withWellness(kind, fetchHandler, run) {
  const originalFetch = globalThis.fetch;
  let renderer;
  globalThis.fetch = fetchHandler;
  try {
    await act(async () => {
      renderer = create(React.createElement(WellnessView, { kind }));
    });
    await flush();
    await run(renderer);
  } finally {
    if (renderer) await act(async () => renderer.unmount());
    globalThis.fetch = originalFetch;
  }
}

function deletionEntry(kind, updatedAt, id = "00000000-0000-4000-8000-0000000000c1") {
  return {
    id,
    kind,
    createdAt: "2026-10-12T10:20:30.123456Z",
    updatedAt,
    data: {
      name: "Sensitive fixture value",
      title: "Sensitive fixture value",
      note: "Should never render",
    },
  };
}

test("expired-consent deletion metadata works for workout and supplement without consent writes", async () => {
  for (const kind of ["workout", "supplement"]) {
    const calls = [];
    const deleteBodies = [];
    let deleted = false;
    await withWellness(kind, async (input, init = {}) => {
      const url = String(input);
      calls.push({ init, url });
      if (url === "/api/wellness" && init.method === "POST") {
        deleteBodies.push(JSON.parse(init.body));
        deleted = true;
        return response({ ok: true });
      }
      if (url === `/api/wellness?kind=${kind}`) {
        return response({ error: "consent_required" }, 403);
      }
      if (url === `/api/wellness?kind=${kind}&view=deletion`) {
        return response({
          entries: deleted ? [] : [deletionEntry(kind, "2026-10-12T12:34:56.123456Z")],
        });
      }
      throw new Error(`Unexpected request: ${url}`);
    }, async (renderer) => {
      const panel = renderer.root.findByProps({ "data-testid": `wellness-${kind}-deletion-panel` });
      assert.equal(renderer.root.findAllByProps({ "data-testid": "wellness-deletion-entry" }).length, 1);
      assert.match(textOf(panel), /Record 1/);
      assert.match(textOf(panel), /Created 2026-10-12T10:20:30.123456Z/);
      assert.doesNotMatch(textOf(renderer.root), /Sensitive fixture value|Should never render/);
      assert.equal(calls.some(({ url }) => url === "/api/consent"), false);

      await act(async () => buttonsWithText(renderer, "Delete")[0].props.onClick());
      await act(async () => buttonsWithText(renderer, "Confirm delete")[0].props.onClick());
      await flush();
      assert.equal(deleteBodies.length, 1);
      assert.equal(deleteBodies[0].kind, kind);
      assert.equal(deleteBodies[0].updatedAt, "2026-10-12T12:34:56.123456Z");
      assert.equal(renderer.root.findAllByProps({ "data-testid": "wellness-deletion-entry" }).length, 0);
      assert.equal(calls.some(({ url }) => url === "/api/consent"), false);
    });
  }
});

test("saving after consent expires clears the editor and opens metadata deletion access", async () => {
  const calls = [];
  let normalReads = 0;
  const fullEntry = {
    id: "00000000-0000-4000-8000-0000000000c1",
    kind: "workout",
    data: {
      title: "Sensitive routine fixture",
      exercises: [{ name: "Sensitive exercise fixture", sets: 3, reps: "8", note: "Sensitive row fixture" }],
      notes: "Sensitive notes fixture",
    },
    createdAt: "2026-10-12T10:20:30.123456Z",
    updatedAt: "2026-10-12T12:34:56.123456Z",
  };
  const originalRaf = globalThis.requestAnimationFrame;
  const originalDocument = globalThis.document;
  globalThis.requestAnimationFrame = (callback) => {
    callback();
    return 0;
  };
  globalThis.document = { getElementById: () => ({ scrollIntoView() {} }) };
  try {
    await withWellness("workout", async (input, init = {}) => {
      const url = String(input);
      calls.push({ init, url });
      if (url === "/api/wellness?kind=workout") {
        normalReads += 1;
        return normalReads === 1
          ? response({ entries: [fullEntry] })
          : response({ error: "consent_required" }, 403);
      }
      if (url === "/api/wellness?kind=workout&view=deletion") {
        return response({ entries: [deletionEntry("workout", fullEntry.updatedAt)] });
      }
      if (url === "/api/wellness" && init.method === "POST") {
        assert.equal(JSON.parse(init.body).action, "update");
        return response({ error: "consent_required" }, 403);
      }
      throw new Error(`Unexpected request: ${url}`);
    }, async (renderer) => {
      assert.match(textOf(renderer.root), /Sensitive routine fixture/);
      await act(async () => buttonsWithText(renderer, "Edit")[0].props.onClick());
      await act(async () => renderer.root.findAllByType("input").find((input) => input.props.id === "workout-title").props.onChange({
        target: { value: "Unsaved draft fixture" },
      }));
      await act(async () => renderer.root.findByProps({ id: "wellness-editor" }).props.onSubmit({
        preventDefault() {},
      }));
      await flush();

      assert.equal(renderer.root.findAllByProps({ id: "wellness-editor" }).length, 0);
      assert.equal(renderer.root.findAllByProps({ "data-testid": "wellness-workout-entry" }).length, 0);
      assert.equal(renderer.root.findAllByProps({ "data-testid": "wellness-deletion-entry" }).length, 1);
      assert.doesNotMatch(textOf(renderer.root), /Sensitive routine fixture|Sensitive exercise fixture|Sensitive row fixture|Sensitive notes fixture|Unsaved draft fixture/);
      assert.ok(buttonsWithText(renderer, "Delete").length > 0);
      assert.equal(calls.some(({ url }) => url === "/api/consent"), false);
    });
  } finally {
    if (originalRaf === undefined) delete globalThis.requestAnimationFrame;
    else globalThis.requestAnimationFrame = originalRaf;
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
  }
});

test("metadata refresh preserves entries for a transient failure but clears them on authentication failure", async () => {
  let metadataReads = 0;
  await withWellness("supplement", async (input) => {
    const url = String(input);
    if (url === "/api/wellness?kind=supplement") return response({ error: "consent_required" }, 403);
    if (url === "/api/wellness?kind=supplement&view=deletion") {
      metadataReads += 1;
      if (metadataReads === 1) {
        return response({ entries: [deletionEntry("supplement", "2026-10-12T12:34:56.123456Z")] });
      }
      if (metadataReads === 2) return response({ error: "unavailable" }, 503);
      return response({ error: "unauthenticated" }, 401);
    }
    if (url === "/api/wellness") return response({ ok: true });
    throw new Error(`Unexpected request: ${url}`);
  }, async (renderer) => {
    await act(async () => buttonsWithText(renderer, "Delete")[0].props.onClick());
    await act(async () => buttonsWithText(renderer, "Confirm delete")[0].props.onClick());
    assert.equal(renderer.root.findAllByProps({ "data-testid": "wellness-deletion-entry" }).length, 1);
    assert.ok(textOf(renderer.root).includes("The deletion list is temporarily unavailable."));

    await act(async () => buttonsWithText(renderer, "Refresh deletion list")[0].props.onClick());
    assert.equal(renderer.root.findAllByProps({ "data-testid": "wellness-deletion-entry" }).length, 0);
    assert.equal(renderer.root.findAllByProps({ "data-testid": "wellness-supplement-deletion-panel" }).length, 0);
    assert.equal(buttonsWithText(renderer, "Delete").length, 0);
  });
});

test("a delete authentication failure clears stale deletion metadata", async () => {
  await withWellness("workout", async (input, init = {}) => {
    const url = String(input);
    if (url === "/api/wellness?kind=workout") return response({ error: "consent_required" }, 403);
    if (url === "/api/wellness?kind=workout&view=deletion") {
      return response({ entries: [deletionEntry("workout", "2026-10-12T12:34:56.123456Z")] });
    }
    if (url === "/api/wellness" && init.method === "POST") {
      return response({ error: "unauthenticated" }, 401);
    }
    throw new Error(`Unexpected request: ${url}`);
  }, async (renderer) => {
    await act(async () => buttonsWithText(renderer, "Delete")[0].props.onClick());
    await act(async () => buttonsWithText(renderer, "Confirm delete")[0].props.onClick());
    assert.equal(renderer.root.findAllByProps({ "data-testid": "wellness-deletion-entry" }).length, 0);
    assert.equal(renderer.root.findAllByProps({ "data-testid": "wellness-workout-deletion-panel" }).length, 0);
    assert.equal(buttonsWithText(renderer, "Delete").length, 0);
  });
});

test("wellness conflict reloads metadata and requires a fresh explicit confirmation", async () => {
  const calls = [];
  let metadataReads = 0;
  let deleteReads = 0;
  const oldUpdatedAt = "2026-10-12T12:34:56.123456Z";
  const freshUpdatedAt = "2026-10-12T12:34:56.654321Z";
  await withWellness("workout", async (input, init = {}) => {
    const url = String(input);
    calls.push({ init, url });
    if (url === "/api/wellness?kind=workout") return response({ error: "consent_required" }, 403);
    if (url === "/api/wellness?kind=workout&view=deletion") {
      metadataReads += 1;
      return response({
        entries: metadataReads < 3
          ? [deletionEntry("workout", metadataReads === 1 ? oldUpdatedAt : freshUpdatedAt)]
          : [],
      });
    }
    if (url === "/api/wellness" && init.method === "POST") {
      deleteReads += 1;
      const body = JSON.parse(init.body);
      if (deleteReads === 1) {
        assert.equal(body.updatedAt, oldUpdatedAt);
        return response({ error: "conflict", status: 409 }, 409);
      }
      assert.equal(body.updatedAt, freshUpdatedAt);
      return response({ ok: true });
    }
    throw new Error(`Unexpected request: ${url}`);
  }, async (renderer) => {
    await act(async () => buttonsWithText(renderer, "Delete")[0].props.onClick());
    await act(async () => buttonsWithText(renderer, "Confirm delete")[0].props.onClick());
    await flush();
    assert.equal(deleteReads, 1);
    assert.equal(renderer.root.findAllByProps({ "data-testid": "wellness-deletion-entry" }).length, 1);

    await act(async () => buttonsWithText(renderer, "Load latest (discard my edits)")[0].props.onClick());
    await flush();
    assert.equal(metadataReads, 2);
    await act(async () => buttonsWithText(renderer, "Delete")[0].props.onClick());
    await act(async () => buttonsWithText(renderer, "Confirm delete")[0].props.onClick());
    await flush();
    assert.equal(deleteReads, 2);
    assert.equal(metadataReads, 3);
    assert.equal(renderer.root.findAllByProps({ "data-testid": "wellness-deletion-entry" }).length, 0);
    assert.equal(calls.some(({ url }) => url === "/api/consent"), false);
  });
});

test("aborted metadata from the previous account cannot restore wellness records", async () => {
  const originalFetch = globalThis.fetch;
  const oldMetadata = deferred();
  let metadataReads = 0;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url === "/api/wellness?kind=workout") return response({ error: "consent_required" }, 403);
    if (url === "/api/wellness?kind=workout&view=deletion") {
      metadataReads += 1;
      if (metadataReads === 1) {
        return { ok: true, status: 200, json: () => oldMetadata.promise };
      }
      return response({ entries: [] });
    }
    throw new Error(`Unexpected request: ${url}`);
  };

  let renderer;
  try {
    authState.account = { userId: "00000000-0000-4000-8000-0000000000a1" };
    await act(async () => {
      renderer = create(React.createElement(WellnessView, { kind: "workout" }));
    });
    await flush();
    authState.account = { userId: "00000000-0000-4000-8000-0000000000b1" };
    await act(async () => {
      renderer.update(React.createElement(WellnessView, { kind: "workout" }));
    });
    await flush();
    oldMetadata.resolve({ entries: [deletionEntry("workout", "2026-10-12T12:34:56.123456Z")] });
    await flush();
    assert.equal(metadataReads, 2);
    assert.equal(renderer.root.findAllByProps({ "data-testid": "wellness-deletion-entry" }).length, 0);
    assert.doesNotMatch(textOf(renderer.root), /Sensitive fixture value|Should never render/);
  } finally {
    if (renderer) await act(async () => renderer.unmount());
    globalThis.fetch = originalFetch;
  }
});
