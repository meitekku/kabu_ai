"use client";

import { useMemo, useState } from "react";
import { MessageSquareIcon, PlusIcon, Trash2Icon, UserIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/components/auth";
import type { StoredChat } from "@/lib/agent/chat-history-store";
import { cn } from "@/lib/utils";

interface PortfolioSidebarProps {
  chats: StoredChat[];
  currentChatId: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onDeleteChat: (id: string) => void;
  className?: string;
}

// WHY: lightweight relative time — keep dependency surface minimal.
function formatRelativeTime(ts: number, now: number): string {
  const diff = Math.max(0, now - ts);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return "今";
  if (diff < hour) return `${Math.floor(diff / minute)}分前`;
  if (diff < day) return `${Math.floor(diff / hour)}時間前`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}日前`;

  const d = new Date(ts);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}/${dd}`;
}

interface DateGroup {
  label: string;
  items: StoredChat[];
}

function groupByDate(chats: StoredChat[]): DateGroup[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - 86_400_000;
  const weekAgo = today - 7 * 86_400_000;

  const groups: DateGroup[] = [
    { label: "今日", items: [] },
    { label: "昨日", items: [] },
    { label: "過去7日間", items: [] },
    { label: "それ以前", items: [] },
  ];

  for (const chat of chats) {
    if (chat.updatedAt >= today) groups[0].items.push(chat);
    else if (chat.updatedAt >= yesterday) groups[1].items.push(chat);
    else if (chat.updatedAt >= weekAgo) groups[2].items.push(chat);
    else groups[3].items.push(chat);
  }

  return groups.filter((g) => g.items.length > 0);
}

export function PortfolioSidebar({
  chats,
  currentChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  className,
}: PortfolioSidebarProps) {
  const { isLogin, user } = useAuth();
  const [deleteTarget, setDeleteTarget] = useState<StoredChat | null>(null);

  const groups = useMemo(() => groupByDate(chats), [chats]);
  const now = Date.now();

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    onDeleteChat(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <aside
      className={cn(
        "flex h-full w-[280px] shrink-0 flex-col border-r border-border bg-background",
        className,
      )}
    >
      {/* Header — new chat */}
      <div className="px-3 py-3">
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={onNewChat}
        >
          <PlusIcon className="size-4" />
          新しいチャット
        </Button>
      </div>

      <Separator />

      {/* Chat history list */}
      <div className="flex-1 min-h-0 overflow-y-auto px-2 py-3">
        {chats.length === 0 ? (
          <div className="flex h-full items-center justify-center px-4">
            <p className="text-center text-xs text-muted-foreground/70">
              チャット履歴がありません
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => (
              <div key={group.label}>
                <p className="px-3 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                  {group.label}
                </p>
                <ul className="space-y-0.5">
                  {group.items.map((chat) => {
                    const isActive = chat.id === currentChatId;
                    return (
                      <li key={chat.id}>
                        <div
                          className={cn(
                            "group relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                            isActive
                              ? "bg-primary/10 text-primary"
                              : "text-foreground/80 hover:bg-muted/60 hover:text-foreground",
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => onSelectChat(chat.id)}
                            className="flex min-w-0 flex-1 items-center gap-2 text-left"
                          >
                            <MessageSquareIcon
                              className={cn(
                                "size-3.5 shrink-0",
                                isActive ? "text-primary" : "text-muted-foreground/60",
                              )}
                            />
                            <span className="min-w-0 flex-1 truncate">{chat.title}</span>
                            <span className="shrink-0 text-[10px] text-muted-foreground/60">
                              {formatRelativeTime(chat.updatedAt, now)}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setDeleteTarget(chat);
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground/70 opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                            aria-label={`${chat.title} を削除`}
                          >
                            <Trash2Icon className="size-3.5" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer — user info */}
      {isLogin && user && (
        <>
          <Separator />
          <div className="flex items-center gap-2.5 px-3 py-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/15">
              <UserIcon className="size-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {user.name ?? user.email}
              </p>
              {user.name && (
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              )}
            </div>
          </div>
        </>
      )}

      {/* Delete confirmation */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>チャットを削除</DialogTitle>
            <DialogDescription>
              「{deleteTarget?.title}」を削除しますか？この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
            >
              キャンセル
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteConfirm}
            >
              削除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
