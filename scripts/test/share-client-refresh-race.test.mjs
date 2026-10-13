import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { loadTranspiledModule } from "./transpile-component.mjs";

const require = createRequire(import.meta.url);
const React = require("react");
const { act, create } = require("react-test-renderer");

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const componentPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../components/share/ShareClient.tsx",
);
const disclosurePreviewPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../components/share/DisclosurePreview.tsx",
);

const passThrough = ({ children }) => children ?? null;
const noop = () => null;
const translate = (key, params) =>
  key === "share.history" ? `share.history.${params?.count ?? 0}` : key;
let configurableExpiryEnabled = false;
const localeProviderMock = {
  useLocale: () => ({ d: (value) => value, locale: "en", t: translate }),
};
const testInsurer = {
  color: "#087F5B",
  id: "daman",
  monogram: "D",
  name: "Daman",
  nameAr: "ضمان",
};
const testRecipient = {
  consented: true,
  deliveryRef: "VID-SHARE-DAMAN-TEST",
  insurerId: "daman",
  sentAt: "2026-01-01T00:00:00.000Z",
};

const DisclosurePreview = loadTranspiledModule(
  disclosurePreviewPath,
  new Map([["@/components/providers/LocaleProvider", localeProviderMock]]),
).DisclosurePreview;

function loadShareClient() {
  const mocks = new Map([
    ["qrcode.react", { QRCodeSVG: noop }],
    ["@/components/providers/LocaleProvider", localeProviderMock],
    ["@/components/providers/AuthProvider", { useAuth: () => ({ account: null }) }],
    [
      "@/components/providers/MembershipProvider",
      {
        useMembership: () => ({
          hasFeature: (feature) => feature === "configurableExpiry" && configurableExpiryEnabled,
        }),
      },
    ],
    ["@/components/membership/LockedFeature", { LockedFeature: passThrough }],
    ["@/components/membership/UpgradeChip", { LockIcon: noop, UpgradeChip: noop }],
    ["@/components/vital-id/VitalIdSections", { SectionTitle: passThrough }],
    ["@/components/mascot/MascotNote", { MascotNote: passThrough }],
    ["@/components/companions/Companion", { Companion: noop }],
    [
      "@/lib/sharing",
      {
        PURPOSE_PRESETS: { doctor: ["identity"] },
        SHARE_DURATIONS: [15, 60],
        SHARE_FIELDS: ["identity"],
        SHARE_PURPOSES: ["doctor"],
      },
    ],
    [
      "@/lib/insurers",
      {
        getInsurer: (id) => id === testInsurer.id ? testInsurer : undefined,
        INSURERS: [testInsurer],
      },
    ],
    [
      "@/components/share/InsurerBadge",
      {
        InsurerMonogram: ({ insurer }) => React.createElement("span", null, insurer.monogram),
        resolveRecipients: (recipients) => (recipients ?? [])
          .filter((recipient) => recipient.insurerId === testInsurer.id)
          .map((recipient) => ({ recipient, insurer: testInsurer })),
      },
    ],
    ["@/components/share/DisclosurePreview", { DisclosurePreview }],
  ]);
  return loadTranspiledModule(componentPath, mocks).default;
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

function deferredInitialList(body, nextResponse) {
  let calls = 0;
  let bodyRead = false;
  return {
    get bodyRead() {
      return bodyRead;
    },
    get calls() {
      return calls;
    },
    next() {
      calls += 1;
      return calls === 1
        ? deferredResponse(body, () => {
          bodyRead = true;
        })
        : nextResponse(calls);
    },
  };
}

function shareCreationFetch(result, listResponse, additionalResponses = new Map()) {
  const previewSnapshot = typeof result === "function" ? shareResult("share-preview").snapshot : result.snapshot;
  return async (input, init = {}) => {
    const url = String(input);
    if (additionalResponses.has(url)) return okResponse(additionalResponses.get(url));
    if (url === "/api/share/preview") return okResponse({ snapshot: previewSnapshot });
    if (url === "/api/share" && init.method === "POST") {
      return okResponse(typeof result === "function" ? result() : result);
    }
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
  const [fieldCheckbox] = checkboxInputs(renderer).slice(0, -1);
  if (!fieldCheckbox.props.checked) {
    await act(async () => fieldCheckbox.props.onChange({}));
    await flush();
  }

  const recipientInput = renderer.root
    .findAllByType("input")
    .find((input) => input.props.type !== "checkbox");
  await act(async () => {
    recipientInput.props.onChange({
      target: { value: "00000000-0000-4000-8000-00000000000b" },
    });
  });
  await act(async () => {
    checkboxInputs(renderer).at(-1).props.onChange({ target: { checked: true } });
  });

  const generateButton = buttonsWithText(renderer, "share.generate").find((button) => !button.props.disabled);
  assert.ok(generateButton);
  await act(async () => generateButton.props.onClick());
}

async function withShareClient(
  fetchHandler,
  run,
  { confirm = () => true, configurableExpiry = false } = {},
) {
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  const originalConfigurableExpiry = configurableExpiryEnabled;
  let renderer;
  globalThis.fetch = fetchHandler;
  configurableExpiryEnabled = configurableExpiry;
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
    configurableExpiryEnabled = originalConfigurableExpiry;
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  }
}

async function withDisclosurePreview(snapshot, run) {
  let renderer;
  try {
    await act(async () => {
      renderer = create(React.createElement(DisclosurePreview, { snapshot }));
    });
    await run(renderer);
  } finally {
    if (renderer) await act(async () => renderer.unmount());
  }
}

const syntheticPreviewSnapshot = {
  identity: {
    fullName: "Synthetic Owner",
    vitalId: "VID-SYNTHETIC-01",
  },
};

function shareFormFetch({
  previewResponse = okResponse({ snapshot: syntheticPreviewSnapshot }),
  onCreate = () => {},
  result = shareResult("share-ui-created"),
} = {}) {
  return async (input, init = {}) => {
    const url = String(input);
    if (url === "/api/share/preview") return previewResponse;
    if (url === "/api/share" && init.method === "POST") {
      onCreate(JSON.parse(init.body));
      return okResponse(result);
    }
    if (url === "/api/share" && (!init.method || init.method === "GET")) return okResponse([]);
    throw new Error(`Unexpected fetch: ${url}`);
  };
}

function recipientCodeInput(renderer) {
  return renderer.root
    .findAllByType("input")
    .find((input) => input.props.type !== "checkbox" && !input.props.readOnly);
}

function disclosureConsentInput(renderer) {
  return checkboxInputs(renderer).at(-1);
}

function generateButton(renderer) {
  return buttonsWithText(renderer, "share.generate")[0];
}

async function selectIdentityField(renderer) {
  const [identityCheckbox] = checkboxInputs(renderer).slice(0, -1);
  await act(async () => identityCheckbox.props.onChange({}));
  await flush();
}

async function setRecipientCode(renderer, value) {
  const input = recipientCodeInput(renderer);
  await act(async () => input.props.onChange({ target: { value } }));
  await flush();
}

async function authorizeDisclosure(renderer) {
  const consent = disclosureConsentInput(renderer);
  await act(async () => consent.props.onChange({ target: { checked: true } }));
  await flush();
}

async function waitForPreview(renderer) {
  await waitFor(() => renderer.root.findAllByProps({ "data-testid": "disclosure-preview" }).length === 1);
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
  const laterCreated = shareResult("share-created-later");
  const existing = [shareSummary("share-a"), shareSummary("share-b")];
  let createCalls = 0;
  const lists = deferredInitialList(
    initialBody,
    () => {
      throw new Error("post-create refresh failed");
    },
  );

  await withShareClient(shareCreationFetch(
    () => [created, laterCreated][createCalls++],
    () => lists.next(),
  ), async (renderer) => {
    await waitFor(() => lists.bodyRead);
    await createShare(renderer);
    await waitFor(() => lists.calls === 2);
    await flush();
    assert.equal(buttonsWithText(renderer, "share.revoke").length, 2);
    assert.ok(revokeButtonFor(renderer, created.id));

    initialBody.resolve(existing);
    await flush();
    for (const share of existing) {
      assert.ok(shareRow(renderer, share.id));
      assert.ok(revokeButtonFor(renderer, share.id));
    }

    await createShare(renderer);
    await waitFor(() => lists.calls === 3);
    await flush();
    assert.ok(shareRow(renderer, created.id));
    assert.ok(revokeButtonFor(renderer, created.id));
    assert.ok(shareRow(renderer, laterCreated.id));
    assert.ok(revokeButtonFor(renderer, laterCreated.id));
  });
});

test("an older late list cannot replace a newer successful list", async () => {
  const initialBody = deferred();
  const created = shareResult("share-created");
  const older = shareSummary("share-older");
  const newer = shareSummary("share-newer");
  const lists = deferredInitialList(
    initialBody,
    () => okResponse([newer]),
  );

  await withShareClient(shareCreationFetch(created, () => lists.next()), async (renderer) => {
    await waitFor(() => lists.bodyRead);
    await createShare(renderer);
    await waitFor(() => lists.calls === 2);
    await flush();
    assert.ok(revokeButtonFor(renderer, newer.id));
    assert.equal(shareRow(renderer, created.id), undefined);

    initialBody.resolve([older]);
    await flush();
    assert.ok(shareRow(renderer, newer.id));
    assert.equal(shareRow(renderer, older.id), undefined);
    assert.ok(revokeButtonFor(renderer, newer.id));
  });
});

test("confirmed insurer recipients survive an older list after send refresh fails", async () => {
  const initialBody = deferred();
  const created = shareResult("share-sent");
  const existing = [shareSummary("share-a"), shareSummary("share-b")];
  const lists = deferredInitialList(
    initialBody,
    () => {
      throw new Error("post-mutation refresh failed");
    },
  );
  const fetchHandler = shareCreationFetch(
    created,
    () => lists.next(),
    new Map([[`/api/share/${created.id}/send`, { id: created.id, sentTo: [testRecipient] }]]),
  );

  await withShareClient(fetchHandler, async (renderer) => {
    await waitFor(() => lists.bodyRead);
    await createShare(renderer);
    await waitFor(() => lists.calls === 2);
    await flush();

    const insurerButton = renderer.root
      .findAllByType("button")
      .find((button) => textOf(button).includes(testInsurer.name));
    assert.ok(insurerButton, textOf(renderer.root));
    await act(async () => insurerButton.props.onClick());
    await act(async () => checkboxInputs(renderer)[2].props.onChange({ target: { checked: true } }));
    await act(async () => buttonsWithText(renderer, "share.sendReport")[0].props.onClick());
    await waitFor(() => lists.calls === 3);

    initialBody.resolve(existing);
    await flush();
    const row = shareRow(renderer, created.id);
    assert.ok(row);
    assert.ok(row.findAllByType("span").some((span) => span.props.title === "Daman"));
  });
});

test("confirmed revoke wins over a created-share mutation on an older list", async () => {
  const initialBody = deferred();
  const created = shareResult("share-revoked");
  const existing = [shareSummary("share-a"), shareSummary("share-b")];
  const lists = deferredInitialList(
    initialBody,
    () => {
      throw new Error("post-mutation refresh failed");
    },
  );
  const fetchHandler = shareCreationFetch(
    created,
    () => lists.next(),
    new Map([[`/api/share/${created.id}/revoke`, {}]]),
  );

  await withShareClient(fetchHandler, async (renderer) => {
    await waitFor(() => lists.bodyRead);
    await createShare(renderer);
    await waitFor(() => lists.calls === 2);
    await act(async () => buttonsWithText(renderer, "share.revoke")[0].props.onClick());
    await waitFor(() => lists.calls === 3);

    initialBody.resolve(existing);
    await flush();
    const row = shareRow(renderer, created.id);
    assert.ok(row);
    assert.match(textOf(row), /share\.status\.revoked/);
    assert.equal(revokeButtonFor(renderer, created.id), undefined);
  });
});

test("reset prevents a pre-reset list response from restoring cleared shares", async () => {
  const initialBody = deferred();
  const stale = shareSummary("share-before-reset");
  const lists = deferredInitialList(
    initialBody,
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
    await waitFor(() => lists.bodyRead);
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

test("a confirmed revoke overlays a delayed post-create list", async () => {
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
    assert.equal(buttonsWithText(renderer, "share.revoke").length, 2);

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

test("disclosure preview presents allowlisted values as readable labeled fields", async () => {
  const snapshot = {
    identity: {
      fullName: "Synthetic Owner",
      localizedName: { en: "Synthetic Owner", ar: "مالك افتراضي" },
      vitalId: "VID-SYNTHETIC-01",
    },
    emergencyInfo: {
      allergies: ["Synthetic pollen"],
      conditions: [],
      emergencyContact: {
        localizedName: { en: "Synthetic Contact", ar: "جهة اتصال افتراضية" },
        name: "Synthetic Contact",
        phone: "+971500000001",
        relation: "friend",
      },
    },
    currentSignals: [{
      baseline: 0,
      baselineDays: 7,
      delta: 0,
      deltaPercent: 0,
      metric: "sleep",
      polarity: "higherIsBetter",
      sevenDayAverage: 0,
      source: "manual",
      status: "stable",
      timestamp: "2026-10-12T08:15:00.000Z",
      unit: "hours",
      value: 0,
    }],
    healthProfile: {
      heightCm: 0,
      maxHeartRate: 0,
      medications: [],
      weightKg: 0,
    },
  };

  await withDisclosurePreview(snapshot, (renderer) => {
    const text = textOf(renderer.root);
    for (const value of [
      "Personal details",
      "Synthetic Owner",
      "Names in other languages",
      "English",
      "Arabic",
      "مالك افتراضي",
      "Recorded allergies",
      "Synthetic pollen",
      "Recorded conditions",
      "No entries recorded",
      "Emergency contact",
      "Synthetic Contact",
      "Relationship",
      "friend",
      "+971500000001",
      "Value0",
      "Height (cm)0",
      "Maximum heart rate (bpm)0",
      "Source",
      "manual",
      "Personal baseline0",
      "Days in baseline7",
      "Recorded at",
      "2026-10-12T08:15:00.000Z",
    ]) {
      assert.ok(text.includes(value), `expected disclosure preview to include ${value}`);
    }
    assert.equal(renderer.root.findAllByType("pre").length, 0);
    assert.equal(renderer.root.findAllByType("code").length, 0);
    assert.doesNotMatch(text, /"fullName"\s*:/);
  });
});

test("disclosure preview omits identity when the snapshot has no identity", async () => {
  await withDisclosurePreview({ emergencyInfo: { allergies: [] } }, (renderer) => {
    const summaries = renderer.root.findAllByType("summary").map(textOf);
    assert.deepEqual(summaries, ["Emergency information"]);
    assert.doesNotMatch(textOf(renderer.root), /Personal details|Full name/);
  });
});

test("missing or invalid recipient keeps consent and generation disabled", async () => {
  let createCalls = 0;
  await withShareClient(
    shareFormFetch({ onCreate: () => { createCalls += 1; } }),
    async (renderer) => {
      await selectIdentityField(renderer);
      await waitForPreview(renderer);

      assert.equal(disclosureConsentInput(renderer).props.disabled, true);
      assert.equal(generateButton(renderer).props.disabled, true);

      await setRecipientCode(renderer, "not-a-recipient-code");
      assert.equal(recipientCodeInput(renderer).props["aria-invalid"], true);
      assert.equal(disclosureConsentInput(renderer).props.disabled, true);
      assert.equal(generateButton(renderer).props.disabled, true);
      assert.equal(createCalls, 0);
    },
  );
});

test("a valid recipient code alone does not authorize disclosure", async () => {
  let createCalls = 0;
  await withShareClient(shareFormFetch({ onCreate: () => { createCalls += 1; } }), async (renderer) => {
    await selectIdentityField(renderer);
    await waitForPreview(renderer);
    await setRecipientCode(renderer, "00000000-0000-4000-8000-00000000000b");

    assert.equal(disclosureConsentInput(renderer).props.disabled, false);
    assert.equal(disclosureConsentInput(renderer).props.checked, false);
    assert.equal(generateButton(renderer).props.disabled, true);
    assert.equal(createCalls, 0);
  });
});

test("changing the recipient resets disclosure consent", async () => {
  await withShareClient(shareFormFetch(), async (renderer) => {
    await selectIdentityField(renderer);
    await waitForPreview(renderer);
    await setRecipientCode(renderer, "00000000-0000-4000-8000-00000000000b");
    await authorizeDisclosure(renderer);
    assert.equal(disclosureConsentInput(renderer).props.checked, true);
    assert.equal(generateButton(renderer).props.disabled, false);

    await setRecipientCode(renderer, "00000000-0000-4000-8000-00000000000c");
    assert.equal(disclosureConsentInput(renderer).props.checked, false);
    assert.equal(generateButton(renderer).props.disabled, true);
  });
});

test("changing disclosure duration resets consent when configurable expiry is available", async () => {
  await withShareClient(shareFormFetch(), async (renderer) => {
    await selectIdentityField(renderer);
    await waitForPreview(renderer);
    await setRecipientCode(renderer, "00000000-0000-4000-8000-00000000000b");
    await authorizeDisclosure(renderer);
    assert.equal(disclosureConsentInput(renderer).props.checked, true);

    const shorterDuration = buttonsWithText(renderer, "share.duration.15")[0];
    assert.equal(shorterDuration.props.disabled, false);
    await act(async () => shorterDuration.props.onClick());

    assert.equal(disclosureConsentInput(renderer).props.checked, false);
    assert.equal(generateButton(renderer).props.disabled, true);
  }, { configurableExpiry: true });
});

test("share creation sends the selected fields and preview unchanged with a normalized recipient", async () => {
  const expectedSnapshot = {
    identity: {
      fullName: "Synthetic Owner",
      vitalId: "VID-SYNTHETIC-01",
    },
  };
  let postedBody;
  await withShareClient(shareFormFetch({
    previewResponse: okResponse({ snapshot: expectedSnapshot }),
    onCreate: (body) => { postedBody = body; },
  }), async (renderer) => {
    await selectIdentityField(renderer);
    await waitForPreview(renderer);
    await setRecipientCode(renderer, " 00000000-0000-4000-8000-00000000000B ");
    await authorizeDisclosure(renderer);

    await act(async () => generateButton(renderer).props.onClick());

    assert.deepEqual(postedBody.selectedFields, ["identity"]);
    assert.deepEqual(postedBody.expectedSnapshot, expectedSnapshot);
    assert.equal(postedBody.recipientUserId, "00000000-0000-4000-8000-00000000000b");
  });
});

test("missing preview data blocks share generation", async () => {
  let previewRead = false;
  let createCalls = 0;
  const previewResponse = {
    json: async () => {
      previewRead = true;
      return null;
    },
    ok: true,
    status: 200,
  };

  await withShareClient(shareFormFetch({
    previewResponse,
    onCreate: () => { createCalls += 1; },
  }), async (renderer) => {
    await selectIdentityField(renderer);
    await waitFor(() => previewRead);
    await flush();
    await setRecipientCode(renderer, "00000000-0000-4000-8000-00000000000b");

    assert.equal(disclosureConsentInput(renderer).props.disabled, true);
    assert.equal(generateButton(renderer).props.disabled, true);
    assert.equal(createCalls, 0);
  });
});

test("failed preview blocks share generation", async () => {
  let createCalls = 0;
  const previewResponse = { json: async () => ({}), ok: false, status: 503 };

  await withShareClient(shareFormFetch({
    previewResponse,
    onCreate: () => { createCalls += 1; },
  }), async (renderer) => {
    await selectIdentityField(renderer);
    await waitFor(() => textOf(renderer.root).includes("Preview unavailable. Sharing is blocked."));
    await setRecipientCode(renderer, "00000000-0000-4000-8000-00000000000b");

    assert.equal(disclosureConsentInput(renderer).props.disabled, true);
    assert.equal(generateButton(renderer).props.disabled, true);
    assert.equal(createCalls, 0);
  });
});
