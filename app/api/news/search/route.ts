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

interface CountResult extends RowDataPacket {
  total: number;
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
      page = 1,       // ページ番号
      site_type = 0   // サイトタイプ
    } = await req.json();

    const db = Database.getInstance();
    
    // 総件数を取得するクエリ
    let countQuery = `
      SELECT COUNT(*) as total
      FROM post p
      LEFT JOIN company c ON p.code = c.code
      WHERE p.accept = 1
    `;

    // データを取得するクエリ
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

    if (site_type !== undefined) {
      conditions.push('p.site = ?');
      values.push(site_type);
    }

    if (pickup) {
      conditions.push('p.pickup = ?');
      values.push(pickup);
    }

    if (company_code) {
      conditions.push('p.code = ?');
      values.push(String(company_code));
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
      const whereClause = ` AND ${conditions.join(' AND ')}`;
      query += whereClause;
      countQuery += whereClause;
    }

    // ソート順を追加
    query += ` ORDER BY p.created_at DESC`;

    // ページネーションのためのLIMITとOFFSETを追加
    const offset = (page - 1) * limit;
    query += ` LIMIT ? OFFSET ?`;
    values.push(limit);
    values.push(offset);

    // 総件数を取得
    const [totalResult] = await db.select<CountResult>(countQuery, values.slice(0, -2));
    const total = totalResult.total;

    // データを取得
    const posts = await db.select<PostRow>(query, values);

    // created_atのフォーマットを修正
    const formattedPosts = posts.map(post => ({
      ...post,
      created_at: new Date(post.created_at).toLocaleString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).replace(/\//g, '-')
    }));

    return NextResponse.json({
      success: true,
      data: formattedPosts,
      total: total,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });

  } catch (error) {
    console.error('Error in news search:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal Server Error',
    }, { status: 500 });
  }
} 