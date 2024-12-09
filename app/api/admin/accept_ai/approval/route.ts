// src/app/api/approval/route.ts

import { Database } from '@/lib/database/Mysql';
import { NextRequest } from 'next/server';

interface ApprovalUpdateData {
  id: number;
  title: string;
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const data: ApprovalUpdateData = await request.json();
    const { id, title, content } = data;

    const db = Database.getInstance();

    // 承認処理（accept=1に更新）と内容の更新を実行
    const query = `
      UPDATE news_ai 
      SET accept = 1, 
          title = ?,
          content = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    const result = await db.update(query, [title, content, id]);

    if (result > 0) {
      return Response.json({ 
        success: true, 
        message: '承認処理が完了しました'
      });
    } else {
      return Response.json({ 
        success: false, 
        error: '更新対象のレコードが見つかりませんでした'
      }, { status: 404 });
    }

  } catch (error) {
    console.error('Approval error:', error);
    return Response.json({ 
      success: false, 
      error: error instanceof Error ? error.message : '承認処理中にエラーが発生しました'
    }, { status: 500 });
  }
}

// タイトルのみの更新用エンドポイント
export async function PATCH(request: NextRequest) {
  try {
    const data: { id: number; title: string } = await request.json();
    const { id, title } = data;

    const db = Database.getInstance();

    const query = `
      UPDATE news_ai 
      SET title = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    const result = await db.update(query, [title, id]);

    if (result > 0) {
      return Response.json({ 
        success: true, 
        message: 'タイトルを更新しました'
      });
    } else {
      return Response.json({ 
        success: false, 
        error: '更新対象のレコードが見つかりませんでした'
      }, { status: 404 });
    }

  } catch (error) {
    console.error('Title update error:', error);
    return Response.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'タイトル更新中にエラーが発生しました'
    }, { status: 500 });
  }
}