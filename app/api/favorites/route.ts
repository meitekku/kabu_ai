import { NextResponse } from 'next/server';
import { Database } from '@/lib/database/Mysql';
import { auth } from '@/lib/auth/auth';
import { headers } from 'next/headers';
import { checkFavoritesAccess } from '@/lib/favorites/access';

interface FavoriteRow {
  id: number;
  code: string;
  importance: number | null;
  created_at: Date;
  name: string | null;
  current_price: number | null;
  diff_percent: number | null;
}

// お気に入り一覧取得
export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
    }

    const access = await checkFavoritesAccess(session.user.id);
    if (!access.allowed) {
      return NextResponse.json({ error: 'アクセス権がありません', reason: access.reason }, { status: 403 });
    }

    const db = Database.getInstance();
    const favorites = await db.select<FavoriteRow>(
      `SELECT uf.id, uf.code, uf.importance, uf.created_at,
              c.name, ci.current_price, ci.diff_percent
       FROM user_favorite uf
       LEFT JOIN company c ON uf.code = c.code
       LEFT JOIN company_info ci ON uf.code = ci.code
       WHERE uf.user_id = ?
       ORDER BY uf.importance DESC, uf.created_at DESC`,
      [session.user.id]
    );

    return NextResponse.json({ favorites, access });
  } catch (error) {
    console.error('Favorites GET error:', error);
    return NextResponse.json({ error: 'お気に入りの取得に失敗しました' }, { status: 500 });
  }
}

// お気に入り追加
export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
    }

    const access = await checkFavoritesAccess(session.user.id);
    if (!access.allowed) {
      return NextResponse.json({ error: 'アクセス権がありません', reason: access.reason }, { status: 403 });
    }

    const body = await req.json();
    const { code } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: '銘柄コードが必要です' }, { status: 400 });
    }

    const db = Database.getInstance();

    // 銘柄存在チェック
    const companies = await db.select<{ code: string }>(
      'SELECT code FROM company WHERE code = ?',
      [code]
    );
    if (companies.length === 0) {
      return NextResponse.json({ error: '銘柄が見つかりません' }, { status: 404 });
    }

    // 登録上限チェック (最大50銘柄)
    const countResult = await db.select<{ count: number }>(
      'SELECT COUNT(*) as count FROM user_favorite WHERE user_id = ?',
      [session.user.id]
    );
    if (countResult[0].count >= 50) {
      return NextResponse.json({ error: 'お気に入り登録は最大50銘柄までです' }, { status: 400 });
    }

    await db.insert(
      'INSERT IGNORE INTO user_favorite (user_id, code) VALUES (?, ?)',
      [session.user.id, code]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Favorites POST error:', error);
    return NextResponse.json({ error: 'お気に入りの追加に失敗しました' }, { status: 500 });
  }
}

// お気に入り削除
export async function DELETE(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json({ error: '銘柄コードが必要です' }, { status: 400 });
    }

    const db = Database.getInstance();
    await db.delete(
      'DELETE FROM user_favorite WHERE user_id = ? AND code = ?',
      [session.user.id, code]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Favorites DELETE error:', error);
    return NextResponse.json({ error: 'お気に入りの削除に失敗しました' }, { status: 500 });
  }
}
