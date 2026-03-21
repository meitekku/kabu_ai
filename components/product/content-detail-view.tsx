"use client"

import { useState, useRef, useCallback } from "react"
import Image from "next/image"
import { ProductImageFloat } from "@/components/product/product-image-float"
import { ToolLog, type ToolLogEntry } from "@/components/ai/tool-log"
import { GENRE_LABELS, type ContentItem, type ContentItemFull, type FloatButton, type Genre } from "@/lib/types/content"
import { generateFloatButtons } from "@/lib/mock-data/content"

type SearchState = "idle" | "searching" | "results"

interface ContentDetailViewProps {
  item: ContentItemFull
  contentId: string
  genre: Genre
}

export function ContentDetailView({ item, contentId, genre }: ContentDetailViewProps) {
  const [currentItem, setCurrentItem] = useState(item)
  const [searchState, setSearchState] = useState<SearchState>("idle")
  const [toolLogs, setToolLogs] = useState<ToolLogEntry[]>([])
  const [searchResults, setSearchResults] = useState<ContentItem[]>([])
  const [aiCommentary, setAiCommentary] = useState("")
  const [loadingButtonId, setLoadingButtonId] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const floatButtons = generateFloatButtons(contentId, genre)

  const handleButtonClick = useCallback(async (button: FloatButton) => {
    // 前のリクエストをキャンセル
    abortRef.current?.abort()
    const abort = new AbortController()
    abortRef.current = abort

    setLoadingButtonId(button.id)
    setSearchState("searching")
    setToolLogs([])
    setSearchResults([])
    setAiCommentary("")

    try {
      const res = await fetch("/api/agent-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: button.query,
          genre,
          contentId,
          label: button.label,
          title: currentItem.title_ja,
        }),
        signal: abort.signal,
      })

      if (!res.ok || !res.body) {
        setSearchState("idle")
        setLoadingButtonId(null)
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() ?? ""

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          const data = line.slice(6).trim()
          if (data === "[DONE]") break

          try {
            const parsed = JSON.parse(data) as {
              type: string
              toolName?: string
              message?: string
              resultCount?: number
              items?: ContentItem[]
              text?: string
            }

            switch (parsed.type) {
              case "tool_start":
              case "tool_complete":
              case "tool_error":
                setToolLogs((prev) => [
                  ...prev,
                  {
                    type: parsed.type as ToolLogEntry["type"],
                    toolName: parsed.toolName ?? "",
                    message: parsed.message ?? "",
                    resultCount: parsed.resultCount,
                  },
                ])
                break

              case "items":
                if (parsed.items) {
                  setSearchResults(parsed.items)
                  setSearchState("results")
                }
                break

              case "commentary_chunk":
                if (parsed.text) {
                  setAiCommentary((prev) => prev + parsed.text)
                }
                break

              case "done":
                break
            }
          } catch {
            // ignore parse errors
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setSearchState("idle")
      }
    }

    setLoadingButtonId(null)
  }, [genre, contentId, currentItem.title_ja])

  const handleResultClick = useCallback((result: ContentItem) => {
    setCurrentItem({
      id: result.id,
      title: result.title,
      title_ja: result.title_ja ?? result.title,
      genre: result.genre,
      image_url: result.image_url,
      release_year: result.release_year ?? 0,
      rating: 0,
      rating_count: 0,
      description: result.description ?? "",
      tags: [],
    })
  }, [])

  return (
    <div className="flex flex-col md:flex-row gap-8">
      {/* 左カラム: 画像 + フロートボタン */}
      <div className="md:w-[45%] md:sticky md:top-20 md:self-start">
        <ProductImageFloat
          imageUrl={currentItem.image_url}
          title={currentItem.title_ja}
          buttons={floatButtons}
          onButtonClick={handleButtonClick}
          loadingButtonId={loadingButtonId}
        />
      </div>

      {/* 右カラム: 情報 + 検索結果 */}
      <div className="md:w-[55%] space-y-6">
        {/* 商品情報 */}
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground tracking-wide">
            {GENRE_LABELS[currentItem.genre] ?? currentItem.genre}
          </p>
          <h1 className="text-2xl font-bold tracking-tight">
            {currentItem.title_ja}
          </h1>
          {currentItem.title !== currentItem.title_ja && (
            <p className="text-sm text-muted-foreground">{currentItem.title}</p>
          )}
          {currentItem.release_year > 0 && (
            <p className="text-sm text-muted-foreground">
              {currentItem.release_year}年
            </p>
          )}
          {currentItem.description && (
            <p className="text-sm text-foreground/80 leading-relaxed">
              {currentItem.description}
            </p>
          )}
          {currentItem.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {currentItem.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 text-xs bg-secondary text-secondary-foreground rounded-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-border" />

        {/* 動的エリア */}
        {searchState === "idle" && (
          <p className="text-sm text-muted-foreground">
            左の画像上のボタンをクリックすると、AIが関連コンテンツを検索します
          </p>
        )}

        {searchState === "searching" && (
          <ToolLog logs={toolLogs} />
        )}

        {searchState === "results" && (
          <div className="space-y-4">
            {/* ツールログ（完了表示） */}
            <ToolLog logs={toolLogs} />

            {/* 検索結果カードグリッド */}
            {searchResults.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground tracking-wide">
                  関連コンテンツ ({searchResults.length}件)
                </p>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  {searchResults.filter((r) => r.image_url).map((result) => (
                    <button
                      key={result.id}
                      onClick={() => handleResultClick(result)}
                      className="group text-left rounded-sm overflow-hidden border border-border hover:border-primary/30 transition-colors"
                    >
                      <div className="relative aspect-[3/4] bg-muted">
                        <Image
                          src={result.image_url}
                          alt={result.title_ja ?? result.title}
                          fill
                          className="object-cover group-hover:scale-[1.02] transition-transform"
                          sizes="(max-width: 768px) 50vw, 20vw"
                          unoptimized
                        />
                      </div>
                      <div className="p-2">
                        <p className="text-xs font-medium line-clamp-2">
                          {result.title_ja ?? result.title}
                        </p>
                        {result.release_year && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {result.release_year}年
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* AIコメント */}
            {aiCommentary && (
              <details className="text-sm">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
                  AIの分析コメント
                </summary>
                <p className="mt-2 text-foreground/80 leading-relaxed pl-4 border-l-2 border-primary/20">
                  {aiCommentary}
                </p>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
