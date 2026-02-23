import { beforeEach, describe, expect, it, vi } from 'vitest';

type DbSelectFn = (query: string, params?: Array<string | number | boolean | null>) => Promise<unknown[]>;
type DbDeleteFn = (query: string, params?: Array<string | number | boolean | null>) => Promise<number>;
type SessionValue = {
  user?: {
    id?: string;
    email?: string;
  };
} | null;
type GetSessionFn = () => Promise<SessionValue>;

const { mockSelect, mockDelete, mockGetSession, mockHeaders } = vi.hoisted(() => ({
  mockSelect: vi.fn<DbSelectFn>(),
  mockDelete: vi.fn<DbDeleteFn>(),
  mockGetSession: vi.fn<GetSessionFn>(() => Promise.resolve(null)),
  mockHeaders: vi.fn(() => Promise.resolve(new Headers({ host: 'localhost:3000' }))),
}));

vi.mock('@/lib/database/Mysql', () => ({
  Database: {
    getInstance: () => ({
      select: mockSelect,
      delete: mockDelete,
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

import { GET, DELETE } from '@/app/api/agent-chat/history/route';

describe('GET /api/agent-chat/history', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not logged in', async () => {
    mockGetSession.mockResolvedValue(null);

    const req = new Request('http://localhost/api/agent-chat/history');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns chat list for logged-in user', async () => {
    mockGetSession.mockResolvedValue({
      user: { id: 'user-1', email: 'user@example.com' },
    });
    mockSelect.mockResolvedValue([
      { id: 'chat-1', title: 'テストチャット', createdAt: new Date(), updatedAt: new Date() },
    ]);

    const req = new Request('http://localhost/api/agent-chat/history');
    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = (await res.json()) as { chats: Array<{ id: string }> };
    expect(data.chats).toHaveLength(1);
    expect(data.chats[0].id).toBe('chat-1');
  });

  it('returns messages for a specific chat', async () => {
    mockGetSession.mockResolvedValue({
      user: { id: 'user-1', email: 'user@example.com' },
    });
    mockSelect.mockResolvedValue([
      { id: 'msg-1', role: 'user', content: '質問', createdAt: new Date() },
      { id: 'msg-2', role: 'assistant', content: '回答', createdAt: new Date() },
    ]);

    const req = new Request('http://localhost/api/agent-chat/history?chatId=chat-1');
    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = (await res.json()) as { messages: Array<{ role: string }> };
    expect(data.messages).toHaveLength(2);
  });

  it('allows non-admin users to access history', async () => {
    mockGetSession.mockResolvedValue({
      user: { id: 'user-2', email: 'regular@example.com' },
    });
    mockSelect.mockResolvedValue([]);

    const req = new Request('http://localhost/api/agent-chat/history');
    const res = await GET(req);
    expect(res.status).toBe(200);
  });
});

describe('DELETE /api/agent-chat/history', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not logged in', async () => {
    mockGetSession.mockResolvedValue(null);

    const req = new Request('http://localhost/api/agent-chat/history?chatId=chat-1', { method: 'DELETE' });
    const res = await DELETE(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 when chatId is missing', async () => {
    mockGetSession.mockResolvedValue({
      user: { id: 'user-1', email: 'user@example.com' },
    });

    const req = new Request('http://localhost/api/agent-chat/history', { method: 'DELETE' });
    const res = await DELETE(req);
    expect(res.status).toBe(400);
  });

  it('deletes chat for logged-in user', async () => {
    mockGetSession.mockResolvedValue({
      user: { id: 'user-1', email: 'user@example.com' },
    });
    mockDelete.mockResolvedValue(1);

    const req = new Request('http://localhost/api/agent-chat/history?chatId=chat-1', { method: 'DELETE' });
    const res = await DELETE(req);
    expect(res.status).toBe(200);

    const data = (await res.json()) as { success: boolean };
    expect(data.success).toBe(true);

    expect(mockDelete).toHaveBeenCalledWith(
      'DELETE FROM agent_chat WHERE id = ? AND userId = ?',
      ['chat-1', 'user-1'],
    );
  });
});
