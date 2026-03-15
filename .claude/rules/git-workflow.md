---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
---
# Git ワークフロー（必須）

コード変更後は必ず以下の順序:

1. `npm run lint -- --max-warnings=0`（ゼロ警告必須）
2. `npx tsc --noEmit --skipLibCheck`（型チェック）
3. `git add` → `git commit`
4. **必ず `git push` まで実行すること**

```bash
./scripts/ci-repair-loop.sh  # push→CI監視→失敗時exit 2
# ログ: /tmp/ci-failure-kabu_ai.log
```
