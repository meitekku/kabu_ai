import { NextResponse } from 'next/server';
import { Database } from '@/lib/database/Mysql';
import { RowDataPacket } from 'mysql2';

interface PostRow extends RowDataPacket {
  id: number;
  code: string | null;
  title: string | null;
  content: string | null;
  site: number | null;
  accept: number;
  pickup: number;
  created_at: Date;
  updated_at: Date;
}

export async function POST(req: Request) {
  try {
    const {
      pickup,         // ピックアップタイプ（1: ピックアップ, 2: 市場, 3: 企業）
      company_code,   // 企業コード
      keyword,        // キーワード検索
      from_date,      // 開始日
      to_date,        // 終了日
      limit = 10,     // 取得件数
      offset = 0      // オフセット
    } = await req.json();

    const db = Database.getInstance();
    
    let query = `
      SELECT 
        p.id,
        p.code,
        p.title,
        p.content,
        p.site,
        p.pickup,
        p.created_at,
        p.updated_at,
        c.name as company_name
      FROM post p
      LEFT JOIN company c ON p.code = c.code
      WHERE p.accept = 1
    `;

    const conditions = [];
    const values: (string | number | boolean | null)[] = [];

    if (pickup) {
      conditions.push('p.pickup = ?');
      values.push(pickup);
    }

    if (company_code) {
      conditions.push('p.code = ?');
      values.push(company_code);
    }

    if (keyword) {
      conditions.push('(p.title LIKE ? OR p.content LIKE ?)');
      values.push(`%${keyword}%`);
      values.push(`%${keyword}%`);
    }

    if (from_date) {
      conditions.push('p.created_at >= ?');
      values.push(from_date);
    }

    if (to_date) {
      conditions.push('p.created_at <= ?');
      values.push(to_date);
    }

    // 条件を結合
    if (conditions.length > 0) {
      query += ` AND ${conditions.join(' AND ')}`;
    }

    // ソート順と取得件数の制限を追加
    query += ` ORDER BY p.created_at DESC LIMIT ? OFFSET ?`;
    values.push(limit);
    values.push(offset);

    const posts = await db.select<PostRow>(query, values);

    return NextResponse.json({
      success: true,
      data: posts,
      total: posts.length,
    });

  } catch (error) {
    console.error('Error in news search:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal Server Error',
    }, { status: 500 });
  }
} 