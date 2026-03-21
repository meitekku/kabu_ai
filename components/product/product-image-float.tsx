"use client"

import { useState } from "react"
import Image from "next/image"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { FloatButton } from "@/lib/types/content"

interface ProductImageFloatProps {
  imageUrl: string
  title: string
  buttons: FloatButton[]
  onButtonClick: (button: FloatButton) => void
  loadingButtonId?: string | null
}

const POSITION_CLASSES: Record<string, string> = {
  "top-left": "top-2 left-2",
  "top-center": "top-2 left-1/2 -translate-x-1/2",
  "top-right": "top-2 right-2",
  "center-left": "top-1/2 left-2 -translate-y-1/2",
  "center-right": "top-1/2 right-2 -translate-y-1/2",
  "bottom-left": "bottom-2 left-2",
  "bottom-center": "bottom-2 left-1/2 -translate-x-1/2",
  "bottom-right": "bottom-2 right-2",
}

const ANIMATION_CLASSES = [
  "animate-float",
  "animate-float-delay-1",
  "animate-float-delay-2",
  "animate-float-delay-3",
]

function getPositionClass(position: FloatButton["position"]): string {
  return POSITION_CLASSES[`${position.y}-${position.x}`] ?? "top-2 left-2"
}

export function ProductImageFloat({
  imageUrl,
  title,
  buttons,
  onButtonClick,
  loadingButtonId,
}: ProductImageFloatProps) {
  const [imgError, setImgError] = useState(false)

  return (
    <div className="relative w-full">
      {/* メイン画像 */}
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-sm bg-muted">
        {imageUrl && !imgError ? (
          <Image
            src={imageUrl}
            alt={title}
            fill
            className="object-contain"
            sizes="(max-width: 768px) 100vw, 45vw"
            priority
            unoptimized
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
            No Image
          </div>
        )}
      </div>

      {/* フローティングボタン群 */}
      {buttons.map((btn, i) => {
        const isLoading = loadingButtonId === btn.id

        return (
          <button
            key={btn.id}
            onClick={() => !isLoading && onButtonClick(btn)}
            disabled={!!loadingButtonId}
            className={cn(
              "absolute z-10",
              "flex items-center gap-1.5",
              "px-3 py-1.5 rounded-full text-xs font-medium",
              "bg-black/60 text-white",
              "backdrop-blur-sm border border-white/20",
              "hover:bg-black/75 transition-all",
              "disabled:opacity-70 disabled:cursor-not-allowed",
              getPositionClass(btn.position),
              isLoading ? "" : ANIMATION_CLASSES[i % ANIMATION_CLASSES.length],
            )}
          >
            {isLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              btn.icon && <span>{btn.icon}</span>
            )}
            <span className="max-w-28 truncate">{btn.label}</span>
          </button>
        )
      })}
    </div>
  )
}
