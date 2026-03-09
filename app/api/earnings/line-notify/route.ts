import { NextResponse } from 'next/server';
import { Database } from '@/lib/database/Mysql';
import { query, type SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import { sendLinePush } from '@/lib/line/messaging';

// Interfaces
interface EarningsStock {
  code: string;
  name: string;
  settlement_date: string;
}

interface QuarterlyResult {
  period: string;
  revenue: number | null;
  operating_profit: number | null;
  ordinary_profit: number | null;
  net_income: number | null;
  eps: number | null;
  progress_rate: number | null;
  announcement_date: string;
}

interface AnnualResult {
  period: string;
  revenue: number | null;
  operating_profit: number | null;
  ordinary_profit: number | null;
  net_income: number | null;
  eps: number | null;
  announcement_date: string;
}

interface PtsPrice {
  pts_price: number | null;
  pts_pct: number | null;
}

interface LineUser {
  user_id: string;
  line_user_id: string;
}

async function generateEarningsMessage(
  code: string,
  companyName: string,
  quarterly: QuarterlyResult[],
  annual: AnnualResult[],
  ptsInfo: PtsPrice | null
): Promise<string> {
  // Build earnings summary string
  const qStr = quarterly.slice(0, 2).map(q => {
    const rev = q.revenue ? `売上${(q.revenue / 1e8).toFixed(0)}億` : '';
    const op = q.operating_profit ? `営業益${(q.operating_profit / 1e8).toFixed(0)}億` : '';
    const ni = q.net_income ? `純益${(q.net_income / 1e8).toFixed(0)}億` : '';
    const pr = q.progress_rate ? `進捗${q.progress_rate}%` : '';
    return `${q.period}: ${[rev, op, ni, pr].filter(Boolean).join(' ')}`;
  }).join('\n');

  const ptsStr = ptsInfo?.pts_price
    ? `PTS: ¥${Number(ptsInfo.pts_price).toLocaleString()} (${ptsInfo.pts_pct != null ? (Number(ptsInfo.pts_pct) > 0 ? '+' : '') + Number(ptsInfo.pts_pct).toFixed(2) + '%' : ''})`
    : '';

  const prompt = `決算発表のLINE通知メッセージを生成してください。

銘柄: ${companyName} (${code})
${ptsStr}

決算データ:
${qStr || '（データなし）'}

以下の形式で350文字以内のメッセージを作成してください（本文のみ出力）:

【決算速報】${companyName}(${code})
${ptsStr}

[売上・営業利益・純利益・進捗率を1-2行で簡潔に]

詳細: https://kabu-ai.jp/stocks/${code}/news`;

  const cleanEnv = { ...process.env };
  delete cleanEnv.ANTHROPIC_API_KEY;

  const messages: SDKMessage[] = [];
  const q = query({
    prompt,
    options: {
      model: 'claude-haiku-4-5-20251001',
      maxTurns: 1,
      permissionMode: 'default',
      allowedTools: [],
      tools: [],
      env: cleanEnv,
    },
  });

  for await (const msg of q) {
    messages.push(msg);
  }

  const assistantMessages = messages.filter(m => m.type === 'assistant' && m.message);
  if (assistantMessages.length === 0) {
    return `【決算速報】${companyName}(${code})\n${ptsStr}\n\n${qStr}\n\n詳細: https://kabu-ai.jp/stocks/${code}/news`;
  }

  const lastMsg = assistantMessages[assistantMessages.length - 1];
  if (lastMsg.type === 'assistant' && lastMsg.message) {
    const content = lastMsg.message.content;
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      return content.filter(b => b.type === 'text').map(b => ('text' in b ? b.text : '')).join('\n');
    }
  }

  return `【決算速報】${companyName}(${code})\n${ptsStr}\n\n${qStr}\n\n詳細: https://kabu-ai.jp/stocks/${code}/news`;
}

export async function POST(req: Request) {
  try {
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey || apiKey !== process.env.FAVORITES_NEWS_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = Database.getInstance();
    const today = new Date().toISOString().split('T')[0];

    // earnings_line_notify_log テーブルを作成（なければ）
    await db.query(
      `CREATE TABLE IF NOT EXISTS earnings_line_notify_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(10) NOT NULL,
        notify_date DATE NOT NULL,
        sent_count INT NOT NULL DEFAULT 0,
        notified_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_code_date (code, notify_date)
      )`,
      []
    );

    // 本日決算で未通知の銘柄を取得
    const stocks = await db.select<EarningsStock>(
      `SELECT ci.code, c.name, ci.settlement_date
       FROM company_info ci
       JOIN company c ON c.code = ci.code AND c.status = 'active'
       LEFT JOIN earnings_line_notify_log enl
         ON enl.code = ci.code AND enl.notify_date = ?
       WHERE DATE(ci.settlement_date) = ?
         AND ci.code NOT IN ('0000', '0001', '0002', '9999')
         AND enl.id IS NULL`,
      [today, today]
    );

    if (stocks.length === 0) {
      return NextResponse.json({ success: true, notified: 0 });
    }

    let notified = 0;

    // 並列処理（最大5件同時）
    const results = await Promise.allSettled(
      stocks.map(async (stock) => {
        const { code, name } = stock;

        // 決算データ取得（並列）
        const [quarterly, annual, ptsRows] = await Promise.all([
          db.select<QuarterlyResult>(
            `SELECT period, revenue, operating_profit, ordinary_profit,
                    net_income, eps, progress_rate, announcement_date
             FROM kabutan_quarterly_results
             WHERE stock_code = ?
             ORDER BY period DESC LIMIT 4`,
            [code]
          ),
          db.select<AnnualResult>(
            `SELECT period, revenue, operating_profit, ordinary_profit,
                    net_income, eps, announcement_date
             FROM kabutan_annual_results
             WHERE stock_code = ?
             ORDER BY period DESC LIMIT 2`,
            [code]
          ),
          db.select<PtsPrice>(
            `SELECT pp.price AS pts_price,
                    ROUND((pp.price - pr.close) / pr.close * 100, 2) AS pts_pct
             FROM pts_price pp
             JOIN price pr ON pr.code = pp.code
               AND pr.date = (SELECT MAX(date) FROM price p2 WHERE p2.code = pp.code)
             WHERE pp.code = ?
             LIMIT 1`,
            [code]
          ),
        ]);

        // 決算データがなければスキップ
        if (quarterly.length === 0 && annual.length === 0) return;

        const ptsInfo = ptsRows[0] || null;

        // お気に入り登録済み＋LINE連携済みユーザーを取得
        const lineUsers = await db.select<LineUser>(
          `SELECT DISTINCT ull.user_id, ull.line_user_id
           FROM user_line_link ull
           WHERE EXISTS (
             SELECT 1 FROM user_favorite uf
             WHERE uf.user_id = ull.user_id AND uf.code = ?
           )`,
          [code]
        );

        if (lineUsers.length === 0) {
          // ユーザーなし→ログだけ記録して次へ
          await db.insert(
            `INSERT INTO earnings_line_notify_log (code, notify_date, sent_count)
             VALUES (?, ?, 0)
             ON DUPLICATE KEY UPDATE sent_count = sent_count`,
            [code, today]
          );
          return;
        }

        const message = await generateEarningsMessage(code, name, quarterly, annual, ptsInfo);

        const sendResults = await Promise.allSettled(
          lineUsers.map(lu => sendLinePush(lu.line_user_id, message))
        );

        const sentCount = sendResults.filter(r => r.status === 'fulfilled').length;
        for (const r of sendResults) {
          if (r.status === 'rejected') console.error('LINE push failed (earnings):', r.reason);
        }

        await db.insert(
          `INSERT INTO earnings_line_notify_log (code, notify_date, sent_count)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE sent_count = sent_count + VALUES(sent_count)`,
          [code, today, sentCount]
        );

        notified++;
      })
    );

    for (const r of results) {
      if (r.status === 'rejected') console.error('Earnings notify error:', r.reason);
    }

    return NextResponse.json({ success: true, notified });
  } catch (error) {
    console.error('Earnings LINE notify error:', error);
    return NextResponse.json({ error: '決算通知処理に失敗しました' }, { status: 500 });
  }
}
