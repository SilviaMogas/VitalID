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
    "community.retry": "Retry",
    "common.loading": "Loading",
    "wellness.consentNeeded": "Health-data consent is required",
    "wellness.conflict": "This entry changed",
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

function savedEntry(kind, id, name) {
  return {
    id,
    kind,
    data: kind === "workout"
      ? {
          title: name,
          exercises: [{ name: "Fixture exercise", sets: 3, reps: "8", note: "" }],
          notes: "",
        }
      : { name, amount: "1 capsule", schedule: "daily", note: "" },
    createdAt: "2026-10-12T10:20:30.123456Z",
    updatedAt: "2026-10-12T12:34:56.123456Z",
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

test("unavailable full reads open metadata deletion and retry only recovers on a later full read", async () => {
  for (const kind of ["workout", "supplement"]) {
    const calls = [];
    const recovered = savedEntry(
      kind,
      "00000000-0000-4000-8000-0000000000c2",
      `Recovered ${kind} fixture`,
    );
    let fullReads = 0;
    await withWellness(kind, async (input, init = {}) => {
      const url = String(input);
      calls.push({ init, url });
      if (url === `/api/wellness?kind=${kind}`) {
        fullReads += 1;
        return fullReads === 1
          ? response({ error: "unavailable" }, 503)
          : response({ entries: [recovered] });
      }
      if (url === `/api/wellness?kind=${kind}&view=deletion`) {
        return response({
          entries: [deletionEntry(kind, recovered.updatedAt, recovered.id)],
        });
      }
      throw new Error(`Unexpected request: ${url}`);
    }, async (renderer) => {
      const panel = renderer.root.findByProps({ "data-testid": `wellness-${kind}-deletion-panel` });
      assert.match(textOf(panel), /Record 1/);
      assert.match(textOf(panel), /Created 2026-10-12T10:20:30.123456Z/);
      assert.doesNotMatch(textOf(renderer.root), /Recovered workout fixture|Recovered supplement fixture|Sensitive fixture value|Should never render/);
      assert.equal(renderer.root.findAllByProps({ id: "wellness-editor" }).length, 0);
      assert.equal(renderer.root.findAllByProps({ id: "wellness-consent" }).length, 0);
      assert.equal(buttonsWithText(renderer, "Save consent and continue").length, 0);
      assert.equal(buttonsWithText(renderer, "Retry").length, 1);
      assert.equal(calls.filter(({ url }) => url.startsWith("/api/consent")).length, 0);

      await act(async () => buttonsWithText(renderer, "Retry")[0].props.onClick());
      await flush();

      assert.equal(fullReads, 2);
      assert.equal(renderer.root.findAllByProps({ "data-testid": `wellness-${kind}-deletion-panel` }).length, 0);
      assert.match(textOf(renderer.root), new RegExp(`Recovered ${kind} fixture`));
      assert.equal(calls.filter(({ url }) => url.startsWith("/api/consent")).length, 0);
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

test("metadata refresh removes confirmed deletes, preserves remaining entries on failure, and clears on authentication failure", async () => {
  let metadataReads = 0;
  const first = deletionEntry(
    "supplement",
    "2026-10-12T12:34:56.123456Z",
    "00000000-0000-4000-8000-0000000000c1",
  );
  const remaining = {
    ...deletionEntry(
      "supplement",
      "2026-10-11T12:34:56.123456Z",
      "00000000-0000-4000-8000-0000000000c2",
    ),
    createdAt: "2026-10-11T10:20:30.123456Z",
  };
  await withWellness("supplement", async (input) => {
    const url = String(input);
    if (url === "/api/wellness?kind=supplement") return response({ error: "consent_required" }, 403);
    if (url === "/api/wellness?kind=supplement&view=deletion") {
      metadataReads += 1;
      if (metadataReads === 1) return response({ entries: [first, remaining] });
      if (metadataReads === 2) return response({ error: "unavailable" }, 503);
      if (metadataReads === 3) return response({ entries: [remaining] });
      return response({ error: "unauthenticated" }, 401);
    }
    if (url === "/api/wellness") return response({ ok: true });
    throw new Error(`Unexpected request: ${url}`);
  }, async (renderer) => {
    await act(async () => buttonsWithText(renderer, "Delete")[0].props.onClick());
    await act(async () => buttonsWithText(renderer, "Confirm delete")[0].props.onClick());
    assert.equal(renderer.root.findAllByProps({ "data-testid": "wellness-deletion-entry" }).length, 1);
    assert.ok(textOf(renderer.root).includes("The deletion list is temporarily unavailable."));
    assert.match(textOf(renderer.root), /Created 2026-10-11T10:20:30.123456Z/);

    await act(async () => buttonsWithText(renderer, "Refresh deletion list")[0].props.onClick());
    assert.equal(renderer.root.findAllByProps({ "data-testid": "wellness-deletion-entry" }).length, 1);
    assert.doesNotMatch(textOf(renderer.root), /temporarily unavailable/);

    await act(async () => buttonsWithText(renderer, "Delete")[0].props.onClick());
    await act(async () => buttonsWithText(renderer, "Confirm delete")[0].props.onClick());
    await flush();
    assert.equal(metadataReads, 4);
    assert.equal(renderer.root.findAllByProps({ "data-testid": "wellness-deletion-entry" }).length, 0);
    assert.equal(renderer.root.findAllByProps({ "data-testid": "wellness-supplement-deletion-panel" }).length, 0);
    assert.equal(buttonsWithText(renderer, "Delete").length, 0);
  });
});

test("unavailable deletion and metadata conflicts preserve the unavailable reason", async () => {
  const first = deletionEntry(
    "workout",
    "2026-10-12T12:34:56.123456Z",
    "00000000-0000-4000-8000-0000000000c1",
  );
  const second = {
    ...deletionEntry(
      "workout",
      "2026-10-11T12:34:56.123456Z",
      "00000000-0000-4000-8000-0000000000c2",
    ),
    createdAt: "2026-10-11T10:20:30.123456Z",
  };
  const freshSecond = { ...second, updatedAt: "2026-10-12T12:34:56.654321Z" };
  let metadataReads = 0;
  const deleteBodies = [];
  await withWellness("workout", async (input, init = {}) => {
    const url = String(input);
    if (url === "/api/wellness?kind=workout") return response({ error: "unavailable" }, 503);
    if (url === "/api/wellness?kind=workout&view=deletion") {
      metadataReads += 1;
      if (metadataReads === 1) return response({ entries: [first, second] });
      if (metadataReads === 2) return response({ error: "unavailable" }, 503);
      if (metadataReads === 3) return response({ entries: [second] });
      if (metadataReads === 4) return response({ entries: [freshSecond] });
      return response({ entries: [] });
    }
    if (url === "/api/wellness" && init.method === "POST") {
      const body = JSON.parse(init.body);
      deleteBodies.push(body);
      if (body.id === first.id || deleteBodies.filter((item) => item.id === second.id).length > 1) {
        return response({ ok: true });
      }
      return response({ error: "conflict" }, 409);
    }
    throw new Error(`Unexpected request: ${url}`);
  }, async (renderer) => {
    assert.match(textOf(renderer.root), /Unavailable/);
    assert.equal(renderer.root.findAllByProps({ "data-testid": "wellness-deletion-entry" }).length, 2);

    await act(async () => buttonsWithText(renderer, "Delete")[0].props.onClick());
    await act(async () => buttonsWithText(renderer, "Confirm delete")[0].props.onClick());
    await flush();
    assert.equal(deleteBodies[0].id, first.id);
    assert.equal(renderer.root.findAllByProps({ "data-testid": "wellness-deletion-entry" }).length, 1);
    assert.match(textOf(renderer.root), /Unavailable/);
    assert.ok(textOf(renderer.root).includes("The deletion list is temporarily unavailable."));
    assert.equal(buttonsWithText(renderer, "Save consent and continue").length, 0);
    assert.equal(renderer.root.findAllByProps({ id: "wellness-consent" }).length, 0);

    await act(async () => buttonsWithText(renderer, "Refresh deletion list")[0].props.onClick());
    assert.equal(renderer.root.findAllByProps({ "data-testid": "wellness-deletion-entry" }).length, 1);
    await act(async () => buttonsWithText(renderer, "Delete")[0].props.onClick());
    await act(async () => buttonsWithText(renderer, "Confirm delete")[0].props.onClick());
    await flush();
    assert.equal(deleteBodies[1].id, second.id);
    assert.equal(deleteBodies[1].updatedAt, second.updatedAt);
    assert.equal(renderer.root.findAllByProps({ "data-testid": "wellness-deletion-entry" }).length, 1);
    assert.match(textOf(renderer.root), /This entry changed/);

    await act(async () => buttonsWithText(renderer, "Load latest (discard my edits)")[0].props.onClick());
    await flush();
    assert.equal(metadataReads, 4);
    assert.equal(renderer.root.findAllByProps({ "data-testid": "wellness-deletion-entry" }).length, 1);
    assert.match(textOf(renderer.root), /Unavailable/);
    assert.doesNotMatch(textOf(renderer.root), /Health-data consent is required/);
    assert.equal(buttonsWithText(renderer, "Save consent and continue").length, 0);
    assert.equal(renderer.root.findAllByProps({ id: "wellness-consent" }).length, 0);

    await act(async () => buttonsWithText(renderer, "Delete")[0].props.onClick());
    await act(async () => buttonsWithText(renderer, "Confirm delete")[0].props.onClick());
    await flush();
    assert.equal(deleteBodies[2].updatedAt, freshSecond.updatedAt);
    assert.equal(renderer.root.findAllByProps({ "data-testid": "wellness-deletion-entry" }).length, 0);
    assert.match(textOf(renderer.root), /Unavailable/);
    assert.equal(buttonsWithText(renderer, "Save consent and continue").length, 0);
  });
});

test("full-data delete removes the confirmed entry before an unavailable refresh enters deletion mode", async () => {
  const first = savedEntry("workout", "00000000-0000-4000-8000-0000000000c1", "Private first fixture");
  const second = savedEntry("workout", "00000000-0000-4000-8000-0000000000c2", "Private second fixture");
  let fullReads = 0;
  let deleteBody;
  await withWellness("workout", async (input, init = {}) => {
    const url = String(input);
    if (url === "/api/wellness?kind=workout") {
      fullReads += 1;
      return fullReads === 1
        ? response({ entries: [first, second] })
        : response({ error: "unavailable" }, 503);
    }
    if (url === "/api/wellness?kind=workout&view=deletion") {
      return response({ entries: [deletionEntry("workout", second.updatedAt, second.id)] });
    }
    if (url === "/api/wellness" && init.method === "POST") {
      deleteBody = JSON.parse(init.body);
      return response({ ok: true });
    }
    throw new Error(`Unexpected request: ${url}`);
  }, async (renderer) => {
    assert.match(textOf(renderer.root), /Private first fixture/);
    assert.match(textOf(renderer.root), /Private second fixture/);
    await act(async () => buttonsWithText(renderer, "Delete")[0].props.onClick());
    await act(async () => buttonsWithText(renderer, "Confirm delete")[0].props.onClick());
    await flush();

    assert.equal(deleteBody.id, first.id);
    assert.equal(renderer.root.findAllByProps({ "data-testid": "wellness-deletion-entry" }).length, 1);
    assert.match(textOf(renderer.root), /Record 1/);
    assert.doesNotMatch(textOf(renderer.root), /Private first fixture|Private second fixture/);
    assert.equal(renderer.root.findAllByProps({ id: "wellness-editor" }).length, 0);
    assert.match(textOf(renderer.root), /Unavailable/);
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
