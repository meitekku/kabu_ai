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

const { mockSelect, mockInsert, mockGetSession, mockHeaders } = vi.hoisted(() => ({
  mockSelect: vi.fn<DbSelectFn>(),
  mockInsert: vi.fn<DbInsertFn>(),
  mockGetSession: vi.fn<GetSessionFn>(() => Promise.resolve(null)),
  mockHeaders: vi.fn(() => Promise.resolve(new Headers({ host: 'localhost:3000' }))),
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

// Claude Agent SDK mock — createAgentStream returns an async iterable
vi.mock('@/lib/agent/claude-code', () => ({
  createAgentStream: vi.fn(() => ({
    async *[Symbol.asyncIterator]() {
      yield {
        type: 'assistant',
        message: { content: [{ type: 'text', text: 'テスト回答です' }] },
        session_id: 'test-session',
      };
      yield {
        type: 'result',
        subtype: 'success',
        result: 'テスト回答です',
        total_cost_usd: 0.001,
        num_turns: 1,
        duration_ms: 100,
        session_id: 'test-session',
      };
    },
  })),
}));

vi.mock('uuid', () => ({
  v4: () => 'test-uuid-1234',
}));

vi.mock('@/lib/auth/email', () => ({
  sendAgentChatErrorEmail: vi.fn(),
}));

import { POST } from '@/app/api/agent-chat/route';

// Helper: mockSelect responds to plan check first, then other queries
function setupAgentPlanUser(email = 'user@example.com') {
  mockGetSession.mockResolvedValue({
    user: { id: 'user-1', email },
  });
  // First select: plan check, second select: message count
  mockSelect
    .mockResolvedValueOnce([{ subscription_plan: 'agent', email }])
    .mockResolvedValueOnce([{ cnt: 0 }]);
}

function setupAdminUser() {
  mockGetSession.mockResolvedValue({
    user: { id: 'admin-1', email: 'smartaiinvest@gmail.com' },
  });
  // Admin bypasses plan check but still has plan query + message count query
  mockSelect
    .mockResolvedValueOnce([{ cnt: 0 }]);
}

function setupNonAgentUser(email = 'free@example.com') {
  mockGetSession.mockResolvedValue({
    user: { id: 'user-2', email },
  });
  mockSelect.mockResolvedValueOnce([{ subscription_plan: 'standard', email }]);
}

describe('POST /api/agent-chat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(null);
    mockSelect.mockResolvedValue([{ cnt: 0 }]);
    mockInsert.mockResolvedValue(1);
  });

  it('returns 401 when not logged in', async () => {
    mockGetSession.mockResolvedValue(null);

    const req = new Request('http://localhost/api/agent-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'テスト' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);

    const data = (await res.json()) as { error: string };
    expect(data.error).toBe('ログインが必要です');
  });

  it('returns 403 when user has no agent plan', async () => {
    setupNonAgentUser();

    const req = new Request('http://localhost/api/agent-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'テスト' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);

    const data = (await res.json()) as { error: string; requireAgentPlan: boolean };
    expect(data.requireAgentPlan).toBe(true);
  });

  it('allows agent plan users and returns SSE stream', async () => {
    setupAgentPlanUser();

    const req = new Request('http://localhost/api/agent-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'テスト質問' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/event-stream');
  });

  it('allows admin users and returns SSE stream', async () => {
    setupAdminUser();

    const req = new Request('http://localhost/api/agent-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'テスト質問' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/event-stream');
  });

  it('returns 429 when question limit reached', async () => {
    mockGetSession.mockResolvedValue({
      user: { id: 'user-1', email: 'smartaiinvest@gmail.com' },
    });
    // Admin: skips plan check, message count returns 20
    mockSelect.mockResolvedValue([{ cnt: 20 }]);

    const req = new Request('http://localhost/api/agent-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'テスト',
        chatId: 'existing-chat-id',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(429);

    const data = (await res.json()) as { error: string; remainingQuestions: number };
    expect(data.remainingQuestions).toBe(0);
  });

  it('returns 400 when message is empty', async () => {
    setupAdminUser();

    const req = new Request('http://localhost/api/agent-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
