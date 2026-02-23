import { Database } from '@/lib/database/Mysql';

const GLM_API_URL = process.env.GLM_API_URL || 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
const GLM_MODEL = process.env.GLM_CHAT_MODEL || 'glm-4-plus';

interface ParsedIntent {
  action: 'add' | 'remove' | 'list' | 'info' | 'help' | 'unknown';
  stockCodes?: string[];
  stockNames?: string[];
  rawQuery?: string;
}

/**
 * GLM APIでユーザーメッセージの意図を解析
 */
async function parseUserIntent(message: string): Promise<ParsedIntent> {
  const apiKey = process.env.GLM_API_KEY;
  if (!apiKey) {
    return { action: 'unknown', rawQuery: message };
  }

  const systemPrompt = `あなたはLINEボットの意図解析エンジンです。ユーザーのメッセージから以下の操作意図を判別してください。

## 操作一覧
- add: 銘柄をお気に入りに追加（例: "トヨタを追加", "7203を登録", "ソニーをお気に入りに"）
- remove: 銘柄をお気に入りから削除（例: "トヨタを削除", "7203を解除"）
- list: 現在のお気に入り一覧表示（例: "一覧", "お気に入り", "リスト", "確認"）
- info: 特定銘柄の情報取得（例: "トヨタの情報", "7203について"）
- help: 使い方説明（例: "ヘルプ", "使い方", "何ができる"）

## 出力形式（JSON）
{"action":"add","stockCodes":["7203"],"stockNames":["トヨタ自動車"]}

ルール:
- actionは必ず上記5つのいずれか。判別不能ならunknown
- 銘柄コード（4桁数字）があればstockCodesに入れる
- 会社名があればstockNamesに入れる
- JSONのみ返すこと。説明文は不要`;

  try {
    const res = await fetch(GLM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GLM_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        temperature: 0.1,
        max_tokens: 200,
      }),
    });

    if (!res.ok) {
      console.error('GLM intent parse error:', res.status, await res.text());
      return { action: 'unknown', rawQuery: message };
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content?.trim() || '';

    // JSONを抽出（マークダウンのコードブロック対応）
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { action: 'unknown', rawQuery: message };
    }

    const parsed = JSON.parse(jsonMatch[0]) as ParsedIntent;
    if (!['add', 'remove', 'list', 'info', 'help', 'unknown'].includes(parsed.action)) {
      return { action: 'unknown', rawQuery: message };
    }

    return { ...parsed, rawQuery: message };
  } catch (error) {
    console.error('GLM intent parse exception:', error);
    return { action: 'unknown', rawQuery: message };
  }
}

/**
 * 会社名から銘柄コードを検索
 */
async function resolveStockCodes(intent: ParsedIntent): Promise<string[]> {
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
async function handleAdd(userId: string, intent: ParsedIntent): Promise<string> {
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
async function handleRemove(userId: string, intent: ParsedIntent): Promise<string> {
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
async function handleList(userId: string): Promise<string> {
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
async function handleInfo(intent: ParsedIntent): Promise<string> {
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

const HELP_MESSAGE = `【株AI LINE Bot】

以下のコマンドが使えます:

◆ お気に入り管理
・「トヨタを追加」「7203を登録」→ 銘柄を追加
・「トヨタを削除」「7203を解除」→ 銘柄を削除
・「一覧」「お気に入り」→ 登録銘柄一覧

◆ 銘柄情報
・「トヨタの情報」「7203について」→ 株価・ニュース表示

◆ 自動配信
・平日 11:30 / 15:30 にお気に入り銘柄のAIレポートをお届け

詳しくは https://kabu-ai.jp/favorites`;

/**
 * LINEメッセージを処理して応答テキストを返す
 */
export async function handleLineMessage(
  lineUserId: string,
  message: string
): Promise<string> {
  const db = Database.getInstance();

  // LINE user_idからkabu_aiユーザーを特定
  const links = await db.select<{ user_id: string }>(
    'SELECT user_id FROM user_line_link WHERE line_user_id = ?',
    [lineUserId]
  );

  if (links.length === 0) {
    return '株AIアカウントと連携されていません。\nhttps://kabu-ai.jp/favorites からLINE連携を設定してください。';
  }

  const userId = links[0].user_id;

  // アクセス権チェック
  const users = await db.select<{
    subscription_status: string | null;
    createdAt: Date;
  }>(
    'SELECT subscription_status, createdAt FROM user WHERE id = ?',
    [userId]
  );

  if (users.length === 0) {
    return 'ユーザー情報が見つかりません。';
  }

  const user = users[0];
  const isPremium = user.subscription_status === 'active';
  const createdAt = new Date(user.createdAt);
  const trialEnd = new Date(createdAt.getTime() + 48 * 60 * 60 * 1000);
  const isTrial = new Date() < trialEnd;

  if (!isPremium && !isTrial) {
    return 'お気に入り機能はプレミアム会員限定です。\nhttps://kabu-ai.jp/premium からプレミアムプランをご確認ください。';
  }

  // GLM APIで意図解析
  const intent = await parseUserIntent(message);

  switch (intent.action) {
    case 'add':
      return handleAdd(userId, intent);
    case 'remove':
      return handleRemove(userId, intent);
    case 'list':
      return handleList(userId);
    case 'info':
      return handleInfo(intent);
    case 'help':
      return HELP_MESSAGE;
    default:
      // 意図が不明な場合はヘルプを表示
      return `メッセージを理解できませんでした。\n\n${HELP_MESSAGE}`;
  }
}
