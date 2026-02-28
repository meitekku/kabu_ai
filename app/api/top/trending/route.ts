import { NextResponse } from 'next/server'
import { getTrendingContent } from '@/lib/top/trending'
import { getCacheTTL } from '@/lib/cache'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const data = await getTrendingContent()
    const ttl = getCacheTTL('ranking')
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': `public, s-maxage=${ttl}, stale-while-revalidate=${ttl * 2}`,
      },
    })
  } catch (error) {
    console.error('[/api/top/trending] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch trending content' },
      { status: 500 }
    )
  }
}
