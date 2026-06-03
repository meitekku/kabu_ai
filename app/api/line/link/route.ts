import { NextResponse } from 'next/server';
import { Database } from '@/lib/database/Mysql';
import { auth } from '@/lib/auth/auth';
import { headers } from 'next/headers';
import { generateLineAuthUrl, exchangeCodeForProfile } from '@/lib/line/login';
import crypto from 'crypto';

// LINE連携状態チェック + 認可URL生成
export async function POST() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
    }

    // ランダムstate生成（CSRF防止）
    const state = `${session.user.id}:${crypto.randomBytes(16).toString('hex')}`;
    const authUrl = generateLineAuthUrl(state);

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error('LINE link POST error:', error);
    return NextResponse.json({ error: 'LINE連携URLの生成に失敗しました' }, { status: 500 });
  }
}

// LINE OAuthコールバック + 連携状態取得
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  // コールバックの場合（code+state付き）
  if (code && state) {
    try {
      // stateからuser_idを抽出
      const userId = state.split(':')[0];
      if (!userId) {
        return NextResponse.redirect(new URL('/favorites?line_error=invalid_state', req.url));
      }

      const profile = await exchangeCodeForProfile(code);
      const db = Database.getInstance();

      // 既存の連携を確認
      const existing = await db.select<{ id: number }>(
        'SELECT id FROM user_line_link WHERE user_id = ? OR line_user_id = ?',
        [userId, profile.userId]
      );

      if (existing.length > 0) {
        // 既存の連携を更新
        await db.update(
          'UPDATE user_line_link SET line_user_id = ?, display_name = ?, linked_at = NOW() WHERE user_id = ?',
          [profile.userId, profile.displayName, userId]
        );
      } else {
        await db.insert(
          'INSERT INTO user_line_link (user_id, line_user_id, display_name) VALUES (?, ?, ?)',
          [userId, profile.userId, profile.displayName]
        );
      }

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://kabu-ai.jp';
      return NextResponse.redirect(new URL('/favorites?line_linked=true', baseUrl));
    } catch (error) {
      console.error('LINE callback error:', error);
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://kabu-ai.jp';
      return NextResponse.redirect(new URL('/favorites?line_error=callback_failed', baseUrl));
    }
  }

  // 連携状態チェック（通常のGET）
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ linked: false });
    }

    const db = Database.getInstance();
    const links = await db.select<{ display_name: string | null }>(
      'SELECT display_name FROM user_line_link WHERE user_id = ?',
      [session.user.id]
    );

    if (links.length === 0) {
      return NextResponse.json({ linked: false });
    }

    return NextResponse.json({
      linked: true,
      displayName: links[0].display_name,
    });
  } catch (error) {
    console.error('LINE link GET error:', error);
    return NextResponse.json({ linked: false });
  }
}
