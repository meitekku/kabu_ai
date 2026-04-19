import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import { cacheGet, cacheSet, getCacheTTL, makeCacheKey } from '@/lib/cache';

let mongoClient: MongoClient | null = null;

async function getMongoClient() {
  if (!mongoClient) {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI is not set');
    mongoClient = new MongoClient(uri);
    await mongoClient.connect();
  }
  return mongoClient;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const body = await request.json();
    const limit = body.limit || 50;

    const cacheKey = makeCacheKey('us-comments', { code, limit });
    const ttl = getCacheTTL('market');
    const cached = cacheGet(cacheKey, ttl);
    if (cached) {
      return NextResponse.json(cached);
    }

    const client = await getMongoClient();
    const db = client.db('kabu_ai');

    const stocktwitsComments = await db.collection('stocktwits_comment')
      .find({ code: String(code) })
      .sort({ comment_date: -1 })
      .limit(limit)
      .toArray();

    const comments = stocktwitsComments.map(c => ({
      source: 'stocktwits',
      body: c.body,
      username: c.username,
      sentiment: c.sentiment,
      comment_date: c.comment_date,
    }));

    const response = { success: true, data: comments };
    cacheSet(cacheKey, response);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching US comments:', error);
    return NextResponse.json({ success: false, data: [] }, { status: 500 });
  }
}
