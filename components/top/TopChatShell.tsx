"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Crown, LogIn, MenuIcon, PlusIcon, SparklesIcon } from "lucide-react";
import {
  PortfolioChatPanel,
  type PortfolioChatHandle,
} from "@/components/agent-portfolio/PortfolioChatPanel";
import { PortfolioSidebar } from "@/components/agent-portfolio/PortfolioSidebar";
import { FavoritesPanel } from "@/components/agent-portfolio/FavoritesPanel";
import type {
  BuilderStock,
  RiskLevel,
} from "@/components/agent-portfolio/PortfolioBuilder";
import { usePortfolioChatHistory } from "@/hooks/usePortfolioChatHistory";
import { useFavoritesList } from "@/hooks/useFavoritesList";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { getChat, scopeForUser } from "@/lib/agent/chat-history-store";
import CompanySearch from "@/components/parts/common/CompanySearch";
import { UserMenu } from "@/components/layout/Header";
import { useSession } from "@/lib/auth/auth-client";
import { useSubscription } from "@/hooks/useSubscription";

const FALLBACK_CHAT_ID = "portfolio-agent";
const MAX_BUILDER_STOCKS = 5;

export default function TopChatShell() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { data: session, isPending: isSessionPending } = useSession();
  const { isPremium, isLoading: isSubLoading } = useSubscription();
  const user = session?.user ?? null;
  const isLogin = !!user;

  const {
    chats,
    currentChatId,
    selectChat,
    createNewChat,
    persistCurrent,
    removeChat,
    migratedCount,
    acknowledgeMigrated,
  } = usePortfolioChatHistory(user?.id ?? null, isSessionPending);

  // 匿名→ログイン移植件数の通知(簡易: alert ではなく1回だけ表示するバナー)
  const [migrationNotice, setMigrationNotice] = useState<number | null>(null);
  useEffect(() => {
    if (migratedCount && migratedCount > 0) {
      setMigrationNotice(migratedCount);
      acknowledgeMigrated();
      const t = setTimeout(() => setMigrationNotice(null), 6000);
      return () => clearTimeout(t);
    }
  }, [migratedCount, acknowledgeMigrated]);

  const {
    favorites,
    isLoading: favoritesLoading,
  } = useFavoritesList(isLogin);

  // ビルダー状態(リスク・含めたい銘柄)
  const [builderRisk, setBuilderRiskState] = useState<RiskLevel | null>(null);
  const [builderStocks, setBuilderStocks] = useState<BuilderStock[]>([]);
  const [hasMessages, setHasMessages] = useState(false);

  const setBuilderRisk = useCallback((r: RiskLevel) => {
    setBuilderRiskState(r);
  }, []);

  const addBuilderStock = useCallback((s: BuilderStock) => {
    setBuilderStocks((prev) => {
      if (prev.some((p) => p.id === s.id)) return prev;
      if (prev.length >= MAX_BUILDER_STOCKS) return prev;
      return [...prev, s];
    });
  }, []);

  const removeBuilderStock = useCallback((id: string) => {
    setBuilderStocks((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const clearBuilder = useCallback(() => {
    setBuilderRiskState(null);
    setBuilderStocks([]);
  }, []);

  // チャットへの imperative ハンドル(右パネルから "AI に質問" を発火させる)
  const chatRef = useRef<PortfolioChatHandle>(null);

  const handleAskAI = useCallback((s: BuilderStock) => {
    chatRef.current?.sendMessage(
      `${s.name}(${s.id}) を今のポートフォリオに加えて再提案してください`,
    );
  }, []);

  // WHY: when the selected chat changes, we must re-mount PortfolioChatPanel
  // so useChat re-initialises with the restored messages.
  const activeChatId = currentChatId ?? FALLBACK_CHAT_ID;
  const scope = scopeForUser(user?.id ?? null);
  const initialMessages = useMemo(() => {
    if (!currentChatId) return undefined;
    const stored = getChat(scope, currentChatId);
    return stored?.messages;
  }, [scope, currentChatId]);

  const activeChat = chats.find((c) => c.id === currentChatId);
  const headerTitle = activeChat?.title ?? "AIポートフォリオエージェント";

  const handleSelect = useCallback(
    (id: string) => {
      selectChat(id);
      setMobileSidebarOpen(false);
      clearBuilder();
    },
    [selectChat, clearBuilder],
  );

  const handleNewChat = useCallback(() => {
    createNewChat();
    setMobileSidebarOpen(false);
    clearBuilder();
  }, [createNewChat, clearBuilder]);

  // WHY: close drawer on viewport widening so it doesn't stick open after
  // a resize from mobile → desktop.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = () => {
      if (mq.matches) setMobileSidebarOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // WHY: avoid auth UI flicker. Render a placeholder slot until both session
  // and subscription resolve so the right cluster doesn't pop in/out.
  const isAuthResolving = isSessionPending || isSubLoading;
  const showPremiumCta = !isAuthResolving && !isPremium;

  return (
    <div className="relative flex h-full w-full overflow-hidden bg-background">
      {migrationNotice !== null && (
        <div
          role="status"
          className="absolute left-1/2 top-3 z-50 -translate-x-1/2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs font-medium text-emerald-700 shadow-sm"
        >
          以前のチャット {migrationNotice} 件を引き継ぎました
        </div>
      )}
      {/* Desktop sidebar */}
      <div className="hidden md:flex h-full">
        <PortfolioSidebar
          chats={chats}
          currentChatId={currentChatId}
          onSelectChat={handleSelect}
          onNewChat={handleNewChat}
          onDeleteChat={removeChat}
        />
      </div>

      {/* Mobile sidebar drawer */}
      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetContent side="left" className="w-[300px] p-0 sm:max-w-[320px]">
          <SheetTitle className="sr-only">チャット履歴</SheetTitle>
          <PortfolioSidebar
            chats={chats}
            currentChatId={currentChatId}
            onSelectChat={handleSelect}
            onNewChat={handleNewChat}
            onDeleteChat={removeChat}
            className="w-full border-r-0"
          />
        </SheetContent>
      </Sheet>

      {/* Center pane: header + chat */}
      <div className="relative flex flex-1 min-w-0 flex-col">
        <header className="relative z-40 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/70">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="md:hidden h-8 w-8"
            onClick={() => setMobileSidebarOpen(true)}
            aria-label="チャット履歴を開く"
          >
            <MenuIcon className="size-4" />
          </Button>
          {/* Left: title + BETA */}
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-md bg-primary/10 ring-1 ring-primary/15">
              <SparklesIcon className="size-3.5 text-primary" />
            </span>
            <h1 className="truncate text-sm font-semibold text-foreground max-w-[8rem] sm:max-w-[14rem]">
              {headerTitle}
            </h1>
            <span className="hidden sm:inline rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600">
              BETA
            </span>
          </div>

          {/* Center: company search */}
          <div className="ml-2 hidden md:block flex-1 min-w-0 max-w-md">
            <CompanySearch />
          </div>

          {/* Right cluster */}
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={handleNewChat}
              aria-label="新しいチャット"
            >
              <PlusIcon className="size-3.5" />
              <span className="hidden lg:inline">新しいチャット</span>
            </Button>

            {showPremiumCta && (
              <Link
                href="/premium"
                className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-100"
                aria-label="プレミアムプランを見る"
              >
                <Crown className="size-3.5 text-amber-500" />
                <span className="hidden md:inline">プレミアム</span>
              </Link>
            )}

            {isAuthResolving ? (
              <div className="h-7 w-7 rounded-full bg-muted animate-pulse" aria-hidden />
            ) : user ? (
              <UserMenu user={user} variant="light" />
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-1 rounded-md bg-[#cc0000] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#990000]"
              >
                <LogIn className="size-3.5" />
                <span className="hidden sm:inline">ログイン</span>
              </Link>
            )}
          </div>
        </header>

        <div className="relative flex-1 min-h-0">
          {/* WHY: keying by chatId remounts the chat panel so stored messages load. */}
          <PortfolioChatPanel
            ref={chatRef}
            key={activeChatId}
            chatId={activeChatId}
            initialMessages={initialMessages}
            onMessagesChange={persistCurrent}
            onHasMessagesChange={setHasMessages}
            builderRisk={builderRisk}
            setBuilderRisk={setBuilderRisk}
            builderStocks={builderStocks}
            onAddBuilderStock={addBuilderStock}
            onRemoveBuilderStock={removeBuilderStock}
            onClearBuilder={clearBuilder}
          />
        </div>
      </div>

      {/* Right: favorites panel (renders nothing if user has no favorites) */}
      <FavoritesPanel
        favorites={favorites}
        isLoading={favoritesLoading}
        isEmpty={!hasMessages}
        onAddToBuilder={addBuilderStock}
        onAskAI={handleAskAI}
      />
    </div>
  );
}
