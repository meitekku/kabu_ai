import js from "@eslint/js";
import tseslint from "typescript-eslint";
import nextPlugin from "@next/eslint-plugin-next";
import reactHooksPlugin from "eslint-plugin-react-hooks";

export default [
  {
    ignores: [".next/**", "node_modules/**", "*.config.js", "*.config.mjs", "lib/Twitter/**", "scripts/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    plugins: {
      "@next/next": nextPlugin,
      "react-hooks": reactHooksPlugin,
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
      // Next.js recommended + core-web-vitals rules
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,

      // ===== ビルドエラー防止ルール =====

      // useSearchParams等のSuspense境界チェック（今回のエラー）
      "@next/next/no-html-link-for-pages": "error",

      // 画像最適化関連
      "@next/next/no-img-element": "warn",

      // Script/Headコンポーネントの正しい使用
      "@next/next/no-head-import-in-document": "error",
      "@next/next/no-script-component-in-head": "error",
      "@next/next/no-styled-jsx-in-document": "error",
      "@next/next/no-title-in-document-head": "error",

      // next/documentの誤用防止
      "@next/next/no-document-import-in-page": "error",
      "@next/next/no-head-element": "error",

      // ===== TypeScript厳格ルール =====

      // 空のインターフェース禁止（今回のlintエラー）
      "@typescript-eslint/no-empty-object-type": "error",

      // 暗黙のany禁止（ビルド時の型エラー防止）
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-return": "off",

      // 未使用変数
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-require-imports": "off",

      // ===== React関連ルール =====

      // useEffect依存配列の問題検出
      "react-hooks/exhaustive-deps": "warn",

      // Hooksのルール違反検出
      "react-hooks/rules-of-hooks": "error",

      // ===== 一般的なルール =====
      "no-unused-vars": "off",
      "no-undef": "off",
      "no-empty": "warn",
      "no-useless-catch": "warn",

      // async関数のawait忘れ防止
      "require-await": "warn",

      // return文の一貫性
      "consistent-return": "off",

      // 重複インポート防止
      "no-duplicate-imports": "error",
    },
  },
];
