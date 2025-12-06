import js from "@eslint/js";
import tseslint from "typescript-eslint";
import nextPlugin from "@next/eslint-plugin-next";

export default [
  {
    ignores: [".next/**", "node_modules/**", "*.config.js", "*.config.mjs", "lib/Twitter/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    plugins: {
      "@next/next": nextPlugin,
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        React: "readonly",
        JSX: "readonly",
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        fetch: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        FormData: "readonly",
        Blob: "readonly",
        File: "readonly",
        Response: "readonly",
        Request: "readonly",
        Headers: "readonly",
        AbortController: "readonly",
        TextEncoder: "readonly",
        TextDecoder: "readonly",
        crypto: "readonly",
        atob: "readonly",
        btoa: "readonly",
        Uint8Array: "readonly",
        ArrayBuffer: "readonly",
      },
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-require-imports": "off",
      "no-unused-vars": "off",
      "no-undef": "off",
      "no-empty": "warn",
      "no-useless-catch": "warn",
    },
  },
];
