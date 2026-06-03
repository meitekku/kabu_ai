import { NextResponse } from 'next/server';
import { Database } from '@/lib/database/Mysql';
import { auth } from '@/lib/auth/auth';
import { headers } from 'next/headers';

interface ChatRow {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

interface MessageRow {
  id: string;
  role: string;
  content: string;
  createdAt: Date;
}

export async function GET(req: Request) {
  try {
    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const chatId = searchParams.get('chatId');
    const db = Database.getInstance();

    if (chatId) {
      const messages = await db.select<MessageRow>(
        'SELECT id, role, content, createdAt FROM agent_chat_message WHERE chatId = ? ORDER BY createdAt ASC',
        [chatId],
      );
      return NextResponse.json({ messages });
    }

    const chats = await db.select<ChatRow>(
      'SELECT id, title, createdAt, updatedAt FROM agent_chat WHERE userId = ? ORDER BY updatedAt DESC LIMIT 50',
      [session.user.id],
    );
    return NextResponse.json({ chats });
  } catch (error) {
    console.error('Agent chat history error:', error);
    return NextResponse.json(
      { error: 'チャット履歴の取得に失敗しました' },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const chatId = searchParams.get('chatId');

    if (!chatId) {
      return NextResponse.json({ error: 'chatIdが必要です' }, { status: 400 });
    }

    const db = Database.getInstance();
    await db.delete(
      'DELETE FROM agent_chat WHERE id = ? AND userId = ?',
      [chatId, session.user.id],
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Agent chat delete error:', error);
    return NextResponse.json(
      { error: 'チャットの削除に失敗しました' },
      { status: 500 },
    );
  }
}
