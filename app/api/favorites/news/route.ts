import { NextResponse } from 'next/server';
import { Database } from '@/lib/database/Mysql';
import { auth } from '@/lib/auth/auth';
import { headers } from 'next/headers';
import { checkFavoritesAccess } from '@/lib/favorites/access';

interface FavoriteNewsRow {
  id: number;
  report_type: 'midday' | 'closing';
  content: string;
  stock_codes: string;
  generation_date: string;
  created_at: Date;
}

// ユーザー向けレポート取得
export async function GET(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
    }

    const access = await checkFavoritesAccess(session.user.id);
    if (!access.allowed) {
      return NextResponse.json({ error: 'アクセス権がありません', reason: access.reason }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const reportType = searchParams.get('type');

    const db = Database.getInstance();

    let query = `SELECT id, report_type, content, stock_codes, generation_date, created_at
                 FROM favorite_news
                 WHERE user_id = ?`;
    const params: (string | number)[] = [session.user.id];

    if (date) {
      query += ' AND generation_date = ?';
      params.push(date);
    }

    if (reportType && (reportType === 'midday' || reportType === 'closing')) {
      query += ' AND report_type = ?';
      params.push(reportType);
    }

    query += ' ORDER BY generation_date DESC, created_at DESC LIMIT 10';

    const reports = await db.select<FavoriteNewsRow>(query, params);

    // stock_codes JSONをパース
    const parsed = reports.map(r => ({
      ...r,
      stock_codes: JSON.parse(r.stock_codes as string),
    }));

    return NextResponse.json({ reports: parsed, access });
  } catch (error) {
    console.error('Favorites news GET error:', error);
    return NextResponse.json({ error: 'レポートの取得に失敗しました' }, { status: 500 });
  }
}
