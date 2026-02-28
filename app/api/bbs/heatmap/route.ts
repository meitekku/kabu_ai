import { NextResponse } from 'next/server'
import { getBbsHeatmap } from '@/lib/bbs/heatmap'

export async function GET() {
  try {
    const data = await getBbsHeatmap()
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=60' },
    })
  } catch (error) {
    console.error('BBS heatmap error:', error)
    return NextResponse.json({ items: [], generated_at: new Date().toISOString() })
  }
}
