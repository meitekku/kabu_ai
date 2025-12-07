import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { Database } from '@/lib/database/Mysql';
import { auth } from '@/lib/auth/auth';
import { headers } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';

export const maxDuration = 30;

// 非プレミアムユーザーの1日あたりの利用上限
const FREE_USAGE_LIMIT = 3;

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
    const { messages, chatId } = await req.json();
    const headersList = await headers();

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
      const title = typeof firstMessage === 'string'
        ? firstMessage.substring(0, 100)
        : 'New Chat';

      await db.insert(
        'INSERT INTO chatbot_chat (id, userId, title, createdAt) VALUES (?, ?, ?, NOW())',
        [currentChatId, userId || 'anonymous', title]
      );
    }

    // ユーザーメッセージを取得
    const lastUserMessage = messages[messages.length - 1];
    const questionContent = lastUserMessage && lastUserMessage.role === 'user'
      ? (typeof lastUserMessage.content === 'string'
          ? lastUserMessage.content
          : JSON.stringify(lastUserMessage.content))
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

    // AIからの返答をストリーミング
    const result = streamText({
      model: openai('gpt-5-mini'),
      system: `あなたは株式投資の専門家AIアシスタントです。
ユーザーの株式投資に関する質問に丁寧に回答してください。
日本語で回答し、専門用語は分かりやすく説明してください。
投資は自己責任であることを適切なタイミングで伝えてください。`,
      messages,
      onFinish: async ({ text }) => {
        // AIの返答を保存
        await db.insert(
          'INSERT INTO chatbot_message (id, chatId, role, content, createdAt) VALUES (?, ?, ?, ?, NOW())',
          [uuidv4(), currentChatId, 'assistant', text]
        );
      },
    });

    const response = result.toTextStreamResponse();
    response.headers.set('X-Chat-Id', currentChatId);
    return response;
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({ error: 'チャットの処理中にエラーが発生しました' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
