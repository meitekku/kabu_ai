"use client";

import { cn } from "@/lib/utils";

interface QuotaBadgeProps {
  remaining: number;
  total?: number;
  isUnlimited?: boolean;
  isLoading?: boolean;
  className?: string;
}

const DEFAULT_TOTAL = 3;

export function QuotaBadge({
  remaining,
  total = DEFAULT_TOTAL,
  isUnlimited,
  isLoading,
  className,
}: QuotaBadgeProps) {
  if (isLoading) {
    return (
      <div className={cn("inline-flex h-5 w-24 animate-pulse rounded bg-muted/60", className)} />
    );
  }

  if (isUnlimited) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-0.5 text-[11px] font-medium text-primary",
          className,
        )}
      >
        <span className="size-1.5 rounded-full bg-primary" />
        プレミアム · 無制限
      </div>
    );
  }

  const used = Math.max(0, total - remaining);
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground",
        className,
      )}
      aria-label={`残り ${remaining} / ${total} 回`}
    >
      <span className="inline-flex items-center gap-0.5" aria-hidden="true">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={cn(
              "size-2 rounded-full",
              i < remaining ? "bg-primary" : "bg-muted-foreground/30",
            )}
          />
        ))}
      </span>
      <span>
        残り {remaining}/{total} 回
        {used > 0 && remaining === 0 && " (本日上限)"}
      </span>
    </div>
  );
}
