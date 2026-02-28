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

export interface HeatItem {
  code: string
  company_name: string
  count_1h: number
  count_24h: number
  velocity: number
}

export interface HeatmapData {
  items: HeatItem[]
  generated_at: string
}

export async function getBbsHeatmap(): Promise<HeatmapData> {
  const bucket = Math.floor(Date.now() / 300_000) // 5-min bucket
  const cacheKey = makeCacheKey('bbs-heatmap', { bucket })
  const cached = cacheGet(cacheKey, 300)
  if (cached) return cached as HeatmapData

  const ago24h = getJSTString(-24)
  const ago1h = getJSTString(-1)

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

  // Fetch company names from MySQL
  const codes = aggResult.map((r) => r._id as string).filter(Boolean)
  let nameMap: Record<string, string> = {}
  if (codes.length > 0) {
    const placeholders = codes.map(() => '?').join(',')
    const mysqlDb = Database.getInstance()
    const companies = await mysqlDb.select<{ code: string; name: string }>(
      `SELECT code, name FROM company WHERE code IN (${placeholders})`,
      codes
    )
    nameMap = Object.fromEntries(companies.map((c) => [c.code, c.name]))
  }

  const items: HeatItem[] = aggResult
    .map((r) => ({
      code: r._id as string,
      company_name: nameMap[r._id as string] ?? '',
      count_1h: r.count_1h as number,
      count_24h: r.count_24h as number,
      velocity: r.velocity as number,
    }))
    .filter((item) => item.company_name !== '') // Japanese stocks only

  const result: HeatmapData = { items, generated_at: new Date().toISOString() }
  cacheSet(cacheKey, result)
  return result
}
