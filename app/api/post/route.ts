import { NextResponse } from 'next/server';
import { type NextRequest } from 'next/server';
import { Database } from '@/lib/database/Mysql';

interface PostRequest {
  id?: number;
  code: string;
  title: string;
  content: string;
  site?: number;
  accept?: number;
}

interface ApiResponse {
  success: boolean;
  message: string;
  data?: {
    id: number;
  };
  error?: string;
}

// 出来高の増加を判断する関数
function isRaisingVolume(averageVolume: number, currentVolume: number): boolean {
  if (averageVolume < 2000) {
    return currentVolume > averageVolume * 4.0;
  } else if (averageVolume < 8000) {
    return currentVolume > averageVolume * 3.75;
  } else if (averageVolume < 30000) {
    return currentVolume > averageVolume * 3.33;
  } else if (averageVolume < 100000) {
    return currentVolume > averageVolume * 3.0;
  } else if (averageVolume < 300000) {
    return currentVolume > averageVolume * 2.0;
  } else if (averageVolume < 600000) {
    return currentVolume > averageVolume * 1.9;
  } else if (averageVolume < 1000000) {
    return currentVolume > averageVolume * 1.8;
  } else if (averageVolume < 5000000) {
    return currentVolume > averageVolume * 1.7;
  } else if (averageVolume < 10000000) {
    return currentVolume > averageVolume * 1.6;
  } else if (averageVolume < 30000000) {
    return currentVolume > averageVolume * 1.5;
  } else if (averageVolume < 50000000) {
    return currentVolume > averageVolume * 1.4;
  } else if (averageVolume < 80000000) {
    return currentVolume > averageVolume * 1.35;
  } else {
    return currentVolume > averageVolume * 1.3;
  }
}

// 決算日からの日数を計算する関数
async function getSettlementStatus(code: string): Promise<number | null> {
  const db = Database.getInstance();
  
  const result = await db.select(
    `SELECT settlement_date FROM company_info WHERE code = ? AND settlement_date IS NOT NULL`,
    [code]
  );

  if (!result || result.length === 0 || !result[0].settlement_date) {
    return null;
  }

  const settlementDate = new Date(result[0].settlement_date);
  const now = new Date();
  
  // 日付の差を計算（簡易版 - 実際の営業日計算はより複雑）
  const diffTime = Math.abs(now.getTime() - settlementDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays > 3) {
    return null;
  }
  
  // 決算日が未来の場合はマイナス値、過去の場合はプラス値
  return settlementDate > now ? -diffDays : diffDays;
}

// 記事のステータス情報を生成する関数
async function generatePostStatus(code: string): Promise<Record<string, number | null>> {
  const db = Database.getInstance();
  const statusDict: Record<string, number | null> = {};
  
  // 株価情報を取得
  const companyData = await db.select(
    `SELECT c.name, p.volume, ci.price_change, ci.diff_percent, ci.volume_week_average, ci.settlement_date
     FROM company c 
     LEFT JOIN company_info ci ON c.code = ci.code 
     LEFT JOIN price p ON c.code = p.code
     WHERE c.code = ?
     AND p.date = (
         SELECT MAX(date) 
         FROM price 
         WHERE code = ?
     )`,
    [code, code]
  );
  
  if (!companyData || companyData.length === 0) {
    return statusDict;
  }
  
  const data = companyData[0];
  const diffPercent = data.diff_percent || 0;
  const volume = data.volume || 0;
  const volumeWeekAverage = data.volume_week_average || 0;
  
  // 株価の上昇/下落
  if (diffPercent > 2) {
    statusDict.price_up = 1;
  } else if (diffPercent < -2) {
    statusDict.price_down = 1;
  }
  
  // 出来高の増加
  if (isRaisingVolume(volumeWeekAverage, volume)) {
    statusDict.volume_up = 1;
  }
  
  // 決算発表日の状態
  const settlementDays = await getSettlementStatus(code);
  if (settlementDays !== null) {
    statusDict.settlement = settlementDays;
  }
  
  // ニュースの存在確認（簡易版）
  const newsCount = await db.select(
    `SELECT COUNT(*) as count FROM material WHERE code = ? AND DATE(article_time) = CURRENT_DATE`,
    [code]
  );
  
  if (newsCount && newsCount[0].count > 0) {
    statusDict.news = 1;
  }
  
  // Yahoo掲示板のコメント増加（簡易版）
  const commentCount = await db.select(
    `SELECT COUNT(*) as count FROM yahoo_comment WHERE code = ? AND DATE(post_date) = CURRENT_DATE`,
    [code]
  );
  
  if (commentCount && commentCount[0].count > 200) {
    statusDict.yahoo_increase = 1;
  }
  
  return statusDict;
}

// POST handler for creating new posts
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const body = await request.json() as PostRequest;
    const { code, title, content, site = 0, accept = 0 } = body;

    if (!code || !title || !content) {
      return NextResponse.json(
        {
          success: false,
          message: 'Code, title and content are required',
        },
        { status: 400 }
      );
    }

    const db = Database.getInstance();
    const insertId = await db.insert(
      'INSERT INTO post (code, title, content, site, accept) VALUES (?, ?, ?, ?, ?)',
      [code, title, content, site, accept]
    );

    // post_status テーブルにステータス情報を挿入
    const statusDict = await generatePostStatus(code);
    statusDict["human"] = 1;
    await db.insert(
      'INSERT INTO post_status (post_id, status) VALUES (?, ?)',
      [insertId, JSON.stringify(statusDict)]
    );

    return NextResponse.json(
      {
        success: true,
        message: 'Post created successfully',
        data: {
          id: insertId
        }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

// PUT handler for updating existing posts
export async function PUT(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const body = await request.json() as PostRequest;
    const { id, code, title, content, site = 0, accept = 0 } = body;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: 'ID is required for updating a post',
        },
        { status: 400 }
      );
    }

    if (!code || !title || !content) {
      return NextResponse.json(
        {
          success: false,
          message: 'Code, title and content are required',
        },
        { status: 400 }
      );
    }

    const db = Database.getInstance();

    const affectedRows = await db.update(
      'UPDATE post SET code = ?, title = ?, content = ?, site = ?, accept = ? WHERE id = ?',
      [code, title, content, site, accept, id]
    );

    if (affectedRows === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Post not found or no changes made',
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Post updated successfully',
        data: {
          id: id
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating post:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

// DELETE handler for deleting posts
export async function DELETE(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const body = await request.json() as PostRequest;
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: 'ID is required for deleting a post',
        },
        { status: 400 }
      );
    }

    const db = Database.getInstance();

    const affectedRows = await db.delete(
      'DELETE FROM post WHERE id = ?',
      [id]
    );

    if (affectedRows === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Post not found or already deleted',
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Post deleted successfully',
        data: {
          id: id
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting post:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}