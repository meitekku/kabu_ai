export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/database/Mysql';
import https from 'https';
import fetch from 'node-fetch'; // node-fetch を使用

// 型定義
interface StockData {
  code: string;
  current_price: number;
  price_change: number;
  price_change_percent: number;
}

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();
    const httpsAgent = new https.Agent({ rejectUnauthorized: false });
    const apiRes = await fetch(`https://localhost:8000/stock/${code}`, {
      method: 'GET',
      agent: httpsAgent,
    });

    if (!apiRes.ok) {
      return NextResponse.json({ success: false, error: 'API error' }, { status: apiRes.status });
    }

    // 明示的に型を指定
    const stockData = (await apiRes.json()) as StockData;

    const db = Database.getInstance();
    const selectQuery = `SELECT * FROM company c JOIN company_info ci ON c.code = ci.code WHERE c.code = ?`;
    const results = await db.select(selectQuery, [code]);

    if (results.length > 0) {
      const updateQuery = `
        UPDATE company_info
        SET current_price = ?, price_change = ?, price_change_percent = ?
        WHERE code = ?
      `;
      await db.update(updateQuery, [
        stockData.current_price,
        stockData.price_change,
        stockData.price_change_percent,
        code,
      ]);
    }

    const updatedResults = await db.select(selectQuery, [code]);
    return NextResponse.json({ success: true, data: updatedResults });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
