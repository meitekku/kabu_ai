import { headers } from 'next/headers'
import type { IndexItem } from '@/app/api/top/indices/route'

async function fetchIndices(): Promise<IndexItem[]> {
  try {
    const h = await headers()
    const host = h.get('x-forwarded-host') ?? h.get('host')
    const proto = h.get('x-forwarded-proto') ?? 'http'
    if (!host) return []
    const url = `${proto}://${host}/api/top/indices`
    const res = await fetch(url, {
      next: { revalidate: 60 },
    })
    if (!res.ok) return []
    const data = (await res.json()) as { indices?: IndexItem[] }
    return data.indices ?? []
  } catch (error) {
    console.error('[IndexTicker] fetch failed:', error)
    return []
  }
}

function formatPrice(code: string, price: number): string {
  // USDJPY は小数2桁、それ以外は3桁区切り整数表示 (S&P500 は小数2桁)
  if (code === '3') {
    return price.toLocaleString('ja-JP', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }
  if (code === '2' || code === '4') {
    return price.toLocaleString('ja-JP', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }
  return Math.round(price).toLocaleString('ja-JP')
}

function formatChange(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '' : '±'
  const abs = Math.abs(value)
  const formatted = abs.toLocaleString('ja-JP', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return value < 0 ? `-${formatted}` : `${sign}${formatted}`
}

function changeColor(value: number | null): string {
  if (value === null) return 'text-zinc-500'
  if (value > 0) return 'text-emerald-600'
  if (value < 0) return 'text-rose-600'
  return 'text-zinc-500'
}

export default async function IndexTicker() {
  const indices = await fetchIndices()
  if (indices.length === 0) return null

  return (
    <div className="w-full border-y border-zinc-200 bg-zinc-50/80 backdrop-blur-sm">
      <div
        className="overflow-x-auto scrollbar-thin"
        aria-label="主要指数"
        role="region"
      >
        <ul className="flex items-center gap-x-6 px-4 py-2 min-h-[44px] whitespace-nowrap">
          {indices.map((idx) => {
            const change = idx.change
            const pct = idx.change_percent
            const isUp = (change ?? 0) > 0
            const isDown = (change ?? 0) < 0
            const dotColor = isUp
              ? 'bg-emerald-500'
              : isDown
                ? 'bg-rose-500'
                : 'bg-zinc-400'
            return (
              <li
                key={idx.code}
                className="flex items-center gap-2 text-[13px] tabular-nums"
              >
                <span
                  className={`inline-block w-1.5 h-1.5 rounded-full ${dotColor}`}
                  aria-hidden="true"
                />
                <span className="font-semibold text-zinc-700 tracking-wide">
                  {idx.display_code}
                </span>
                <span className="font-semibold text-zinc-900">
                  {formatPrice(idx.code, idx.price ?? 0)}
                </span>
                {change !== null && pct !== null && (
                  <span className={`font-medium ${changeColor(change)}`}>
                    {formatChange(change)}{' '}
                    <span className="text-[11px]">
                      ({pct > 0 ? '+' : ''}
                      {pct.toFixed(2)}%)
                    </span>
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
