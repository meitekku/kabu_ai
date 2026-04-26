import { NextResponse } from 'next/server'
import { Database } from '@/lib/database/Mysql'
import { cacheGet, cacheSet, makeCacheKey } from '@/lib/cache'

export const dynamic = 'force-dynamic'

interface IndexRow {
  code: string
  name: string
  current_price: number | string | null
  price_change: number | string | null
  diff_percent: number | string | null
  price_updated_at: Date | string | null
}

export interface IndexItem {
  code: string
  display_code: string
  name: string
  price: number | null
  change: number | null
  change_percent: number | null
  updated_at: string | null
}

// company テーブル上の内部コード → 表示用コード/名称
// kabu_ai の MySQL では市場指数は market=12 で code='0'..'4' に格納されている
const INDEX_META: Record<string, { display_code: string; name: string }> = {
  '0': { display_code: 'N225', name: '日経平均' },
  '4': { display_code: 'TOPIX', name: 'TOPIX' },
  '1': { display_code: 'DJIA', name: 'NYダウ' },
  '2': { display_code: 'SPX', name: 'S&P500' },
  '3': { display_code: 'USDJPY', name: 'ドル円' },
}

// 表示順 (日本市場 → 米国市場 → 為替)
const DISPLAY_ORDER = ['0', '4', '1', '2', '3']

function toNumber(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined) return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

export async function GET() {
  const cacheKey = makeCacheKey('top-indices', { v: 1 })
  const ttl = 60
  const cached = cacheGet(cacheKey, ttl)
  if (cached) {
    return NextResponse.json(cached, {
      headers: {
        'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
      },
    })
  }

  try {
    const db = Database.getInstance()
    const codes = Object.keys(INDEX_META)
    const placeholders = codes.map(() => '?').join(',')
    const rows = await db.select<IndexRow>(
      `SELECT c.code, c.name, ci.current_price, ci.price_change, ci.diff_percent, ci.price_updated_at
       FROM company c
       LEFT JOIN company_info ci ON c.code = ci.code
       WHERE c.code IN (${placeholders})`,
      codes
    )

    const byCode = new Map(rows.map((r) => [r.code, r]))
    const indices: IndexItem[] = DISPLAY_ORDER.flatMap((code) => {
      const meta = INDEX_META[code]
      const row = byCode.get(code)
      if (!row) return []
      const price = toNumber(row.current_price)
      // 価格が無いレコードは除外 (DBに無い指数を黙ってダミー表示しない)
      if (price === null) return []
      return [
        {
          code,
          display_code: meta.display_code,
          name: meta.name,
          price,
          change: toNumber(row.price_change),
          change_percent: toNumber(row.diff_percent),
          updated_at: row.price_updated_at
            ? new Date(row.price_updated_at).toISOString()
            : null,
        },
      ]
    })

    const payload = { indices }
    cacheSet(cacheKey, payload)
    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
      },
    })
  } catch (error) {
    console.error('[Top Indices API] Error:', error)
    return NextResponse.json(
      { indices: [] as IndexItem[] },
      { status: 500 }
    )
  }
}
