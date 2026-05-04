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
  const [stoppedFlag, setStoppedFlag] = useState(false);

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

  // WHY: refetch quota after assistant finishes — backend decremented usage
  const prevStatus = useRef(status);
  useEffect(() => {
    const wasLoading =
      prevStatus.current === "submitted" || prevStatus.current === "streaming";
    prevStatus.current = status;
    if (wasLoading && status === "ready") {
      quota.refetch();
    }
  }, [status, quota]);

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

  const handleSend = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      setStoppedFlag(false);
      sendMessage({ text });
    },
    [sendMessage],
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

  const remaining = quota.isUnlimited ? quota.total : quota.remaining;
  const inputDisabled =
    !isLogin || (!quota.isUnlimited && quota.remaining <= 0);
  const lockReason: "login" | "quota" | null = !isLogin
    ? authLoading
      ? null
      : "login"
    : !quota.isUnlimited && quota.remaining <= 0 && !quota.isLoading
      ? "quota"
      : null;

  const placeholder = !isLogin
    ? "ログインするとAIエージェントを利用できます"
    : inputDisabled
      ? "本日の利用上限に達しました"
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
            total={quota.total}
            isUnlimited={quota.isUnlimited}
            isLoading={quota.isLoading}
          />
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
    </div>
  );
});
