'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, User, Bot, Loader2, Plus, History } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface AgentChatInterfaceProps {
  chatId?: string;
  initialMessages?: Array<{ role: 'user' | 'assistant'; content: string }>;
  onChatCreated?: (chatId: string) => void;
  onNewChat?: () => void;
  onOpenHistory?: () => void;
}

export function AgentChatInterface({
  chatId,
  initialMessages = [],
  onChatCreated,
  onNewChat,
  onOpenHistory,
}: AgentChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(
    initialMessages.map((msg, i) => ({
      id: `initial-${i}`,
      role: msg.role,
      content: msg.content,
    })),
  );
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentChatId, setCurrentChatId] = useState(chatId);
  const [remainingQuestions, setRemainingQuestions] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(Math.max(textarea.scrollHeight, 60), 200);
      textarea.style.height = `${newHeight}px`;
    }
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [input, adjustTextareaHeight]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    setCurrentChatId(chatId);
    if (!chatId) {
      setMessages([]);
    }
  }, [chatId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || remainingQuestions === 0) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/agent-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          chatId: currentChatId,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || 'エージェントチャットの送信に失敗しました');
      }

      const newChatId = response.headers.get('X-Chat-Id');
      if (newChatId && !currentChatId) {
        setCurrentChatId(newChatId);
        onChatCreated?.(newChatId);
      }

      const remaining = response.headers.get('X-Remaining-Questions');
      if (remaining !== null) {
        setRemainingQuestions(parseInt(remaining, 10));
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('ストリームの読み取りに失敗しました');
      }

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: '',
      };

      setMessages((prev) => [...prev, assistantMessage]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        assistantMessage.content += text;

        setMessages((prev) =>
          prev.map((m) => (m.id === assistantMessage.id ? { ...m, content: assistantMessage.content } : m)),
        );
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : '';
      setError(errMsg || '申し訳ございません。しばらく時間をおいてから再度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background pb-[140px]">
      <div className="flex items-center justify-end gap-2 p-2 border-b">
        {onOpenHistory && (
          <Button variant="outline" size="sm" onClick={onOpenHistory}>
            <History className="w-4 h-4 mr-1" />
            履歴
          </Button>
        )}
        {onNewChat && (
          <Button variant="outline" size="sm" onClick={onNewChat}>
            <Plus className="w-4 h-4 mr-1" />
            新しいチャット
          </Button>
        )}
      </div>

      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-12">
              <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">Agent Chat</h3>
              <p className="text-sm">
                株式データベースとウェブ検索を活用するAIエージェントです。
                <br />
                銘柄分析、決算データ、市場動向など、なんでもお聞きください。
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {[
                  'トヨタ自動車の最新決算と株価推移を教えて',
                  '今日のストップ高銘柄を一覧して',
                  '半導体関連銘柄のPER比較をして',
                  '最近の市場全体の動向を分析して',
                ].map((question) => (
                  <Button
                    key={question}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-auto py-2 px-3 text-xs whitespace-normal text-left"
                    onClick={() => setInput(question)}
                  >
                    {question}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={cn('flex gap-3 p-4 rounded-lg', message.role === 'user' ? 'bg-primary/10 ml-12' : 'bg-muted mr-12')}
            >
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                  message.role === 'user' ? 'bg-primary' : 'bg-secondary',
                )}
              >
                {message.role === 'user' ? (
                  <User className="w-4 h-4 text-primary-foreground" />
                ) : (
                  <Bot className="w-4 h-4 text-secondary-foreground" />
                )}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium mb-1">{message.role === 'user' ? 'あなた' : 'AI エージェント'}</p>
                <div className="text-sm whitespace-pre-wrap break-words">{message.content}</div>
              </div>
            </div>
          ))}

          {isLoading && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex gap-3 p-4 rounded-lg bg-muted mr-12">
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-secondary">
                <Bot className="w-4 h-4 text-secondary-foreground" />
              </div>
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm text-muted-foreground">エージェントが処理中...</span>
              </div>
            </div>
          )}

          {error && <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
        </div>
      </ScrollArea>

      <div className="fixed bottom-0 left-0 right-0 border-t bg-background p-4 z-50">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          {remainingQuestions !== null && remainingQuestions <= 3 && remainingQuestions > 0 && (
            <p className="text-xs text-muted-foreground/50 text-center mb-1">残り{remainingQuestions}回です</p>
          )}
          {remainingQuestions === 0 && (
            <p className="text-xs text-destructive/60 text-center mb-1">
              質問回数の上限に達しました。新しいチャットを開始してください。
            </p>
          )}
          <div className="flex gap-2 items-end">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="メッセージを入力... (Shift+Enterで改行)"
              className="min-h-[60px] max-h-[200px] resize-none overflow-y-auto"
              style={{ height: '60px' }}
              disabled={isLoading || remainingQuestions === 0}
            />
            <Button
              type="submit"
              size="icon"
              className="h-[60px] w-[60px] flex-shrink-0"
              disabled={isLoading || !input.trim() || remainingQuestions === 0}
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            DB照会・ウェブ検索を含むため、回答に時間がかかる場合があります。
          </p>
        </form>
      </div>
    </div>
  );
}
