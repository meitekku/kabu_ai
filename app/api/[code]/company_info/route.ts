export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/database/Mysql';
import https from 'https';
import fetch from 'node-fetch';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'error',
  transports: [
    new winston.transports.File({ filename: 'error.log' }),
    new winston.transports.Console(),
  ],
});

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
      logger.error(`API error: status=${apiRes.status}`);
      return NextResponse.json({ success: false, error: 'API error' }, { status: apiRes.status });
    }

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
  } catch (error: unknown) {
    if (error instanceof Error) {
      logger.error(`Error in POST: ${error.message}\nStack trace: ${error.stack}`);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    } else {
      logger.error(`Unknown error in POST: ${JSON.stringify(error)}`);
      return NextResponse.json({ success: false, error: 'Unknown error occurred' }, { status: 500 });
    }
  }
}
