import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { headers } from 'next/headers';
import { Database } from '@/lib/database/Mysql';
import { generateFavoritesReport } from '@/lib/agent/favorites-news-agent';
import { sendLinePush } from '@/lib/line/messaging';

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
  }

  const db = Database.getInstance();

  // admin権限チェック
  const users = await db.select<{ role: string }>(
    'SELECT role FROM user WHERE id = ?',
    [session.user.id]
  );

  if (users.length === 0 || users[0].role !== 'admin') {
    return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 });
  }

  const body = await request.json();
  const reportType: 'midday' | 'closing' = body.reportType;

  if (reportType !== 'midday' && reportType !== 'closing') {
    return NextResponse.json({ error: 'reportType は midday または closing を指定してください' }, { status: 400 });
  }

  // adminのお気に入り銘柄取得
  const favorites = await db.select<{ code: string; importance: number | null }>(
    'SELECT code, importance FROM user_favorite WHERE user_id = ? ORDER BY importance DESC, created_at ASC',
    [session.user.id]
  );

  if (favorites.length === 0) {
    return NextResponse.json({ success: false, sent: false, message: 'お気に入り銘柄が登録されていません' });
  }

  const codes = favorites.map((f) => f.code);
  const placeholders = codes.map(() => '?').join(',');

  // 株価・ニュース・企業名を並列取得
  const [prices, news, companies] = await Promise.all([
    db.select<{ code: string; current_price: number; diff_percent: number }>(
      `SELECT code, current_price, diff_percent FROM company_info WHERE code IN (${placeholders})`,
      codes
    ),
    db.select<{ code: string; title: string; content: string; article_time: Date }>(
      `SELECT code, title, content, article_time FROM material_summary WHERE code IN (${placeholders}) AND article_time > DATE_SUB(NOW(), INTERVAL 3 DAY) ORDER BY article_time DESC LIMIT 30`,
      codes
    ),
    db.select<{ code: string; name: string }>(
      `SELECT code, name FROM company WHERE code IN (${placeholders})`,
      codes
    ),
  ]);

  const companyMap = new Map(companies.map((c) => [c.code, c.name]));
  const priceMap = new Map(prices.map((p) => [p.code, p]));

  // プロンプト構築
  const stockInfo = favorites.map((f) => {
    const company = companyMap.get(f.code) || f.code;
    const price = priceMap.get(f.code);
    const stockNews = news.filter((n) => n.code === f.code);
    const importance = f.importance ? `(重要度: ${'★'.repeat(f.importance)})` : '';

    let info = `### ${company} (${f.code}) ${importance}\n`;
    if (price) {
      const dp = price.diff_percent != null ? Number(price.diff_percent) : null;
      const cp = price.current_price != null ? Number(price.current_price) : null;
      info += `現在値: ¥${cp?.toLocaleString() ?? '-'} (${
        (dp ?? 0) > 0 ? '+' : ''
      }${dp?.toFixed(2) ?? '-'}%)\n`;
    }
    if (stockNews.length > 0) {
      info += '最近のニュース:\n';
      for (const n of stockNews.slice(0, 3)) {
        info += `- ${n.title}\n`;
      }
    } else {
      info += '最近のニュース: なし\n';
    }
    return info;
  });

  const reportLabel = reportType === 'midday' ? '昼（12:00）' : '終値（16:00）';
  const prompt = `以下のお気に入り銘柄について、${reportLabel}のパーソナルニュースレポートを生成してください。
重要度の高い銘柄を優先的に詳しく分析してください。
必要に応じてデータベースやウェブ検索で追加情報を取得してください。

## お気に入り銘柄データ

${stockInfo.join('\n')}

## 出力形式
マークダウンは使わず、プレーンテキストで出力してください。
各銘柄のセクションは改行で区切ってください。
最後に簡潔な市場全体のコメントを添えてください。`;

  const report = await generateFavoritesReport(prompt);

  // LINE送信
  const lineLink = await db.select<{ line_user_id: string }>(
    'SELECT line_user_id FROM user_line_link WHERE user_id = ?',
    [session.user.id]
  );

  let sent = false;
  if (lineLink.length > 0) {
    const truncated = report.length > 4000 ? report.slice(0, 4000) + '...' : report;
    await sendLinePush(
      lineLink[0].line_user_id,
      `【株AI ${reportLabel}レポート（テスト）】\n\n${truncated}\n\n詳細: https://kabu-ai.jp/favorites`
    );
    sent = true;
  }

  return NextResponse.json({
    success: true,
    sent,
    message: sent
      ? `${reportLabel}レポートを生成し、LINEに送信しました`
      : `${reportLabel}レポートを生成しましたが、LINE連携がないため送信できませんでした`,
  });
}
