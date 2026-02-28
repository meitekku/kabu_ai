import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/lib/database/Mysql'
import { getCacheTTL, cacheGet, cacheSet, makeCacheKey } from '@/lib/cache'
import { RowDataPacket } from 'mysql2'

interface PriceRow extends RowDataPacket {
  close: number
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  if (!code || !/^\d{4}$/.test(code)) {
    return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
  }

  const cacheKey = makeCacheKey('sparkline', { code })
  const ttl = getCacheTTL('market')
  const cached = cacheGet(cacheKey, ttl)
  if (cached) {
    return NextResponse.json(cached, {
      headers: { 'Cache-Control': `public, s-maxage=${ttl}, stale-while-revalidate=${ttl * 2}` },
    })
  }

  const db = Database.getInstance()
  const rows = await db.select<PriceRow>(
    `SELECT close FROM price
     WHERE code = ? AND close IS NOT NULL
     ORDER BY date DESC
     LIMIT 30`,
    [code]
  )

  if (!rows || rows.length === 0) {
    return NextResponse.json({ prices: [], change: null })
  }

  // 古い順に並び替え
  const prices = rows.map((r) => Number(r.close)).reverse()
  const first = prices[0]
  const last = prices[prices.length - 1]
  const change = first > 0 ? ((last - first) / first) * 100 : null

  const data = { prices, change: change !== null ? Math.round(change * 100) / 100 : null }
  cacheSet(cacheKey, data)

  return NextResponse.json(data, {
    headers: { 'Cache-Control': `public, s-maxage=${ttl}, stale-while-revalidate=${ttl * 2}` },
  })
}
