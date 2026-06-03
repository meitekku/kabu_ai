"use client";

import { useEffect, useState } from "react";
import { Message, MessageContent } from "./ai-elements/message";
import { cn } from "@/lib/utils";

export type RiskPresetId = "stable" | "balanced" | "growth";

const RISK_PRESETS: Array<{ id: RiskPresetId; label: string }> = [
  { id: "stable", label: "安定" },
  { id: "balanced", label: "バランス" },
  { id: "growth", label: "成長" },
];

const LINES = [
  "こんにちは。今の市場環境を踏まえて、日本株のおすすめポートフォリオを提案します。",
  "どのスタイルで組みましょうか？",
];

interface PortfolioWelcomeProps {
  onPick: (label: string) => void;
  disabled?: boolean;
}

export function buildPresetPrompt(label: string): string {
  return (
    `今の日本市場の環境を踏まえて、${label}寄りのおすすめ日本株ポートフォリオを提案してください。\n` +
    `各銘柄の選定理由・配分比率(合計100%)・セクター分散も含めて教えてください。`
  );
}

export function PortfolioWelcome({ onPick, disabled }: PortfolioWelcomeProps) {
  const [shown, setShown] = useState<string[]>(LINES.map(() => ""));
  const [showButtons, setShowButtons] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let lineIdx = 0;
    let charIdx = 0;
    const tick = () => {
      if (cancelled) return;
      if (lineIdx >= LINES.length) {
        setShowButtons(true);
        return;
      }
      const line = LINES[lineIdx];
      if (charIdx <= line.length) {
        setShown((prev) => {
          const next = [...prev];
          next[lineIdx] = line.slice(0, charIdx);
          return next;
        });
        charIdx += 1;
        timers.push(setTimeout(tick, 28));
      } else {
        lineIdx += 1;
        charIdx = 0;
        timers.push(setTimeout(tick, 260));
      }
    };
    timers.push(setTimeout(tick, 200));
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    <div className="flex flex-col gap-5">
      <Message from="assistant">
        <MessageContent>
          {shown.map((s, i) =>
            s ? (
              <p key={i} className="leading-relaxed">
                {s}
              </p>
            ) : null,
          )}
        </MessageContent>
      </Message>

      {showButtons && (
        <div className="flex flex-wrap gap-2 animate-portfolio-fade-in">
          {RISK_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              disabled={disabled}
              onClick={() => onPick(p.label)}
              className={cn(
                "rounded-full border border-border bg-card px-5 py-2 text-sm font-medium transition-colors",
                "hover:border-primary hover:bg-primary/5 hover:text-primary",
                "disabled:cursor-not-allowed disabled:opacity-50",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
