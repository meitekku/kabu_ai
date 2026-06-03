import { NextRequest, NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'
import { cacheGet, cacheSet, makeCacheKey } from '@/lib/cache'

let mongoClient: MongoClient | null = null

async function getMongoClient(): Promise<MongoClient> {
  if (!mongoClient) {
    const uri = process.env.MONGODB_URI
    if (!uri) throw new Error('MONGODB_URI is not set')
    mongoClient = new MongoClient(uri)
    await mongoClient.connect()
  }
  return mongoClient
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  const cacheKey = makeCacheKey('bbs-comments', { code })
  const cached = cacheGet(cacheKey, 120)
  if (cached) return NextResponse.json(cached)

  try {
    const client = await getMongoClient()
    const db = client.db('kabu_ai')

    const [yahooRaw, stocktwitsRaw] = await Promise.all([
      db
        .collection('yahoo_comment')
        .find({ code: String(code), is_useful: { $ne: 0 } })
        .sort({ comment_date: -1 })
        .limit(50)
        .toArray(),
      db
        .collection('stocktwits_comment')
        .find({ code: String(code) })
        .sort({ comment_date: -1 })
        .limit(30)
        .toArray(),
    ])

    const yahoo = yahooRaw.map((c) => ({
      id: String(c._id),
      name: c.name ?? '',
      comment: c.comment ?? '',
      comment_date: String(c.comment_date),
      is_useful: c.is_useful ?? null,
    }))

    const stocktwits = stocktwitsRaw.map((c) => ({
      id: String(c._id),
      username: c.username ?? '',
      body: c.body ?? '',
      sentiment: c.sentiment ?? '',
      comment_date: String(c.comment_date),
    }))

    const result = { yahoo, stocktwits }
    cacheSet(cacheKey, result)
    return NextResponse.json(result)
  } catch (error) {
    console.error('BBS comments error:', error)
    return NextResponse.json({ yahoo: [], stocktwits: [] }, { status: 500 })
  }
}
