import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { generateCarouselReport } from '@/lib/top/carousel-agent';
import { saveCarouselSlides } from '@/lib/top/carousel';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const hdrs = await headers();
  const apiKey = hdrs.get('x-api-key');
  if (!apiKey || apiKey !== process.env.TOP_CAROUSEL_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const reportType: 'midday' | 'closing' = body.reportType === 'closing' ? 'closing' : 'midday';

    console.log(`[Carousel Generate] Starting ${reportType} generation...`);
    const slides = await generateCarouselReport(reportType);
    await saveCarouselSlides(slides);
    console.log(`[Carousel Generate] Completed: ${slides.length} slides saved`);

    return NextResponse.json({ success: true, slides_generated: slides.length });
  } catch (error) {
    console.error('[Carousel Generate] Error:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
