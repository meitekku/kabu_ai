import { createHash } from 'crypto';
import { isIPv4, isIPv6 } from 'net';
import type { RowDataPacket } from 'mysql2';
import { Database } from '@/lib/database/Mysql';

export const ANON_DAILY_LIMIT = 3;
export const ANON_BURST_WINDOW_SECONDS = 10;
export const ANON_DAILY_WINDOW_HOURS = 24;

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

export function extractAnonIdentity(headersList: Headers): AnonQuotaIdentity {
  return {
    cfConnectingIp: headersList.get('cf-connecting-ip'),
    userAgent: headersList.get('user-agent'),
    acceptLanguage: headersList.get('accept-language'),
  };
}

export function hasTrustedClientIp(identity: AnonQuotaIdentity): boolean {
  return !!identity.cfConnectingIp && identity.cfConnectingIp.trim().length > 0;
}

// IPv6 アドレスを /64 プレフィックスに丸める。
// 攻撃者が同一 ISP の /64 内でアドレスを変えるだけで bucket を増やせないようにする。
// IPv4-mapped IPv6 は IPv4 に展開して扱う。zone id (%eth0 等) は除去。
export function normalizeIpForBucket(rawIp: string): string {
  const trimmed = rawIp.trim().toLowerCase().split('%')[0];
  if (!trimmed) return rawIp;

  if (isIPv4(trimmed)) {
    return trimmed;
  }

  // IPv4-mapped IPv6 (e.g. ::ffff:192.0.2.1)
  if (trimmed.startsWith('::ffff:')) {
    const tail = trimmed.slice(7);
    if (isIPv4(tail)) return tail;
    // hex 表記のマップ済 IPv4 も、IPv6 とみなして /64 化に倒す
  }

  if (isIPv6(trimmed)) {
    return ipv6To64Prefix(trimmed);
  }

  // 未知の形式: 元の文字列のままハッシュさせる(同一バケットを構成する)
  return trimmed;
}

// IPv6 アドレスを /64 プレフィックス文字列に正規化する。
// 上位 4 hextet を取り、それぞれゼロ埋めの 4 桁にしてコロン連結 + "::/64"。
export function ipv6To64Prefix(ipv6: string): string {
  const noZone = ipv6.split('%')[0].toLowerCase();
  let groups: string[];
  if (noZone.includes('::')) {
    const [head, tail] = noZone.split('::', 2);
    const headParts = head ? head.split(':').filter(Boolean) : [];
    const tailParts = tail ? tail.split(':').filter(Boolean) : [];
    const fillCount = 8 - headParts.length - tailParts.length;
    if (fillCount < 0) {
      // 不正な :: 展開。original を使う
      return noZone;
    }
    groups = [...headParts, ...Array(fillCount).fill('0'), ...tailParts];
  } else {
    groups = noZone.split(':');
  }

  if (groups.length !== 8) {
    // 異常: そのまま返してハッシュ衝突の責任を呼出側に倒す
    return noZone;
  }

  const prefix = groups
    .slice(0, 4)
    .map((g) => g.padStart(4, '0'))
    .join(':');
  return `${prefix}::/64`;
}

// 抑止キーは IP のみを使う。UA/Accept-Language は混ぜない(攻撃者が無料で
// バケットを増やせるため)。salt は pseudonymization 用途。
export function computeAnonKey(identity: AnonQuotaIdentity): string | null {
  if (!hasTrustedClientIp(identity)) return null;
  const salt = process.env.ANON_QUOTA_SALT ?? '';
  if (!salt && process.env.NODE_ENV === 'production') return null;

  const normalized = normalizeIpForBucket(identity.cfConnectingIp!);
  return createHash('sha256').update(normalized + salt).digest('hex');
}

interface QuotaOptions {
  // テスト差替えで時刻と DB を上書き
  now?: () => Date;
  db?: Pick<Database, 'select' | 'update'>;
}

// 「上限未達 + バースト窓外」を1ステートメントで判定し、合致時のみ INSERT する原子操作。
// 戻り値:
//   ok    : 利用記録に成功
//   limit : 24h 内 3 件に達している
//   burst : 直近 10 秒以内に消費がある
//   missing_cf_ip : CF-Connecting-IP がない / salt 未設定
//
// 失敗時(burst/limit) は理由特定のため別途軽い SELECT を1回行う。
// その結果は UI 表示用で抑止判断には用いない(本判定は INSERT の affectedRows のみ)。
export async function tryConsumeAnonQuota(
  identity: AnonQuotaIdentity,
  options: QuotaOptions = {},
): Promise<AnonQuotaResult> {
  const ipHash = computeAnonKey(identity);
  if (!ipHash) return { kind: 'missing_cf_ip' };

  const db = options.db ?? Database.getInstance();

  // Atomic: バースト窓内に履歴がなく、かつ 24h 内のカウントが上限未満の時だけ INSERT。
  // 同じ ip_hash で並列に走っても、SELECT で同時に COUNT を読むため最大で
  // (concurrency 数 - 1) のオーバーシュートが理論上ありうるが、現実的には
  // ms 単位でのレースに限られ、意図的な大量並列突破は困難になる。
  const insertSql = `
    INSERT INTO anon_quota_log (ip_hash)
    SELECT ? FROM DUAL
    WHERE NOT EXISTS (
      SELECT 1 FROM anon_quota_log
      WHERE ip_hash = ?
        AND consumed_at >= NOW() - INTERVAL ? SECOND
    )
    AND (
      SELECT COUNT(*) FROM anon_quota_log AS t
      WHERE t.ip_hash = ?
        AND t.consumed_at >= NOW() - INTERVAL ? HOUR
    ) < ?
  `;
  const affected = await db.update(insertSql, [
    ipHash,
    ipHash,
    ANON_BURST_WINDOW_SECONDS,
    ipHash,
    ANON_DAILY_WINDOW_HOURS,
    ANON_DAILY_LIMIT,
  ]);

  if (affected === 1) {
    // 成功: 残数を再取得(参考値)
    const usedAfter = await fetchUsedCount(db, ipHash);
    const remaining = Math.max(0, ANON_DAILY_LIMIT - usedAfter);
    return { kind: 'ok', remaining };
  }

  // 失敗: 原因を特定して返す(UI 用、判定は既に確定済)
  const recentBurst = await fetchHasRecentBurst(db, ipHash);
  if (recentBurst) {
    return { kind: 'burst' };
  }
  return { kind: 'limit', remaining: 0 };
}

async function fetchUsedCount(
  db: Pick<Database, 'select'>,
  ipHash: string,
): Promise<number> {
  const rows = await db.select<CountRow>(
    `SELECT COUNT(*) AS cnt FROM anon_quota_log
     WHERE ip_hash = ?
       AND consumed_at >= NOW() - INTERVAL ? HOUR`,
    [ipHash, ANON_DAILY_WINDOW_HOURS],
  );
  return Number(rows[0]?.cnt ?? 0);
}

async function fetchHasRecentBurst(
  db: Pick<Database, 'select'>,
  ipHash: string,
): Promise<boolean> {
  const rows = await db.select<CountRow>(
    `SELECT COUNT(*) AS cnt FROM anon_quota_log
     WHERE ip_hash = ?
       AND consumed_at >= NOW() - INTERVAL ? SECOND`,
    [ipHash, ANON_BURST_WINDOW_SECONDS],
  );
  return Number(rows[0]?.cnt ?? 0) > 0;
}

// 残数のみ取得(GET エンドポイント用)。書き込みはしない。
export async function peekAnonQuota(
  identity: AnonQuotaIdentity,
  options: QuotaOptions = {},
): Promise<AnonQuotaResult> {
  const ipHash = computeAnonKey(identity);
  if (!ipHash) return { kind: 'missing_cf_ip' };

  const db = options.db ?? Database.getInstance();
  const used = await fetchUsedCount(db, ipHash);
  if (used >= ANON_DAILY_LIMIT) return { kind: 'limit', remaining: 0 };
  return { kind: 'ok', remaining: ANON_DAILY_LIMIT - used };
}
