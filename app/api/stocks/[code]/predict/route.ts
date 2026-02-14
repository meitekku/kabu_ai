import { NextResponse, NextRequest } from 'next/server';
import { Database } from '@/lib/database/Mysql';
import { auth } from '@/lib/auth/auth';
import { headers, cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';

export const maxDuration = 120;

const GLM_API_URL = process.env.GLM_API_URL || 'https://ollama.kabu-ai.jp/glm/api/paas/v4/chat/completions';

// 日本の祝日判定
function getJapaneseHolidays(year: number): Set<string> {
  const holidays = new Set<string>();
  const add = (m: number, d: number) => holidays.add(`${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);

  add(1, 1);   // 元日
  // 成人の日: 1月第2月曜
  holidays.add(getNthWeekday(year, 1, 1, 2));
  add(2, 11);  // 建国記念の日
  add(2, 23);  // 天皇誕生日
  // 春分の日（概算）
  add(3, Math.floor(20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4)));
  add(4, 29);  // 昭和の日
  add(5, 3);   // 憲法記念日
  add(5, 4);   // みどりの日
  add(5, 5);   // こどもの日
  // 海の日: 7月第3月曜
  holidays.add(getNthWeekday(year, 7, 1, 3));
  add(8, 11);  // 山の日
  // 敬老の日: 9月第3月曜
  holidays.add(getNthWeekday(year, 9, 1, 3));
  // 秋分の日（概算）
  add(9, Math.floor(23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4)));
  // スポーツの日: 10月第2月曜
  holidays.add(getNthWeekday(year, 10, 1, 2));
  add(11, 3);  // 文化の日
  add(11, 23); // 勤労感謝の日

  // 振替休日: 祝日が日曜なら翌月曜
  const toCheck = [...holidays];
  for (const h of toCheck) {
    const d = new Date(h + 'T00:00:00');
    if (d.getDay() === 0) {
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      const y = next.getFullYear();
      const m = String(next.getMonth() + 1).padStart(2, '0');
      const day = String(next.getDate()).padStart(2, '0');
      holidays.add(`${y}-${m}-${day}`);
    }
  }

  return holidays;
}

function getNthWeekday(year: number, month: number, weekday: number, n: number): string {
  let count = 0;
  for (let day = 1; day <= 31; day++) {
    const d = new Date(year, month - 1, day);
    if (d.getMonth() !== month - 1) break;
    if (d.getDay() === weekday) {
      count++;
      if (count === n) return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }
  return '';
}

function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getNextBusinessDays(startDate: Date, count: number): string[] {
  const year = startDate.getFullYear();
  const holidays = new Set([
    ...getJapaneseHolidays(year),
    ...getJapaneseHolidays(year + 1),
  ]);
  const result: string[] = [];
  const d = new Date(startDate);
  d.setDate(d.getDate() + 1); // 翌日から開始
  while (result.length < count) {
    const dateStr = formatLocalDate(d);
    const dayOfWeek = d.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidays.has(dateStr)) {
      result.push(dateStr);
    }
    d.setDate(d.getDate() + 1);
  }
  return result;
}

function getClientIp(headersList: Headers): string {
  const forwardedFor = headersList.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  const cfConnectingIp = headersList.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp;
  }
  const realIp = headersList.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  return 'unknown';
}

interface PriceRecord {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface CompanyRecord {
  code: string;
  name: string;
  settlement_date: string | null;
}

interface NewsRecord {
  title: string;
  created_at: string;
}

interface AnnualResultRecord {
  period: string;
  revenue: number | null;
  operating_profit: number | null;
  net_income: number | null;
  eps: number | null;
}

interface QuarterlyResultRecord {
  period: string;
  revenue: number | null;
  operating_profit: number | null;
  net_income: number | null;
}

interface DailyForecast {
  date: string;
  predictedClose: number;
  predictedHigh: number;
  predictedLow: number;
  predictedVolume?: number;
  reasoning: string;
}

interface PredictionResult {
  summary: string;
  dailyForecasts: DailyForecast[];
  overallAnalysis: string;
  riskFactors: string[];
  confidence: number;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
): Promise<NextResponse> {
  try {
    const { code } = await params;
    const { fingerprint, chartImage } = await request.json();

    if (!fingerprint) {
      return NextResponse.json(
        { success: false, error: 'フィンガープリントが必要です' },
        { status: 400 }
      );
    }

    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });
    const userId = session?.user?.id || null;
    const clientIp = getClientIp(headersList);

    const db = Database.getInstance();

    // 管理者チェック（legacyクッキー認証）
    const cookieStore = await cookies();
    const isAdmin = !!cookieStore.get('username')?.value;

    // プレミアム会員チェック
    let isPremium = false;
    if (userId) {
      const users = await db.select<{ subscription_status: string }>(
        'SELECT subscription_status FROM user WHERE id = ?',
        [userId]
      );
      isPremium = users[0]?.subscription_status === 'active';
    }

    // 利用制限チェック（管理者はスキップ）
    if (!isPremium && !isAdmin) {
      if (userId) {
        const usageResult = await db.select<{ count: number }>(
          `SELECT COUNT(*) as count FROM prediction_usage_log WHERE user_id = ?`,
          [userId]
        );
        if ((usageResult[0]?.count || 0) >= 3) {
          return NextResponse.json(
            { success: false, error: '無料の予測回数（3回）を使い切りました。プレミアム会員になると無制限でご利用いただけます。', requirePremium: true },
            { status: 429 }
          );
        }
      } else {
        const usageResult = await db.select<{ count: number }>(
          `SELECT COUNT(*) as count FROM prediction_usage_log WHERE fingerprint = ? OR ip_address = ?`,
          [fingerprint, clientIp]
        );
        if ((usageResult[0]?.count || 0) >= 1) {
          return NextResponse.json(
            { success: false, error: '無料の予測回数（1回）を使い切りました。ログインすると3回まで利用できます。', requireLogin: true },
            { status: 429 }
          );
        }
      }
    }

    // キャッシュチェック
    const cacheResult = await db.select<{
      prediction_data: string;
      report_html: string;
    }>(
      `SELECT prediction_data, report_html FROM prediction_cache
       WHERE code = ? AND prediction_date = CURDATE()`,
      [code]
    );

    if (cacheResult.length > 0) {
      // キャッシュヒット: 利用ログを記録して返却
      await db.insert(
        `INSERT INTO prediction_usage_log (id, fingerprint, ip_address, user_id, code, is_premium, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [uuidv4(), fingerprint, clientIp, userId, code, isPremium]
      );

      let predictionData;
      try {
        predictionData = typeof cacheResult[0].prediction_data === 'string'
          ? JSON.parse(cacheResult[0].prediction_data)
          : cacheResult[0].prediction_data;
      } catch {
        predictionData = cacheResult[0].prediction_data;
      }

      return NextResponse.json({
        success: true,
        report: predictionData,
        cached: true,
      });
    }

    // データ収集
    const [prices, companyInfo, news, annualResults, quarterlyResults] = await Promise.all([
      // 直近60日の株価
      db.select<PriceRecord>(
        `SELECT date, open, high, low, close, volume FROM price
         WHERE code = ? ORDER BY date DESC LIMIT 60`,
        [code]
      ),
      // 会社情報
      db.select<CompanyRecord>(
        `SELECT c.code, c.name, ci.settlement_date FROM company c
         LEFT JOIN company_info ci ON c.code = ci.code
         WHERE c.code = ?`,
        [code]
      ),
      // 直近7日のニュース
      db.select<NewsRecord>(
        `SELECT p.title, p.created_at FROM post p
         JOIN post_code pc ON p.id = pc.post_id
         WHERE pc.code = ? AND p.accept = 1
         AND p.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
         ORDER BY p.created_at DESC LIMIT 20`,
        [code]
      ),
      // 年次業績
      db.select<AnnualResultRecord>(
        `SELECT period, revenue, operating_profit, net_income, eps
         FROM kabutan_annual_results WHERE stock_code = ?
         ORDER BY period DESC LIMIT 5`,
        [code]
      ).catch(() => [] as AnnualResultRecord[]),
      // 四半期業績
      db.select<QuarterlyResultRecord>(
        `SELECT period, revenue, operating_profit, net_income
         FROM kabutan_quarterly_results WHERE stock_code = ?
         ORDER BY period DESC LIMIT 8`,
        [code]
      ).catch(() => [] as QuarterlyResultRecord[]),
    ]);

    if (prices.length === 0) {
      return NextResponse.json(
        { success: false, error: '株価データが見つかりません' },
        { status: 404 }
      );
    }

    const companyName = companyInfo[0]?.name || code;

    // プロンプト構築
    const priceText = prices
      .slice()
      .reverse()
      .map((p) => `${p.date}: 始値${p.open} 高値${p.high} 安値${p.low} 終値${p.close} 出来高${p.volume}`)
      .join('\n');

    const latestPrice = prices[0];
    const price5dAgo = prices[4] || prices[prices.length - 1];
    const price20dAgo = prices[19] || prices[prices.length - 1];
    const trend5d = latestPrice && price5dAgo
      ? ((Number(latestPrice.close) - Number(price5dAgo.close)) / Number(price5dAgo.close) * 100).toFixed(2)
      : '不明';
    const trend20d = latestPrice && price20dAgo
      ? ((Number(latestPrice.close) - Number(price20dAgo.close)) / Number(price20dAgo.close) * 100).toFixed(2)
      : '不明';

    const newsText = news.length > 0
      ? news.map((n) => `- [${n.created_at}] ${n.title}`).join('\n')
      : 'ニュースなし';

    const annualText = annualResults.length > 0
      ? annualResults.map((r) => `${r.period}: 売上${r.revenue} 営業利益${r.operating_profit} 純利益${r.net_income} EPS${r.eps}`).join('\n')
      : '業績データなし';

    const quarterlyText = quarterlyResults.length > 0
      ? quarterlyResults.map((r) => `${r.period}: 売上${r.revenue} 営業利益${r.operating_profit} 純利益${r.net_income}`).join('\n')
      : '四半期業績データなし';

    // 営業日リストを生成
    const latestDate = new Date(latestPrice.date);
    const businessDays = getNextBusinessDays(latestDate, 10);
    const businessDaysText = businessDays.join(', ');

    const prompt = `あなたは株式アナリストです。以下のデータに基づいて、今後2週間（10営業日）の株価を日足で予測してください。

## 銘柄情報
- 銘柄コード: ${code}
- 会社名: ${companyName}

## 直近の株価データ（60日分）
${priceText}

## トレンド
- 直近5日の変動率: ${trend5d}%
- 直近20日の変動率: ${trend20d}%

## 年次業績（直近5年）
${annualText}

## 四半期業績（直近8四半期）
${quarterlyText}

## 最新ニュース（直近7日）
${newsText}

${chartImage ? '## チャート画像\n添付のチャート画像も分析に活用してください。テクニカル指標のパターンを読み取り予測に反映させてください。' : ''}

## 予測対象の営業日（この10日分を必ず全て予測すること）
${businessDaysText}

## 回答形式
以下のJSON形式で回答してください。JSON以外のテキストは含めないでください。

{
  "summary": "予測の要約（2-3文）",
  "dailyForecasts": [
    {
      "date": "YYYY-MM-DD",
      "predictedClose": 数値,
      "predictedHigh": 数値,
      "predictedLow": 数値,
      "predictedVolume": 数値,
      "reasoning": "この日の予測根拠（20文字以内で簡潔に）"
    }
  ],
  "overallAnalysis": "全体的な分析（テクニカル・ファンダメンタルズの両面から）",
  "riskFactors": ["リスク要因1", "リスク要因2", ...],
  "confidence": 0-100の信頼度
}

注意:
- 上記の10営業日分を必ず全て予測してください（土日祝は既に除外済み）
- 価格は現実的な範囲で予測してください
- reasoningは簡潔に20文字以内にしてください
- confidenceは分析の確信度を0-100で示してください`;

    // GLM-4 API呼び出し
    if (!process.env.GLM_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'GLM_API_KEYが設定されていません。管理者にお問い合わせください。' },
        { status: 500 }
      );
    }

    // チャート画像がある場合はglm-4v-flash（Vision対応）、なければglm-4.7-flashx
    const modelName = chartImage ? 'glm-4v-flash' : 'glm-4.7-flashx';

    const messages: Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }> = [];

    if (chartImage) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: `data:image/png;base64,${chartImage}` } },
        ],
      });
    } else {
      messages.push({ role: 'user', content: prompt });
    }

    const glmResponse = await fetch(GLM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GLM_API_KEY}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages,
        temperature: 0.7,
        max_tokens: 8192,
      }),
    });

    if (!glmResponse.ok) {
      const errorText = await glmResponse.text();
      console.error('GLM API error:', glmResponse.status, errorText);
      return NextResponse.json(
        { success: false, error: 'AI APIの呼び出しに失敗しました。再度お試しください。' },
        { status: 500 }
      );
    }

    const glmData = await glmResponse.json();
    const result = glmData.choices?.[0]?.message?.content || '';

    // JSONパース
    let predictionData: PredictionResult;
    try {
      // マークダウンコードブロックを除去
      const jsonStr = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      predictionData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse GLM response:', parseError);
      console.error('Raw response:', result);
      return NextResponse.json(
        { success: false, error: '予測データの解析に失敗しました。再度お試しください。' },
        { status: 500 }
      );
    }

    // 後処理: 祝日・土日の予測日を除外
    if (predictionData.dailyForecasts) {
      const currentYear = new Date().getFullYear();
      const holidays = new Set([
        ...getJapaneseHolidays(currentYear),
        ...getJapaneseHolidays(currentYear + 1),
      ]);
      predictionData.dailyForecasts = predictionData.dailyForecasts.filter((f) => {
        const d = new Date(f.date + 'T00:00:00');
        const dayOfWeek = d.getDay();
        return dayOfWeek !== 0 && dayOfWeek !== 6 && !holidays.has(f.date);
      });
    }

    // キャッシュ保存
    const reportHtml = `<h3>${companyName}（${code}）の株価予測</h3><p>${predictionData.summary}</p>`;
    try {
      await db.insert(
        `INSERT INTO prediction_cache (code, prediction_date, report_html, prediction_data, created_at)
         VALUES (?, CURDATE(), ?, ?, NOW())
         ON DUPLICATE KEY UPDATE report_html = VALUES(report_html), prediction_data = VALUES(prediction_data), created_at = NOW()`,
        [code, reportHtml, JSON.stringify(predictionData)]
      );
    } catch (cacheError) {
      console.error('Cache save error:', cacheError);
    }

    // 利用ログ記録
    await db.insert(
      `INSERT INTO prediction_usage_log (id, fingerprint, ip_address, user_id, code, is_premium, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [uuidv4(), fingerprint, clientIp, userId, code, isPremium]
    );

    return NextResponse.json({
      success: true,
      report: predictionData,
      cached: false,
    });
  } catch (error) {
    console.error('Prediction API error:', error);
    return NextResponse.json(
      { success: false, error: '予測処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
