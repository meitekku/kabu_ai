import { query, type SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import path from 'path';
import fs from 'fs';

const PROJECT_ROOT = path.resolve(process.cwd());
const WORKSPACE_DIR = path.join(PROJECT_ROOT, 'workspace');

function ensureWorkspaceDir() {
  if (!fs.existsSync(WORKSPACE_DIR)) {
    fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
  }
}

const SYSTEM_PROMPT = `あなたは日本株のポートフォリオ組成エージェントです。
ユーザーの投資目標（金額・期間・リスク許容度）をヒアリングし、kabu_ai の MySQL データベースから
銘柄情報・株価・予測スコア・バリュエーション・業績データを取得して、5〜10銘柄に分散した
ポートフォリオ配分案を日本語で提案します。

## 提案フロー
1. ユーザーの目標（投資金額・運用期間・リスク許容度・希望セクター等）を確認する
2. DB から候補銘柄を抽出（バリュエーション良好・業績堅調・予測スコア上位・分散したセクター）
3. 各銘柄に対して以下を提示:
   - 銘柄コード／会社名／市場
   - 推奨投資比率（合計100%）
   - 想定購入株数・想定金額
   - 選定理由（バリュエーション・業績・予測根拠）
4. 最後に分散度・想定リスク・想定リターンの簡易サマリを付ける

## データベースクエリ
SELECT 専用クエリを実行できます:
\`\`\`bash
node scripts/agent-db-query.cjs "SELECT ..."
\`\`\`
※ SELECT/SHOW/DESCRIBE のみ。結果は JSON。LIMIT を必ず付けること（最大100件）。

## アクセス可能テーブル（抜粋）
- company（code, name, market）
- company_info（code, current_price, settlement_date）
- price（code, date, open, high, low, close, volume）
- material_summary（code, title, content, article_time）
- valuation_report（code, per, pbr, industry_avg_per, industry_avg_pbr, per_evaluation, pbr_evaluation, report_content, created_at）
- kabutan_annual_results / kabutan_quarterly_results（業績推移）
- ranking_up / ranking_low / ranking_trading_value / ranking_pts_up / ranking_pts_down

## 回答ルール
- 日本語で回答
- 銘柄コードは文字列比較（code = '7203'）
- 数値は DB ベースで根拠を示す（推測しない）
- 配分比率は合計100%
- 末尾に「投資判断は自己責任である」旨を簡潔に明記
- 全体は2500文字以内を目安に簡潔に

## 銘柄リンク表記（必須）
回答中に銘柄を出すときは必ず以下の Markdown リンク形式で書くこと。
これによりUI側で銘柄ページに遷移できる。

\`\`\`
[銘柄名(コード)](/stocks/コード/news)
\`\`\`

例:
- ✅ [トヨタ自動車(7203)](/stocks/7203/news)
- ✅ [ソニーグループ(6758)](/stocks/6758/news)
- ❌ トヨタ自動車（7203）  ← リンク形式でない
- ❌ 7203                  ← コードだけ

表中・本文中・リスト中、どこに出てきても必ずリンク形式にする。
同じ銘柄が複数回出てきても、毎回リンクにする。`;

export function createPortfolioStream(
  userMessage: string,
  sessionId?: string,
): AsyncIterable<SDKMessage> {
  ensureWorkspaceDir();

  // OAuth を上書きしないため API キーは必ず除外
  const cleanEnv = { ...process.env };
  delete cleanEnv.ANTHROPIC_API_KEY;

  const tools = ['Bash', 'Read', 'Grep', 'Glob'];

  return query({
    prompt: userMessage,
    options: {
      cwd: WORKSPACE_DIR,
      permissionMode: 'default',
      tools,
      allowedTools: tools,
      includePartialMessages: true,
      maxTurns: 15,
      settingSources: ['project'],
      env: cleanEnv,
      systemPrompt: {
        type: 'preset',
        preset: 'claude_code',
        append: SYSTEM_PROMPT,
      } as const,
      stderr: (data: string) => {
        console.error('[Portfolio Agent stderr]', data);
      },
      ...(sessionId ? { resume: sessionId } : {}),
    },
  });
}
