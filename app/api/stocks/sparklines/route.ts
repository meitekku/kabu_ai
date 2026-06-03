import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/lib/database/Mysql'
import { getCacheTTL, cacheGet, cacheSet, makeCacheKey } from '@/lib/cache'
import { RowDataPacket } from 'mysql2'

interface PriceRow extends RowDataPacket {
  code: string
  close: number
}

export async function GET(req: NextRequest) {
  const codesParam = req.nextUrl.searchParams.get('codes')
  if (!codesParam) return NextResponse.json({})

  const codes = codesParam
    .split(',')
    .map((c) => c.trim().toUpperCase())
    .filter((c) => /^[0-9A-Z]{4}$/.test(c))
    .slice(0, 20)

  if (codes.length === 0) return NextResponse.json({})

  const ttl = getCacheTTL('sparkline')
  const cacheKey = makeCacheKey('sparklines', { codes: [...codes].sort().join(',') })
  const cached = cacheGet(cacheKey, ttl)
  if (cached) {
    return NextResponse.json(cached, {
      headers: { 'Cache-Control': `public, s-maxage=${ttl}, stale-while-revalidate=${ttl * 2}` },
    })
  }

  const db = Database.getInstance()
  const placeholders = codes.map(() => '?').join(',')
  const rows = await db.select<PriceRow>(
    `SELECT code, close FROM price
     WHERE code IN (${placeholders}) AND close IS NOT NULL
     AND date >= DATE_SUB(CURDATE(), INTERVAL 45 DAY)
     ORDER BY code, date ASC`,
    codes
  )

  const byCode: Record<string, number[]> = {}
  for (const row of rows) {
    if (!byCode[row.code]) byCode[row.code] = []
    byCode[row.code].push(Number(row.close))
  }

  const result: Record<string, { prices: number[]; change: number | null }> = {}
  for (const code of codes) {
    const prices = (byCode[code] ?? []).slice(-30)
    if (prices.length < 2) {
      result[code] = { prices: [], change: null }
      continue
    }
    const first = prices[0]
    const last = prices[prices.length - 1]
    const change = first > 0 ? Math.round(((last - first) / first) * 10000) / 100 : null
    result[code] = { prices, change }
  }

  cacheSet(cacheKey, result)
  return NextResponse.json(result, {
    headers: { 'Cache-Control': `public, s-maxage=${ttl}, stale-while-revalidate=${ttl * 2}` },
  })
}
