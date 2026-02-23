import { NextResponse } from 'next/server';
import { Database } from '@/lib/database/Mysql';
import { auth } from '@/lib/auth/auth';
import { headers } from 'next/headers';

// 重要度更新
export async function PATCH(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
    }

    const body = await req.json();
    const { code, importance } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: '銘柄コードが必要です' }, { status: 400 });
    }

    if (importance !== null && (typeof importance !== 'number' || importance < 1 || importance > 5)) {
      return NextResponse.json({ error: '重要度は1-5またはnullで指定してください' }, { status: 400 });
    }

    const db = Database.getInstance();
    const affected = await db.update(
      'UPDATE user_favorite SET importance = ? WHERE user_id = ? AND code = ?',
      [importance, session.user.id, code]
    );

    if (affected === 0) {
      return NextResponse.json({ error: 'お気に入りが見つかりません' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Favorites importance PATCH error:', error);
    return NextResponse.json({ error: '重要度の更新に失敗しました' }, { status: 500 });
  }
}
