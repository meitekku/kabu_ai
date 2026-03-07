import { query, type SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import path from 'path';
import fs from 'fs';
import { CarouselSlide } from './carousel';

const PROJECT_ROOT = path.resolve(process.cwd());
const WORKSPACE_DIR = path.join(PROJECT_ROOT, 'workspace');

function ensureWorkspaceDir() {
  if (!fs.existsSync(WORKSPACE_DIR)) {
    fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
  }
}

const SYSTEM_PROMPT = `あなたは株式市場のAIアナリストです。
現在のDBデータを分析して、トップページのMVカルーセル用コンテンツを3枚分生成します。

## タスク
以下のDBクエリで最新データを取得し、3枚のスライドコンテンツを生成してください。

### データ取得クエリ
\`\`\`bash
# 最新AI記事
node scripts/agent-db-query.cjs "SELECT p.id, p.title, p.content, p.created_at, pc.code, c.name AS company_name, ci.diff_percent FROM post p LEFT JOIN post_code pc ON p.id = pc.post_id LEFT JOIN company c ON pc.code = c.code LEFT JOIN company_info ci ON pc.code = ci.code WHERE p.accept = 1 AND p.site = 70 ORDER BY p.created_at DESC LIMIT 20"

# 値上がりランキング上位3
node scripts/agent-db-query.cjs "SELECT r.code, c.name, ci.diff_percent, ci.current_price FROM ranking_up r JOIN company c ON r.code = c.code LEFT JOIN company_info ci ON r.code = ci.code LIMIT 3"

# 売買代金上位3
node scripts/agent-db-query.cjs "SELECT r.code, c.name, ci.diff_percent FROM ranking_trading_value r JOIN company c ON r.code = c.code LEFT JOIN company_info ci ON r.code = ci.code LIMIT 3"
\`\`\`

## 出力形式（必ずこの形式で終了すること）
以下のJSON形式のみで回答を締めくくること:
\`\`\`json
{
  "slides": [
    {
      "slot": 1,
      "title": "キャッチーな見出し（30文字以内）",
      "subtitle": "サブテキスト（50文字以内）",
      "badge_label": "相場分析",
      "theme": "bull",
      "link_url": "/stocks/7203/news/12345",
      "stock_code": "7203"
    },
    { "slot": 2, ... },
    { "slot": 3, ... }
  ]
}
\`\`\`

## スライド構成ルール
- slot 1: マーケット全体の動向（値上がり/値下がりトレンド）→ theme: bull/bear/neutral
- slot 2: 最も注目度の高い銘柄ニュース → theme: bull/bear/flash
- slot 3: もう一つの注目銘柄または市場分析 → theme: neutral/bull/bear
- badge_label は「相場分析」「注目銘柄」「速報」「前場動向」「後場動向」から選択
- link_url は実在する記事URL（/stocks/{code}/news/{post_id}）を使うこと
- stock_code は関連銘柄があれば4桁コード文字列、なければJSONのnull`;

export async function generateCarouselReport(
  reportType: 'midday' | 'closing'
): Promise<CarouselSlide[]> {
  ensureWorkspaceDir();

  const cleanEnv = { ...process.env };
  delete cleanEnv.ANTHROPIC_API_KEY;

  const prompt = `${reportType === 'midday' ? '前場（11:30）' : '後場（15:30）'}のマーケットデータを分析して、カルーセルスライドを3枚生成してください。`;

  const messages: SDKMessage[] = [];
  const tools = ['Bash', 'Read', 'Grep', 'Glob'];

  const q = query({
    prompt,
    options: {
      cwd: WORKSPACE_DIR,
      permissionMode: 'default',
      model: 'claude-sonnet-4-6',
      tools,
      allowedTools: tools,
      maxTurns: 10,
      settingSources: ['project'],
      env: cleanEnv,
      systemPrompt: {
        type: 'preset',
        preset: 'claude_code',
        append: SYSTEM_PROMPT,
      } as const,
      stderr: (data: string) => {
        console.error('[Carousel Agent stderr]', data);
      },
    },
  });

  for await (const msg of q) {
    messages.push(msg);
  }

  const assistantMessages = messages.filter(
    (m) => m.type === 'assistant' && m.message
  );

  if (assistantMessages.length === 0) {
    throw new Error('カルーセルの生成に失敗しました');
  }

  const lastMsg = assistantMessages[assistantMessages.length - 1];
  let text = '';
  if (lastMsg.type === 'assistant' && lastMsg.message) {
    const content = lastMsg.message.content;
    if (typeof content === 'string') {
      text = content;
    } else if (Array.isArray(content)) {
      text = content
        .filter((block) => block.type === 'text')
        .map((block) => ('text' in block ? block.text : ''))
        .join('\n');
    }
  }

  const match = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (!match) {
    throw new Error('カルーセルの生成に失敗しました');
  }

  const parsed = JSON.parse(match[1]);
  const slides: CarouselSlide[] = parsed.slides;

  if (!slides || slides.length === 0) {
    throw new Error('カルーセルの生成に失敗しました');
  }

  const generatedAt = new Date().toISOString();
  return slides.map((s) => ({
    ...s,
    report_type: reportType,
    generated_at: generatedAt,
  })) as CarouselSlide[];
}
