---
paths:
  - "__tests__/**"
  - "**/*.test.ts"
  - "**/*.spec.ts"
---
# テスト規約

## テスト構成

- `__tests__/unit/` — Vitest ユニットテスト
- `__tests__/integration/` — Vitest 結合テスト
- `__tests__/e2e/` — Playwright E2Eテスト

## 実行コマンド

```bash
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:all
```

設定: `vitest.config.ts` / `playwright.config.ts`（chromium、localhost:3000、180秒タイムアウト）
