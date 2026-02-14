'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PremiumModal } from '@/components/common/PremiumModal';
import { Send, User, Bot, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ChatInterfaceProps {
  chatId?: string;
  initialMessages?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export function ChatInterface({ chatId, initialMessages = [] }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(
    initialMessages.map((msg, i) => ({
      id: `initial-${i}`,
      role: msg.role,
      content: msg.content,
    }))
  );
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentChatId, setCurrentChatId] = useState(chatId);
  const [showLimitDialog, setShowLimitDialog] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // テキストエリアの高さを自動調整
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

  // 新しいメッセージが追加されたらスクロール
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

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
      const response = await fetch('/api/chat', {
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
        // 利用制限エラーの場合
        if (response.status === 429) {
          setShowLimitDialog(true);
          // 送信したメッセージを削除
          setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
          return;
        }
        throw new Error('チャットの送信に失敗しました');
      }

      // チャットIDを取得
      const newChatId = response.headers.get('X-Chat-Id');
      if (newChatId && !currentChatId) {
        setCurrentChatId(newChatId);
      }

      // ストリーミングレスポンスを処理
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
          prev.map((m) =>
            m.id === assistantMessage.id
              ? { ...m, content: assistantMessage.content }
              : m
          )
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
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
      {/* 利用制限ポップアップ */}
      <PremiumModal
        open={showLimitDialog}
        onOpenChange={setShowLimitDialog}
        title="本日の無料利用回数を超えました"
        description="無料プランでは1日3回までチャットをご利用いただけます。プレミアム会員になると、無制限でAIアシスタントをご利用いただけます。"
      />

      {/* メッセージエリア */}
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-12">
              <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">株式投資AIアシスタント</h3>
              <p className="text-sm">
                株式投資に関する質問をお気軽にどうぞ。
                <br />
                銘柄分析、投資戦略、市場動向など、なんでもお答えします。
              </p>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex gap-3 p-4 rounded-lg',
                message.role === 'user'
                  ? 'bg-primary/10 ml-12'
                  : 'bg-muted mr-12'
              )}
            >
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                  message.role === 'user' ? 'bg-primary' : 'bg-secondary'
                )}
              >
                {message.role === 'user' ? (
                  <User className="w-4 h-4 text-primary-foreground" />
                ) : (
                  <Bot className="w-4 h-4 text-secondary-foreground" />
                )}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium mb-1">
                  {message.role === 'user' ? 'あなた' : 'AI アシスタント'}
                </p>
                <div className="text-sm whitespace-pre-wrap break-words">
                  {message.content}
                </div>
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
                <span className="text-sm text-muted-foreground">考え中...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
              エラーが発生しました: {error}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* 入力エリア - 画面下部に固定 */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-background p-4 z-50">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="flex gap-2 items-end">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="メッセージを入力... (Shift+Enterで改行)"
              className="min-h-[60px] max-h-[200px] resize-none overflow-y-auto"
              style={{ height: '60px' }}
              disabled={isLoading}
            />
            <Button
              type="submit"
              size="icon"
              className="h-[60px] w-[60px] flex-shrink-0"
              disabled={isLoading || !input.trim()}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            投資判断は自己責任でお願いします。AIの回答は参考情報です。
          </p>
        </form>
      </div>
    </div>
  );
}
