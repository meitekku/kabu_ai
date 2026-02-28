import { MongoClient } from 'mongodb'
import { Database } from '@/lib/database/Mysql'
import { cacheGet, cacheSet, makeCacheKey } from '@/lib/cache'

const MONGO_URI = 'mongodb://meiteko:***REMOVED_DB_PASSWORD_URLENC***@133.130.102.77:27017/'
let mongoClient: MongoClient | null = null

async function getMongoClient(): Promise<MongoClient> {
  if (!mongoClient) {
    mongoClient = new MongoClient(MONGO_URI)
    await mongoClient.connect()
  }
  return mongoClient
}

/** Returns JST datetime string "YYYY-MM-DD HH:MM:SS" offset by given hours */
function getJSTString(offsetHours: number = 0): string {
  const jstMs = Date.now() + (9 + offsetHours) * 3600 * 1000
  return new Date(jstMs).toISOString().slice(0, 19).replace('T', ' ')
}

/** Returns today's JST midnight as "YYYY-MM-DD 00:00:00" */
function getJSTMidnight(): string {
  const jstMs = Date.now() + 9 * 3600 * 1000
  const d = new Date(jstMs)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day} 00:00:00`
}

export interface HeatItem {
  code: string
  company_name: string
  count_1h: number
  count_24h: number
  count_today: number
  velocity: number
  close: number | null
  change_pct: number | null
}

export interface HeatmapData {
  items: HeatItem[]
  generated_at: string
}

export async function getBbsHeatmap(): Promise<HeatmapData> {
  const bucket = Math.floor(Date.now() / 30_000) // 30-sec bucket
  const cacheKey = makeCacheKey('bbs-heatmap', { bucket })
  const cached = cacheGet(cacheKey, 30)
  if (cached) return cached as HeatmapData

  const ago24h = getJSTString(-24)
  const ago1h = getJSTString(-1)
  const todayMidnight = getJSTMidnight()

  const client = await getMongoClient()
  const db = client.db('kabu_ai')

  const aggResult = await db.collection('yahoo_comment').aggregate([
    { $match: { comment_date: { $gte: ago24h } } },
    {
      $group: {
        _id: '$code',
        count_24h: { $sum: 1 },
        count_1h: {
          $sum: { $cond: [{ $gte: ['$comment_date', ago1h] }, 1, 0] },
        },
        count_today: {
          $sum: { $cond: [{ $gte: ['$comment_date', todayMidnight] }, 1, 0] },
        },
      },
    },
    {
      $addFields: {
        velocity: {
          $divide: [
            '$count_1h',
            { $max: [{ $divide: ['$count_24h', 24] }, 0.5] },
          ],
        },
      },
    },
    { $sort: { velocity: -1 } },
    { $limit: 60 },
  ]).toArray()

  // Fetch company names + latest prices from MySQL in parallel
  const codes = aggResult.map((r) => r._id as string).filter(Boolean)
  let nameMap: Record<string, string> = {}
  const priceMap: Record<string, { close: number | null; change_pct: number | null }> = {}
  if (codes.length > 0) {
    const placeholders = codes.map(() => '?').join(',')
    const mysqlDb = Database.getInstance()
    const [companies, priceRows] = await Promise.all([
      mysqlDb.select<{ code: string; name: string }>(
        `SELECT code, name FROM company WHERE code IN (${placeholders})`,
        codes
      ),
      mysqlDb.select<{ code: string; close: number; rn: number }>(
        `SELECT code, close, rn FROM (
           SELECT code, close,
             ROW_NUMBER() OVER (PARTITION BY code ORDER BY date DESC) AS rn
           FROM price WHERE code IN (${placeholders})
         ) t WHERE rn <= 2`,
        codes
      ),
    ])
    nameMap = Object.fromEntries(companies.map((c) => [c.code, c.name]))
    const byCode: Record<string, Array<{ close: number; rn: number }>> = {}
    for (const r of priceRows) {
      if (!byCode[r.code]) byCode[r.code] = []
      byCode[r.code].push({ close: r.close, rn: r.rn })
    }
    for (const [code, rows] of Object.entries(byCode)) {
      rows.sort((a, b) => a.rn - b.rn)
      const latest = rows[0]?.close ?? null
      const prev = rows[1]?.close ?? null
      const change_pct =
        latest !== null && prev !== null && prev !== 0
          ? ((latest - prev) / prev) * 100
          : null
      priceMap[code] = { close: latest, change_pct }
    }
  }

  const items: HeatItem[] = aggResult
    .map((r) => ({
      code: r._id as string,
      company_name: nameMap[r._id as string] ?? '',
      count_1h: r.count_1h as number,
      count_24h: r.count_24h as number,
      count_today: r.count_today as number,
      velocity: r.velocity as number,
      close: priceMap[r._id as string]?.close ?? null,
      change_pct: priceMap[r._id as string]?.change_pct ?? null,
    }))
    .filter((item) => item.company_name !== '') // Japanese stocks only

  const result: HeatmapData = { items, generated_at: new Date().toISOString() }
  cacheSet(cacheKey, result)
  return result
}
