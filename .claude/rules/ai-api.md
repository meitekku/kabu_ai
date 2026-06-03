---
paths:
  - "app/api/**/*.ts"
  - "lib/**/*.ts"
  - "components/**/*.tsx"
---
# AI API ルール

## GLM-4 のみ使用（必須）

一般チャット・AI機能は **GLM-4 のみ**。Google/OpenAI/他のAI API は不可。

- テキスト: `glm-4-plus` / Vision: `glm-4v-flash`
- エンドポイント: `https://open.bigmodel.cn/api/paas/v4/chat/completions`
- 認証: `Authorization: Bearer ${GLM_API_KEY}`

## ANTHROPIC_API_KEY 禁止（必須）

- **`ANTHROPIC_API_KEY` は絶対に使用しない・`.env.local` に設定しない**
- Agent Chat は `@anthropic-ai/claude-agent-sdk` の `query()` + Claude Code CLI OAuth のみ
- `ANTHROPIC_API_KEY` が存在すると OAuth を上書きしてエラーになる
- 参考実装: `claude-code-chat/src/lib/claude.ts`

## LLM コストログ（必須）

TypeScript でLLM API呼び出しを実装する際:
- `stream_options: { include_usage: true }` を設定
- ストリーム完了後に `[GLM_USAGE]` をコンソールログ
