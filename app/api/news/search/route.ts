import { NextResponse } from 'next/server'
import { searchNews } from '@/lib/news/search'

export async function POST(req: Request) {
  try {
    const params = await req.json()
    const { response, cacheHit, ttl } = await searchNews(params)

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': `public, s-maxage=${ttl}, stale-while-revalidate=${ttl * 2}`,
        'X-Cache': cacheHit ? 'HIT' : 'MISS',
      }
    })
  } catch (error) {
    console.error('Error in news search:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal Server Error',
    }, { status: 500 })
  }
}
