"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { NewspaperIcon, PieChartIcon, SparklesIcon } from "lucide-react";

export interface PresetQuestion {
  id: string;
  title: string;
  description: string;
  prompt: string;
  icon: ReactNode;
}

const NEWS_PRESET: PresetQuestion = {
  id: "latest-news",
  title: "最新のニュース",
  description: "今日の市場で押さえるべき注目ポイントを5つ",
  prompt: "今日の市場の最新ニュースから注目ポイントを5つ教えて",
  icon: <NewspaperIcon className="size-4" />,
};

const FAVORITES_PRESET: PresetQuestion = {
  id: "favorites-portfolio",
  title: "自分のポートフォリオを評価",
  description: "お気に入り銘柄のリスク・分散・改善点を診断",
  prompt:
    "私のお気に入り銘柄でポートフォリオを組んだ場合の評価をして(リスク・分散・改善点)",
  icon: <PieChartIcon className="size-4" />,
};

const RECOMMEND_PRESET: PresetQuestion = {
  id: "recommend-5",
  title: "おすすめの銘柄5つ",
  description: "今注目の日本株を推し理由付きで5銘柄ピックアップ",
  prompt: "今おすすめの日本株を5銘柄、それぞれの推し理由付きで教えて",
  icon: <SparklesIcon className="size-4" />,
};

interface PresetQuestionCardsProps {
  onSelect: (prompt: string) => void;
  showFavorites?: boolean;
  disabled?: boolean;
  className?: string;
}

export function PresetQuestionCards({
  onSelect,
  showFavorites,
  disabled,
  className,
}: PresetQuestionCardsProps) {
  // お気に入り未登録時は評価カードを除外
  const presets: PresetQuestion[] = showFavorites
    ? [NEWS_PRESET, FAVORITES_PRESET, RECOMMEND_PRESET]
    : [NEWS_PRESET, RECOMMEND_PRESET];

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {presets.map((p) => (
        <button
          key={p.id}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(p.prompt)}
          className={cn(
            "group flex flex-col items-start gap-1.5 rounded-xl border bg-card p-4 text-left",
            "transition-colors hover:bg-accent/40 hover:border-accent/60",
            "min-w-0 cursor-pointer whitespace-normal",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-card",
          )}
        >
          <span className="mb-0.5 text-muted-foreground group-hover:text-foreground transition-colors">
            {p.icon}
          </span>
          <span className="text-sm font-medium leading-snug line-clamp-1">
            {p.title}
          </span>
          <span className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
            {p.description}
          </span>
        </button>
      ))}
    </div>
  );
}
