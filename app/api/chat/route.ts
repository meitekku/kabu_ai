import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { Database } from '@/lib/database/Mysql';
import { auth } from '@/lib/auth/auth';
import { headers } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';

export const maxDuration = 30;

// 非プレミアムユーザーの1日あたりの利用上限
const FREE_USAGE_LIMIT = 3;
const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-5-mini';

type ChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

interface ChatRequestBody {
  messages?: unknown;
  chatId?: unknown;
  stockCode?: unknown;
}

interface CompanyRow {
  code: string;
  name: string;
  settlement_date: string | Date | null;
}

interface PriceRow {
  date: string | Date;
  close: number | string | null;
  volume: number | string | null;
}

interface NewsRow {
  title: string;
  created_at: string | Date;
}

interface AnnualResultRow {
  period: string;
  revenue: number | null;
  operating_profit: number | null;
  net_income: number | null;
  eps: number | null;
}

interface QuarterlyResultRow {
  period: string;
  revenue: number | null;
  operating_profit: number | null;
  net_income: number | null;
}

interface StockContext {
  code: string;
  companyName: string;
  settlementDate: string | null;
  latestPriceText: string;
  annualResults: AnnualResultRow[];
  quarterlyResults: QuarterlyResultRow[];
  news: NewsRow[];
}

function normalizeMessages(input: unknown): ChatMessage[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const messages: ChatMessage[] = [];
  for (const rawMessage of input) {
    if (!rawMessage || typeof rawMessage !== 'object') {
      continue;
    }

    const candidate = rawMessage as { role?: unknown; content?: unknown };
    if (
      candidate.role !== 'user' &&
      candidate.role !== 'assistant' &&
      candidate.role !== 'system'
    ) {
      continue;
    }

    const content =
      typeof candidate.content === 'string'
        ? candidate.content
        : candidate.content != null
          ? JSON.stringify(candidate.content)
          : '';

    const trimmed = content.trim();
    if (!trimmed) {
      continue;
    }

    messages.push({
      role: candidate.role,
      content: trimmed,
    });
  }

  return messages;
}

function normalizeChatId(input: unknown): string | null {
  if (typeof input !== 'string') {
    return null;
  }
  const trimmed = input.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeStockCode(input: unknown): string | null {
  if (typeof input !== 'string') {
    return null;
  }
  const normalized = input.trim().toUpperCase();
  if (!normalized) {
    return null;
  }
  if (!/^[A-Z0-9.-]{1,10}$/.test(normalized)) {
    return null;
  }
  return normalized;
}

function detectStockCodeFromQuestion(question: string): string | null {
  const normalizedQuestion = question.trim();
  if (!normalizedQuestion) {
    return null;
  }

  const labeledMatch = normalizedQuestion.match(
    /(?:銘柄コード|ティッカー|ticker|code)\s*[:：]?\s*([A-Za-z0-9.-]{1,10})/i
  );
  if (labeledMatch?.[1]) {
    return normalizeStockCode(labeledMatch[1]);
  }

  const jpCodeMatch = normalizedQuestion.match(/(?:^|[^0-9])(\d{4})(?!\d)/);
  if (jpCodeMatch?.[1]) {
    return jpCodeMatch[1];
  }

  const usTickerMatch = normalizedQuestion.match(/\$([A-Za-z][A-Za-z0-9.-]{0,9})\b/);
  if (usTickerMatch?.[1]) {
    return normalizeStockCode(usTickerMatch[1]);
  }

  return null;
}

function formatDate(value: string | Date | null | undefined): string {
  if (!value) {
    return '不明';
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) {
    return '不明';
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function toNumber(value: number | string | null | undefined): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function formatNumeric(value: number | null): string {
  if (value === null) {
    return '不明';
  }
  return value.toLocaleString('ja-JP');
}

function formatAnnualResult(result: AnnualResultRow): string {
  return `${result.period}: 売上 ${formatNumeric(result.revenue)} / 営業利益 ${formatNumeric(result.operating_profit)} / 純利益 ${formatNumeric(result.net_income)} / EPS ${formatNumeric(result.eps)}`;
}

function formatQuarterlyResult(result: QuarterlyResultRow): string {
  return `${result.period}: 売上 ${formatNumeric(result.revenue)} / 営業利益 ${formatNumeric(result.operating_profit)} / 純利益 ${formatNumeric(result.net_income)}`;
}

function buildStockContextText(context: StockContext): string {
  const annualText =
    context.annualResults.length > 0
      ? context.annualResults.map((row) => `- ${formatAnnualResult(row)}`).join('\n')
      : '- 取得できませんでした';

  const quarterlyText =
    context.quarterlyResults.length > 0
      ? context.quarterlyResults.map((row) => `- ${formatQuarterlyResult(row)}`).join('\n')
      : '- 取得できませんでした';

  const newsText =
    context.news.length > 0
      ? context.news
          .map((news) => `- [${formatDateTime(news.created_at)}] ${news.title}`)
          .join('\n')
      : '- 直近ニュースは見つかりませんでした';

  return `### 事前取得データ（${context.companyName} / ${context.code}）
- 直近株価: ${context.latestPriceText}
- 直近決算予定日: ${context.settlementDate ?? '不明'}

#### 年次決算（新しい順）
${annualText}

#### 四半期決算（新しい順）
${quarterlyText}

#### 直近ニュース（新しい順）
${newsText}`;
}

async function fetchStockContext(db: Database, stockCode: string): Promise<StockContext | null> {
  const [companyRows, priceRows, newsRows, annualRows, quarterlyRows] = await Promise.all([
    db.select<CompanyRow>(
      `SELECT c.code, c.name, ci.settlement_date
       FROM company c
       LEFT JOIN company_info ci ON c.code = ci.code
       WHERE c.code = ?
       LIMIT 1`,
      [stockCode]
    ),
    db.select<PriceRow>(
      `SELECT date, close, volume
       FROM price
       WHERE code = ?
       ORDER BY date DESC
       LIMIT 2`,
      [stockCode]
    ),
    db.select<NewsRow>(
      `SELECT p.title, p.created_at
       FROM post p
       JOIN post_code pc ON p.id = pc.post_id
       WHERE pc.code = ?
       AND p.accept = 1
       ORDER BY p.created_at DESC
       LIMIT 5`,
      [stockCode]
    ),
    db.select<AnnualResultRow>(
      `SELECT period, revenue, operating_profit, net_income, eps
       FROM kabutan_annual_results
       WHERE stock_code = ?
       ORDER BY period DESC
       LIMIT 3`,
      [stockCode]
    ).catch(() => [] as AnnualResultRow[]),
    db.select<QuarterlyResultRow>(
      `SELECT period, revenue, operating_profit, net_income
       FROM kabutan_quarterly_results
       WHERE stock_code = ?
       ORDER BY period DESC
       LIMIT 4`,
      [stockCode]
    ).catch(() => [] as QuarterlyResultRow[]),
  ]);

  if (companyRows.length === 0) {
    return null;
  }

  const latestPrice = priceRows[0];
  const previousPrice = priceRows[1];
  let latestPriceText = '価格データなし';
  if (latestPrice) {
    const latestClose = toNumber(latestPrice.close);
    const previousClose = toNumber(previousPrice?.close);
    const latestVolume = toNumber(latestPrice.volume);
    const priceDate = formatDate(latestPrice.date);

    if (latestClose !== null) {
      if (previousClose !== null && previousClose !== 0) {
        const diff = latestClose - previousClose;
        const diffPercent = (diff / previousClose) * 100;
        latestPriceText = `${priceDate} 終値 ${latestClose.toLocaleString('ja-JP')}円（前日比 ${diff >= 0 ? '+' : ''}${diff.toLocaleString('ja-JP', { maximumFractionDigits: 2 })}円 / ${diffPercent >= 0 ? '+' : ''}${diffPercent.toFixed(2)}%）, 出来高 ${latestVolume?.toLocaleString('ja-JP') ?? '不明'}`;
      } else {
        latestPriceText = `${priceDate} 終値 ${latestClose.toLocaleString('ja-JP')}円, 出来高 ${latestVolume?.toLocaleString('ja-JP') ?? '不明'}`;
      }
    }
  }

  return {
    code: companyRows[0].code,
    companyName: companyRows[0].name || stockCode,
    settlementDate: companyRows[0].settlement_date
      ? formatDate(companyRows[0].settlement_date)
      : null,
    latestPriceText,
    annualResults: annualRows,
    quarterlyResults: quarterlyRows,
    news: newsRows,
  };
}

// クライアントIPアドレスを取得
function getClientIp(headersList: Headers): string {
  // Vercel/Cloudflare等のプロキシ経由の場合
  const forwardedFor = headersList.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  // Cloudflare
  const cfConnectingIp = headersList.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp;
  }
  // 直接接続の場合
  const realIp = headersList.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  return 'unknown';
}

export async function POST(req: Request) {
  try {
    const headersList = await headers();
    const body = (await req.json()) as ChatRequestBody;
    const messages = normalizeMessages(body.messages);
    const chatId = normalizeChatId(body.chatId);

    if (messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'メッセージが空です' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI設定エラー（OPENAI_API_KEY未設定）です。管理者にお問い合わせください。' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 認証チェック
    const session = await auth.api.getSession({ headers: headersList });
    const userId = session?.user?.id || null;
    const clientIp = getClientIp(headersList);

    const db = Database.getInstance();

    // プレミアム会員かどうかをチェック
    let isPremium = false;
    if (userId) {
      const users = await db.select<{ subscription_status: string }>(
        'SELECT subscription_status FROM user WHERE id = ?',
        [userId]
      );
      isPremium = users[0]?.subscription_status === 'active';
    }

    // 非プレミアムの場合、利用制限をチェック
    if (!isPremium) {
      const usageResult = await db.select<{ count: number }>(
        `SELECT COUNT(*) as count FROM chat_usage_log
         WHERE ip_address = ?
         AND is_premium = FALSE
         AND DATE(created_at) = CURDATE()`,
        [clientIp]
      );
      const todayUsage = usageResult[0]?.count || 0;

      if (todayUsage >= FREE_USAGE_LIMIT) {
        return new Response(
          JSON.stringify({
            error: '本日の無料利用回数（3回）を超えました。プレミアム会員になると無制限でご利用いただけます。',
            limitReached: true,
            usage: todayUsage,
            limit: FREE_USAGE_LIMIT,
          }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // 新規チャットの場合、チャットセッションを作成
    let currentChatId = chatId;
    if (!currentChatId) {
      currentChatId = uuidv4();
      const firstMessage = messages[0]?.content || 'New Chat';
      const title = firstMessage.substring(0, 100);

      await db.insert(
        'INSERT INTO chatbot_chat (id, userId, title, createdAt) VALUES (?, ?, ?, NOW())',
        [currentChatId, userId || 'anonymous', title]
      );
    }

    // ユーザーメッセージを取得
    const lastUserMessage = messages[messages.length - 1];
    const questionContent = lastUserMessage && lastUserMessage.role === 'user'
      ? lastUserMessage.content
      : '';

    // ユーザーメッセージを保存
    if (lastUserMessage && lastUserMessage.role === 'user') {
      await db.insert(
        'INSERT INTO chatbot_message (id, chatId, role, content, createdAt) VALUES (?, ?, ?, ?, NOW())',
        [uuidv4(), currentChatId, 'user', questionContent]
      );
    }

    // チャット利用ログを記録
    await db.insert(
      `INSERT INTO chat_usage_log (id, ip_address, user_id, chat_id, question, is_premium, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [uuidv4(), clientIp, userId, currentChatId, questionContent, isPremium]
    );

    const requestedStockCode = normalizeStockCode(body.stockCode);
    const detectedStockCode = questionContent ? detectStockCodeFromQuestion(questionContent) : null;
    const stockCode = requestedStockCode || detectedStockCode;

    const stockContext = stockCode
      ? await fetchStockContext(db, stockCode).catch((error) => {
          console.error(`Failed to fetch stock context (${stockCode}):`, error);
          return null;
        })
      : null;

    const stockContextText = stockContext ? buildStockContextText(stockContext) : '';
    const systemPrompt = `あなたは株式投資の専門家AIアシスタントです。
ユーザーの株式投資に関する質問に丁寧に回答してください。
日本語で回答し、専門用語は分かりやすく説明してください。
推測で数値を作らず、与えられたデータに基づいて回答してください。
投資は自己責任であることを適切なタイミングで伝えてください。
${stockContextText ? `\n以下の銘柄事前データを必ず参照して回答してください。\n${stockContextText}` : '\n銘柄データが不足している場合は、その旨を明示してください。'}
`;

    // AIからの返答をストリーミング
    const result = streamText({
      model: openai(CHAT_MODEL),
      system: systemPrompt,
      messages,
      onFinish: async ({ text }) => {
        // AIの返答を保存
        try {
          await db.insert(
            'INSERT INTO chatbot_message (id, chatId, role, content, createdAt) VALUES (?, ?, ?, ?, NOW())',
            [uuidv4(), currentChatId, 'assistant', text]
          );
        } catch (saveError) {
          console.error('Failed to save assistant message:', saveError);
        }
      },
    });

    const response = result.toTextStreamResponse();
    response.headers.set('X-Chat-Id', currentChatId);
    if (stockContext) {
      response.headers.set('X-Stock-Code', stockContext.code);
    }
    return response;
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({ error: 'チャットの処理中にエラーが発生しました' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
