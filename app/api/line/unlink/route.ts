import { NextResponse } from 'next/server';
import { Database } from '@/lib/database/Mysql';
import { auth } from '@/lib/auth/auth';
import { headers } from 'next/headers';

export async function POST() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
    }

    const db = Database.getInstance();
    await db.delete(
      'DELETE FROM user_line_link WHERE user_id = ?',
      [session.user.id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('LINE unlink error:', error);
    return NextResponse.json({ error: 'LINE連携の解除に失敗しました' }, { status: 500 });
  }
}
