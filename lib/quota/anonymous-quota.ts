import { createHash } from 'crypto';
import type { RowDataPacket } from 'mysql2';
import { Database } from '@/lib/database/Mysql';

export const ANON_DAILY_LIMIT = 3;
export const ANON_BURST_WINDOW_SECONDS = 10;

export type AnonQuotaResult =
  | { kind: 'ok'; remaining: number }
  | { kind: 'missing_cf_ip' }
  | { kind: 'burst' }
  | { kind: 'limit'; remaining: 0 };

export interface AnonQuotaIdentity {
  cfConnectingIp: string | null;
  userAgent: string | null;
  acceptLanguage: string | null;
}

interface CountRow extends RowDataPacket {
  cnt: number;
}

interface LastRow extends RowDataPacket {
  consumed_at: Date;
}

export function extractAnonIdentity(headersList: Headers): AnonQuotaIdentity {
  return {
    cfConnectingIp: headersList.get('cf-connecting-ip'),
    userAgent: headersList.get('user-agent'),
    acceptLanguage: headersList.get('accept-language'),
  };
}

// WHY: CF 経由でないと CF-Connecting-IP は付与されない。Cloudflare はクライアント
// から偽装された CF-Connecting-IP を上書き/拒否する(検証済)ので、ここに値が
// あるときは "Cloudflare がリアル IP として保証した値" と扱える。
export function hasTrustedClientIp(identity: AnonQuotaIdentity): boolean {
  return !!identity.cfConnectingIp && identity.cfConnectingIp.trim().length > 0;
}

export function computeAnonKey(identity: AnonQuotaIdentity): string | null {
  if (!hasTrustedClientIp(identity)) return null;
  const salt = process.env.ANON_QUOTA_SALT ?? '';
  if (!salt) {
    // WHY: ソルト未設定だと攻撃者が同じハッシュを再現できてしまう。
    // Production では必須として扱い、無ければキー生成を拒否する。
    if (process.env.NODE_ENV === 'production') return null;
  }
  const raw = [
    identity.cfConnectingIp ?? '',
    identity.userAgent ?? '',
    identity.acceptLanguage ?? '',
    salt,
  ].join('');
  return createHash('sha256').update(raw).digest('hex');
}

interface CheckOptions {
  // テスト用に時計を差し替えられるようにする
  now?: () => Date;
  // テスト用に DB 層を差し替えられる
  db?: Pick<Database, 'select' | 'insert'>;
}

async function fetchTodayCount(
  db: Pick<Database, 'select'>,
  ipHash: string,
): Promise<number> {
  const rows = await db.select<CountRow>(
    `SELECT COUNT(*) AS cnt FROM anon_quota_log
     WHERE ip_hash = ?
       AND consumed_at >= CONVERT_TZ(CONCAT(CURDATE(), ' 00:00:00'), '+09:00', '+00:00')`,
    [ipHash],
  );
  return Number(rows[0]?.cnt ?? 0);
}

async function fetchLastConsumedAt(
  db: Pick<Database, 'select'>,
  ipHash: string,
): Promise<Date | null> {
  const rows = await db.select<LastRow>(
    `SELECT consumed_at FROM anon_quota_log
     WHERE ip_hash = ?
     ORDER BY consumed_at DESC
     LIMIT 1`,
    [ipHash],
  );
  if (rows.length === 0) return null;
  const consumed = rows[0].consumed_at;
  return consumed instanceof Date ? consumed : new Date(consumed);
}

export async function checkAnonQuota(
  identity: AnonQuotaIdentity,
  options: CheckOptions = {},
): Promise<AnonQuotaResult> {
  const ipHash = computeAnonKey(identity);
  if (!ipHash) return { kind: 'missing_cf_ip' };

  const db = options.db ?? Database.getInstance();
  const now = options.now ? options.now() : new Date();

  const last = await fetchLastConsumedAt(db, ipHash);
  if (last) {
    const elapsedSec = (now.getTime() - last.getTime()) / 1000;
    if (elapsedSec < ANON_BURST_WINDOW_SECONDS) {
      return { kind: 'burst' };
    }
  }

  const used = await fetchTodayCount(db, ipHash);
  if (used >= ANON_DAILY_LIMIT) {
    return { kind: 'limit', remaining: 0 };
  }

  return { kind: 'ok', remaining: ANON_DAILY_LIMIT - used };
}

export async function recordAnonUsage(
  identity: AnonQuotaIdentity,
  options: CheckOptions = {},
): Promise<void> {
  const ipHash = computeAnonKey(identity);
  if (!ipHash) return;
  const db = options.db ?? Database.getInstance();
  await db.insert(
    `INSERT INTO anon_quota_log (ip_hash) VALUES (?)`,
    [ipHash],
  );
}
