'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Star, Lock } from 'lucide-react'
import SparklineChart from '@/components/news/SparklineChart'
import { useAuth } from '@/components/auth'

const DEFAULT_CODES = [
  '7203', // トヨタ
  '9984', // ソフトバンクG
  '6758', // ソニー
  '9433', // KDDI
  '8306', // 三菱UFJ
  '9432', // NTT
  '6861', // キーエンス
  '8035', // 東京エレクトロン
  '9020', // JR東日本
  '7974', // 任天堂
] as const

interface FavoriteRow {
  id: number
  code: string
  importance: number | null
  created_at: string
  name: string | null
  current_price: number | null
  diff_percent: number | null
}

interface FavoritesResponse {
  favorites?: FavoriteRow[]
  error?: string
}

interface CardData {
  code: string
  name: string
  price: number | null
  diffPercent: number | null
}

interface SparklineMap {
  [code: string]: { prices: number[]; change: number | null }
}

interface CompanyMetaRow {
  code: string
  name: string | null
  current_price: number | null
  diff_percent: number | null
}

function formatPrice(value: number | null): string {
  if (value === null) return '-'
  return value.toLocaleString('ja-JP', {
    minimumFractionDigits: value >= 1000 ? 0 : 2,
    maximumFractionDigits: 2,
  })
}

function changeColor(value: number | null): string {
  if (value === null) return 'text-zinc-500'
  if (value > 0) return 'text-emerald-600'
  if (value < 0) return 'text-rose-600'
  return 'text-zinc-500'
}

function changeBg(value: number | null): string {
  if (value === null || value === 0) return 'bg-zinc-100 text-zinc-600'
  if (value > 0) return 'bg-emerald-50 text-emerald-700'
  return 'bg-rose-50 text-rose-700'
}

export default function FavoriteMiniChartList() {
  const { isLogin, isLoading: authLoading } = useAuth()
  const [cards, setCards] = useState<CardData[] | null>(null)
  const [sparklines, setSparklines] = useState<SparklineMap>({})
  const [loading, setLoading] = useState(true)

  const isFallback = !isLogin

  useEffect(() => {
    if (authLoading) return
    let cancelled = false

    async function load() {
      setLoading(true)

      // 1. 表示する銘柄リストを決定
      let baseCards: CardData[] = []
      if (isLogin) {
        try {
          const res = await fetch('/api/favorites', {
            credentials: 'include',
            cache: 'no-store',
          })
          if (res.ok) {
            const json = (await res.json()) as FavoritesResponse
            const favs = json.favorites ?? []
            baseCards = favs.slice(0, 20).map((f) => ({
              code: f.code,
              name: f.name ?? f.code,
              price: f.current_price !== null ? Number(f.current_price) : null,
              diffPercent:
                f.diff_percent !== null ? Number(f.diff_percent) : null,
            }))
          }
        } catch (error) {
          console.error('[FavoriteMiniChartList] favorites fetch failed:', error)
        }
      }

      // ログイン済みでもお気に入りが空ならフォールバック
      if (baseCards.length === 0) {
        try {
          const res = await fetch(
            `/api/stocks/meta?codes=${DEFAULT_CODES.join(',')}`,
            { cache: 'no-store' }
          )
          if (res.ok) {
            const json = (await res.json()) as { stocks?: CompanyMetaRow[] }
            const map = new Map(
              (json.stocks ?? []).map((s) => [s.code, s])
            )
            baseCards = DEFAULT_CODES.map((code) => {
              const meta = map.get(code)
              return {
                code,
                name: meta?.name ?? code,
                price: meta?.current_price !== undefined && meta?.current_price !== null
                  ? Number(meta.current_price)
                  : null,
                diffPercent:
                  meta?.diff_percent !== undefined && meta?.diff_percent !== null
                    ? Number(meta.diff_percent)
                    : null,
              }
            })
          } else {
            // メタAPIが無くてもコードだけは表示
            baseCards = DEFAULT_CODES.map((code) => ({
              code,
              name: code,
              price: null,
              diffPercent: null,
            }))
          }
        } catch (error) {
          console.error('[FavoriteMiniChartList] meta fetch failed:', error)
          baseCards = DEFAULT_CODES.map((code) => ({
            code,
            name: code,
            price: null,
            diffPercent: null,
          }))
        }
      }

      if (cancelled) return
      setCards(baseCards)

      // 2. スパークライン一括取得
      const codes = baseCards.map((c) => c.code).join(',')
      if (codes.length > 0) {
        try {
          const res = await fetch(`/api/stocks/sparklines?codes=${codes}`, {
            cache: 'no-store',
          })
          if (res.ok) {
            const json = (await res.json()) as SparklineMap
            if (!cancelled) setSparklines(json)
          }
        } catch (error) {
          console.error('[FavoriteMiniChartList] sparklines fetch failed:', error)
        }
      }

      if (!cancelled) setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [isLogin, authLoading])

  const heading = useMemo(
    () => (isFallback ? '注目銘柄' : 'お気に入り銘柄'),
    [isFallback]
  )

  if (authLoading || loading) {
    return (
      <section className="w-full">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-zinc-900">{heading}</h2>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-44 h-[112px] rounded-xl border border-zinc-200 bg-white animate-pulse"
            />
          ))}
        </div>
      </section>
    )
  }

  if (!cards || cards.length === 0) return null

  return (
    <section className="w-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-zinc-900">{heading}</h2>
        {isFallback ? (
          <Link
            href="/login"
            className="inline-flex items-center gap-1 text-xs text-zinc-600 hover:text-zinc-900 transition-colors"
          >
            <Lock className="w-3 h-3" />
            ログインして自分のお気に入りを追加
          </Link>
        ) : (
          <Link
            href="/favorites"
            className="text-xs text-zinc-600 hover:text-zinc-900 transition-colors"
          >
            すべて見る
          </Link>
        )}
      </div>

      <div
        className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin"
        role="list"
      >
        {cards.map((card) => {
          const sl = sparklines[card.code]
          const diff = card.diffPercent
          return (
            <Link
              href={`/stocks/${card.code}/news`}
              key={card.code}
              role="listitem"
              className="flex-shrink-0 w-44 rounded-xl border border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-sm transition-all p-3 relative group"
            >
              {isFallback && (
                <span
                  className="absolute top-2 right-2 text-zinc-300 group-hover:text-amber-400 transition-colors"
                  title="ログインしてお気に入りに追加"
                >
                  <Star className="w-3.5 h-3.5" />
                </span>
              )}
              <div className="flex items-baseline gap-1.5 mb-0.5">
                <span className="text-[11px] font-semibold text-zinc-500 tabular-nums">
                  {card.code}
                </span>
              </div>
              <div className="text-xs font-medium text-zinc-900 truncate mb-2">
                {card.name}
              </div>
              <div className="flex items-end justify-between gap-2">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-zinc-900 tabular-nums leading-tight">
                    {formatPrice(card.price)}
                  </span>
                  {diff !== null && (
                    <span
                      className={`text-[10px] font-medium px-1.5 py-0.5 rounded mt-1 inline-block w-fit tabular-nums ${changeBg(diff)}`}
                    >
                      {diff > 0 ? '+' : ''}
                      {diff.toFixed(2)}%
                    </span>
                  )}
                </div>
                <div className={changeColor(diff)}>
                  <SparklineChart
                    code={card.code}
                    width={70}
                    height={32}
                    data={sl ?? null}
                  />
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
