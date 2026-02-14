import { NextResponse, NextRequest } from 'next/server';
import { Database } from '@/lib/database/Mysql';
import { auth } from '@/lib/auth/auth';
import { headers } from 'next/headers';

function getClientIp(headersList: Headers): string {
  const forwardedFor = headersList.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  const cfConnectingIp = headersList.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp;
  }
  const realIp = headersList.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  return 'unknown';
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
): Promise<NextResponse> {
  try {
    await params;
    const { fingerprint } = await request.json();

    if (!fingerprint) {
      return NextResponse.json(
        { canPredict: false, reason: 'フィンガープリントが必要です' },
        { status: 400 }
      );
    }

    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });
    const userId = session?.user?.id || null;
    const clientIp = getClientIp(headersList);

    const db = Database.getInstance();

    // プレミアム会員チェック
    let isPremium = false;
    if (userId) {
      const users = await db.select<{ subscription_status: string }>(
        'SELECT subscription_status FROM user WHERE id = ?',
        [userId]
      );
      isPremium = users[0]?.subscription_status === 'active';
    }

    if (isPremium) {
      return NextResponse.json({
        canPredict: true,
        remainingUses: -1,
      });
    }

    if (userId) {
      // ログイン済み・非プレミアム: 累計3回まで
      const usageResult = await db.select<{ count: number }>(
        `SELECT COUNT(*) as count FROM prediction_usage_log
         WHERE user_id = ?`,
        [userId]
      );
      const totalUsage = usageResult[0]?.count || 0;

      if (totalUsage >= 3) {
        return NextResponse.json({
          canPredict: false,
          reason: '無料の予測回数（3回）を使い切りました。プレミアム会員になると無制限でご利用いただけます。',
          remainingUses: 0,
          requirePremium: true,
        });
      }

      return NextResponse.json({
        canPredict: true,
        remainingUses: 3 - totalUsage,
      });
    }

    // 未ログイン: fingerprint or IP で累計1回まで
    const usageResult = await db.select<{ count: number }>(
      `SELECT COUNT(*) as count FROM prediction_usage_log
       WHERE fingerprint = ? OR ip_address = ?`,
      [fingerprint, clientIp]
    );
    const totalUsage = usageResult[0]?.count || 0;

    if (totalUsage >= 1) {
      return NextResponse.json({
        canPredict: false,
        reason: '無料の予測回数（1回）を使い切りました。ログインすると3回まで、プレミアム会員は無制限でご利用いただけます。',
        remainingUses: 0,
        requireLogin: true,
      });
    }

    return NextResponse.json({
      canPredict: true,
      remainingUses: 1 - totalUsage,
    });
  } catch (error) {
    console.error('Check usage error:', error);
    return NextResponse.json(
      { canPredict: false, reason: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}
