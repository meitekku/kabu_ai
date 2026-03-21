"use client"

import { Loader2, CheckCircle2, AlertCircle } from "lucide-react"

export type ToolLogEntry = {
  type: "tool_start" | "tool_complete" | "tool_error"
  toolName: string
  message: string
  resultCount?: number
}

const TOOL_DISPLAY_NAMES: Record<string, string> = {
  search_similar: "データベース検索",
  fetch_tmdb: "TMDb映画API",
  fetch_jikan: "JikanアニメAPI",
  fetch_rawg: "RAWGゲームAPI",
  fetch_rakuten: "楽天ブックスAPI",
  web_search: "Web検索",
  ai_reasoning: "AI分析",
}

function getDisplayName(toolName: string): string {
  return TOOL_DISPLAY_NAMES[toolName] ?? toolName
}

interface ToolLogProps {
  logs: ToolLogEntry[]
}

export function ToolLog({ logs }: ToolLogProps) {
  if (logs.length === 0) return null

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground tracking-wide">
        検索ツール実行中
      </p>
      <div className="space-y-1.5">
        {logs.map((log, i) => (
          <div
            key={`${log.toolName}-${log.type}-${i}`}
            className="flex items-center gap-2 text-sm"
          >
            {log.type === "tool_start" && (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            )}
            {log.type === "tool_complete" && (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            )}
            {log.type === "tool_error" && (
              <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <span className="font-medium text-foreground">
              {getDisplayName(log.toolName)}
            </span>
            <span className="text-muted-foreground">{log.message}</span>
            {log.type === "tool_complete" && log.resultCount !== undefined && (
              <span className="text-xs text-muted-foreground">
                ({log.resultCount}件)
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
