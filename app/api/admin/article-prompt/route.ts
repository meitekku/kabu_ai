import { Database } from '@/lib/database/Mysql';
import { NextRequest } from 'next/server';
import { RowDataPacket } from 'mysql2';

interface BaseRecord extends RowDataPacket {
  id: number;
  created_at?: string;
}

interface PostPrompt extends BaseRecord {
  code: string;
  prompt: string;
}

interface PostArticle extends BaseRecord {
  code: string;
  title: string;
  content: string;
}

interface CompanyOption extends RowDataPacket {
  code: string;
  name: string;
}

interface DatabaseResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// 当日のデータがある会社一覧を取得
export async function GET() {
  try {
    const db = Database.getInstance();

    // 本日または直近の日付のデータがある会社コードと名前を取得（昇順）
    // 土日・祝日の場合は直前の営業日のデータを表示
    // CONVERT_TZ で UTC から JST に変換して日付比較
    const query = `
      SELECT DISTINCT pc.code, c.name
      FROM post p
      INNER JOIN post_code pc ON p.id = pc.post_id
      INNER JOIN company c ON pc.code = c.code
      WHERE DATE(CONVERT_TZ(p.created_at, '+00:00', '+09:00')) = (
        SELECT MAX(DATE(CONVERT_TZ(p2.created_at, '+00:00', '+09:00')))
        FROM post p2
        INNER JOIN post_code pc2 ON p2.id = pc2.post_id
        WHERE DATE(CONVERT_TZ(p2.created_at, '+00:00', '+09:00')) <= CURDATE()
      )
      ORDER BY pc.code ASC
    `;
    const results = await db.select<CompanyOption>(query);

    return Response.json({
      success: true,
      data: results
    } as DatabaseResponse<CompanyOption[]>);

  } catch (error) {
    console.error('Database operation error:', error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'データベース操作中にエラーが発生しました'
      } as DatabaseResponse<never>,
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();
    const db = Database.getInstance();

    if (!code) {
      return Response.json(
        {
          success: false,
          error: 'codeパラメータが必要です'
        } as DatabaseResponse<never>,
        { status: 400 }
      );
    }

    // 1. post_promptテーブルから指定されたcodeの最新のpromptを取得
    const promptQuery = `SELECT code, prompt, created_at FROM post_prompt WHERE code = ? ORDER BY created_at DESC LIMIT 1`;
    const promptResults = await db.select<PostPrompt>(promptQuery, [code]);

    if (promptResults.length === 0) {
      return Response.json(
        {
          success: false,
          error: '指定されたcodeのプロンプトが見つかりません'
        } as DatabaseResponse<never>,
        { status: 404 }
      );
    }

    // 2. 本日または直近の日付のpostテーブルのデータを取得 (post_codeテーブルとJOIN)
    // contentは最初の500文字のみ取得してパフォーマンス改善
    // 最新の1件のみ取得
    // 土日・祝日の場合は直前の営業日のデータを表示
    const articleQuery = `
      SELECT p.id, p.title, SUBSTRING(p.content, 1, 500) as content, p.created_at, pc.code
      FROM post p
      INNER JOIN post_code pc ON p.id = pc.post_id
      WHERE pc.code = ? AND DATE(CONVERT_TZ(p.created_at, '+00:00', '+09:00')) = (
        SELECT MAX(DATE(CONVERT_TZ(p2.created_at, '+00:00', '+09:00')))
        FROM post p2
        INNER JOIN post_code pc2 ON p2.id = pc2.post_id
        WHERE DATE(CONVERT_TZ(p2.created_at, '+00:00', '+09:00')) <= CURDATE()
      )
      ORDER BY p.created_at DESC
      LIMIT 1
    `;
    const articleResults = await db.select<PostArticle>(articleQuery, [code]);

    return Response.json({
      success: true,
      data: {
        prompt: promptResults[0],
        articles: articleResults
      }
    } as DatabaseResponse<{ prompt: PostPrompt; articles: PostArticle[] }>);

  } catch (error) {
    console.error('Database operation error:', error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'データベース操作中にエラーが発生しました'
      } as DatabaseResponse<never>,
      { status: 500 }
    );
  }
}
