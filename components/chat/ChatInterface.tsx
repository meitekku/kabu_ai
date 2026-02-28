'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LoginModal } from '@/components/common/LoginModal';
import { PremiumModal } from '@/components/common/PremiumModal';
import { CloudflareTurnstileModal } from '@/components/common/CloudflareTurnstileModal';
import { useFingerprint } from '@/hooks/useFingerprint';
import { useCloudflareTurnstile } from '@/hooks/useCloudflareTurnstile';
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
  stockCode?: string;
}

interface CompanyInfoResponse {
  success?: boolean;
  data?: Array<{
    name?: string;
    company_name?: string;
  }>;
}

interface PriceRecord {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface PriceEvent {
  type: 'stop_high' | 'stop_low' | 'surge' | 'plunge';
  date: string;
  changePercent: number;
}

function detectPriceEvents(prices: PriceRecord[]): PriceEvent[] {
  if (prices.length < 2) return [];
  // prices are DESC order (newest first)
  const events: PriceEvent[] = [];
  for (let i = 0; i < prices.length - 1; i++) {
    const current = prices[i];
    const previous = prices[i + 1];
    if (previous.close === 0) continue;
    const changePercent = ((current.close - previous.close) / previous.close) * 100;
    const absChange = Math.abs(changePercent);

    if (changePercent > 0 && absChange >= 15) {
      events.push({ type: 'stop_high', date: current.date, changePercent });
    } else if (changePercent < 0 && absChange >= 15) {
      events.push({ type: 'stop_low', date: current.date, changePercent });
    } else if (changePercent > 0 && absChange >= 5) {
      events.push({ type: 'surge', date: current.date, changePercent });
    } else if (changePercent < 0 && absChange >= 5) {
      events.push({ type: 'plunge', date: current.date, changePercent });
    }
  }
  return events;
}

export function ChatInterface({ chatId, initialMessages = [], stockCode }: ChatInterfaceProps) {
  const fingerprint = useFingerprint();
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
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [showPremiumDialog, setShowPremiumDialog] = useState(false);
  const [showTurnstileDialog, setShowTurnstileDialog] = useState(false);
  const [stockName, setStockName] = useState<string | null>(null);
  const [priceEvents, setPriceEvents] = useState<PriceEvent[]>([]);
  const [hasUsedStarterQuestions, setHasUsedStarterQuestions] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const normalizedStockCode = stockCode?.trim().toUpperCase();
  const stockLabel = normalizedStockCode
    ? stockName
      ? `${stockName}（${normalizedStockCode}）`
      : normalizedStockCode
    : null;
  const {
    enabled: turnstileEnabled,
    verified: turnstileVerified,
    requiresVerification: turnstileRequired,
    isLoading: turnstileLoading,
    isVerifying: turnstileVerifying,
    error: turnstileError,
    verifyToken,
  } = useCloudflareTurnstile();
  const isInputLockedByTurnstile = turnstileLoading || turnstileRequired;

  const starterQuestions = (() => {
    if (!stockLabel) return [];

    // イベントに基づく質問を生成
    const eventQuestions: string[] = [];
    for (const event of priceEvents) {
      const dateStr = event.date.replace(/-/g, '/');
      const pct = Math.abs(event.changePercent).toFixed(1);
      if (event.type === 'stop_high') {
        eventQuestions.push(
          `${stockLabel}が${dateStr}にストップ高（+${pct}%）になった要因と今後の見通しを教えて`
        );
      } else if (event.type === 'stop_low') {
        eventQuestions.push(
          `${stockLabel}が${dateStr}にストップ安（-${pct}%）になった原因と反発の可能性を教えて`
        );
      } else if (event.type === 'surge') {
        eventQuestions.push(
          `${stockLabel}が${dateStr}に+${pct}%上昇した背景と上昇トレンドが続くか分析して`
        );
      } else if (event.type === 'plunge') {
        eventQuestions.push(
          `${stockLabel}が${dateStr}に-${pct}%下落した原因と買い場かどうか教えて`
        );
      }
      if (eventQuestions.length >= 2) break; // イベント質問は最大2つ
    }

    // デフォルト質問（イベント質問で埋まらない分を補完）
    const defaultQuestions = [
      `${stockLabel}の直近決算の注目ポイントを3つで教えて`,
      `${stockLabel}の株価が動く主要な材料を整理して`,
      `${stockLabel}を今買う場合のリスクを具体的に教えて`,
      `${stockLabel}と同業他社を比較して強み・弱みを教えて`,
    ];

    const remaining = 4 - eventQuestions.length;
    return [...eventQuestions, ...defaultQuestions.slice(0, remaining)];
  })();

  // テキストエリアの高さを自動調整
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(Math.max(textarea.scrollHeight, 44), 200);
      textarea.style.height = `${newHeight}px`;
    }
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [input, adjustTextareaHeight]);

  useEffect(() => {
    setHasUsedStarterQuestions(false);
    setPriceEvents([]);
  }, [normalizedStockCode]);

  // 直近の株価データを取得してイベントを検出
  useEffect(() => {
    let cancelled = false;
    setPriceEvents([]);

    if (!normalizedStockCode) return;

    const fetchPriceEvents = async () => {
      try {
        const response = await fetch(`/api/stocks/${normalizedStockCode}/chart`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: normalizedStockCode, num: 6 }),
        });
        if (!response.ok) return;
        const data = (await response.json()) as { success?: boolean; data?: PriceRecord[] };
        if (!cancelled && data.success && data.data) {
          const events = detectPriceEvents(data.data);
          setPriceEvents(events);
        }
      } catch {
        // 株価イベント取得失敗は無視
      }
    };

    fetchPriceEvents();
    return () => { cancelled = true; };
  }, [normalizedStockCode]);

  useEffect(() => {
    if (!turnstileLoading && turnstileRequired) {
      setShowTurnstileDialog(true);
    }
  }, [turnstileLoading, turnstileRequired]);

  useEffect(() => {
    let cancelled = false;
    setStockName(null);

    if (!normalizedStockCode) {
      return;
    }

    const fetchStockName = async () => {
      try {
        const response = await fetch(`/api/stocks/${normalizedStockCode}/company_info`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: normalizedStockCode }),
        });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as CompanyInfoResponse;
        const candidateName = data.data?.[0]?.name || data.data?.[0]?.company_name;
        if (!cancelled && typeof candidateName === 'string' && candidateName.trim()) {
          setStockName(candidateName.trim());
        }
      } catch {
        // 企業名が取得できなくてもコード表示で継続する
      }
    };

    fetchStockName();

    return () => {
      cancelled = true;
    };
  }, [normalizedStockCode]);

  // 新しいメッセージが追加されたらスクロール
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isInputLockedByTurnstile) {
      if (turnstileEnabled && !turnstileVerified) {
        setShowTurnstileDialog(true);
      }
      return;
    }
    if (!input.trim() || isLoading || !fingerprint) return;

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
          stockCode: normalizedStockCode,
          fingerprint,
        }),
      });

      if (!response.ok) {
        let errorMessage = 'チャットの送信に失敗しました';
        let requireLogin = false;
        let requirePremium = false;
        try {
          const data = (await response.json()) as { error?: string; requireLogin?: boolean; requirePremium?: boolean };
          if (typeof data.error === 'string' && data.error) {
            errorMessage = data.error;
          }
          requireLogin = data.requireLogin === true;
          requirePremium = data.requirePremium === true;
        } catch {
          // JSON以外のレスポンスはデフォルトメッセージを使用
        }

        // 利用制限エラーの場合
        if (response.status === 429) {
          if (requireLogin) {
            setShowLoginDialog(true);
          } else if (requirePremium) {
            setShowPremiumDialog(true);
          } else {
            setShowPremiumDialog(true);
          }
          // 送信したメッセージを削除
          setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
          return;
        }
        throw new Error(errorMessage);
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

  const handleStarterQuestionClick = useCallback((question: string) => {
    if (hasUsedStarterQuestions) {
      return;
    }

    setInput(question);
    setHasUsedStarterQuestions(true);

    requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (!textarea) {
        return;
      }
      textarea.focus();
      textarea.setSelectionRange(question.length, question.length);
    });
  }, [hasUsedStarterQuestions]);

  const handleTurnstileVerify = useCallback(
    (token: string): Promise<boolean> => verifyToken(token, 'ai-feature-access'),
    [verifyToken]
  );

  return (
    <div className="flex flex-col h-full bg-background pb-[120px] sm:pb-[140px]">
      <LoginModal
        open={showLoginDialog}
        onOpenChange={setShowLoginDialog}
        description="無料のチャット回数（1日1回）を使い切りました。ログインすると1日3回まで無料でご利用いただけます。"
      />

      <PremiumModal
        open={showPremiumDialog}
        onOpenChange={setShowPremiumDialog}
        title="本日の無料利用回数を超えました"
        description="無料プランではログインユーザーは1日3回までチャットをご利用いただけます。プレミアム会員になると、無制限でAIアシスタントをご利用いただけます。"
      />

      <CloudflareTurnstileModal
        open={showTurnstileDialog}
        onOpenChange={setShowTurnstileDialog}
        onVerify={handleTurnstileVerify}
        isSubmitting={turnstileVerifying}
        errorMessage={turnstileError}
        title="Cloudflare認証"
        description="AIチャットをご利用の前にCloudflare認証を完了してください。"
      />

      {!turnstileLoading && turnstileRequired && (
        <div className="border-b bg-amber-50/70 dark:bg-amber-950/20">
          <div className="max-w-3xl mx-auto px-4 py-2 flex items-center justify-between gap-3">
            <p className="text-xs text-amber-700 dark:text-amber-300">
              AIチャットを開始するにはCloudflare認証が必要です。
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowTurnstileDialog(true)}
            >
              認証する
            </Button>
          </div>
        </div>
      )}

      {stockLabel && (
        <div className="border-b bg-muted/20">
          <div className="max-w-3xl mx-auto px-4 py-2 text-sm text-muted-foreground">
            対象銘柄: <span className="font-medium text-foreground">{stockLabel}</span>
          </div>
        </div>
      )}

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
              {stockLabel && (
                <p className="mt-3 text-xs text-emerald-600 dark:text-emerald-400">
                  {stockLabel} の直近データを読み込んで回答します。
                </p>
              )}
              {!hasUsedStarterQuestions && starterQuestions.length > 0 && (
                <div className="mt-6">
                  <p className="text-xs text-muted-foreground mb-2">最初の質問テンプレート（1回のみ表示）</p>
                  <div className="flex flex-col sm:flex-wrap sm:flex-row justify-center gap-2 px-2 sm:px-0">
                    {starterQuestions.map((question) => (
                      <Button
                        key={question}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-auto py-2.5 px-3 text-xs whitespace-normal text-left"
                        onClick={() => handleStarterQuestionClick(question)}
                      >
                        {question}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex gap-3 p-3 sm:p-4 rounded-lg',
                message.role === 'user'
                  ? 'bg-primary/10 ml-4 sm:ml-12'
                  : 'bg-muted mr-4 sm:mr-12'
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
            <div className="flex gap-3 p-3 sm:p-4 rounded-lg bg-muted mr-4 sm:mr-12">
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
      <div className="fixed bottom-0 left-0 right-0 border-t bg-background p-3 sm:p-4 z-50">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="flex gap-2 items-end">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isInputLockedByTurnstile
                  ? turnstileLoading
                    ? '認証状態を確認中...'
                    : 'Cloudflare認証を完了してください'
                  : fingerprint
                    ? 'メッセージを入力... (Shift+Enterで改行)'
                    : 'チャットを準備中...'
              }
              className="min-h-[44px] sm:min-h-[60px] max-h-[200px] resize-none overflow-y-auto text-base"
              style={{ height: '44px' }}
              disabled={isLoading || !fingerprint || isInputLockedByTurnstile}
            />
            <Button
              type="submit"
              size="icon"
              className="h-[44px] w-[44px] sm:h-[60px] sm:w-[60px] flex-shrink-0"
              disabled={isLoading || !input.trim() || !fingerprint || isInputLockedByTurnstile}
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
