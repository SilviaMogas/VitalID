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

test("stale active refresh cannot undo confirmed revoke after a failed latest refresh", async () => {
  const originalFetch = globalThis.fetch;
  const staleBody = deferred();
  let mountBodyRead = false;
  let listCalls = 0;
  let renderer;
  const result = {
    ...activeShare,
    snapshot: { identity: { fullName: "Owner" } },
  };

  globalThis.fetch = async (input, init = {}) => {
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
    if (url === "/api/share/share-race-1/revoke") return okResponse({});
    throw new Error(`Unexpected fetch: ${url}`);
  };

  try {
    await act(async () => {
      renderer = create(React.createElement(ShareClient));
    });
    await waitFor(() => mountBodyRead);

    const [fieldCheckbox] = checkboxInputs(renderer);
    await act(async () => {
      fieldCheckbox.props.onChange({});
    });
    await flush();

    const recipientInput = renderer.root
      .findAllByType("input")
      .find((input) => input.props.type !== "checkbox");
    await act(async () => {
      recipientInput.props.onChange({
        target: { value: "00000000-0000-4000-8000-00000000000b" },
      });
    });
    const disclosureCheckbox = checkboxInputs(renderer)[1];
    await act(async () => {
      disclosureCheckbox.props.onChange({ target: { checked: true } });
    });

    const generateButton = buttonsWithText(renderer, "share.generate").find((button) => !button.props.disabled);
    assert.ok(generateButton);
    await act(async () => {
      await generateButton.props.onClick();
    });
    await waitFor(() => listCalls === 2);
    await flush();
    assert.equal(buttonsWithText(renderer, "share.revoke").length, 2);

    await act(async () => {
      await buttonsWithText(renderer, "share.revoke")[0].props.onClick();
    });
    await waitFor(() => listCalls === 3);
    await flush();
    assert.equal(buttonsWithText(renderer, "share.revoke").length, 0);

    staleBody.resolve([activeShare]);
    await flush();
    assert.equal(buttonsWithText(renderer, "share.revoke").length, 0);
    assert.match(textOf(renderer.root), /share\.status\.revoked/);
  } finally {
    if (renderer) await act(async () => renderer.unmount());
    globalThis.fetch = originalFetch;
  }
});

test("failed revoke does not mark the share as revoked", async () => {
  const originalFetch = globalThis.fetch;
  let renderer;
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    if (url === "/api/share" && (!init.method || init.method === "GET")) {
      return okResponse([activeShare]);
    }
    if (url === "/api/share/share-race-1/revoke") return { json: async () => ({}), ok: false, status: 500 };
    throw new Error(`Unexpected fetch: ${url}`);
  };

  try {
    await act(async () => {
      renderer = create(React.createElement(ShareClient));
    });
    await flush();
    assert.equal(buttonsWithText(renderer, "share.revoke").length, 1);

    await act(async () => {
      await buttonsWithText(renderer, "share.revoke")[0].props.onClick();
    });
    assert.equal(buttonsWithText(renderer, "share.revoke").length, 1);
    assert.doesNotMatch(textOf(renderer.root), /share\.status\.revoked/);
  } finally {
    if (renderer) await act(async () => renderer.unmount());
    globalThis.fetch = originalFetch;
  }
});
