import { beforeEach, describe, expect, it, vi } from 'vitest';

type DbSelectFn = (query: string, params?: Array<string | number | boolean | null>) => Promise<unknown[]>;
type DbInsertFn = (query: string, params?: Array<string | number | boolean | null>) => Promise<number>;
type SessionValue = {
  user?: {
    id?: string;
    email?: string;
  };
} | null;
type GetSessionFn = () => Promise<SessionValue>;
type CookieValue = { value: string } | undefined;
type CookieGetFn = (name: string) => CookieValue;

const { mockSelect, mockInsert, mockGetSession, mockHeaders, mockCookies, mockCookieGet } = vi.hoisted(() => {
  const mockCookieGet = vi.fn<CookieGetFn>(() => undefined);

  return {
    mockSelect: vi.fn<DbSelectFn>(),
    mockInsert: vi.fn<DbInsertFn>(),
    mockGetSession: vi.fn<GetSessionFn>(() => Promise.resolve(null)),
    mockHeaders: vi.fn(() =>
      Promise.resolve(
        new Headers({
          host: 'localhost:3000',
          'x-forwarded-for': '203.0.113.10',
        })
      )
    ),
    mockCookieGet,
    mockCookies: vi.fn(() =>
      Promise.resolve({
        get: (name: string) => mockCookieGet(name),
      })
    ),
  };
});

vi.mock('@/lib/database/Mysql', () => ({
  Database: {
    getInstance: () => ({
      select: mockSelect,
      insert: mockInsert,
    }),
  },
}));

vi.mock('@/lib/auth/auth', () => ({
  auth: {
    api: {
      getSession: mockGetSession,
    },
  },
}));

vi.mock('next/headers', () => ({
  headers: mockHeaders,
  cookies: mockCookies,
}));

import { POST } from '@/app/api/chat/route';

describe('POST /api/chat (GLM)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    process.env.GLM_API_KEY = 'test-glm-key';
    process.env.GLM_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
    process.env.GLM_CHAT_MODEL = 'glm-4-plus';

    mockGetSession.mockResolvedValue(null);
    mockCookieGet.mockReturnValue(undefined);

    mockSelect.mockImplementation((query: string) => {
      if (query.includes('SELECT COUNT(*) as count FROM chat_usage_log')) {
        return Promise.resolve([{ count: 0 }]);
      }
      if (query.includes('SELECT c.code, c.name, ci.settlement_date')) {
        return Promise.resolve([{ code: '7203', name: 'トヨタ自動車', settlement_date: '2026-02-05' }]);
      }
      if (query.includes('FROM price')) {
        return Promise.resolve([
          { date: '2026-02-16', close: 3000, volume: 1000000 },
          { date: '2026-02-15', close: 2950, volume: 900000 },
        ]);
      }
      if (query.includes('FROM post p')) {
        return Promise.resolve([{ title: '直近ニュース', created_at: '2026-02-16T09:00:00Z' }]);
      }
      if (query.includes('FROM kabutan_annual_results')) {
        return Promise.resolve([{ period: '2025', revenue: 100, operating_profit: 20, net_income: 15, eps: 50 }]);
      }
      if (query.includes('FROM kabutan_quarterly_results')) {
        return Promise.resolve([{ period: '2025Q4', revenue: 25, operating_profit: 6, net_income: 4 }]);
      }
      return Promise.resolve([]);
    });

    mockInsert.mockResolvedValue(1);
  });

  it('streams GLM response and stores assistant message', async () => {
    const fetchMock = vi.fn((_url: string | URL | globalThis.Request, init?: RequestInit) => {
      expect(init?.method).toBe('POST');
      expect(init?.headers).toMatchObject({
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-glm-key',
      });

      const payload = JSON.parse(String(init?.body));
      expect(payload.model).toBe('glm-4-plus');
      expect(payload.stream).toBe(true);
      expect(payload.messages[0].role).toBe('system');
      expect(payload.messages[0].content).toContain('事前取得データ');
      expect(payload.messages[payload.messages.length - 1].content).toContain('7203');

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"トヨタ"}}]}\n\n'));
          controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"の要約"}}]}\n\n'));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        },
      });

      return Promise.resolve(new Response(stream, {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
      }));
    });

    vi.stubGlobal('fetch', fetchMock);

    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: '7203の直近材料を教えて' }],
        stockCode: '7203',
        fingerprint: 'visitor-test-id',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('X-Chat-Id')).toBeTruthy();
    expect(res.headers.get('X-Stock-Code')).toBe('7203');

    const text = await res.text();
    expect(text).toBe('トヨタの要約');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const assistantInsert = mockInsert.mock.calls.find(
      (call) =>
        typeof call[0] === 'string' &&
        call[0].includes('INSERT INTO chatbot_message') &&
        Array.isArray(call[1]) &&
        call[1][2] === 'assistant'
    );
    expect(assistantInsert).toBeDefined();
    expect(assistantInsert?.[1]?.[3]).toBe('トヨタの要約');

    const usageInsert = mockInsert.mock.calls.find(
      (call) =>
        typeof call[0] === 'string' &&
        call[0].includes('INSERT INTO chat_usage_log')
    );
    expect(usageInsert).toBeDefined();
    expect(usageInsert?.[1]?.[1]).toBe('visitor-test-id');

    vi.unstubAllGlobals();
  });

  it('returns requireLogin when guest daily limit is reached', async () => {
    mockSelect.mockImplementation((query: string) => {
      if (query.includes('SELECT COUNT(*) as count FROM chat_usage_log')) {
        return Promise.resolve([{ count: 1 }]);
      }
      return Promise.resolve([]);
    });

    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: '今日の相場どう？' }],
        fingerprint: 'visitor-test-id',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(429);

    const data = await res.json() as { requireLogin?: boolean; requirePremium?: boolean };
    expect(data.requireLogin).toBe(true);
    expect(data.requirePremium).toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it('returns requirePremium when logged-in daily limit is reached', async () => {
    mockGetSession.mockResolvedValue({
      user: {
        id: 'user-1',
        email: 'user@example.com',
      },
    });

    mockSelect.mockImplementation((query: string) => {
      if (query.includes('SELECT subscription_status FROM user WHERE id = ?')) {
        return Promise.resolve([{ subscription_status: 'inactive' }]);
      }
      if (query.includes('SELECT COUNT(*) as count FROM chat_usage_log')) {
        return Promise.resolve([{ count: 3 }]);
      }
      return Promise.resolve([]);
    });

    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'ファンダ分析して' }],
        fingerprint: 'visitor-test-id',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(429);

    const data = await res.json() as { requireLogin?: boolean; requirePremium?: boolean };
    expect(data.requirePremium).toBe(true);
    expect(data.requireLogin).toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });
});
