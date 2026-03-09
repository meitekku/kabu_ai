import cron from 'node-cron';

const API_URL = process.env.FAVORITES_NEWS_API_URL
  ? process.env.FAVORITES_NEWS_API_URL.replace('/favorites/news/generate', '/pts/line-notify')
  : 'http://localhost:3000/api/pts/line-notify';
const EARNINGS_API_URL = process.env.FAVORITES_NEWS_API_URL
  ? process.env.FAVORITES_NEWS_API_URL.replace('/favorites/news/generate', '/earnings/line-notify')
  : 'http://localhost:3000/api/earnings/line-notify';
const API_KEY = process.env.FAVORITES_NEWS_API_KEY || '';

async function checkAndNotify() {
  const day = new Date().getDay();
  if (day === 0 || day === 6) return;

  console.log(`[${new Date().toISOString()}] PTS通知チェック開始...`);

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify({}),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`[${new Date().toISOString()}] PTS通知失敗: ${res.status} ${text}`);
      return;
    }

    const data = await res.json();
    console.log(`[${new Date().toISOString()}] PTS通知: ${data.notified}件送信`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] PTS通知エラー:`, error);
  }
}

async function checkEarningsAndNotify() {
  const day = new Date().getDay();
  if (day === 0 || day === 6) return;

  console.log(`[${new Date().toISOString()}] [決算通知] チェック開始...`);

  try {
    const res = await fetch(EARNINGS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify({}),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`[${new Date().toISOString()}] [決算通知] 失敗: ${res.status} ${text}`);
      return;
    }

    const data = await res.json();
    console.log(`[${new Date().toISOString()}] [決算通知] ${data.notified}件送信`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] [決算通知] エラー:`, error);
  }
}

// 平日 16:00-23:50 の10分ごと
cron.schedule('*/10 16-23 * * 1-5', () => {
  void checkAndNotify();
  void checkEarningsAndNotify();
}, { timezone: 'Asia/Tokyo' });

console.log(`[${new Date().toISOString()}] PTS LINE notifier started`);
console.log('  - schedule: weekdays 16:00-23:50 JST (every 10 min)');
