import { NextResponse } from 'next/server';
import { generateFavoritesNews } from '@/lib/favorites/generate-news';

// 内部APIキー認証付きニュース生成トリガー
export async function POST(req: Request) {
  try {
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey || apiKey !== process.env.FAVORITES_NEWS_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const reportType = body.reportType as 'midday' | 'closing';

    if (!reportType || !['midday', 'closing'].includes(reportType)) {
      return NextResponse.json({ error: 'reportType must be midday or closing' }, { status: 400 });
    }

    const result = await generateFavoritesNews(reportType);

    return NextResponse.json({
      success: true,
      processedUsers: result.processedUsers,
      errors: result.errors,
    });
  } catch (error) {
    console.error('Favorites news generate error:', error);
    return NextResponse.json({ error: 'ニュース生成に失敗しました' }, { status: 500 });
  }
}
