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
    // 2ステップに分割: 最新日の範囲を取得→その範囲でcreated_atインデックスを活用
    const rangeQuery = `
      SELECT
        CONVERT_TZ(
          DATE(CONVERT_TZ(MAX(p.created_at), '+00:00', '+09:00')),
          '+09:00', '+00:00'
        ) as day_start,
        CONVERT_TZ(
          DATE(CONVERT_TZ(MAX(p.created_at), '+00:00', '+09:00')) + INTERVAL 1 DAY,
          '+09:00', '+00:00'
        ) as day_end
      FROM post p
      INNER JOIN post_code pc ON p.id = pc.post_id
      WHERE p.created_at <= NOW()
    `;
    const rangeResults = await db.select<RowDataPacket & { day_start: string; day_end: string }>(rangeQuery);

    if (rangeResults.length === 0 || !rangeResults[0].day_start) {
      return Response.json({ success: true, data: [] } as DatabaseResponse<CompanyOption[]>);
    }

    const { day_start, day_end } = rangeResults[0];
    const query = `
      SELECT DISTINCT pc.code, c.name
      FROM post p
      INNER JOIN post_code pc ON p.id = pc.post_id
      INNER JOIN company c ON pc.code = c.code
      WHERE p.created_at >= ? AND p.created_at < ?
      ORDER BY pc.code ASC
    `;
    const results = await db.select<CompanyOption>(query, [day_start, day_end]);

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
    // 2ステップに分割: 最新日の範囲を取得→その範囲でcreated_atインデックスを活用
    const articleRangeQuery = `
      SELECT
        CONVERT_TZ(
          DATE(CONVERT_TZ(MAX(p.created_at), '+00:00', '+09:00')),
          '+09:00', '+00:00'
        ) as day_start,
        CONVERT_TZ(
          DATE(CONVERT_TZ(MAX(p.created_at), '+00:00', '+09:00')) + INTERVAL 1 DAY,
          '+09:00', '+00:00'
        ) as day_end
      FROM post p
      INNER JOIN post_code pc ON p.id = pc.post_id
      WHERE p.created_at <= NOW()
    `;
    const articleRange = await db.select<RowDataPacket & { day_start: string; day_end: string }>(articleRangeQuery);

    let articleResults: PostArticle[] = [];
    if (articleRange.length > 0 && articleRange[0].day_start) {
      const articleQuery = `
        SELECT p.id, p.title, SUBSTRING(p.content, 1, 500) as content, p.created_at, pc.code
        FROM post p
        INNER JOIN post_code pc ON p.id = pc.post_id
        WHERE pc.code = ?
          AND p.created_at >= ? AND p.created_at < ?
        ORDER BY p.created_at DESC
        LIMIT 1
      `;
      articleResults = await db.select<PostArticle>(articleQuery, [code, articleRange[0].day_start, articleRange[0].day_end]);
    }

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
