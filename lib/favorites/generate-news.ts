import { Database } from '@/lib/database/Mysql';
import { generateFavoritesReport } from '@/lib/agent/favorites-news-agent';
import { sendLinePush } from '@/lib/line/messaging';

interface GenerationResult {
  processedUsers: number;
  errors: string[];
}

export async function generateFavoritesNews(
  reportType: 'midday' | 'closing'
): Promise<GenerationResult> {
  const db = Database.getInstance();
  const errors: string[] = [];
  let processedUsers = 0;

  // 対象ユーザー取得: premium OR 48h trial, お気に入りあり
  const users = await db.select<{
    user_id: string;
    subscription_status: string | null;
    createdAt: Date;
  }>(
    `SELECT DISTINCT uf.user_id, u.subscription_status, u.createdAt
     FROM user_favorite uf
     JOIN user u ON uf.user_id = u.id
     WHERE u.subscription_status = 'active'
        OR u.createdAt > DATE_SUB(NOW(), INTERVAL 48 HOUR)`,
    []
  );

  if (users.length === 0) return { processedUsers: 0, errors: [] };

  const today = new Date().toISOString().split('T')[0];

  for (const user of users) {
    try {
      // 本日既に同タイプのレポート生成済みかチェック
      const existing = await db.select<{ id: number }>(
        `SELECT id FROM favorite_news
         WHERE user_id = ? AND report_type = ? AND generation_date = ?`,
        [user.user_id, reportType, today]
      );
      if (existing.length > 0) continue;

      // ユーザーのお気に入り取得
      const favorites = await db.select<{
        code: string;
        importance: number | null;
      }>(
        `SELECT code, importance FROM user_favorite
         WHERE user_id = ? ORDER BY importance DESC, created_at ASC`,
        [user.user_id]
      );

      if (favorites.length === 0) continue;

      const codes = favorites.map((f) => f.code);
      const placeholders = codes.map(() => '?').join(',');

      // 株価データ取得
      const prices = await db.select<{
        code: string;
        current_price: number;
        diff_percent: number;
      }>(
        `SELECT code, current_price, diff_percent
         FROM company_info WHERE code IN (${placeholders})`,
        codes
      );

      // 最新ニュース取得
      const news = await db.select<{
        code: string;
        title: string;
        content: string;
        article_time: Date;
      }>(
        `SELECT code, title, content, article_time
         FROM material_summary
         WHERE code IN (${placeholders})
         AND article_time > DATE_SUB(NOW(), INTERVAL 3 DAY)
         ORDER BY article_time DESC
         LIMIT 30`,
        codes
      );

      // 企業名取得
      const companies = await db.select<{ code: string; name: string }>(
        `SELECT code, name FROM company WHERE code IN (${placeholders})`,
        codes
      );

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
          info += `現在値: ¥${price.current_price?.toLocaleString() ?? '-'} (${
            price.diff_percent > 0 ? '+' : ''
          }${price.diff_percent?.toFixed(2) ?? '-'}%)\n`;
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

      const reportLabel = reportType === 'midday' ? '昼（11:30）' : '終値（15:30）';
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

      // DB保存
      await db.insert(
        `INSERT INTO favorite_news (user_id, report_type, content, stock_codes, generation_date)
         VALUES (?, ?, ?, ?, ?)`,
        [user.user_id, reportType, report, JSON.stringify(codes), today]
      );

      // LINE通知
      const lineLink = await db.select<{ line_user_id: string }>(
        'SELECT line_user_id FROM user_line_link WHERE user_id = ?',
        [user.user_id]
      );

      if (lineLink.length > 0) {
        try {
          const truncated = report.length > 4000 ? report.slice(0, 4000) + '...' : report;
          await sendLinePush(
            lineLink[0].line_user_id,
            `【株AI ${reportLabel}レポート】\n\n${truncated}\n\n詳細: https://kabu-ai.jp/favorites`
          );
        } catch (lineError) {
          console.error(`LINE push failed for user ${user.user_id}:`, lineError);
        }
      }

      processedUsers++;
    } catch (err) {
      const msg = `User ${user.user_id}: ${err instanceof Error ? err.message : 'Unknown error'}`;
      console.error('Generate favorites news error:', msg);
      errors.push(msg);
    }
  }

  return { processedUsers, errors };
}
