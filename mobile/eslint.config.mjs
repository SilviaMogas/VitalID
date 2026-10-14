import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  {
    ignores: ["node_modules/**", ".expo/**", "dist/**", "android/**", "ios/**"],
  },
  js.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}", "test/**/*.{js,mjs,ts,tsx}"],
    linterOptions: { reportUnusedDisableDirectives: false },
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: "latest", sourceType: "module" },
      globals: {
        AbortController: "readonly",
        Headers: "readonly",
        Response: "readonly",
        URL: "readonly",
        __DEV__: "readonly",
        clearInterval: "readonly",
        clearTimeout: "readonly",
        fetch: "readonly",
        process: "readonly",
        setInterval: "readonly",
        setTimeout: "readonly",
      },
    },
    plugins: { "@typescript-eslint": tseslint, "react-hooks": reactHooks },
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
      "no-console": "error",
      "react-hooks/exhaustive-deps": "off",
    }
  },
  {
    files: ["src/screens.tsx", "src/ui.tsx"],
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
];
