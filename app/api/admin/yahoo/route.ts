import { NextRequest, NextResponse } from 'next/server';
import { MongoDatabase } from '@/lib/database/Mongodb';

// リクエストボディの型定義
interface RequestBody {
  code: string;
  limit: number;
}

// レスポンスの型定義
interface YahooComment {
  comment: string;
  comment_date: string;
  _id: string;
}

export async function POST(request: NextRequest) {
  try {
    // リクエストボディのバリデーション
    const body: RequestBody = await request.json();
    console.log('Request body:', body);
    
    if (!body.code || !body.limit || typeof body.limit !== 'number' || body.limit <= 0) {
      return NextResponse.json(
        { error: 'Invalid request parameters' },
        { status: 400 }
      );
    }

    // MongoDBに接続
    const mongoDb = MongoDatabase.getInstance();
    await mongoDb.connect();

    // yahoo コレクションから指定された数のコメントを取得（comment_dateの降順）
    const comments = await mongoDb.find<YahooComment>(
      'yahoo_comment',
      { code: body.code },
      {
        limit: body.limit,
        sort: { comment_date: -1 }, // comment_dateの降順でソート
        projection: { comment: 1, comment_date: 1 } // commentとcomment_dateフィールドを取得
      }
    );

    // 結果を返す
    return NextResponse.json({
      success: true,
      data: comments.map(doc => ({
        id: doc._id.toString(),
        comment: doc.comment,
        comment_date: doc.comment_date
      }))
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}