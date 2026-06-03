import { NextResponse } from 'next/server';
import { Database } from '@/lib/database/Mysql';
import { auth } from '@/lib/auth/auth';
import { headers } from 'next/headers';

// 特定銘柄のお気に入り状態チェック
export async function GET(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ isFavorite: false });
    }

    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json({ error: '銘柄コードが必要です' }, { status: 400 });
    }

    const db = Database.getInstance();
    const result = await db.select<{ id: number }>(
      'SELECT id FROM user_favorite WHERE user_id = ? AND code = ?',
      [session.user.id, code]
    );

    return NextResponse.json({ isFavorite: result.length > 0 });
  } catch (error) {
    console.error('Favorites check error:', error);
    return NextResponse.json({ isFavorite: false });
  }
}
