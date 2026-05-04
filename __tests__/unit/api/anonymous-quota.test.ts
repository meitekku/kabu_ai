import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ANON_BURST_WINDOW_SECONDS,
  ANON_DAILY_LIMIT,
  checkAnonQuota,
  computeAnonKey,
  extractAnonIdentity,
  hasTrustedClientIp,
  recordAnonUsage,
  type AnonQuotaIdentity,
} from '@/lib/quota/anonymous-quota';

type Row = Record<string, unknown>;
type SelectFn = (
  query: string,
  params?: Array<string | number | boolean | null>,
) => Promise<Row[]>;
type InsertFn = (
  query: string,
  params?: Array<string | number | boolean | null>,
) => Promise<number>;

function makeIdentity(overrides: Partial<AnonQuotaIdentity> = {}): AnonQuotaIdentity {
  return {
    cfConnectingIp: '203.0.113.10',
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) Chrome/120',
    acceptLanguage: 'ja,en;q=0.9',
    ...overrides,
  };
}

describe('extractAnonIdentity', () => {
  it('CF-Connecting-IP / User-Agent / Accept-Language を取り出す', () => {
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

  it('ヘッダーが無ければ null を返す', () => {
    const id = extractAnonIdentity(new Headers());
    expect(id.cfConnectingIp).toBeNull();
    expect(id.userAgent).toBeNull();
    expect(id.acceptLanguage).toBeNull();
  });
});

describe('hasTrustedClientIp', () => {
  it('CF-Connecting-IP がある = 信頼可', () => {
    expect(hasTrustedClientIp(makeIdentity({ cfConnectingIp: '203.0.113.1' }))).toBe(
      true,
    );
  });

  it('CF-Connecting-IP が null = 信頼不可', () => {
    expect(hasTrustedClientIp(makeIdentity({ cfConnectingIp: null }))).toBe(false);
  });

  it('CF-Connecting-IP が空文字 = 信頼不可', () => {
    expect(hasTrustedClientIp(makeIdentity({ cfConnectingIp: '   ' }))).toBe(false);
  });
});

describe('computeAnonKey', () => {
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

  it('同じ入力なら同じハッシュ', () => {
    const id = makeIdentity();
    const a = computeAnonKey(id);
    const b = computeAnonKey(id);
    expect(a).toBeTruthy();
    expect(a).toBe(b);
    expect(a).toHaveLength(64); // SHA256 hex
  });

  it('IP が違えば別ハッシュ', () => {
    const a = computeAnonKey(makeIdentity({ cfConnectingIp: '203.0.113.10' }));
    const b = computeAnonKey(makeIdentity({ cfConnectingIp: '203.0.113.11' }));
    expect(a).not.toBe(b);
  });

  it('UA が違えば別ハッシュ', () => {
    const a = computeAnonKey(makeIdentity({ userAgent: 'A' }));
    const b = computeAnonKey(makeIdentity({ userAgent: 'B' }));
    expect(a).not.toBe(b);
  });

  it('Accept-Language が違えば別ハッシュ', () => {
    const a = computeAnonKey(makeIdentity({ acceptLanguage: 'ja' }));
    const b = computeAnonKey(makeIdentity({ acceptLanguage: 'en' }));
    expect(a).not.toBe(b);
  });

  it('ソルトが違えば別ハッシュ', () => {
    process.env.ANON_QUOTA_SALT = 'salt-A';
    const a = computeAnonKey(makeIdentity());
    process.env.ANON_QUOTA_SALT = 'salt-B';
    const b = computeAnonKey(makeIdentity());
    expect(a).not.toBe(b);
  });

  it('Production でソルト未設定なら null(セキュリティ要件)', () => {
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

describe('checkAnonQuota', () => {
  const NOW = new Date('2026-05-04T12:00:00+09:00');

  beforeEach(() => {
    process.env.ANON_QUOTA_SALT = 'test-salt';
  });

  function buildDb(opts: {
    selectImpl?: SelectFn;
    insertImpl?: InsertFn;
  } = {}) {
    return {
      select: vi.fn<SelectFn>(opts.selectImpl ?? (() => Promise.resolve([]))),
      insert: vi.fn<InsertFn>(opts.insertImpl ?? (() => Promise.resolve(1))),
    };
  }

  it('CF-Connecting-IP が無いと missing_cf_ip', async () => {
    const db = buildDb();
    const result = await checkAnonQuota(makeIdentity({ cfConnectingIp: null }), {
      db,
      now: () => NOW,
    });
    expect(result.kind).toBe('missing_cf_ip');
    expect(db.select).not.toHaveBeenCalled();
  });

  it('未使用なら ok / remaining=3', async () => {
    const db = buildDb({
      selectImpl: vi.fn<SelectFn>((q) =>
        Promise.resolve(q.includes('ORDER BY') ? [] : [{ cnt: 0 }]),
      ),
    });
    const result = await checkAnonQuota(makeIdentity(), { db, now: () => NOW });
    expect(result).toEqual({ kind: 'ok', remaining: ANON_DAILY_LIMIT });
  });

  it('上限到達(3回)なら limit', async () => {
    const last = new Date(NOW.getTime() - 3600 * 1000); // 1時間前
    const db = buildDb({
      selectImpl: vi.fn<SelectFn>((q) =>
        Promise.resolve(
          q.includes('ORDER BY') ? [{ consumed_at: last }] : [{ cnt: ANON_DAILY_LIMIT }],
        ),
      ),
    });
    const result = await checkAnonQuota(makeIdentity(), { db, now: () => NOW });
    expect(result).toEqual({ kind: 'limit', remaining: 0 });
  });

  it('10秒以内の連投は burst でブロック', async () => {
    const last = new Date(NOW.getTime() - 5 * 1000);
    const db = buildDb({
      selectImpl: vi.fn<SelectFn>((q) =>
        Promise.resolve(
          q.includes('ORDER BY') ? [{ consumed_at: last }] : [{ cnt: 0 }],
        ),
      ),
    });
    const result = await checkAnonQuota(makeIdentity(), { db, now: () => NOW });
    expect(result.kind).toBe('burst');
  });

  it('11秒前の利用なら通る', async () => {
    const last = new Date(NOW.getTime() - (ANON_BURST_WINDOW_SECONDS + 1) * 1000);
    const db = buildDb({
      selectImpl: vi.fn<SelectFn>((q) =>
        Promise.resolve(
          q.includes('ORDER BY') ? [{ consumed_at: last }] : [{ cnt: 1 }],
        ),
      ),
    });
    const result = await checkAnonQuota(makeIdentity(), { db, now: () => NOW });
    expect(result).toEqual({ kind: 'ok', remaining: ANON_DAILY_LIMIT - 1 });
  });

  it('途中(1回使用)なら ok / remaining=2', async () => {
    const last = new Date(NOW.getTime() - 60 * 1000);
    const db = buildDb({
      selectImpl: vi.fn<SelectFn>((q) =>
        Promise.resolve(
          q.includes('ORDER BY') ? [{ consumed_at: last }] : [{ cnt: 1 }],
        ),
      ),
    });
    const result = await checkAnonQuota(makeIdentity(), { db, now: () => NOW });
    expect(result).toEqual({ kind: 'ok', remaining: ANON_DAILY_LIMIT - 1 });
  });
});

describe('recordAnonUsage', () => {
  beforeEach(() => {
    process.env.ANON_QUOTA_SALT = 'test-salt';
  });

  it('CF-IP 無しなら何もしない', async () => {
    const db = {
      select: vi.fn<SelectFn>(),
      insert: vi.fn<InsertFn>(),
    };
    await recordAnonUsage(makeIdentity({ cfConnectingIp: null }), { db });
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('CF-IP ありなら anon_quota_log に挿入', async () => {
    const db = {
      select: vi.fn<SelectFn>(() => Promise.resolve([])),
      insert: vi.fn<InsertFn>(() => Promise.resolve(1)),
    };
    await recordAnonUsage(makeIdentity(), { db });
    expect(db.insert).toHaveBeenCalledTimes(1);
    const [sql, params] = db.insert.mock.calls[0];
    expect(sql).toContain('anon_quota_log');
    expect(params).toBeTruthy();
    expect(params?.[0]).toMatch(/^[0-9a-f]{64}$/);
  });
});
