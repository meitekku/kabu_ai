import { Database } from '@/lib/database/Mysql';

interface AccessResult {
  allowed: boolean;
  reason: 'premium' | 'trial' | 'expired' | 'not_logged_in';
  trialEndsAt?: string;
}

/**
 * お気に入りニュース機能のアクセス判定
 * - premium (subscription_status = 'active') → 許可
 * - 登録後48時間以内 → トライアル許可
 * - それ以外 → 拒否
 */
export async function checkFavoritesAccess(userId: string | null): Promise<AccessResult> {
  if (!userId) {
    return { allowed: false, reason: 'not_logged_in' };
  }

  const db = Database.getInstance();
  const users = await db.select<{
    subscription_status: string | null;
    createdAt: Date;
  }>(
    'SELECT subscription_status, createdAt FROM user WHERE id = ?',
    [userId]
  );

  if (users.length === 0) {
    return { allowed: false, reason: 'not_logged_in' };
  }

  const user = users[0];

  // プレミアム会員
  if (user.subscription_status === 'active') {
    return { allowed: true, reason: 'premium' };
  }

  // 48時間トライアル
  const createdAt = new Date(user.createdAt);
  const trialEnd = new Date(createdAt.getTime() + 48 * 60 * 60 * 1000);
  const now = new Date();

  if (now < trialEnd) {
    return {
      allowed: true,
      reason: 'trial',
      trialEndsAt: trialEnd.toISOString(),
    };
  }

  return { allowed: false, reason: 'expired' };
}
