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

function calculateVolatility(prices: PriceRecord[]): { avgDailyReturn: string; dailyVolatility: string; avgRange: string } {
  const closes = prices.slice().reverse().map(p => Number(p.close));
  const dailyReturns: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    dailyReturns.push((closes[i] - closes[i - 1]) / closes[i - 1] * 100);
  }
  const avgReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
  const variance = dailyReturns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / dailyReturns.length;
  const stdDev = Math.sqrt(variance);

  const ranges = prices.map(p => (Number(p.high) - Number(p.low)) / Number(p.close) * 100);
  const avgRange = ranges.reduce((a, b) => a + b, 0) / ranges.length;

  return {
    avgDailyReturn: avgReturn.toFixed(3),
    dailyVolatility: stdDev.toFixed(3),
    avgRange: avgRange.toFixed(3),
  };
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
  predictedOpen: number;
  predictedClose: number;
  predictedHigh: number;
  predictedLow: number;
  predictedVolume?: number;
  reasoning: string;
}

interface PredictionResult {
  summary: string;
  themes: string[];
  risks: string[];
  dailyForecasts: DailyForecast[];
  overallAnalysis: string;
  technicalAnalysis: string;
  fundamentalAnalysis: string;
  catalystAnalysis: string;
  investmentStrategy: string;
  riskFactors: string[];
  quality_score?: number;
  scores?: {
    technical: number;
    fundamental: number;
    catalyst: number;
    strategy: number;
    overall: number;
  };
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

    const db = Database.getInstance();

    // 認証・キャッシュチェックを並列実行
    const [headersList, cookieStore, cacheResult] = await Promise.all([
      headers(),
      cookies(),
      db.select<{ prediction_data: string; report_html: string }>(
        `SELECT prediction_data, report_html FROM prediction_cache
         WHERE code = ? AND prediction_date = CURDATE()`,
        [code]
      ),
    ]);

    const session = await auth.api.getSession({ headers: headersList });
    const userId = session?.user?.id || null;
    const clientIp = getClientIp(headersList);
    const ADMIN_EMAIL = 'smartaiinvest@gmail.com';
    const isAdmin = !!cookieStore.get('username')?.value || session?.user?.email === ADMIN_EMAIL;

    // キャッシュヒット: 利用ログを記録して即返却（認証チェック不要）
    if (cacheResult.length > 0) {
      // 利用ログは非同期で記録（レスポンスをブロックしない）
      db.insert(
        `INSERT INTO prediction_usage_log (id, fingerprint, ip_address, user_id, code, is_premium, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [uuidv4(), fingerprint, clientIp, userId, code, false]
      ).catch((err: unknown) => console.error('Usage log error:', err));

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

    // プレミアム会員チェック
    let isPremium = false;
    if (userId) {
      const users = await db.select<{ subscription_status: string }>(
        'SELECT subscription_status FROM user WHERE id = ?',
        [userId]
      );
      isPremium = users[0]?.subscription_status === 'active';
    }

    // 利用制限チェック（管理者・プレミアムはスキップ）
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

    // 既に処理中かチェック
    const processingCheck = await db.select<{ prediction_data: string }>(
      `SELECT prediction_data FROM prediction_cache
       WHERE code = ? AND prediction_date = CURDATE()`,
      [code]
    );
    if (processingCheck.length > 0 && processingCheck[0].prediction_data === '{"status":"processing"}') {
      return NextResponse.json({ success: true, status: 'processing' });
    }

    // 処理中フラグを設定
    await db.insert(
      `INSERT INTO prediction_cache (code, prediction_date, report_html, prediction_data, created_at)
       VALUES (?, CURDATE(), '{"status":"processing"}', '{"status":"processing"}', NOW())
       ON DUPLICATE KEY UPDATE report_html = '{"status":"processing"}', prediction_data = '{"status":"processing"}', created_at = NOW()`,
      [code]
    );

    // 利用ログを先に記録
    db.insert(
      `INSERT INTO prediction_usage_log (id, fingerprint, ip_address, user_id, code, is_premium, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [uuidv4(), fingerprint, clientIp, userId, code, isPremium]
    ).catch((err: unknown) => console.error('Usage log error:', err));

    // バックグラウンドで予測を実行（レスポンスをブロックしない）
    generatePrediction(code, db, chartImage).catch((err) => {
      console.error('Background prediction error:', err);
      // エラー時はprocessingフラグを削除
      db.insert(
        `DELETE FROM prediction_cache WHERE code = ? AND prediction_date = CURDATE() AND prediction_data = '{"status":"processing"}'`,
        [code]
      ).catch(() => {});
    });

    return NextResponse.json({ success: true, status: 'processing' });
  } catch (error) {
    console.error('Prediction API error:', error);
    return NextResponse.json(
      { success: false, error: '予測処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

async function generatePrediction(code: string, db: Database, chartImage?: string) {
    // データ収集
    const [prices, companyInfo, news, annualResults, quarterlyResults] = await Promise.all([
      db.select<PriceRecord>(
        `SELECT date, open, high, low, close, volume FROM price
         WHERE code = ? ORDER BY date DESC LIMIT 60`,
        [code]
      ),
      db.select<CompanyRecord>(
        `SELECT c.code, c.name, ci.settlement_date FROM company c
         LEFT JOIN company_info ci ON c.code = ci.code
         WHERE c.code = ?`,
        [code]
      ),
      db.select<NewsRecord>(
        `SELECT p.title, p.created_at FROM post p
         JOIN post_code pc ON p.id = pc.post_id
         WHERE pc.code = ? AND p.accept = 1
         AND p.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
         ORDER BY p.created_at DESC LIMIT 20`,
        [code]
      ),
      db.select<AnnualResultRecord>(
        `SELECT period, revenue, operating_profit, net_income, eps
         FROM kabutan_annual_results WHERE stock_code = ?
         ORDER BY period DESC LIMIT 5`,
        [code]
      ).catch(() => [] as AnnualResultRecord[]),
      db.select<QuarterlyResultRecord>(
        `SELECT period, revenue, operating_profit, net_income
         FROM kabutan_quarterly_results WHERE stock_code = ?
         ORDER BY period DESC LIMIT 8`,
        [code]
      ).catch(() => [] as QuarterlyResultRecord[]),
    ]);

    if (prices.length === 0) {
      throw new Error('株価データが見つかりません');
    }

    const companyName = companyInfo[0]?.name || code;
    const volatility = calculateVolatility(prices);
    const latestPrice = prices[0];

    const price5dAgo = prices[4] || prices[prices.length - 1];
    const price20dAgo = prices[19] || prices[prices.length - 1];
    const trend5d = latestPrice && price5dAgo
      ? ((Number(latestPrice.close) - Number(price5dAgo.close)) / Number(price5dAgo.close) * 100).toFixed(2)
      : '不明';
    const trend20d = latestPrice && price20dAgo
      ? ((Number(latestPrice.close) - Number(price20dAgo.close)) / Number(price20dAgo.close) * 100).toFixed(2)
      : '不明';

    const priceText = prices.slice().reverse()
      .map((p) => `${p.date}: 始値${p.open} 高値${p.high} 安値${p.low} 終値${p.close} 出来高${p.volume}`)
      .join('\n');

    const recentPriceText = prices.slice(0, 20).slice().reverse()
      .map((p) => `${p.date}: 始値${p.open} 高値${p.high} 安値${p.low} 終値${p.close} 出来高${p.volume}`)
      .join('\n');

    const newsText = news.length > 0
      ? news.map((n) => `- [${n.created_at}] ${n.title}`).join('\n')
      : 'ニュースなし';

    const annualText = annualResults.length > 0
      ? annualResults.map((r) => `${r.period}: 売上${r.revenue} 営業利益${r.operating_profit} 純利益${r.net_income} EPS${r.eps}`).join('\n')
      : '業績データなし';

    const quarterlyText = quarterlyResults.length > 0
      ? quarterlyResults.map((r) => `${r.period}: 売上${r.revenue} 営業利益${r.operating_profit} 純利益${r.net_income}`).join('\n')
      : '四半期業績データなし';

    const latestDate = new Date(latestPrice.date);
    const businessDays = getNextBusinessDays(latestDate, 20);
    const businessDaysText = businessDays.join(', ');

    // GLM-4 API設定
    if (!process.env.GLM_API_KEY) {
      throw new Error('GLM_API_KEYが設定されていません');
    }
    const modelName = chartImage ? 'glm-4v-flash' : 'glm-4.7-flashx';

    type GlmMessage = { role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> };

    async function callGlmApi(apiMessages: GlmMessage[], temperature = 0.7, maxTokens = 4096): Promise<string> {
      const resp = await fetch(GLM_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GLM_API_KEY}`,
        },
        body: JSON.stringify({
          model: modelName,
          messages: apiMessages,
          temperature,
          max_tokens: maxTokens,
          stream: true,
        }),
      });
      if (!resp.ok) {
        throw new Error(`GLM API error: ${await resp.text()}`);
      }
      const reader = resp.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let content = '';
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const data = trimmed.slice(6);
          if (data === '[DONE]') continue;
          try {
            const chunk = JSON.parse(data);
            const delta = chunk.choices?.[0]?.delta;
            if (delta?.content) content += delta.content;
          } catch { /* skip malformed chunks */ }
        }
      }
      return content;
    }

    // JSON解析ヘルパー（リトライ付き）
    async function callAndParse<T>(prompt: string, maxTokens = 4096, useImage = false): Promise<T> {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const messages: GlmMessage[] = [];
          if (useImage && chartImage) {
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
          const raw = await callGlmApi(messages, 0.7, maxTokens);
          const jsonStr = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          return JSON.parse(jsonStr) as T;
        } catch (err) {
          console.error(`Step parse/API error (attempt ${attempt + 1}):`, err);
          if (attempt === 1) throw err;
        }
      }
      throw new Error('unreachable');
    }

    // ============================================================
    // Step 1: テクニカル・ファンダメンタルズ・カタリスト分析
    // ============================================================
    const analysisPrompt = `あなたはプロの株式アナリストです。以下のデータに基づき、テクニカル分析・ファンダメンタルズ分析・カタリスト分析を行ってください。

## 銘柄情報
- 銘柄コード: ${code}
- 会社名: ${companyName}

## 直近の株価データ（60日分）
${priceText}

## トレンドサマリー
- 直近5日の変動率: ${trend5d}%
- 直近20日の変動率: ${trend20d}%
- 直近終値: ${latestPrice.close}円
- 直近出来高: ${latestPrice.volume}

## ボラティリティ
- 日次平均変動率: ${volatility.avgDailyReturn}%
- 日次ボラティリティ（標準偏差）: ${volatility.dailyVolatility}%
- 平均日中値幅: ${volatility.avgRange}%

## 年次業績（直近5年）
${annualText}

## 四半期業績（直近8四半期）
${quarterlyText}

## 最新ニュース（直近7日）
${newsText}

${chartImage ? '## チャート画像\n添付のチャート画像も分析に活用してください。移動平均線、ボリンジャーバンド、RSI、MACDなどのテクニカル指標のパターンを読み取り予測に反映させてください。' : ''}

## 回答形式
以下のJSON形式のみで回答してください。JSON以外のテキストは含めないでください。

{
  "technicalAnalysis": "テクニカル分析の詳細。移動平均線（5日・25日・75日）の位置関係、ゴールデンクロス/デッドクロスの有無、RSI・MACDの数値と方向性、ボリンジャーバンドの位置、支持線・抵抗線の価格水準、出来高の変化パターンを具体的な数値を交えて200文字以上で記述",
  "fundamentalAnalysis": "ファンダメンタルズ分析の詳細。直近の業績推移（売上・利益の成長率）、PER・PBRなどのバリュエーション指標、同業他社との比較、配当利回り、財務健全性を具体的な数値を交えて200文字以上で記述",
  "catalystAnalysis": "カタリスト・材料分析。直近のニュースや材料がもたらす株価への影響、今後予定されている決算発表・IR・業界イベント、マクロ経済要因の影響を具体的に150文字以上で記述",
  "themes": ["投資テーマ（例: 'AI・人工知能', '半導体', 'DX推進'）を3-5個"],
  "risks": ["リスク要因を1行で簡潔に2-3個"],
  "scores": {
    "technical": "0-100の整数（テクニカル指標の一致度・トレンド信頼性）",
    "fundamental": "0-100の整数（業績の堅実さ・成長性・バリュエーション割安度）",
    "catalyst": "0-100の整数（材料のインパクト・明確さ）"
  }
}`;

    interface AnalysisResult {
      technicalAnalysis: string;
      fundamentalAnalysis: string;
      catalystAnalysis: string;
      themes: string[];
      risks: string[];
      scores: { technical: number; fundamental: number; catalyst: number };
    }

    console.log(`[${code}] Step 1/3: Analysis starting...`);
    const analysis = await callAndParse<AnalysisResult>(analysisPrompt, 4096, !!chartImage);
    console.log(`[${code}] Step 1/3: Analysis complete`);

    // ============================================================
    // Step 2: 日足予測（ボラティリティ制約付き）
    // ============================================================
    const forecastPrompt = `あなたはプロの株式アナリストです。以下のデータと分析結果に基づき、今後20営業日の株価を日足で予測してください。

## 銘柄情報
- 銘柄コード: ${code}
- 会社名: ${companyName}
- 直近終値: ${latestPrice.close}円

## ★ボラティリティ制約（最重要：この銘柄の実際の値動きに厳密に合わせること）
- 日次平均変動率: ${volatility.avgDailyReturn}%
- 日次ボラティリティ（標準偏差）: ${volatility.dailyVolatility}%
- 平均日中値幅(High-Low): ${volatility.avgRange}%
- **1日の終値変動率は日次ボラティリティ(${volatility.dailyVolatility}%)の範囲内に収めること**
- **日中値幅(High-Low)は平均日中値幅(${volatility.avgRange}%)を基準にすること**
- **重大な材料がある場合のみ、ボラティリティの1.5-2倍程度まで許容**
- **ボラティリティが小さい銘柄は小さい変動、大きい銘柄は大きい変動にすること**

## 直近の株価データ（20日分）
${recentPriceText}

## 分析結果サマリー
テクニカル: ${analysis.technicalAnalysis.slice(0, 200)}
ファンダメンタルズ: ${analysis.fundamentalAnalysis.slice(0, 200)}
カタリスト: ${analysis.catalystAnalysis.slice(0, 150)}

## 予測対象の営業日（この20日分を必ず全て予測すること）
${businessDaysText}

## 回答形式
以下のJSON形式のみで回答してください。JSON以外のテキストは含めないでください。

{
  "dailyForecasts": [
    {
      "date": "YYYY-MM-DD",
      "predictedOpen": 数値,
      "predictedClose": 数値,
      "predictedHigh": 数値,
      "predictedLow": 数値,
      "predictedVolume": 数値,
      "reasoning": "この日の予測根拠を30文字程度で記述"
    }
  ]
}

注意:
- 上記の20営業日分を必ず全て予測してください
- 日々の価格変動は自然な上下動を含むようにしてください
- 連続する数日間は上昇と下降が交互に現れるなど、リアルな市場の値動きを再現してください
- **最重要: 1日の変動率は日次ボラティリティ(${volatility.dailyVolatility}%)を基準に、この銘柄の過去の値動きと一致させてください**`;

    interface ForecastResult {
      dailyForecasts: DailyForecast[];
    }

    console.log(`[${code}] Step 2/3: Forecast starting...`);
    const forecast = await callAndParse<ForecastResult>(forecastPrompt, 4096);
    console.log(`[${code}] Step 2/3: Forecast complete`);

    // 予測結果から統計を計算
    const forecastCloses = forecast.dailyForecasts.map(f => f.predictedClose);
    const forecastMin = Math.min(...forecastCloses);
    const forecastMax = Math.max(...forecastCloses);
    const forecastLast = forecastCloses[forecastCloses.length - 1] || Number(latestPrice.close);
    const forecastChange = ((forecastLast - Number(latestPrice.close)) / Number(latestPrice.close) * 100).toFixed(2);

    // ============================================================
    // Step 3: サマリー・投資戦略・総合分析
    // ============================================================
    const summaryPrompt = `あなたはプロの株式アナリストです。以下の分析結果と予測データを総合し、投資家向けのサマリーレポートを作成してください。

## 銘柄情報
- 銘柄コード: ${code}
- 会社名: ${companyName}
- 直近終値: ${latestPrice.close}円

## テクニカル分析（スコア: ${analysis.scores.technical}/100）
${analysis.technicalAnalysis}

## ファンダメンタルズ分析（スコア: ${analysis.scores.fundamental}/100）
${analysis.fundamentalAnalysis}

## カタリスト分析（スコア: ${analysis.scores.catalyst}/100）
${analysis.catalystAnalysis}

## 関連テーマ
${analysis.themes.join(', ')}

## 主要リスク
${analysis.risks.join(', ')}

## 株価予測結果
- 予測期間: ${businessDays[0]} 〜 ${businessDays[businessDays.length - 1]}
- 予測株価レンジ: ${Math.round(forecastMin)}円 〜 ${Math.round(forecastMax)}円
- 期間変動率: ${forecastChange}%
- 予測最終日の終値: ${Math.round(forecastLast)}円

## 回答形式
以下のJSON形式のみで回答してください。JSON以外のテキストは含めないでください。

{
  "summary": "予測の要約。具体的な数値（予想株価レンジ、変動率など）を含む3-5文で記述。例: '${companyName}は現在値${latestPrice.close}円から...'",
  "overallAnalysis": "テクニカル分析とファンダメンタルズ分析の両面から詳細に記述。移動平均線の位置関係、出来高トレンド、業績の成長率、バリュエーション水準など具体的な数値を交えて300文字以上で分析",
  "investmentStrategy": "投資戦略の提案。推奨エントリーポイント（買い場の価格帯）、利益確定の目標価格、損切りラインの設定、時間軸に応じた戦略を具体的な数値を交えて150文字以上で記述",
  "riskFactors": [
    "具体的なリスク要因1（数値やシナリオを含む。例: '25日移動平均線(○○円)を下回った場合、○○円付近まで下落するリスク'）",
    "具体的なリスク要因2",
    "具体的なリスク要因3"
  ],
  "scores": {
    "strategy": "0-100の整数（リスクリワード比、エントリー条件の明確さを評価）",
    "overall": "0-100の整数（全分析を総合した投資魅力度）"
  }
}`;

    interface SummaryResult {
      summary: string;
      overallAnalysis: string;
      investmentStrategy: string;
      riskFactors: string[];
      scores: { strategy: number; overall: number };
    }

    console.log(`[${code}] Step 3/3: Summary starting...`);
    const summaryData = await callAndParse<SummaryResult>(summaryPrompt, 3072);
    console.log(`[${code}] Step 3/3: Summary complete`);

    // ============================================================
    // 結果を統合
    // ============================================================
    const predictionData: PredictionResult = {
      summary: summaryData.summary,
      themes: analysis.themes || [],
      risks: analysis.risks || [],
      dailyForecasts: forecast.dailyForecasts || [],
      overallAnalysis: summaryData.overallAnalysis,
      technicalAnalysis: analysis.technicalAnalysis,
      fundamentalAnalysis: analysis.fundamentalAnalysis,
      catalystAnalysis: analysis.catalystAnalysis,
      investmentStrategy: summaryData.investmentStrategy,
      riskFactors: summaryData.riskFactors || [],
      scores: {
        technical: analysis.scores?.technical || 0,
        fundamental: analysis.scores?.fundamental || 0,
        catalyst: analysis.scores?.catalyst || 0,
        strategy: summaryData.scores?.strategy || 0,
        overall: summaryData.scores?.overall || 0,
      },
    };

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
    const predictionJson = JSON.stringify(predictionData);

    await db.insert(
      `INSERT INTO prediction_cache (code, prediction_date, report_html, prediction_data, created_at)
       VALUES (?, CURDATE(), ?, ?, NOW())
       ON DUPLICATE KEY UPDATE report_html = VALUES(report_html), prediction_data = VALUES(prediction_data), created_at = NOW()`,
      [code, reportHtml, predictionJson]
    );

    console.log(`Prediction completed for ${code} (3 API calls)`);
}
