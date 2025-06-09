import { Database } from '@/lib/database/Mysql';
import { NextRequest } from 'next/server';
import { RowDataPacket } from 'mysql2';

interface BaseRecord extends RowDataPacket {
  id: number;
  created_at?: string;
  updated_at?: string;
}

interface Post extends BaseRecord {
  title: string;
  content: string;
}

interface DatabaseResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { id, title, content } = await request.json() as Partial<Post>;

    // 必須パラメータのバリデーション
    if (!id || !title || !content) {
      return Response.json(
        {
          success: false,
          error: '必須パラメータが不足しています（id, title, content が必要です）'
        } as DatabaseResponse<never>,
        { status: 400 }
      );
    }

    const db = Database.getInstance();
    
    // UPDATE クエリの構築
    const query = 'UPDATE post SET title = ?, content = ?, updated_at = NOW() WHERE id = ?';
    const params = [title, content, id];

    const affectedRows = await db.update(query, params);

    if (affectedRows === 0) {
      return Response.json(
        {
          success: false,
          error: '指定されたIDのポストが見つかりませんでした'
        } as DatabaseResponse<never>,
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      data: { affectedRows }
    } as DatabaseResponse<{ affectedRows: number }>);

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