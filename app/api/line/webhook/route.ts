import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { sendLineReply } from '@/lib/line/messaging';
import { handleLineMessage } from '@/lib/line/favorites-handler';

function verifySignature(body: string, signature: string): boolean {
  const channelSecret = process.env.LINE_MESSAGING_CHANNEL_SECRET;
  if (!channelSecret) return false;

  const hash = crypto
    .createHmac('SHA256', channelSecret)
    .update(body)
    .digest('base64');

  return hash === signature;
}

interface LineEvent {
  type: string;
  replyToken?: string;
  source?: { userId?: string; type?: string };
  message?: { type?: string; text?: string };
}

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get('x-line-signature');

    if (!signature || !verifySignature(body, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    const data = JSON.parse(body);

    for (const event of (data.events || []) as LineEvent[]) {
      // テキストメッセージのみ処理
      if (
        event.type === 'message' &&
        event.message?.type === 'text' &&
        event.message.text &&
        event.replyToken &&
        event.source?.userId
      ) {
        try {
          const response = await handleLineMessage(
            event.source.userId,
            event.message.text
          );
          await sendLineReply(event.replyToken, response);
        } catch (error) {
          console.error('LINE message handling error:', error);
          // エラー時もユーザーに応答
          try {
            await sendLineReply(
              event.replyToken,
              '処理中にエラーが発生しました。しばらく経ってからお試しください。'
            );
          } catch {
            // reply token expired or other error
          }
        }
      }

      // follow イベント（友達追加時）
      if (event.type === 'follow' && event.replyToken) {
        try {
          await sendLineReply(
            event.replyToken,
            '株AI LINE Botへようこそ！\n\nhttps://kabu-ai.jp/favorites からLINE連携を設定すると、お気に入り銘柄の管理やAIレポートの受信ができます。'
          );
        } catch {
          // ignore
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('LINE webhook error:', error);
    return NextResponse.json({ error: 'Webhook処理に失敗しました' }, { status: 500 });
  }
}
