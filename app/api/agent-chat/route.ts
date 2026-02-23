import { Database } from '@/lib/database/Mysql';
import { auth } from '@/lib/auth/auth';
import { headers } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import { runOrchestrator } from '@/lib/agent/orchestrator';
import { isAuthAvailable } from '@/lib/agent/claude-auth';

export const maxDuration = 120;

const MAX_QUESTIONS = 20;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AgentChatRequestBody {
  messages?: unknown;
  chatId?: unknown;
}

function normalizeMessages(input: unknown): ChatMessage[] {
  if (!Array.isArray(input)) return [];

  const messages: ChatMessage[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') continue;
    const candidate = raw as { role?: unknown; content?: unknown };
    if (candidate.role !== 'user' && candidate.role !== 'assistant') continue;
    const content = typeof candidate.content === 'string' ? candidate.content.trim() : '';
    if (!content) continue;
    messages.push({ role: candidate.role, content });
  }
  return messages;
}

function normalizeChatId(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function POST(req: Request) {
  try {
    const headersList = await headers();

    const session = await auth.api.getSession({ headers: headersList });
    if (!session?.user?.id) {
      return new Response(
        JSON.stringify({ error: 'ログインが必要です' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const body = (await req.json()) as AgentChatRequestBody;
    const messages = normalizeMessages(body.messages);

    if (messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'メッセージが空です' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    if (!(await isAuthAvailable())) {
      return new Response(
        JSON.stringify({ error: 'Claude認証が未設定です（ANTHROPIC_API_KEY または Claude Code認証が必要）' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const db = Database.getInstance();
    const userId = session.user.id;

    // チャットセッション管理
    let currentChatId = normalizeChatId(body.chatId);
    if (!currentChatId) {
      currentChatId = uuidv4();
      const firstMessage = messages[0]?.content || 'Agent Chat';
      const title = firstMessage.substring(0, 100);
      await db.insert(
        'INSERT INTO agent_chat (id, userId, title, createdAt) VALUES (?, ?, ?, NOW())',
        [currentChatId, userId, title],
      );
    }

    const [countResult] = await db.select<{ cnt: number }>(
      'SELECT COUNT(*) as cnt FROM agent_chat_message WHERE chatId = ? AND role = ?',
      [currentChatId, 'user'],
    );
    const userMessageCount = countResult?.cnt ?? 0;

    if (userMessageCount >= MAX_QUESTIONS) {
      return new Response(
        JSON.stringify({ error: '質問回数の上限（20回）に達しました', remainingQuestions: 0 }),
        { status: 429, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const lastUserMessage = messages[messages.length - 1];
    if (lastUserMessage?.role === 'user') {
      await db.insert(
        'INSERT INTO agent_chat_message (id, chatId, role, content, createdAt) VALUES (?, ?, ?, ?, NOW())',
        [uuidv4(), currentChatId, 'user', lastUserMessage.content],
      );
    }

    const newRemaining = MAX_QUESTIONS - (userMessageCount + 1);

    const encoder = new TextEncoder();
    let assistantText = '';

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // ステータスコールバック
          const onStatus = (status: string) => {
            controller.enqueue(encoder.encode(`> ${status}\n`));
          };

          // オーケストレーター実行
          const result = await runOrchestrator(messages, db, onStatus);
          assistantText = result;

          // 区切り
          controller.enqueue(encoder.encode('\n'));

          // 結果をチャンクで送信
          const chunkSize = 20;
          for (let i = 0; i < result.length; i += chunkSize) {
            controller.enqueue(encoder.encode(result.substring(i, i + chunkSize)));
            await new Promise((resolve) => setTimeout(resolve, 15));
          }

          // アシスタントメッセージを保存
          if (assistantText.trim()) {
            try {
              await db.insert(
                'INSERT INTO agent_chat_message (id, chatId, role, content, createdAt) VALUES (?, ?, ?, ?, NOW())',
                [uuidv4(), currentChatId, 'assistant', assistantText],
              );
            } catch (saveError) {
              console.error('Failed to save agent assistant message:', saveError);
            }
          }

          controller.close();
        } catch (error) {
          const message = error instanceof Error ? error.message : 'エージェント処理中にエラーが発生しました';
          console.error('Agent chat error:', error);
          controller.enqueue(encoder.encode(`\nエラー: ${message}`));
          controller.close();
        }
      },
    });

    const response = new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
    response.headers.set('X-Chat-Id', currentChatId);
    response.headers.set('X-Remaining-Questions', String(newRemaining));
    return response;
  } catch (error) {
    console.error('Agent chat API error:', error);
    return new Response(
      JSON.stringify({ error: 'エージェントチャットの処理中にエラーが発生しました' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
