import { Database } from '@/lib/database/Mysql';
import { auth } from '@/lib/auth/auth';
import { headers } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import { createAgentStream, type SDKMessage } from '@/lib/agent/claude-code';
import { sendAgentChatErrorEmail } from '@/lib/auth/email';

export const maxDuration = 120;

const MAX_QUESTIONS = 20;

interface AgentChatRequestBody {
  message?: unknown;
  chatId?: unknown;
}

function sendSSE(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  event: string,
  data: unknown,
) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  controller.enqueue(encoder.encode(payload));
}

function extractTextFromMessage(msg: SDKMessage): {
  text: string;
  toolUses: Array<{ name: string; input: unknown }>;
} {
  if (msg.type !== 'assistant') return { text: '', toolUses: [] };

  let text = '';
  const toolUses: Array<{ name: string; input: unknown }> = [];

  for (const block of msg.message.content) {
    if (block.type === 'text') {
      text += block.text;
    } else if (block.type === 'tool_use') {
      toolUses.push({ name: block.name, input: block.input });
    }
  }

  return { text, toolUses };
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
    const message = typeof body.message === 'string' ? body.message.trim() : '';

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'メッセージが空です' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const db = Database.getInstance();
    const userId = session.user.id;

    // チャットセッション管理
    let currentChatId = typeof body.chatId === 'string' ? body.chatId.trim() : '';
    if (!currentChatId) {
      currentChatId = uuidv4();
      const title = message.substring(0, 100);
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

    await db.insert(
      'INSERT INTO agent_chat_message (id, chatId, role, content, createdAt) VALUES (?, ?, ?, ?, NOW())',
      [uuidv4(), currentChatId, 'user', message],
    );

    const newRemaining = MAX_QUESTIONS - (userMessageCount + 1);
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          sendSSE(controller, encoder, 'chat-id', {
            chatId: currentChatId,
            remainingQuestions: newRemaining,
          });

          const q = createAgentStream(message);
          let fullAssistantText = '';

          for await (const msg of q) {
            switch (msg.type) {
              case 'assistant': {
                const { text, toolUses } = extractTextFromMessage(msg);
                if (text) {
                  fullAssistantText = text;
                }
                for (const tu of toolUses) {
                  sendSSE(controller, encoder, 'tool-use', {
                    name: tu.name,
                    input: tu.input,
                  });
                }
                break;
              }

              case 'stream_event': {
                const event = msg.event;
                if (
                  event.type === 'content_block_delta' &&
                  event.delta.type === 'text_delta'
                ) {
                  sendSSE(controller, encoder, 'text-delta', {
                    text: event.delta.text,
                  });
                }
                break;
              }

              case 'result': {
                if (msg.subtype === 'success') {
                  if (!fullAssistantText && msg.result) {
                    fullAssistantText = msg.result;
                  }
                  sendSSE(controller, encoder, 'message-end', {
                    result: msg.result,
                    costUsd: msg.total_cost_usd,
                    numTurns: msg.num_turns,
                    durationMs: msg.duration_ms,
                    sessionId: msg.session_id,
                  });
                } else {
                  sendSSE(controller, encoder, 'error', {
                    error: `Execution error: ${msg.subtype}`,
                  });
                }
                break;
              }

              case 'system':
                break;
            }
          }

          // アシスタントメッセージを保存
          if (fullAssistantText.trim()) {
            try {
              await db.insert(
                'INSERT INTO agent_chat_message (id, chatId, role, content, createdAt) VALUES (?, ?, ?, ?, NOW())',
                [uuidv4(), currentChatId, 'assistant', fullAssistantText],
              );
              await db.insert(
                'UPDATE agent_chat SET updatedAt = NOW() WHERE id = ?',
                [currentChatId],
              );
            } catch (saveError) {
              console.error('Failed to save agent assistant message:', saveError);
            }
          }

          controller.close();
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : 'エージェント処理中にエラーが発生しました';
          console.error('Agent chat error:', error);
          sendAgentChatErrorEmail({
            errorMessage: errMsg,
            errorContext: 'ストリーム処理中',
            userId,
          });
          sendSSE(controller, encoder, 'error', { error: errMsg });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Agent chat API error:', error);
    sendAgentChatErrorEmail({
      errorMessage: errMsg,
      errorContext: 'API処理中',
      userId: undefined,
    });
    return new Response(
      JSON.stringify({ error: '申し訳ございません。現在サーバーが混み合っております。しばらく時間をおいてから再度お試しください。' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
