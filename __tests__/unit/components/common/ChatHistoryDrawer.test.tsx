import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatHistoryDrawer } from '@/components/common/ChatHistoryDrawer';

vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="sheet">{children}</div> : null,
  SheetContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sheet-content">{children}</div>
  ),
  SheetHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sheet-header">{children}</div>
  ),
  SheetTitle: ({ children }: { children: React.ReactNode }) => (
    <h2 data-testid="sheet-title">{children}</h2>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: React.ComponentProps<'button'>) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('lucide-react', () => ({
  MessageSquarePlus: () => <span data-testid="plus-icon" />,
  Trash2: () => <span data-testid="trash-icon" />,
  MessageSquare: () => <span data-testid="message-icon" />,
}));

vi.mock('date-fns', () => ({
  format: () => '2/23 12:00',
}));

vi.mock('date-fns/locale', () => ({
  ja: {},
}));

const mockFetch = vi.fn();

describe('ChatHistoryDrawer', () => {
  const defaultProps = {
    apiBasePath: '/api/agent-chat',
    onSelectChat: vi.fn(),
    onNewChat: vi.fn(),
    open: true,
    onOpenChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', mockFetch);
  });

  it('renders nothing when closed', () => {
    render(<ChatHistoryDrawer {...defaultProps} open={false} />);
    expect(screen.queryByTestId('sheet')).not.toBeInTheDocument();
  });

  it('renders header and new chat button when open', () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ chats: [] }),
    });

    render(<ChatHistoryDrawer {...defaultProps} />);
    expect(screen.getByText('チャット履歴')).toBeInTheDocument();
    expect(screen.getByText('新しいチャット')).toBeInTheDocument();
  });

  it('shows empty state when no chats', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ chats: [] }),
    });

    render(<ChatHistoryDrawer {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('チャット履歴がありません')).toBeInTheDocument();
    });
  });

  it('displays chat list', async () => {
    mockFetch.mockResolvedValue({
      json: () =>
        Promise.resolve({
          chats: [
            { id: 'chat-1', title: 'テストチャット1', createdAt: '2026-02-23T12:00:00Z', updatedAt: '2026-02-23T12:00:00Z' },
            { id: 'chat-2', title: 'テストチャット2', createdAt: '2026-02-23T11:00:00Z', updatedAt: '2026-02-23T11:00:00Z' },
          ],
        }),
    });

    render(<ChatHistoryDrawer {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('テストチャット1')).toBeInTheDocument();
      expect(screen.getByText('テストチャット2')).toBeInTheDocument();
    });
  });

  it('calls onNewChat when new chat button is clicked', () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ chats: [] }),
    });

    render(<ChatHistoryDrawer {...defaultProps} />);
    fireEvent.click(screen.getByText('新しいチャット'));
    expect(defaultProps.onNewChat).toHaveBeenCalledTimes(1);
  });

  it('calls onSelectChat when a chat is clicked', async () => {
    mockFetch
      .mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            chats: [
              { id: 'chat-1', title: 'テストチャット', createdAt: '2026-02-23T12:00:00Z', updatedAt: '2026-02-23T12:00:00Z' },
            ],
          }),
      })
      .mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            messages: [
              { role: 'user', content: '質問' },
              { role: 'assistant', content: '回答' },
            ],
          }),
      });

    render(<ChatHistoryDrawer {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('テストチャット')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('テストチャット'));

    await waitFor(() => {
      expect(defaultProps.onSelectChat).toHaveBeenCalledWith('chat-1', [
        { role: 'user', content: '質問' },
        { role: 'assistant', content: '回答' },
      ]);
    });
  });

  it('fetches chats from the correct API path', async () => {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ chats: [] }),
    });

    render(<ChatHistoryDrawer {...defaultProps} apiBasePath="/api/custom-chat" />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/custom-chat/history');
    });
  });
});
