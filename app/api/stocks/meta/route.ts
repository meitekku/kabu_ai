import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/lib/database/Mysql'
import { getCacheTTL, cacheGet, cacheSet, makeCacheKey } from '@/lib/cache'

export const dynamic = 'force-dynamic'

interface StockMetaRow {
  code: string
  name: string | null
  current_price: number | string | null
  diff_percent: number | string | null
  price_change: number | string | null
  logo_url: string | null
}

export interface StockMeta {
  code: string
  name: string | null
  current_price: number | null
  diff_percent: number | null
  price_change: number | null
  logo_url: string | null
}

function toNum(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined) return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

export async function GET(req: NextRequest) {
  const codesParam = req.nextUrl.searchParams.get('codes')
  if (!codesParam) return NextResponse.json({ stocks: [] })

  const codes = codesParam
    .split(',')
    .map((c) => c.trim().toUpperCase())
    .filter((c) => /^[0-9A-Z]{4}$/.test(c))
    .slice(0, 50)

  if (codes.length === 0) return NextResponse.json({ stocks: [] })

  const ttl = getCacheTTL('market')
  const cacheKey = makeCacheKey('stocks-meta', {
    codes: [...codes].sort().join(','),
  })
  const cached = cacheGet(cacheKey, ttl)
  if (cached) {
    return NextResponse.json(cached, {
      headers: {
        'Cache-Control': `public, s-maxage=${ttl}, stale-while-revalidate=${ttl * 2}`,
      },
    })
  }

  try {
    const db = Database.getInstance()
    const placeholders = codes.map(() => '?').join(',')
    const rows = await db.select<StockMetaRow>(
      `SELECT c.code, c.name, ci.current_price, ci.diff_percent, ci.price_change, ci.logo_url
       FROM company c
       LEFT JOIN company_info ci ON c.code = ci.code
       WHERE c.code IN (${placeholders})`,
      codes
    )
    const byCode = new Map(rows.map((r) => [r.code, r]))
    const stocks: StockMeta[] = codes.flatMap((code) => {
      const row = byCode.get(code)
      if (!row) return []
      return [
        {
          code: row.code,
          name: row.name ?? null,
          current_price: toNum(row.current_price),
          diff_percent: toNum(row.diff_percent),
          price_change: toNum(row.price_change),
          logo_url: row.logo_url ?? null,
        },
      ]
    })

    const payload = { stocks }
    cacheSet(cacheKey, payload)
    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': `public, s-maxage=${ttl}, stale-while-revalidate=${ttl * 2}`,
      },
    })
  } catch (error) {
    console.error('[Stocks Meta API] Error:', error)
    return NextResponse.json({ stocks: [] }, { status: 500 })
  }
}
