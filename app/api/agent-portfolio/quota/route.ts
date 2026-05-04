import { headers } from 'next/headers';
import type { RowDataPacket } from 'mysql2';
import { auth } from '@/lib/auth/auth';
import { isAdminRole } from '@/lib/auth/admin';
import { Database } from '@/lib/database/Mysql';

const UNLIMITED_PLANS = new Set(['standard', 'agent']);
const DAILY_LIMIT = 3;
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

interface UserSubscriptionRow extends RowDataPacket {
  subscription_status: string | null;
  subscription_plan: string | null;
  role: string | null;
}

interface CountRow extends RowDataPacket {
  cnt: number;
}

function nextJstMidnightIso(now: Date = new Date()): string {
  // 翌日 JST 0:00 を UTC ISO で返す
  const jstNow = new Date(now.getTime() + JST_OFFSET_MS);
  const jstNextMidnight = Date.UTC(
    jstNow.getUTCFullYear(),
    jstNow.getUTCMonth(),
    jstNow.getUTCDate() + 1,
    0,
    0,
    0,
    0,
  );
  return new Date(jstNextMidnight - JST_OFFSET_MS).toISOString();
}

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const userId = session.user.id;
    const db = Database.getInstance();
    const userRows = await db.select<UserSubscriptionRow>(
      'SELECT subscription_status, subscription_plan, role FROM user WHERE id = ?',
      [userId],
    );
    const row = userRows[0];
    const isUnlimited =
      !!row &&
      (isAdminRole(row.role) ||
        (row.subscription_status === 'active' &&
          !!row.subscription_plan &&
          UNLIMITED_PLANS.has(row.subscription_plan)));

    const resetAt = nextJstMidnightIso();

    if (isUnlimited) {
      return new Response(
        JSON.stringify({ remaining: -1, isUnlimited: true, resetAt }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const usageRows = await db.select<CountRow>(
      `SELECT COUNT(*) AS cnt FROM agent_portfolio_usage_log
       WHERE user_id = ?
         AND started_at >= CONVERT_TZ(CONCAT(CURDATE(), ' 00:00:00'), '+09:00', '+00:00')
         AND status IN ('completed','cancelled')`,
      [userId],
    );
    const used = usageRows[0]?.cnt ?? 0;
    const remaining = Math.max(0, DAILY_LIMIT - used);

    return new Response(
      JSON.stringify({ remaining, isUnlimited: false, resetAt }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'internal_error';
    console.error('agent-portfolio/quota GET error:', err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
