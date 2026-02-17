import { NextResponse } from 'next/server'
import { RowDataPacket } from 'mysql2'
import { Database } from '@/lib/database/Mysql'
import { getCacheTTL, cacheGet, cacheSet, makeCacheKey } from '@/lib/cache'

type RankingTableName =
  | 'ranking_yahoo_post'
  | 'ranking_access'
  | 'ranking_up'
  | 'ranking_low'
  | 'ranking_stop_high'
  | 'ranking_stop_low'
  | 'ranking_trading_value'

interface CompanyData {
  code: string
  name: string
  current_price: number | null
  price_change: number | null
  diff_percent: number | null
}

interface RankingData extends RowDataPacket {
  code: string
  name: string
  diff_percent: number | null
  current_price: number | null
}

interface LayoutSummaryResponse {
  success: boolean
  data: {
    market: CompanyData[]
    rankings: Partial<Record<RankingTableName, RankingData[]>>
  }
}

const HEADER_CODES = ['0', '3', '1', '2'] as const

const RANKING_CONFIGS: ReadonlyArray<{ tableName: RankingTableName; limit: number }> = [
  { tableName: 'ranking_yahoo_post', limit: 5 },
  { tableName: 'ranking_up', limit: 5 },
  { tableName: 'ranking_low', limit: 5 },
  { tableName: 'ranking_stop_high', limit: 5 },
  { tableName: 'ranking_stop_low', limit: 5 },
  { tableName: 'ranking_trading_value', limit: 5 },
]

export async function GET() {
  try {
    const ttl = Math.min(getCacheTTL('market'), getCacheTTL('ranking'))
    const cacheKey = makeCacheKey('layout-summary', { version: 1 })
    const cached = cacheGet(cacheKey, ttl)

    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          'Cache-Control': `public, s-maxage=${ttl}, stale-while-revalidate=${ttl * 2}`,
          'X-Cache': 'HIT',
        }
      })
    }

    const db = Database.getInstance()
    const placeholders = HEADER_CODES.map(() => '?').join(',')
    const marketRows = await db.select<CompanyData & RowDataPacket>(`
      SELECT
        c.code,
        c.name,
        ci.current_price,
        ci.price_change,
        ci.diff_percent
      FROM company c
      LEFT JOIN company_info ci ON c.code = ci.code
      WHERE c.code IN (${placeholders})
    `, [...HEADER_CODES])

    const marketMap = new Map(marketRows.map((item) => [item.code, item]))
    const market = HEADER_CODES
      .map((code) => marketMap.get(code))
      .filter((item): item is CompanyData & RowDataPacket => Boolean(item))

    const rankingPairs = await Promise.all(
      RANKING_CONFIGS.map(async ({ tableName, limit }) => {
        const rows = await db.select<RankingData>(`
          SELECT
            ${tableName}.code,
            company.name,
            company_info.diff_percent,
            company_info.current_price
          FROM ${tableName}
          LEFT JOIN company ON ${tableName}.code = company.code
          LEFT JOIN company_info ON ${tableName}.code = company_info.code
          LIMIT ?
        `, [limit + 2])

        const filteredRows = rows
          .filter((item) => item.name)
          .slice(0, limit)

        return [tableName, filteredRows] as const
      })
    )

    const rankings = rankingPairs.reduce<Partial<Record<RankingTableName, RankingData[]>>>((acc, [tableName, rows]) => {
      acc[tableName] = rows
      return acc
    }, {})

    const responseData: LayoutSummaryResponse = {
      success: true,
      data: {
        market,
        rankings,
      }
    }

    cacheSet(cacheKey, responseData)

    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': `public, s-maxage=${ttl}, stale-while-revalidate=${ttl * 2}`,
        'X-Cache': 'MISS',
      }
    })
  } catch (error) {
    console.error('Failed to load layout summary:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
      },
      { status: 500 }
    )
  }
}
