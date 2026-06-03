import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ANON_BURST_WINDOW_SECONDS,
  ANON_DAILY_LIMIT,
  computeAnonKey,
  extractAnonIdentity,
  hasTrustedClientIp,
  ipv6To64Prefix,
  normalizeIpForBucket,
  peekAnonQuota,
  tryConsumeAnonQuota,
  type AnonQuotaIdentity,
} from '@/lib/quota/anonymous-quota';

type Row = Record<string, unknown>;
type SelectFn = (
  query: string,
  params?: Array<string | number | boolean | null>,
) => Promise<Row[]>;
type UpdateFn = (
  query: string,
  params?: Array<string | number | boolean | null>,
) => Promise<number>;

function makeIdentity(overrides: Partial<AnonQuotaIdentity> = {}): AnonQuotaIdentity {
  return {
    cfConnectingIp: '203.0.113.10',
    userAgent: 'Mozilla/5.0',
    acceptLanguage: 'ja',
    ...overrides,
  };
}

describe('extractAnonIdentity', () => {
  it('CF-Connecting-IP / UA / Accept-Language を取り出す', () => {
    const headers = new Headers({
      'cf-connecting-ip': '198.51.100.7',
      'user-agent': 'TestAgent/1.0',
      'accept-language': 'ja',
    });
    expect(extractAnonIdentity(headers)).toEqual({
      cfConnectingIp: '198.51.100.7',
      userAgent: 'TestAgent/1.0',
      acceptLanguage: 'ja',
    });
  });
});

describe('hasTrustedClientIp', () => {
  it('CF-Connecting-IP がある = true', () => {
    expect(hasTrustedClientIp(makeIdentity())).toBe(true);
  });
  it('null/空 = false', () => {
    expect(hasTrustedClientIp(makeIdentity({ cfConnectingIp: null }))).toBe(false);
    expect(hasTrustedClientIp(makeIdentity({ cfConnectingIp: '   ' }))).toBe(false);
  });
});

describe('normalizeIpForBucket', () => {
  it('IPv4 はそのまま', () => {
    expect(normalizeIpForBucket('203.0.113.42')).toBe('203.0.113.42');
  });

  it('IPv4-mapped IPv6 (::ffff:1.2.3.4) は IPv4 に展開', () => {
    expect(normalizeIpForBucket('::ffff:192.0.2.1')).toBe('192.0.2.1');
  });

  it('IPv6 はそのまま /64 プレフィックスに丸める', () => {
    expect(normalizeIpForBucket('2001:db8:1234:5678:abcd:ef01:2345:6789')).toBe(
      '2001:0db8:1234:5678::/64',
    );
  });

  it('IPv6 の :: 省略表記を展開して /64 化', () => {
    // 2001:db8:: は 2001:db8:0:0:0:0:0:0
    expect(normalizeIpForBucket('2001:db8::1')).toBe('2001:0db8:0000:0000::/64');
  });

  it('IPv6 の zone id (%eth0) を除去', () => {
    expect(normalizeIpForBucket('fe80::1%eth0')).toBe('fe80:0000:0000:0000::/64');
  });

  it('同じ /64 内なら別アドレスでも同じバケット', () => {
    const a = normalizeIpForBucket('2001:db8:1234:5678:1::1');
    const b = normalizeIpForBucket('2001:db8:1234:5678:ffff:ffff:ffff:ffff');
    expect(a).toBe(b);
  });

  it('違う /64 なら別バケット', () => {
    const a = normalizeIpForBucket('2001:db8:1234:5678::1');
    const b = normalizeIpForBucket('2001:db8:1234:9999::1');
    expect(a).not.toBe(b);
  });
});

describe('ipv6To64Prefix', () => {
  it('展開済みの完全形を /64 化', () => {
    expect(ipv6To64Prefix('2001:0db8:0000:0000:0000:0000:0000:0001')).toBe(
      '2001:0db8:0000:0000::/64',
    );
  });

  it('::1 (ループバック) も処理できる', () => {
    expect(ipv6To64Prefix('::1')).toBe('0000:0000:0000:0000::/64');
  });
});

describe('computeAnonKey (IP のみが key)', () => {
  const ORIGINAL_SALT = process.env.ANON_QUOTA_SALT;

  beforeEach(() => {
    process.env.ANON_QUOTA_SALT = 'test-salt';
  });

  afterEach(() => {
    if (ORIGINAL_SALT === undefined) delete process.env.ANON_QUOTA_SALT;
    else process.env.ANON_QUOTA_SALT = ORIGINAL_SALT;
  });

  it('CF-IP 無しなら null', () => {
    expect(computeAnonKey(makeIdentity({ cfConnectingIp: null }))).toBeNull();
  });

  it('SHA256 hex 形式 (64 chars)', () => {
    const k = computeAnonKey(makeIdentity());
    expect(k).toHaveLength(64);
    expect(k).toMatch(/^[0-9a-f]{64}$/);
  });

  it('UA を変えても key は同じ(UA は混ざらない)', () => {
    const a = computeAnonKey(makeIdentity({ userAgent: 'A' }));
    const b = computeAnonKey(makeIdentity({ userAgent: 'B' }));
    expect(a).toBe(b);
  });

  it('Accept-Language を変えても key は同じ', () => {
    const a = computeAnonKey(makeIdentity({ acceptLanguage: 'ja' }));
    const b = computeAnonKey(makeIdentity({ acceptLanguage: 'en' }));
    expect(a).toBe(b);
  });

  it('IP が違えば別 key', () => {
    const a = computeAnonKey(makeIdentity({ cfConnectingIp: '203.0.113.1' }));
    const b = computeAnonKey(makeIdentity({ cfConnectingIp: '203.0.113.2' }));
    expect(a).not.toBe(b);
  });

  it('IPv6 同 /64 なら同 key', () => {
    const a = computeAnonKey(makeIdentity({ cfConnectingIp: '2001:db8::1' }));
    const b = computeAnonKey(makeIdentity({ cfConnectingIp: '2001:db8::ffff' }));
    expect(a).toBe(b);
  });

  it('IPv6 別 /64 なら別 key', () => {
    const a = computeAnonKey(makeIdentity({ cfConnectingIp: '2001:db8:0:0::1' }));
    const b = computeAnonKey(makeIdentity({ cfConnectingIp: '2001:db8:1:0::1' }));
    expect(a).not.toBe(b);
  });

  it('Production でソルト未設定なら null', () => {
    const originalNodeEnv = process.env.NODE_ENV;
    delete process.env.ANON_QUOTA_SALT;
    process.env.NODE_ENV = 'production';
    try {
      expect(computeAnonKey(makeIdentity())).toBeNull();
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });
});

describe('tryConsumeAnonQuota (atomic INSERT)', () => {
  beforeEach(() => {
    process.env.ANON_QUOTA_SALT = 'test-salt';
  });

  function buildDb(opts: {
    insertAffected?: number;
    burstHit?: boolean;
    usedAfter?: number;
  } = {}) {
    const insertAffected = opts.insertAffected ?? 1;
    const burstHit = opts.burstHit ?? false;
    const usedAfter = opts.usedAfter ?? 1;
    return {
      update: vi.fn<UpdateFn>(() => Promise.resolve(insertAffected)),
      select: vi.fn<SelectFn>((sql) => {
        if (sql.includes('INTERVAL ? SECOND')) {
          // burst 判定 SELECT
          return Promise.resolve([{ cnt: burstHit ? 1 : 0 }]);
        }
        // used count SELECT
        return Promise.resolve([{ cnt: usedAfter }]);
      }),
    };
  }

  it('CF-IP が無いと missing_cf_ip を返し DB は触らない', async () => {
    const db = buildDb();
    const r = await tryConsumeAnonQuota(makeIdentity({ cfConnectingIp: null }), { db });
    expect(r.kind).toBe('missing_cf_ip');
    expect(db.update).not.toHaveBeenCalled();
  });

  it('INSERT 成功(affected=1) → ok / remaining', async () => {
    const db = buildDb({ insertAffected: 1, usedAfter: 1 });
    const r = await tryConsumeAnonQuota(makeIdentity(), { db });
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      expect(r.remaining).toBe(ANON_DAILY_LIMIT - 1);
    }
    expect(db.update).toHaveBeenCalledTimes(1);
    const [sql] = db.update.mock.calls[0];
    expect(sql).toContain('INSERT INTO anon_quota_log');
  });

  it('INSERT 失敗 + 直近 burst あり → burst', async () => {
    const db = buildDb({ insertAffected: 0, burstHit: true });
    const r = await tryConsumeAnonQuota(makeIdentity(), { db });
    expect(r.kind).toBe('burst');
  });

  it('INSERT 失敗 + burst 無し → limit', async () => {
    const db = buildDb({ insertAffected: 0, burstHit: false });
    const r = await tryConsumeAnonQuota(makeIdentity(), { db });
    expect(r.kind).toBe('limit');
  });

  it('原子的: 1ステートメントの INSERT のみ判定に使う', async () => {
    const db = buildDb({ insertAffected: 1, usedAfter: 2 });
    await tryConsumeAnonQuota(makeIdentity(), { db });
    // 判定に使うのは update() 1 回のみ。SELECT は理由特定や残数算出のための補助
    expect(db.update).toHaveBeenCalledTimes(1);
  });

  it('SQL に NOW() - INTERVAL を使い TZ 非依存', async () => {
    const db = buildDb();
    await tryConsumeAnonQuota(makeIdentity(), { db });
    const [sql] = db.update.mock.calls[0];
    expect(sql).toContain('NOW() - INTERVAL ? SECOND');
    expect(sql).toContain('NOW() - INTERVAL ? HOUR');
    expect(sql).not.toContain('CURDATE');
  });
});

describe('peekAnonQuota (read-only)', () => {
  beforeEach(() => {
    process.env.ANON_QUOTA_SALT = 'test-salt';
  });

  it('使用 0 なら ok / remaining=ANON_DAILY_LIMIT', async () => {
    const db = {
      update: vi.fn<UpdateFn>(),
      select: vi.fn<SelectFn>(() => Promise.resolve([{ cnt: 0 }])),
    };
    const r = await peekAnonQuota(makeIdentity(), { db });
    expect(r).toEqual({ kind: 'ok', remaining: ANON_DAILY_LIMIT });
    expect(db.update).not.toHaveBeenCalled();
  });

  it('上限到達なら limit', async () => {
    const db = {
      update: vi.fn<UpdateFn>(),
      select: vi.fn<SelectFn>(() => Promise.resolve([{ cnt: ANON_DAILY_LIMIT }])),
    };
    const r = await peekAnonQuota(makeIdentity(), { db });
    expect(r).toEqual({ kind: 'limit', remaining: 0 });
  });
});

describe('定数 sanity', () => {
  it('ANON_DAILY_LIMIT = 3', () => {
    expect(ANON_DAILY_LIMIT).toBe(3);
  });
  it('ANON_BURST_WINDOW_SECONDS = 10', () => {
    expect(ANON_BURST_WINDOW_SECONDS).toBe(10);
  });
});
