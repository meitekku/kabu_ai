import { NextResponse } from 'next/server';
import { Database } from '@/lib/database/Mysql';
import { query, type SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import { sendLinePush } from '@/lib/line/messaging';

interface PtsPost {
  id: number;
  title: string;
  content: string;
}

interface PostCode {
  code: string;
}

interface CompanyPrice {
  current_price: number | null;
  diff_percent: number | null;
}

interface Company {
  name: string;
}

interface LineUser {
  user_id: string;
  line_user_id: string;
}

async function generatePtsMessage(
  code: string,
  companyName: string,
  price: CompanyPrice | null,
  postTitle: string
): Promise<string> {
  const cp = price?.current_price != null ? Number(price.current_price) : null;
  const dp = price?.diff_percent != null ? Number(price.diff_percent) : null;
  const priceStr = cp != null ? `¥${cp.toLocaleString()}` : '取得不可';
  const changeStr = dp != null ? `${dp > 0 ? '+' : ''}${dp.toFixed(2)}%` : '';

  const prompt = `PTS速報のLINE通知メッセージを生成してください。以下のデータを使ってください。

銘柄: ${companyName} (${code})
現在値: ${priceStr} (${changeStr})
ニュースタイトル: ${postTitle}

以下の形式で400文字以内の簡潔なメッセージを作成してください。装飾や説明は不要で、メッセージ本文のみ出力してください:

【PTS速報】${companyName}(${code})
PTS: ${priceStr} (${changeStr})

[ニュースタイトルに基づく一行コメント]

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

  const assistantMessages = messages.filter(
    (m) => m.type === 'assistant' && m.message
  );

  if (assistantMessages.length === 0) {
    // Fallback: return a static message
    return `【PTS速報】${companyName}(${code})\nPTS: ${priceStr} (${changeStr})\n\n${postTitle}\n\n詳細: https://kabu-ai.jp/stocks/${code}/news`;
  }

  const lastMsg = assistantMessages[assistantMessages.length - 1];
  if (lastMsg.type === 'assistant' && lastMsg.message) {
    const content = lastMsg.message.content;
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      return content
        .filter((block) => block.type === 'text')
        .map((block) => ('text' in block ? block.text : ''))
        .join('\n');
    }
  }

  return `【PTS速報】${companyName}(${code})\nPTS: ${priceStr} (${changeStr})\n\n${postTitle}\n\n詳細: https://kabu-ai.jp/stocks/${code}/news`;
}

export async function POST(req: Request) {
  try {
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey || apiKey !== process.env.FAVORITES_NEWS_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = Database.getInstance();
    const today = new Date().toISOString().split('T')[0];

    // site=71 の本日の PTS 投稿で未通知のものを取得
    const posts = await db.select<PtsPost>(
      `SELECT p.id, p.title, p.content
       FROM post p
       WHERE p.site = 71
         AND DATE(p.created_at) = ?
         AND NOT EXISTS (
           SELECT 1 FROM pts_line_notify_log l
           WHERE l.post_id = p.id AND l.notify_date = ?
         )
       ORDER BY p.created_at ASC`,
      [today, today]
    );

    if (posts.length === 0) {
      return NextResponse.json({ success: true, notified: 0 });
    }

    let notified = 0;

    for (const post of posts) {
      try {
        // 銘柄コード取得
        const postCodes = await db.select<PostCode>(
          'SELECT code FROM post_code WHERE post_id = ?',
          [post.id]
        );

        if (postCodes.length === 0) continue;

        const code = postCodes[0].code;

        // 企業情報・企業名を並列取得
        const [priceRows, companyRows] = await Promise.all([
          db.select<CompanyPrice>(
            'SELECT current_price, diff_percent FROM company_info WHERE code = ?',
            [code]
          ),
          db.select<Company>(
            'SELECT name FROM company WHERE code = ?',
            [code]
          ),
        ]);

        const price = priceRows[0] || null;
        const companyName = companyRows[0]?.name || code;

        // Claude SDK でメッセージ生成
        const message = await generatePtsMessage(code, companyName, price, post.title);

        // LINE連携済みユーザー取得:
        // - お気に入りに該当銘柄があるユーザー
        // - OR role='admin' のユーザー（全銘柄対象）
        const lineUsers = await db.select<LineUser>(
          `SELECT DISTINCT ull.user_id, ull.line_user_id
           FROM user_line_link ull
           JOIN user u ON ull.user_id = u.id
           WHERE u.role = 'admin'
              OR EXISTS (
                SELECT 1 FROM user_favorite uf
                WHERE uf.user_id = ull.user_id AND uf.code = ?
              )`,
          [code]
        );

        // 全ユーザーに並列送信
        const sendResults = await Promise.allSettled(
          lineUsers.map((lu) => sendLinePush(lu.line_user_id, message))
        );

        const sentCount = sendResults.filter((r) => r.status === 'fulfilled').length;

        for (const r of sendResults) {
          if (r.status === 'rejected') {
            console.error('LINE push failed:', r.reason);
          }
        }

        // ログ記録
        await db.insert(
          `INSERT INTO pts_line_notify_log (code, post_id, notify_date, sent_count)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE sent_count = sent_count + VALUES(sent_count), post_id = VALUES(post_id)`,
          [code, post.id, today, sentCount]
        );

        notified++;
      } catch (postErr) {
        console.error(`PTS notify error for post ${post.id}:`, postErr);
      }
    }

    return NextResponse.json({ success: true, notified });
  } catch (error) {
    console.error('PTS LINE notify error:', error);
    return NextResponse.json({ error: 'PTS通知処理に失敗しました' }, { status: 500 });
  }
}
