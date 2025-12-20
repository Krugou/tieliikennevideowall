import js from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import jsxA11yPlugin from "eslint-plugin-jsx-a11y";
import importPlugin from "eslint-plugin-import";
import prettierConfig from "eslint-config-prettier";

export default [
  js.configs.recommended,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        console: "readonly",
        process: "readonly",
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        fetch: "readonly",
        Image: "readonly",
        HTMLImageElement: "readonly",
        HTMLDivElement: "readonly",
        HTMLInputElement: "readonly",
        Event: "readonly",
        KeyboardEvent: "readonly",
        localStorage: "readonly",
        URL: "readonly",
        AbortController: "readonly",
        AbortSignal: "readonly",
        DOMException: "readonly",
        Response: "readonly",
        RequestInit: "readonly",
        ServiceWorkerRegistration: "readonly",
        __filename: "readonly",
        __dirname: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
      "jsx-a11y": jsxA11yPlugin,
      import: importPlugin,
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      ...jsxA11yPlugin.configs.recommended.rules,
      ...importPlugin.configs.recommended.rules,
      ...prettierConfig.rules,
      "no-console": "off",
      "prefer-const": "warn",
      "import/no-unresolved": "off",
      "react/react-in-jsx-scope": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "jsx-a11y/no-noninteractive-element-interactions": "off",
      "func-style": ["error", "expression", { allowArrowFunctions: true }],
      "react-hooks/set-state-in-effect": "off", // Allow conditional setState in effects
      "import/no-named-as-default-member": "off",
    },
  },
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      ".tsupgrader/**",
      "coverage/**",
      "scripts/**",
    ],
  },
];
