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
  predictedOpen: number;
  predictedClose: number;
  predictedHigh: number;
  predictedLow: number;
  predictedVolume?: number;
  reasoning: string;
}

interface TrendDirection {
  direction: 'up' | 'neutral' | 'down';
  strength: number; // 1-5
  reason: string;
}

interface PredictionResult {
  summary: string;
  trends: {
    oneWeek: TrendDirection;   // 1週間予測
    twoWeeks: TrendDirection;  // 2週間予測
    oneMonth: TrendDirection;  // 1ヶ月予測
  };
  dailyForecasts: DailyForecast[];
  overallAnalysis: string;
  technicalAnalysis: string;
  fundamentalAnalysis: string;
  catalystAnalysis: string;
  investmentStrategy: string;
  riskFactors: string[];
  quality_score?: number;
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
    const isAdmin = !!cookieStore.get('username')?.value;

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
    const businessDays = getNextBusinessDays(latestDate, 20);
    const businessDaysText = businessDays.join(', ');

    const prompt = `あなたはプロの株式アナリストです。機関投資家向けの高品質な分析レポートを作成するつもりで、以下のデータに基づき今後1ヶ月（20営業日）の株価を日足で予測してください。投資家に価値ある具体的な分析を提供することを最優先にしてください。

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

## 年次業績（直近5年）
${annualText}

## 四半期業績（直近8四半期）
${quarterlyText}

## 最新ニュース（直近7日）
${newsText}

${chartImage ? '## チャート画像\n添付のチャート画像も分析に活用してください。移動平均線、ボリンジャーバンド、RSI、MACDなどのテクニカル指標のパターンを読み取り予測に反映させてください。' : ''}

## 予測対象の営業日（この20日分を必ず全て予測すること）
${businessDaysText}

## 分析の指針
1. **テクニカル分析**: 移動平均線（5日・25日・75日）のゴールデンクロス/デッドクロス、支持線・抵抗線、出来高の変化、RSI・MACDの動向を考慮
2. **ファンダメンタルズ分析**: 業績トレンド（増収増益か減収減益か）、PER・PBRの水準感、セクター動向を考慮
3. **カタリスト**: ニュースの影響（ポジティブ/ネガティブ）、決算発表スケジュール、マクロ経済要因を考慮

## 回答形式
以下のJSON形式で回答してください。JSON以外のテキストは含めないでください。

{
  "summary": "予測の要約。具体的な数値（予想株価レンジ、変動率など）を含む3-5文で記述。例: '${companyName}は現在値${latestPrice.close}円から...'",
  "trends": {
    "oneWeek": {
      "direction": "up" または "neutral" または "down",
      "strength": 1-5の数値（1=弱い, 5=非常に強い）,
      "reason": "1週間予測のトレンド判断根拠を具体的な数値・指標を交えて50文字程度で記述"
    },
    "twoWeeks": {
      "direction": "up" または "neutral" または "down",
      "strength": 1-5の数値,
      "reason": "2週間予測のトレンド判断根拠を具体的な数値・指標を交えて50文字程度で記述"
    },
    "oneMonth": {
      "direction": "up" または "neutral" または "down",
      "strength": 1-5の数値,
      "reason": "1ヶ月予測のトレンド判断根拠を具体的な数値・指標を交えて50文字程度で記述"
    }
  },
  "dailyForecasts": [
    {
      "date": "YYYY-MM-DD",
      "predictedOpen": 数値,
      "predictedClose": 数値,
      "predictedHigh": 数値,
      "predictedLow": 数値,
      "predictedVolume": 数値,
      "reasoning": "この日の予測根拠を具体的に30文字程度で記述"
    }
  ],
  "overallAnalysis": "テクニカル分析とファンダメンタルズ分析の両面から詳細に記述。移動平均線の位置関係、出来高トレンド、業績の成長率、バリュエーション水準など具体的な数値を交えて300文字以上で分析",
  "technicalAnalysis": "テクニカル分析の詳細。移動平均線（5日・25日・75日）の位置関係、ゴールデンクロス/デッドクロスの有無、RSI・MACDの数値と方向性、ボリンジャーバンドの位置、支持線・抵抗線の価格水準、出来高の変化パターンなどを具体的な数値を交えて200文字以上で記述",
  "fundamentalAnalysis": "ファンダメンタルズ分析の詳細。直近の業績推移（売上・利益の成長率）、PER・PBRなどのバリュエーション指標、同業他社との比較、配当利回り、財務健全性などを具体的な数値を交えて200文字以上で記述",
  "catalystAnalysis": "カタリスト・材料分析。直近のニュースや材料がもたらす株価への影響、今後予定されている決算発表・IR・業界イベント、マクロ経済要因（金利・為替・政策）の影響を具体的に150文字以上で記述",
  "investmentStrategy": "投資戦略の提案。推奨エントリーポイント（買い場の価格帯）、利益確定の目標価格、損切りラインの設定、ポジションサイズの考え方、時間軸に応じた戦略の違いを具体的な数値を交えて150文字以上で記述",
  "riskFactors": [
    "具体的なリスク要因1（数値やシナリオを含む。例: '25日移動平均線(○○円)を下回った場合、○○円付近まで下落するリスク'）",
    "具体的なリスク要因2",
    "具体的なリスク要因3"
  ]
}

注意:
- 上記の20営業日分を必ず全て予測してください（土日祝は既に除外済み）
- 価格は現実的な範囲で予測してください（直近の値幅を参考に、極端な乖離は避ける）
- summaryは抽象的な表現を避け、必ず具体的な株価水準や変動率を含めてください
- overallAnalysisは投資判断に直結する分析を詳細に記述してください
- technicalAnalysis、fundamentalAnalysis、catalystAnalysis、investmentStrategyはそれぞれ指定文字数以上で詳細に記述してください
- riskFactorsは最低3つ、具体的な数値・シナリオを含めてください
- trendsのdirectionは必ず "up", "neutral", "down" のいずれかを使用してください
- trendsのstrengthは必ず1-5の整数を使用してください`;

    // GLM-4 API呼び出し
    if (!process.env.GLM_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'GLM_API_KEYが設定されていません。管理者にお問い合わせください。' },
        { status: 500 }
      );
    }

    // チャート画像がある場合はglm-4v-flash（Vision対応）、なければglm-4.7-flashx
    const modelName = chartImage ? 'glm-4v-flash' : 'glm-4.7-flashx';

    // GLM API呼び出しヘルパー
    async function callGlmApi(
      apiMessages: Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }>,
      temperature = 0.7,
      maxTokens = 8192,
    ): Promise<{ ok: boolean; content?: string; error?: string }> {
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
        }),
      });
      if (!resp.ok) {
        const errorText = await resp.text();
        return { ok: false, error: errorText };
      }
      const data = await resp.json();
      return { ok: true, content: data.choices?.[0]?.message?.content || '' };
    }

    // JSON解析ヘルパー
    function parseJsonResponse(raw: string): PredictionResult {
      const jsonStr = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(jsonStr);
    }

    // 予測生成（パース失敗時のみリトライ、最大2回）
    let predictionData: PredictionResult | null = null;
    const maxAttempts = 2;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
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

      const glmResult = await callGlmApi(messages);

      if (!glmResult.ok) {
        console.error('GLM API error:', glmResult.error);
        if (attempt === maxAttempts - 1) {
          return NextResponse.json(
            { success: false, error: 'AI APIの呼び出しに失敗しました。再度お試しください。' },
            { status: 500 }
          );
        }
        continue;
      }

      try {
        predictionData = parseJsonResponse(glmResult.content!);
        break;
      } catch (parseError) {
        console.error(`Failed to parse GLM response (attempt ${attempt + 1}):`, parseError);
        console.error('Raw response:', glmResult.content);
        if (attempt === maxAttempts - 1) {
          return NextResponse.json(
            { success: false, error: '予測データの解析に失敗しました。再度お試しください。' },
            { status: 500 }
          );
        }
        continue;
      }
    }

    if (!predictionData) {
      return NextResponse.json(
        { success: false, error: '予測データの生成に失敗しました。再度お試しください。' },
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

    // キャッシュ保存と利用ログ記録を非同期で実行（レスポンスをブロックしない）
    const reportHtml = `<h3>${companyName}（${code}）の株価予測</h3><p>${predictionData.summary}</p>`;
    const predictionJson = JSON.stringify(predictionData);

    Promise.all([
      db.insert(
        `INSERT INTO prediction_cache (code, prediction_date, report_html, prediction_data, created_at)
         VALUES (?, CURDATE(), ?, ?, NOW())
         ON DUPLICATE KEY UPDATE report_html = VALUES(report_html), prediction_data = VALUES(prediction_data), created_at = NOW()`,
        [code, reportHtml, predictionJson]
      ).catch((err: unknown) => console.error('Cache save error:', err)),
      db.insert(
        `INSERT INTO prediction_usage_log (id, fingerprint, ip_address, user_id, code, is_premium, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [uuidv4(), fingerprint, clientIp, userId, code, isPremium]
      ).catch((err: unknown) => console.error('Usage log error:', err)),
    ]);

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
