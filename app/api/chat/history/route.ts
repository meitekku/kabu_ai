import { NextResponse } from 'next/server';
import { Database } from '@/lib/database/Mysql';
import { auth } from '@/lib/auth/auth';
import { headers } from 'next/headers';
import { RowDataPacket } from 'mysql2';

// 本番環境かどうかをチェック
function isProductionAccess(headersList: Headers, url: string): boolean {
  const host = headersList.get('host') || '';
  const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');
  const urlObj = new URL(url);
  const hasTestParam = urlObj.searchParams.get('test') === '1';
  return !isLocalhost && !hasTestParam;
}

interface ChatRow extends RowDataPacket {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

interface MessageRow extends RowDataPacket {
  id: string;
  role: string;
  content: string;
  createdAt: Date;
}

// チャット一覧を取得
export async function GET(req: Request) {
  try {
    const headersList = await headers();

    // 本番環境ではアクセス拒否
    if (isProductionAccess(headersList, req.url)) {
      return NextResponse.json(
        { error: 'この機能は現在利用できません' },
        { status: 403 }
      );
    }

    const session = await auth.api.getSession({ headers: headersList });
    const userId = session?.user?.id || 'anonymous';

    const { searchParams } = new URL(req.url);
    const chatId = searchParams.get('chatId');

    const db = Database.getInstance();

    if (chatId) {
      // 特定のチャットのメッセージを取得
      const messages = await db.select<MessageRow>(
        'SELECT id, role, content, createdAt FROM chatbot_message WHERE chatId = ? ORDER BY createdAt ASC',
        [chatId]
      );
      return NextResponse.json({ messages });
    } else {
      // チャット一覧を取得
      const chats = await db.select<ChatRow>(
        'SELECT id, title, createdAt, updatedAt FROM chatbot_chat WHERE userId = ? ORDER BY updatedAt DESC LIMIT 50',
        [userId]
      );
      return NextResponse.json({ chats });
    }
  } catch (error) {
    console.error('Chat history error:', error);
    return NextResponse.json(
      { error: 'チャット履歴の取得に失敗しました' },
      { status: 500 }
    );
  }
}

// チャットを削除
export async function DELETE(req: Request) {
  try {
    const headersList = await headers();

    // 本番環境ではアクセス拒否
    if (isProductionAccess(headersList, req.url)) {
      return NextResponse.json(
        { error: 'この機能は現在利用できません' },
        { status: 403 }
      );
    }

    const session = await auth.api.getSession({ headers: headersList });
    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const chatId = searchParams.get('chatId');

    if (!chatId) {
      return NextResponse.json({ error: 'chatIdが必要です' }, { status: 400 });
    }

    const db = Database.getInstance();

    // チャットを削除（メッセージはCASCADEで自動削除）
    await db.delete(
      'DELETE FROM chatbot_chat WHERE id = ? AND userId = ?',
      [chatId, session.user.id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Chat delete error:', error);
    return NextResponse.json(
      { error: 'チャットの削除に失敗しました' },
      { status: 500 }
    );
  }
}
