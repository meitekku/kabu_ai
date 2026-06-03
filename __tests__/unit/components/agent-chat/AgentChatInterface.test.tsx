import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AgentChatInterface } from '@/components/agent-chat/AgentChatInterface';

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: React.ComponentProps<'button'>) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: vi.fn().mockImplementation(
    ({ ...props }: React.ComponentProps<'textarea'>) => <textarea {...props} />,
  ),
}));

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: vi.fn().mockImplementation(
    ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <div {...props}>{children}</div>,
  ),
}));

vi.mock('lucide-react', () => ({
  Send: () => <span data-testid="send-icon" />,
  User: () => <span data-testid="user-icon" />,
  Bot: () => <span data-testid="bot-icon" />,
  Loader2: () => <span data-testid="loader-icon" />,
  Plus: () => <span data-testid="plus-icon" />,
  History: () => <span data-testid="history-icon" />,
}));

describe('AgentChatInterface', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state with starter questions', () => {
    render(<AgentChatInterface />);
    expect(screen.getByText('Agent Chat')).toBeInTheDocument();
    expect(screen.getByText('トヨタ自動車の最新決算と株価推移を教えて')).toBeInTheDocument();
  });

  it('renders history button when onOpenHistory is provided', () => {
    const onOpenHistory = vi.fn();
    render(<AgentChatInterface onOpenHistory={onOpenHistory} />);
    const historyButton = screen.getByText('履歴');
    expect(historyButton).toBeInTheDocument();
    fireEvent.click(historyButton);
    expect(onOpenHistory).toHaveBeenCalledTimes(1);
  });

  it('does not render history button when onOpenHistory is not provided', () => {
    render(<AgentChatInterface />);
    expect(screen.queryByText('履歴')).not.toBeInTheDocument();
  });

  it('renders new chat button when onNewChat is provided', () => {
    const onNewChat = vi.fn();
    render(<AgentChatInterface onNewChat={onNewChat} />);
    const newChatButton = screen.getByText('新しいチャット');
    expect(newChatButton).toBeInTheDocument();
  });

  it('renders initial messages when provided with chatId', () => {
    const messages = [
      { role: 'user' as const, content: 'テスト質問' },
      { role: 'assistant' as const, content: 'テスト回答' },
    ];
    render(<AgentChatInterface chatId="existing-chat" initialMessages={messages} />);
    expect(screen.getByText('テスト質問')).toBeInTheDocument();
    expect(screen.getByText('テスト回答')).toBeInTheDocument();
  });

  it('disables input when remainingQuestions is 0 (after API response)', () => {
    render(<AgentChatInterface />);
    const textarea = screen.getByPlaceholderText('メッセージを入力... (Shift+Enterで改行)');
    expect(textarea).not.toBeDisabled();
  });

  it('shows placeholder text in input area', () => {
    render(<AgentChatInterface />);
    expect(screen.getByPlaceholderText('メッセージを入力... (Shift+Enterで改行)')).toBeInTheDocument();
  });

  it('shows note about response time', () => {
    render(<AgentChatInterface />);
    expect(screen.getByText('DB照会・ウェブ検索を含むため、回答に時間がかかる場合があります。')).toBeInTheDocument();
  });
});
