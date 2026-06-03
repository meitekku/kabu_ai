import { Database } from '@/lib/database/Mysql';
import type { ParsedIntent } from './parseIntent';

/**
 * 会社名から銘柄コードを検索
 */
export async function resolveStockCodes(intent: ParsedIntent): Promise<string[]> {
  const db = Database.getInstance();
  const codes: string[] = [...(intent.stockCodes || [])];

  if (intent.stockNames && intent.stockNames.length > 0) {
    for (const name of intent.stockNames) {
      const results = await db.select<{ code: string }>(
        'SELECT code FROM company WHERE name LIKE ? LIMIT 1',
        [`%${name}%`]
      );
      if (results.length > 0) {
        codes.push(results[0].code);
      }
    }
  }

  return [...new Set(codes)];
}

/**
 * お気に入り追加
 */
export async function handleAdd(userId: string, intent: ParsedIntent): Promise<string> {
  const codes = await resolveStockCodes(intent);
  if (codes.length === 0) {
    return '銘柄が見つかりませんでした。銘柄コード（例: 7203）または会社名（例: トヨタ）で指定してください。';
  }

  const db = Database.getInstance();
  const results: string[] = [];

  for (const code of codes) {
    // 銘柄存在チェック
    const companies = await db.select<{ code: string; name: string }>(
      'SELECT code, name FROM company WHERE code = ?',
      [code]
    );
    if (companies.length === 0) {
      results.push(`${code}: 銘柄が見つかりません`);
      continue;
    }

    // 上限チェック
    const countResult = await db.select<{ count: number }>(
      'SELECT COUNT(*) as count FROM user_favorite WHERE user_id = ?',
      [userId]
    );
    if (countResult[0].count >= 50) {
      results.push(`${companies[0].name}(${code}): 登録上限50銘柄に達しています`);
      continue;
    }

    // 追加
    await db.insert(
      'INSERT IGNORE INTO user_favorite (user_id, code) VALUES (?, ?)',
      [userId, code]
    );
    results.push(`${companies[0].name}(${code}): 追加しました`);
  }

  return results.join('\n');
}

/**
 * お気に入り削除
 */
export async function handleRemove(userId: string, intent: ParsedIntent): Promise<string> {
  const codes = await resolveStockCodes(intent);
  if (codes.length === 0) {
    return '削除する銘柄が見つかりませんでした。銘柄コードまたは会社名で指定してください。';
  }

  const db = Database.getInstance();
  const results: string[] = [];

  for (const code of codes) {
    const companies = await db.select<{ name: string }>(
      'SELECT name FROM company WHERE code = ?',
      [code]
    );
    const name = companies[0]?.name || code;

    const affected = await db.delete(
      'DELETE FROM user_favorite WHERE user_id = ? AND code = ?',
      [userId, code]
    );

    if (affected > 0) {
      results.push(`${name}(${code}): 削除しました`);
    } else {
      results.push(`${name}(${code}): お気に入りに登録されていません`);
    }
  }

  return results.join('\n');
}

/**
 * お気に入り一覧
 */
export async function handleList(userId: string): Promise<string> {
  const db = Database.getInstance();
  const favorites = await db.select<{
    code: string;
    importance: number | null;
    name: string | null;
    current_price: number | null;
    diff_percent: number | null;
  }>(
    `SELECT uf.code, uf.importance, c.name, ci.current_price, ci.diff_percent
     FROM user_favorite uf
     LEFT JOIN company c ON uf.code = c.code
     LEFT JOIN company_info ci ON uf.code = ci.code
     WHERE uf.user_id = ?
     ORDER BY uf.importance DESC, uf.created_at DESC`,
    [userId]
  );

  if (favorites.length === 0) {
    return 'お気に入り銘柄はまだ登録されていません。\n\n銘柄コードや会社名を送信して追加できます。\n例: 「トヨタを追加」「7203を登録」';
  }

  const lines = favorites.map((f) => {
    const stars = f.importance ? '★'.repeat(f.importance) : '';
    const price = f.current_price != null ? `¥${Number(f.current_price).toLocaleString()}` : '';
    const diffNum = f.diff_percent != null ? Number(f.diff_percent) : null;
    const diff = diffNum != null
      ? `(${diffNum > 0 ? '+' : ''}${diffNum.toFixed(2)}%)`
      : '';
    return `${stars ? stars + ' ' : ''}${f.name || f.code}(${f.code}) ${price} ${diff}`.trim();
  });

  return `お気に入り銘柄 (${favorites.length}/50)\n\n${lines.join('\n')}`;
}

/**
 * 銘柄情報取得
 */
export async function handleInfo(intent: ParsedIntent): Promise<string> {
  const codes = await resolveStockCodes(intent);
  if (codes.length === 0) {
    return '銘柄が見つかりませんでした。銘柄コードまたは会社名で指定してください。';
  }

  const db = Database.getInstance();
  const results: string[] = [];

  for (const code of codes) {
    const companies = await db.select<{
      code: string;
      name: string;
      current_price: number | null;
      diff_percent: number | null;
    }>(
      `SELECT c.code, c.name, ci.current_price, ci.diff_percent
       FROM company c
       LEFT JOIN company_info ci ON c.code = ci.code
       WHERE c.code = ?`,
      [code]
    );

    if (companies.length === 0) {
      results.push(`${code}: 銘柄が見つかりません`);
      continue;
    }

    const c = companies[0];
    let info = `${c.name}(${c.code})`;
    if (c.current_price != null) {
      info += `\n株価: ¥${Number(c.current_price).toLocaleString()}`;
    }
    if (c.diff_percent != null) {
      const dp = Number(c.diff_percent);
      info += ` (${dp > 0 ? '+' : ''}${dp.toFixed(2)}%)`;
    }

    // 最新ニュース
    const news = await db.select<{ title: string }>(
      `SELECT title FROM material_summary
       WHERE code = ? AND article_time > DATE_SUB(NOW(), INTERVAL 3 DAY)
       ORDER BY article_time DESC LIMIT 3`,
      [code]
    );

    if (news.length > 0) {
      info += '\n\n最新ニュース:';
      for (const n of news) {
        info += `\n- ${n.title}`;
      }
    }

    info += `\n\n詳細: https://kabu-ai.jp/stocks/${c.code}/news`;
    results.push(info);
  }

  return results.join('\n\n---\n\n');
}
