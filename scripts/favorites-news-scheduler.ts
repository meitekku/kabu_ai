import cron from 'node-cron';

const API_URL = process.env.FAVORITES_NEWS_API_URL || 'http://localhost:3000/api/favorites/news/generate';
const API_KEY = process.env.FAVORITES_NEWS_API_KEY || '';
const CAROUSEL_API_URL = process.env.CAROUSEL_API_URL || 'http://localhost:3000/api/top/carousel/generate';
const CAROUSEL_API_KEY = process.env.TOP_CAROUSEL_API_KEY || '';

async function triggerGeneration(reportType: 'midday' | 'closing') {
  const label = reportType === 'midday' ? '昼レポート' : '終値レポート';
  console.log(`[${new Date().toISOString()}] ${label}生成開始...`);

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify({ reportType }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`[${new Date().toISOString()}] ${label}生成失敗: ${res.status} ${text}`);
      return;
    }

    const data = await res.json();
    console.log(`[${new Date().toISOString()}] ${label}生成完了: ${data.processedUsers}ユーザー処理`);

    if (data.errors?.length > 0) {
      console.warn(`[${new Date().toISOString()}] エラー:`, data.errors);
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ${label}生成エラー:`, error);
  }
}

async function triggerCarouselGeneration(reportType: 'midday' | 'closing') {
  const label = reportType === 'midday' ? '昼カルーセル' : '終値カルーセル';
  console.log(`[${new Date().toISOString()}] [Carousel] ${label}生成開始...`);

  try {
    const res = await fetch(CAROUSEL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CAROUSEL_API_KEY,
      },
      body: JSON.stringify({ reportType }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`[${new Date().toISOString()}] [Carousel] ${label}生成失敗: ${res.status} ${text}`);
      return;
    }

    const data = await res.json();
    console.log(`[${new Date().toISOString()}] [Carousel] ${label}生成完了: ${data.slides_generated}枚`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] [Carousel] ${label}生成エラー:`, error);
  }
}

// 平日 11:30 JST (02:30 UTC) — 昼レポート
cron.schedule('30 11 * * 1-5', () => {
  void triggerGeneration('midday');
  void triggerCarouselGeneration('midday');
}, { timezone: 'Asia/Tokyo' });

// 平日 15:30 JST (06:30 UTC) — 終値レポート
cron.schedule('30 15 * * 1-5', () => {
  void triggerGeneration('closing');
  void triggerCarouselGeneration('closing');
}, { timezone: 'Asia/Tokyo' });

console.log(`[${new Date().toISOString()}] Favorites news + Carousel scheduler started`);
console.log('  - midday:  weekdays 11:30 JST (favorites + carousel)');
console.log('  - closing: weekdays 15:30 JST (favorites + carousel)');
