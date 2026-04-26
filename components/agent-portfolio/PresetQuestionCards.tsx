"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  TargetIcon,
  CalendarIcon,
  CoinsIcon,
  StarIcon,
} from "lucide-react";

export interface PresetQuestion {
  id: string;
  title: string;
  description: string;
  prompt: string;
  icon: ReactNode;
}

const BASE_PRESETS: PresetQuestion[] = [
  {
    id: "goal-1000",
    title: "10年で1000万円つくる",
    description: "長期目標から逆算して必要な利回り・配分を提案",
    prompt:
      "10年で1000万円を目標に、月いくら積み立てれば達成できそうか試算して、ポートフォリオを組んでください。リスク許容度は中程度です。",
    icon: <TargetIcon className="size-4" />,
  },
  {
    id: "monthly-30k",
    title: "月3万の積立で老後資金",
    description: "つみたて前提でセクター分散を含む銘柄案を提案",
    prompt:
      "月3万円を25年間積み立てる前提で、老後資金として運用する日本株のポートフォリオを組んでください。守り重視です。",
    icon: <CalendarIcon className="size-4" />,
  },
  {
    id: "high-dividend-5",
    title: "高配当だけで5銘柄",
    description: "配当利回り重視・安定セクターから5銘柄を提案",
    prompt:
      "配当利回り3.5%以上の日本株から、業種を分散して5銘柄選んでください。各銘柄の配当・PER・直近業績も教えてください。",
    icon: <CoinsIcon className="size-4" />,
  },
];

const FAVORITES_PRESET: PresetQuestion = {
  id: "favorites",
  title: "今のお気に入りでポートフォリオ組んで",
  description: "登録済みのお気に入り銘柄を使った配分案を提案",
  prompt:
    "私のお気に入り銘柄をベースに、リスクとリターンのバランスが取れたポートフォリオを組んでください。",
  icon: <StarIcon className="size-4" />,
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
  const presets = showFavorites
    ? [...BASE_PRESETS, FAVORITES_PRESET]
    : BASE_PRESETS;

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-2",
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
