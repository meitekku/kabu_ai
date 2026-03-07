import cron from 'node-cron';

const API_URL = process.env.FAVORITES_NEWS_API_URL || 'http://localhost:3000/api/favorites/news/generate';
const API_KEY = process.env.FAVORITES_NEWS_API_KEY || '';

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

// 平日 12:00 JST (03:00 UTC) — 昼レポート
cron.schedule('0 12 * * 1-5', () => {
  void triggerGeneration('midday');
}, { timezone: 'Asia/Tokyo' });

// 平日 16:00 JST (07:00 UTC) — 終値レポート
cron.schedule('0 16 * * 1-5', () => {
  void triggerGeneration('closing');
}, { timezone: 'Asia/Tokyo' });

console.log(`[${new Date().toISOString()}] Favorites news scheduler started`);
console.log('  - midday:  weekdays 12:00 JST');
console.log('  - closing: weekdays 16:00 JST');
