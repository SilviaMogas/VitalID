import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Module } from "node:module";
import path from "node:path";
import { setImmediate } from "node:timers";
import test from "node:test";
import ts from "typescript";

class ApiError extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

function createApi() {
  let savedRefreshToken = null;
  let signInCalls = 0;
  let restoreCalls = 0;
  let accountCalls = 0;
  const refreshTokensUsed = [];
  const account = {
    user: { id: "member-1", email: "member@example.test" },
    onboardingCompleted: true,
    plan: "free",
    consent: { healthCurrent: true, termsCurrent: true, privacyCurrent: true },
    versions: { health_data: "1", privacy_policy: "1", terms_of_service: "1" },
    durations: [60],
  };
  const api = {
    signIn: async () => {
      signInCalls++;
      savedRefreshToken = "saved-refresh-token";
    },
    restore: async () => {
      restoreCalls++;
      if (!savedRefreshToken) return false;
      refreshTokensUsed.push(savedRefreshToken);
      savedRefreshToken = "rotated-refresh-token";
      return true;
    },
    request: async (endpoint) => {
      assert.equal(endpoint, "account");
      accountCalls++;
      if (accountCalls === 1) throw new ApiError(503, "unavailable");
      return account;
    },
    signOut: async () => {
      savedRefreshToken = null;
    },
  };
  return {
    api,
    calls: () => ({ signInCalls, restoreCalls, accountCalls, refreshTokensUsed }),
  };
}

function createHookHarness() {
  const hooks = [];
  let cursor = 0;
  let effects = [];

  function sameDependencies(left, right) {
    return left?.length === right?.length && left?.every((item, index) => Object.is(item, right[index]));
  }

  const react = {
    createElement: (type, props, ...children) => ({
      type,
      props: {
        ...(props ?? {}),
        ...(children.length ? { children: children.length === 1 ? children[0] : children } : {}),
      },
    }),
    useState(initialValue) {
      const index = cursor++;
      if (!hooks[index]) hooks[index] = { kind: "state", value: initialValue };
      const hook = hooks[index];
      return [hook.value, (next) => {
        hook.value = typeof next === "function" ? next(hook.value) : next;
      }];
    },
    useCallback(callback, dependencies) {
      const index = cursor++;
      const previous = hooks[index];
      if (previous && sameDependencies(previous.dependencies, dependencies)) return previous.value;
      hooks[index] = { kind: "callback", dependencies, value: callback };
      return callback;
    },
    useEffect(effect, dependencies) {
      const index = cursor++;
      const previous = hooks[index];
      if (!previous || !sameDependencies(previous.dependencies, dependencies)) {
        hooks[index] = { kind: "effect", dependencies };
        effects.push(effect);
      }
    },
  };

  return {
    react,
    render(component, props) {
      cursor = 0;
      effects = [];
      const tree = component(props);
      const scheduled = effects;
      for (const effect of scheduled) effect();
      return tree;
    },
  };
}

function findElements(node, type, found = []) {
  if (Array.isArray(node)) {
    for (const child of node) findElements(child, type, found);
  } else if (node && typeof node === "object") {
    if (node.type === type) found.push(node);
    findElements(node.props?.children, type, found);
  }
  return found;
}

function loadShell(api) {
  const harness = createHookHarness();
  const placeholder = (name) => function Placeholder() { return name; };
  const Button = placeholder("Button");
  const Notice = placeholder("Notice");
  const SignIn = ({ onSignedIn }) => harness.react.createElement("SignInForm", {
    onSubmit: async () => {
      await api.signIn("member@example.test", "synthetic-password");
      await onSignedIn();
    },
  });
  const screens = {
    AccessScreen: placeholder("AccessScreen"),
    Consent: placeholder("Consent"),
    currentConsent: () => true,
    IdentityScreen: placeholder("IdentityScreen"),
    ShareScreen: placeholder("ShareScreen"),
    SignIn,
  };
  const ui = {
    Button,
    colors: { canvas: "#fff", teal: "#198B85", border: "#ddd", white: "#fff", soft: "#eee", muted: "#666", navy: "#123" },
    errorLabel: () => "connectionError",
    FailureContext: { Provider: placeholder("FailureProvider") },
    JobState: placeholder("JobState"),
    LocaleContext: { Provider: placeholder("LocaleProvider") },
    Notice,
    Page: placeholder("Page"),
    Row: placeholder("Row"),
    s: { title: {} },
    T: placeholder("Text"),
    useCopy: () => ({ t: (key) => key }),
  };
  const reactNative = {
    AppState: {
      currentState: "active",
      addEventListener: () => ({ remove() {} }),
    },
    KeyboardAvoidingView: "KeyboardAvoidingView",
    Platform: { OS: "ios" },
    Pressable: "Pressable",
    StyleSheet: { create: (styles) => styles },
    View: "View",
  };
  const mocks = {
    react: harness.react,
    "react-native": reactNative,
    "react-native-safe-area-context": { SafeAreaProvider: "SafeAreaProvider", SafeAreaView: "SafeAreaView" },
    "expo-status-bar": { StatusBar: "StatusBar" },
    "expo-localization": { getLocales: () => [{ languageCode: "en" }] },
    "./src/api": { api, ApiError },
    "./src/screens": screens,
    "./src/ui": ui,
  };
  const filename = path.resolve("App.tsx");
  const source = readFileSync(filename, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.React,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });
  const appModule = new Module(filename);
  appModule.filename = filename;
  appModule.require = (specifier) => {
    if (Object.hasOwn(mocks, specifier)) return mocks[specifier];
    throw new Error(`Unexpected App.tsx dependency: ${specifier}`);
  };
  appModule._compile(outputText, filename);
  return { Shell: appModule.exports.Shell, harness, screens, ui };
}

function settleMicrotasks() {
  return new Promise((resolve) => setImmediate(resolve));
}

test("account lookup 503 after sign-in recovers through retry and saved refresh", async () => {
  const fake = createApi();
  const { Shell, harness, screens, ui } = loadShell(fake.api);
  const props = { locale: "en", setLocale() {} };

  harness.render(Shell, props);
  await settleMicrotasks();
  let tree = harness.render(Shell, props);
  let signInElement = findElements(tree, screens.SignIn)[0];
  assert.ok(signInElement, "sign-in screen is shown before authentication");

  const signInForm = signInElement.type(signInElement.props);
  await signInForm.props.onSubmit();
  tree = harness.render(Shell, props);

  assert.ok(findElements(tree, ui.Notice).some((element) => element.props.error));
  const buttons = findElements(tree, ui.Button);
  const retry = buttons.find((button) => button.props.label === "retry");
  assert.ok(retry, "retry action is shown after account lookup fails");
  assert.ok(buttons.some((button) => button.props.label === "forget"), "forget-session action remains available");

  retry.props.onPress();
  await settleMicrotasks();
  tree = harness.render(Shell, props);

  assert.ok(findElements(tree, screens.ShareScreen).length > 0, "the restored account returns to the signed-in shell");
  assert.equal(findElements(tree, screens.SignIn).length, 0);
  assert.deepEqual(fake.calls(), {
    signInCalls: 1,
    restoreCalls: 2,
    accountCalls: 2,
    refreshTokensUsed: ["saved-refresh-token"],
  });
});
