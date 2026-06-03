const LINE_PUSH_API_URL = 'https://api.line.me/v2/bot/message/push';
const LINE_REPLY_API_URL = 'https://api.line.me/v2/bot/message/reply';

function getToken(): string | null {
  return process.env.LINE_MESSAGING_API_TOKEN || null;
}

/**
 * LINEプッシュ通知を送信
 */
export async function sendLinePush(
  lineUserId: string,
  message: string
): Promise<void> {
  const token = getToken();
  if (!token) {
    console.warn('LINE_MESSAGING_API_TOKEN is not set, skipping push notification');
    return;
  }

  const truncated = message.length > 5000 ? message.slice(0, 4997) + '...' : message;

  const res = await fetch(LINE_PUSH_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      to: lineUserId,
      messages: [{ type: 'text', text: truncated }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`LINE push failed: ${res.status} ${body}`);
  }
}

/**
 * LINEリプライを送信（Webhook応答用）
 */
export async function sendLineReply(
  replyToken: string,
  message: string
): Promise<void> {
  const token = getToken();
  if (!token) {
    console.warn('LINE_MESSAGING_API_TOKEN is not set, skipping reply');
    return;
  }

  const truncated = message.length > 5000 ? message.slice(0, 4997) + '...' : message;

  const res = await fetch(LINE_REPLY_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: 'text', text: truncated }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`LINE reply failed: ${res.status} ${body}`);
  }
}
