import { NextRequest, NextResponse } from 'next/server';
import { MongoDatabase } from '@/lib/database/Mongodb';
import { format } from 'date-fns';

// リクエストボディの型定義
interface RequestBody {
  code: string;
  limit: number;
  startDateTime?: string;
  endDateTime?: string;
}

// DB が "YYYY-MM-DD HH:mm:ss" の文字列を持つ想定
interface YahooComment {
  comment: string;
  comment_date: string;
  _id: string;
}

// フィルタ用の型
interface CommentFilter {
  code: string;
  comment_date?: {
    $gte?: string;
    $lte?: string;
  };
}

// "2024-12-15T20:56:00Z" → "2024-12-15 20:56:00" に変換する関数
function formatToDbString(date: Date): string {
  return format(date, 'yyyy-MM-dd HH:mm:ss');
}

export async function POST(request: NextRequest) {
  try {
    // CORSヘッダーを設定
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // OPTIONSリクエストの処理
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { headers });
    }

    // リクエストボディを取得
    const body: RequestBody = await request.json();
    console.log('Request body:', body);
    
    // バリデーション
    if (!body.code || !body.limit || typeof body.limit !== 'number' || body.limit <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid request parameters' },
        { status: 400, headers }
      );
    }

    // MongoDBへ接続
    const mongoDb = MongoDatabase.getInstance();
    try {
      await mongoDb.connect();
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      return NextResponse.json(
        { 
          success: false, 
          error: `Database connection failed: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`,
          details: process.env.NODE_ENV === 'development' ? {
            mongodbUri: process.env.MONGODB_URI ? 'Set' : 'Not set',
            mongodbName: process.env.MONGODB_NAME ? 'Set' : 'Not set'
          } : undefined
        },
        { status: 500, headers }
      );
    }

    // フィルタ初期化
    const filter: CommentFilter = { code: body.code };

    // startDateTime / endDateTime があれば、文字列にフォーマットして代入
    if (body.startDateTime && body.endDateTime) {
      const startStr = formatToDbString(new Date(body.startDateTime));
      const endStr = formatToDbString(new Date(body.endDateTime));
      filter.comment_date = { $gte: startStr, $lte: endStr };
    } else if (body.startDateTime) {
      const startStr = formatToDbString(new Date(body.startDateTime));
      filter.comment_date = { $gte: startStr };
    } else if (body.endDateTime) {
      const endStr = formatToDbString(new Date(body.endDateTime));
      filter.comment_date = { $lte: endStr };
    }

    // コレクションから取得 (comment_date の降順)
    const comments = await mongoDb.find<YahooComment>(
      'yahoo_comment',
      filter,
      {
        limit: body.limit,
        sort: { comment_date: -1 }, // comment_date の文字列比較で降順
        projection: { comment: 1, comment_date: 1 },
      }
    );

    // 結果を返す
    return NextResponse.json({
      success: true,
      data: comments.map(doc => ({
        id: doc._id.toString(),
        comment: doc.comment,
        comment_date: doc.comment_date,
      })),
    }, { headers });
    
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      } }
    );
  }
}
