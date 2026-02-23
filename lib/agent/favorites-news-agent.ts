import { query, type SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import path from 'path';

const PROJECT_ROOT = path.resolve(process.cwd());

const SYSTEM_PROMPT = `あなたは株式投資の専門家AIアシスタントです。
ユーザーのお気に入り銘柄について、最新のデータに基づいたパーソナルニュースレポートを生成します。

## レポート生成ルール
- 日本語で回答する
- 各銘柄について、株価動向・ニュース・材料を簡潔にまとめる
- 重要度の高い銘柄（importance値が高い）を優先的に詳しく分析する
- データに基づいて回答し、推測で数値を作らない
- 投資判断は自己責任であることを末尾に簡潔に記載する
- 銘柄コードで検索する際は文字列型で比較する（例: code = '7203'）
- 日付ソートはDESC（新しい順）をデフォルトにする
- レポート全体は2000文字以内に収める

## データベースクエリ
以下のコマンドでMySQLデータベースにSELECTクエリを実行できます:
\`\`\`bash
node scripts/agent-db-query.cjs "SELECT ..."
\`\`\`
※ SELECT/SHOW/DESCRIBE のみ実行可能
※ 結果はJSON形式で返されます

## 利用可能なテーブル
- price: 株価データ (code, date, open, high, low, close, volume)
- material_summary: ニュース要約 (code, title, content, article_time)
- company_info: 企業情報 (code, current_price, diff_percent, settlement_date)
- ranking_up / ranking_low: 値上がり・値下がりランキング

## ウェブ検索
Bashツールで curl を使って最新ニュースを検索できます。`;

export async function generateFavoritesReport(
  prompt: string
): Promise<string> {
  const messages: SDKMessage[] = [];

  const q = query({
    prompt,
    options: {
      cwd: PROJECT_ROOT,
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      tools: ['Bash', 'Read', 'Grep', 'Glob'],
      maxTurns: 10,
      systemPrompt: {
        type: 'preset',
        preset: 'claude_code',
        append: SYSTEM_PROMPT,
      } as const,
    },
  });

  for await (const msg of q) {
    messages.push(msg);
  }

  // 最後のassistantメッセージからテキストを抽出
  const assistantMessages = messages.filter(
    (m) => m.type === 'assistant' && m.message
  );

  if (assistantMessages.length === 0) {
    throw new Error('No response from agent');
  }

  const lastMsg = assistantMessages[assistantMessages.length - 1];
  if (lastMsg.type === 'assistant' && lastMsg.message) {
    const content = lastMsg.message.content;
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      return content
        .filter((block) => block.type === 'text')
        .map((block) => ('text' in block ? block.text : ''))
        .join('\n');
    }
  }

  throw new Error('Failed to extract report text');
}
