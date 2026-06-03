import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { headers } from 'next/headers';
import { checkFavoritesAccess } from '@/lib/favorites/access';

// フロントエンド用アクセスチェック
export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const access = await checkFavoritesAccess(session?.user?.id || null);
    return NextResponse.json(access);
  } catch (error) {
    console.error('Favorites access check error:', error);
    return NextResponse.json({ allowed: false, reason: 'not_logged_in' });
  }
}
