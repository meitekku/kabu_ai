export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/database/Mysql';
import path from 'path';
import winston from 'winston';

// ロガーの設定
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level.toUpperCase()}]: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'application.log' }),
  ],
});

// インターフェースの再定義
interface CompanyRecord {
  code: string;
  company_name: string;
}

interface CompanyFullInfo extends CompanyRecord {
  industry: string;
  market: string;
  current_price?: number;
  price_change?: string;
  price_change_percent?: number;
}

const projectRoot = process.cwd();
const scriptPath = path.join(projectRoot, 'python/daily_data.py');

logger.info(`Script path: ${scriptPath}`);

async function fetchStockPrice(code: string) {
  try {
    const response = await fetch(`http://localhost:8000/stock/${code}`);
    if (!response.ok) {
      throw new Error('Failed to fetch stock price');
    }
    return await response.json();
  } catch (error) {
    logger.error(`Failed to fetch stock price for code ${code}: ${error}`);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();
    const db = Database.getInstance();

    const query = `
      SELECT *
      FROM company c
      JOIN company_info ci ON c.code = ci.code
      WHERE c.code = ?
    `;

    const results = (await db.select(query, [code])) as CompanyFullInfo[];
    
    // 株価APIからデータを取得
    const stockPrice = await fetchStockPrice(code);
    
    if (stockPrice && results.length > 0) {
      // 結果の最初のレコードを更新
      results[0] = {
        ...results[0],
        current_price: stockPrice.current_price,
        price_change: stockPrice.price_change.toString(),
        price_change_percent: stockPrice.price_change_percent
      };
    }

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error) {
    logger.error(`--- [18] Error in main block --- ${error}`);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}