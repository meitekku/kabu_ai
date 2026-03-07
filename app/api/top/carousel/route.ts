import { NextResponse } from 'next/server';
import { getLatestCarousel } from '@/lib/top/carousel';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const slides = await getLatestCarousel();
    const generated_at = slides.length > 0 ? slides[0].generated_at : null;
    return NextResponse.json({ slides, generated_at });
  } catch (error) {
    console.error('[Carousel API] Error:', error);
    return NextResponse.json({ slides: [], generated_at: null });
  }
}
