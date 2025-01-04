// /app.api/common/all-company/route.ts
import { NextApiRequest, NextApiResponse } from 'next';
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

interface ErrorResponse {
  error: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CompanyRow[] | ErrorResponse>
) {
  // POSTメソッド以外は許可しない
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = Database.getInstance();
    
    // リクエストボディからパラメータを取得
    const { 
      id, 
      name, 
      address 
    } = req.body;

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

    // 結果を返す
    return res.status(200).json(companies);

  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
}