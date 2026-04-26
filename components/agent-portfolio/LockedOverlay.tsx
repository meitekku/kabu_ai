"use client";

import Link from "next/link";
import { LockIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LockedOverlayProps {
  reason?: "login" | "quota";
}

export function LockedOverlay({ reason = "login" }: LockedOverlayProps) {
  const isQuota = reason === "quota";

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/60 backdrop-blur-sm">
      <div className="mx-4 max-w-sm rounded-xl border bg-card p-6 text-center shadow-lg">
        <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-primary/10">
          <LockIcon className="size-5 text-primary" />
        </div>
        <h3 className="mb-1 text-sm font-semibold">
          {isQuota ? "本日の利用上限に達しました" : "ログインが必要です"}
        </h3>
        <p className="mb-4 text-xs text-muted-foreground leading-relaxed">
          {isQuota
            ? "プレミアムプランで無制限にAIエージェントを使えます。"
            : "ポートフォリオAIエージェントを利用するにはログインしてください。"}
        </p>
        <div className="flex flex-col gap-2">
          {isQuota ? (
            <Button asChild className="w-full">
              <Link href="/premium">プレミアムを見る</Link>
            </Button>
          ) : (
            <Button asChild className="w-full">
              <Link href="/login">ログイン</Link>
            </Button>
          )}
          {!isQuota && (
            <Button asChild variant="outline" className="w-full">
              <Link href="/signup">新規登録</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
