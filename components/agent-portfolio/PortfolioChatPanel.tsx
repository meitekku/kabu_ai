"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { AlertCircleIcon } from "lucide-react";
import {
  Conversation,
  ConversationContent,
} from "./ai-elements/conversation";
import { Message, MessageContent } from "./ai-elements/message";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { QuotaBadge } from "./QuotaBadge";
import { LockedOverlay } from "./LockedOverlay";
import {
  PortfolioBuilder,
  type BuilderStock,
  type RiskLevel,
} from "./PortfolioBuilder";
import { useAuth } from "@/components/auth";
import { useAgentQuota } from "@/hooks/useAgentQuota";
import { useAnonAgentQuota } from "@/hooks/useAnonAgentQuota";
import { useCloudflareTurnstile } from "@/hooks/useCloudflareTurnstile";
import { CloudflareTurnstileModal } from "@/components/common/CloudflareTurnstileModal";

export interface PortfolioChatHandle {
  sendMessage: (text: string) => void;
}

interface PortfolioChatPanelProps {
  className?: string;
  // WHY: chat id keys the underlying useChat instance so history switching
  // hot-swaps state cleanly (sendMessage / messages reset per id).
  chatId?: string;
  initialMessages?: UIMessage[];
  onMessagesChange?: (messages: UIMessage[]) => void;
  onLinkClick?: (text: string, href: string) => void;
  onHasMessagesChange?: (hasMessages: boolean) => void;
  // ビルダー状態(空状態のときだけ表示する)
  builderRisk: RiskLevel | null;
  setBuilderRisk: (r: RiskLevel) => void;
  builderStocks: BuilderStock[];
  onAddBuilderStock: (s: BuilderStock) => void;
  onRemoveBuilderStock: (id: string) => void;
  onClearBuilder: () => void;
}

export const PortfolioChatPanel = forwardRef<
  PortfolioChatHandle,
  PortfolioChatPanelProps
>(function PortfolioChatPanel(
  {
    className,
    chatId,
    initialMessages,
    onMessagesChange,
    onLinkClick,
    onHasMessagesChange,
    builderRisk,
    setBuilderRisk,
    builderStocks,
    onAddBuilderStock,
    onRemoveBuilderStock,
    onClearBuilder,
  },
  ref,
) {
  const { isLogin, isLoading: authLoading } = useAuth();
  const quota = useAgentQuota();
  const anonQuota = useAnonAgentQuota(!isLogin && !authLoading);
  const turnstile = useCloudflareTurnstile();
  const [stoppedFlag, setStoppedFlag] = useState(false);
  const [turnstileOpen, setTurnstileOpen] = useState(false);
  const pendingPromptRef = useRef<string | null>(null);

  const {
    messages,
    sendMessage,
    regenerate,
    stop,
    status,
    error,
  } = useChat({
    id: chatId ?? "portfolio-agent",
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/agent-portfolio",
    }),
  });

  const isLoading = status === "submitted" || status === "streaming";

  // WHY: refetch quota after assistant finishes — backend decremented usage.
  // 匿名側も同様に anonQuota を再取得する。
  const prevStatus = useRef(status);
  useEffect(() => {
    const wasLoading =
      prevStatus.current === "submitted" || prevStatus.current === "streaming";
    prevStatus.current = status;
    if (wasLoading && (status === "ready" || status === "error")) {
      if (isLogin) {
        quota.refetch();
      } else {
        void anonQuota.refetch();
      }
    }
  }, [status, isLogin, quota, anonQuota]);

  // WHY: bubble messages up to history persistence layer; only persist after a
  // turn settles (ready/error) to avoid spamming localStorage during streaming.
  const onMessagesChangeRef = useRef(onMessagesChange);
  useEffect(() => {
    onMessagesChangeRef.current = onMessagesChange;
  }, [onMessagesChange]);
  useEffect(() => {
    if (!onMessagesChangeRef.current) return;
    if (status !== "ready" && status !== "error") return;
    if (messages.length === 0) return;
    onMessagesChangeRef.current(messages);
  }, [messages, status]);

  // WHY: 親(TopChatShell)に空状態かどうかを伝えて、右パネルのアクション
  // (追加 vs 質問)を切り替える材料にする
  const onHasMessagesChangeRef = useRef(onHasMessagesChange);
  useEffect(() => {
    onHasMessagesChangeRef.current = onHasMessagesChange;
  }, [onHasMessagesChange]);
  useEffect(() => {
    onHasMessagesChangeRef.current?.(messages.length > 0);
  }, [messages.length]);

  const sendNow = useCallback(
    (text: string) => {
      setStoppedFlag(false);
      sendMessage({ text });
    },
    [sendMessage],
  );

  const handleSend = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      // 匿名でクオータ尽きていればここで止める(LockedOverlay 表示)
      if (
        !isLogin &&
        !anonQuota.isLoading &&
        anonQuota.remaining <= 0
      ) {
        return;
      }
      // 匿名 + Turnstile 未検証なら認証モーダルを挟む
      if (!isLogin && turnstile.requiresVerification) {
        pendingPromptRef.current = text;
        setTurnstileOpen(true);
        return;
      }
      sendNow(text);
    },
    [isLogin, anonQuota, turnstile.requiresVerification, sendNow],
  );

  const handleTurnstileVerify = useCallback(
    async (token: string): Promise<boolean> => {
      const ok = await turnstile.verifyToken(token);
      if (ok) {
        setTurnstileOpen(false);
        const queued = pendingPromptRef.current;
        pendingPromptRef.current = null;
        if (queued) {
          sendNow(queued);
        }
      }
      return ok;
    },
    [turnstile, sendNow],
  );

  useImperativeHandle(
    ref,
    () => ({
      sendMessage: handleSend,
    }),
    [handleSend],
  );

  const handleStop = useCallback(() => {
    setStoppedFlag(true);
    stop();
  }, [stop]);

  const handleRegenerate = useCallback(() => {
    setStoppedFlag(false);
    regenerate();
  }, [regenerate]);

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
  }, []);

  // WHY: clicking a stock link inside an assistant reply should ask the agent
  // for a deeper explanation in the same chat instead of leaving the page.
  const handleStockLinkClick = useCallback(
    (text: string, _href: string) => {
      if (status === "submitted" || status === "streaming") return;
      const question = `${text} について詳しく教えて`;
      handleSend(question);
    },
    [handleSend, status],
  );

  const linkClickHandler = useMemo(
    () => onLinkClick ?? handleStockLinkClick,
    [onLinkClick, handleStockLinkClick],
  );

  // 匿名/ログインで残数の出元を切替
  const showAnonQuota = !isLogin;
  const remaining = showAnonQuota
    ? anonQuota.remaining
    : quota.isUnlimited
      ? quota.total
      : quota.remaining;
  const totalForBadge = showAnonQuota ? anonQuota.limit : quota.total;
  const isUnlimitedForBadge = showAnonQuota ? false : quota.isUnlimited;
  const isQuotaLoading = showAnonQuota ? anonQuota.isLoading : quota.isLoading;

  const anonExhausted =
    showAnonQuota && !anonQuota.isLoading && anonQuota.remaining <= 0;
  const loginExhausted =
    !showAnonQuota &&
    !quota.isUnlimited &&
    !quota.isLoading &&
    quota.remaining <= 0;
  const inputDisabled = anonExhausted || loginExhausted;
  const lockReason: "login" | "quota" | "anon_quota" | null = anonExhausted
    ? "anon_quota"
    : loginExhausted
      ? "quota"
      : null;

  const placeholder = anonExhausted
    ? "本日のお試し上限に達しました"
    : loginExhausted
      ? "本日の利用上限に達しました"
      : showAnonQuota
        ? "投資目標を入力(匿名でお試し中)..."
        : "投資目標やリスク許容度を入力してください...";

  const handleBuilderSubmit = useCallback(
    (prompt: string) => {
      handleSend(prompt);
      onClearBuilder();
    },
    [handleSend, onClearBuilder],
  );

  return (
    <div
      className={`relative flex h-full min-h-0 flex-1 flex-col overflow-hidden ${className ?? ""}`}
    >
      <Conversation className="flex-1 min-w-0">
        <ConversationContent className="min-h-full !gap-0 !p-0">
          {messages.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-5 p-8 pb-32">
              <PortfolioBuilder
                risk={builderRisk}
                setRisk={setBuilderRisk}
                stocks={builderStocks}
                onAddStock={onAddBuilderStock}
                onRemoveStock={onRemoveBuilderStock}
                onSubmit={handleBuilderSubmit}
                disabled={inputDisabled || isLoading}
              />
            </div>
          ) : (
            <div className="mx-auto w-full max-w-3xl px-4 pt-8 pb-8 flex flex-col gap-8">
              {messages.map((message, idx) => {
                const isActive =
                  isLoading &&
                  message.role === "assistant" &&
                  idx === messages.length - 1;
                const isLastAssistant =
                  message.role === "assistant" && idx === messages.length - 1;
                return (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    isActiveStreaming={isActive}
                    stopped={
                      stoppedFlag && isLastAssistant && !isLoading
                    }
                    onCopy={handleCopy}
                    onRegenerate={
                      message.role === "assistant" && idx === messages.length - 1
                        ? handleRegenerate
                        : undefined
                    }
                    onLinkClick={linkClickHandler}
                  />
                );
              })}
              {isLoading &&
                messages.length > 0 &&
                messages[messages.length - 1].role === "user" && (
                  <Message from="assistant">
                    <MessageContent>
                      <div className="flex items-center gap-1 py-1">
                        <span className="size-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
                        <span className="size-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
                        <span className="size-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
                      </div>
                    </MessageContent>
                  </Message>
                )}
              {error && (
                <div className="animate-portfolio-fade-in flex items-center gap-2.5 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  <AlertCircleIcon className="size-4 shrink-0" />
                  <span>エラーが発生しました: {error.message}</span>
                </div>
              )}
            </div>
          )}
        </ConversationContent>
      </Conversation>

      <div className="relative z-10 border-t bg-background">
        <div className="mx-auto w-full max-w-3xl px-4 pt-3 flex items-center justify-between">
          <QuotaBadge
            remaining={remaining}
            total={totalForBadge}
            isUnlimited={isUnlimitedForBadge}
            isLoading={isQuotaLoading}
          />
          {showAnonQuota && !anonQuota.isLoading && (
            <span className="text-[10px] text-muted-foreground">
              ログインで本日の上限が増えます
            </span>
          )}
        </div>
        <ChatInput
          status={status}
          onSend={handleSend}
          onStop={handleStop}
          disabled={inputDisabled}
          placeholder={placeholder}
        />
      </div>

      {lockReason && <LockedOverlay reason={lockReason} />}

      <CloudflareTurnstileModal
        open={turnstileOpen}
        onOpenChange={(o) => {
          setTurnstileOpen(o);
          if (!o) pendingPromptRef.current = null;
        }}
        onVerify={handleTurnstileVerify}
        isSubmitting={turnstile.isVerifying}
        title="お試し利用の前に認証してください"
        description="Cloudflare 認証を完了すると、匿名でも AI ポートフォリオをお試しできます。"
        action="ai-feature-access"
        errorMessage={turnstile.error}
      />
    </div>
  );
});
