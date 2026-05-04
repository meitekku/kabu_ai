"use client";

import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Sparkles,
  Star,
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { FavoriteItem } from "@/hooks/useFavoritesList";
import type { BuilderStock } from "./PortfolioBuilder";

interface FavoritesPanelProps {
  favorites: FavoriteItem[];
  isLoading: boolean;
  isEmpty: boolean;
  onAddToBuilder: (s: BuilderStock) => void;
  onAskAI: (s: BuilderStock) => void;
}

const STORAGE_KEY = "portfolio-favorites-panel-open";

export function FavoritesPanel(props: FavoritesPanelProps) {
  const { favorites, isLoading } = props;
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setOpen(window.localStorage.getItem(STORAGE_KEY) === "1");
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, open ? "1" : "0");
  }, [open, hydrated]);

  if (isLoading) return null;
  // ポートフォリオ(お気に入り)が無ければパネル自体を出さない
  if (favorites.length === 0) return null;

  return (
    <>
      <aside
        className={cn(
          "hidden md:flex h-full shrink-0 flex-col border-l border-border bg-background transition-[width] duration-200",
          open ? "w-72" : "w-12",
        )}
      >
        <FavoritesPanelInner
          {...props}
          open={open}
          onToggle={() => setOpen((v) => !v)}
        />
      </aside>

      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed bottom-24 right-3 z-30 inline-flex items-center gap-1.5 rounded-full border border-border bg-background/95 px-3 py-2 text-xs font-medium shadow-md backdrop-blur"
        aria-label="お気に入りを開く"
      >
        <Star className="size-3.5 text-amber-500" />
        <span>{favorites.length}</span>
      </button>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="right" className="w-[300px] p-0 sm:max-w-[320px]">
          <SheetTitle className="sr-only">お気に入り銘柄</SheetTitle>
          <FavoritesPanelInner
            {...props}
            open
            onToggle={() => setMobileOpen(false)}
            onActionDone={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}

interface InnerProps extends FavoritesPanelProps {
  open: boolean;
  onToggle: () => void;
  onActionDone?: () => void;
}

function FavoritesPanelInner({
  favorites,
  isEmpty,
  onAddToBuilder,
  onAskAI,
  open,
  onToggle,
  onActionDone,
}: InnerProps) {
  if (!open) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="flex h-full w-full flex-col items-center gap-2 py-3 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
        aria-label="お気に入りを開く"
      >
        <ChevronLeft className="size-4" />
        <Star className="size-4 text-amber-500" />
        <span className="rotate-180 [writing-mode:vertical-rl] text-[10px] font-medium">
          ポートフォリオ {favorites.length}
        </span>
      </button>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
        <div className="flex items-center gap-1.5 text-sm font-semibold">
          <Star className="size-4 text-amber-500" />
          ポートフォリオ
          <span className="text-xs font-normal text-muted-foreground">
            ({favorites.length})
          </span>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="お気に入りを閉じる"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        <ul className="space-y-1">
          {favorites.map((f) => {
            const diff =
              f.diff_percent !== null ? Number(f.diff_percent) : null;
            const stock: BuilderStock = {
              id: f.code,
              name: f.name ?? f.code,
            };
            return (
              <li
                key={f.code}
                className="group rounded-lg px-2 py-2 hover:bg-muted/60"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-mono text-[11px] font-semibold tabular-nums text-muted-foreground">
                        {f.code}
                      </span>
                      {diff !== null && (
                        <span
                          className={cn(
                            "text-[10px] font-medium tabular-nums",
                            diff > 0
                              ? "text-emerald-600"
                              : diff < 0
                                ? "text-rose-600"
                                : "text-muted-foreground",
                          )}
                        >
                          {diff > 0 ? "+" : ""}
                          {diff.toFixed(2)}%
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 truncate text-xs">
                      {f.name ?? f.code}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (isEmpty) onAddToBuilder(stock);
                      else onAskAI(stock);
                      onActionDone?.();
                    }}
                    className="rounded-md p-1.5 text-muted-foreground opacity-60 transition-all hover:bg-primary/10 hover:text-primary group-hover:opacity-100 focus:opacity-100"
                    title={isEmpty ? "ビルダーに追加" : "AIに質問"}
                    aria-label={
                      isEmpty
                        ? `${stock.name} をビルダーに追加`
                        : `${stock.name} についてAIに質問`
                    }
                  >
                    {isEmpty ? (
                      <Plus className="size-3.5" />
                    ) : (
                      <Sparkles className="size-3.5" />
                    )}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
