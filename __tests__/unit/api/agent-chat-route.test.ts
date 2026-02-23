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

const { mockSelect, mockInsert, mockGetSession, mockHeaders, mockIsAuthAvailable } = vi.hoisted(() => ({
  mockSelect: vi.fn<DbSelectFn>(),
  mockInsert: vi.fn<DbInsertFn>(),
  mockGetSession: vi.fn<GetSessionFn>(() => Promise.resolve(null)),
  mockHeaders: vi.fn(() => Promise.resolve(new Headers({ host: 'localhost:3000' }))),
  mockIsAuthAvailable: vi.fn(() => Promise.resolve(true)),
}));

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
}));

vi.mock('@/lib/agent/orchestrator', () => ({
  runOrchestrator: vi.fn(() => Promise.resolve('テスト回答です')),
}));

vi.mock('uuid', () => ({
  v4: () => 'test-uuid-1234',
}));

vi.mock('@/lib/agent/claude-auth', () => ({
  isAuthAvailable: mockIsAuthAvailable,
}));

import { POST } from '@/app/api/agent-chat/route';

describe('POST /api/agent-chat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAuthAvailable.mockResolvedValue(true);
    mockGetSession.mockResolvedValue(null);
    mockSelect.mockResolvedValue([{ cnt: 0 }]);
    mockInsert.mockResolvedValue(1);
  });

  it('returns 401 when not logged in', async () => {
    mockGetSession.mockResolvedValue(null);

    const req = new Request('http://localhost/api/agent-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'テスト' }],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);

    const data = (await res.json()) as { error: string };
    expect(data.error).toBe('ログインが必要です');
  });

  it('allows non-admin logged-in users', async () => {
    mockGetSession.mockResolvedValue({
      user: { id: 'user-1', email: 'regular@example.com' },
    });

    const req = new Request('http://localhost/api/agent-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'テスト質問' }],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('X-Chat-Id')).toBeTruthy();
  });

  it('returns X-Remaining-Questions header', async () => {
    mockGetSession.mockResolvedValue({
      user: { id: 'user-1', email: 'user@example.com' },
    });
    mockSelect.mockResolvedValue([{ cnt: 5 }]);

    const req = new Request('http://localhost/api/agent-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'テスト' }],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('X-Remaining-Questions')).toBe('14');
  });

  it('returns 429 when question limit reached', async () => {
    mockGetSession.mockResolvedValue({
      user: { id: 'user-1', email: 'user@example.com' },
    });
    mockSelect.mockResolvedValue([{ cnt: 20 }]);

    const req = new Request('http://localhost/api/agent-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'テスト' }],
        chatId: 'existing-chat-id',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(429);

    const data = (await res.json()) as { error: string; remainingQuestions: number };
    expect(data.remainingQuestions).toBe(0);
  });

  it('returns 400 when messages are empty', async () => {
    mockGetSession.mockResolvedValue({
      user: { id: 'user-1', email: 'user@example.com' },
    });

    const req = new Request('http://localhost/api/agent-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 500 when Claude auth is not available', async () => {
    mockIsAuthAvailable.mockResolvedValue(false);
    mockGetSession.mockResolvedValue({
      user: { id: 'user-1', email: 'user@example.com' },
    });

    const req = new Request('http://localhost/api/agent-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'テスト' }],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(500);

    const data = (await res.json()) as { error: string };
    expect(data.error).toContain('Claude認証');
  });
});
