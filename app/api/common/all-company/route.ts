import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/database/Mysql';
import { RowDataPacket } from 'mysql2';

interface CompanyRow extends RowDataPacket {
  id: number;
  name: string;
  address: string;
  phone: string;
  created_at: Date;
  updated_at: Date;
}

export async function POST(request: NextRequest) {
  try {
    const db = Database.getInstance();
    
    // リクエストボディからパラメータを取得
    const { id, name, address } = await request.json();
    
    // クエリを構築
    let query = 'SELECT * FROM companies WHERE 1=1';
    const params: (string | number)[] = [];
    
    // 検索条件を動的に追加
    if (id) {
      query += ' AND id = ?';
      params.push(id);
    }
    if (name) {
      query += ' AND name LIKE ?';
      params.push(`%${name}%`);
    }
    if (address) {
      query += ' AND address LIKE ?';
      params.push(`%${address}%`);
    }
    
    // データを取得
    const companies = await db.select<CompanyRow>(query, params);
    
    if (companies.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No data found',
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: companies,
    });
    
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
    }, { status: 500 });
  }
}