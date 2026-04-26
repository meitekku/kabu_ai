"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MenuIcon, PlusIcon, SparklesIcon } from "lucide-react";
import { PortfolioChatPanel } from "@/components/agent-portfolio/PortfolioChatPanel";
import { PortfolioSidebar } from "@/components/agent-portfolio/PortfolioSidebar";
import { usePortfolioChatHistory } from "@/hooks/usePortfolioChatHistory";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { getChat } from "@/lib/agent/chat-history-store";

const FALLBACK_CHAT_ID = "portfolio-agent";

export default function TopChatShell() {
  const {
    chats,
    currentChatId,
    selectChat,
    createNewChat,
    persistCurrent,
    removeChat,
  } = usePortfolioChatHistory();

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // WHY: when the selected chat changes, we must re-mount PortfolioChatPanel
  // so useChat re-initialises with the restored messages.
  const activeChatId = currentChatId ?? FALLBACK_CHAT_ID;
  const initialMessages = useMemo(() => {
    if (!currentChatId) return undefined;
    const stored = getChat(currentChatId);
    return stored?.messages;
  }, [currentChatId]);

  const activeChat = chats.find((c) => c.id === currentChatId);
  const headerTitle = activeChat?.title ?? "AIポートフォリオエージェント";

  const handleSelect = useCallback(
    (id: string) => {
      selectChat(id);
      setMobileSidebarOpen(false);
    },
    [selectChat],
  );

  const handleNewChat = useCallback(() => {
    createNewChat();
    setMobileSidebarOpen(false);
  }, [createNewChat]);

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

  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
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

      {/* Right pane: header + chat */}
      <div className="relative flex flex-1 min-w-0 flex-col">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/70">
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
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-md bg-primary/10 ring-1 ring-primary/15">
              <SparklesIcon className="size-3.5 text-primary" />
            </span>
            <h1 className="truncate text-sm font-semibold text-foreground">
              {headerTitle}
            </h1>
            <span className="hidden sm:inline rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600">
              BETA
            </span>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={handleNewChat}
              aria-label="新しいチャット"
            >
              <PlusIcon className="size-3.5" />
              <span className="hidden sm:inline">新しいチャット</span>
            </Button>
          </div>
        </header>

        <div className="relative flex-1 min-h-0">
          {/* WHY: keying by chatId remounts the chat panel so stored messages load. */}
          <PortfolioChatPanel
            key={activeChatId}
            chatId={activeChatId}
            initialMessages={initialMessages}
            onMessagesChange={persistCurrent}
          />
        </div>
      </div>
    </div>
  );
}
