export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/database/Mysql';
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
    new winston.transports.File({ filename: 'application.log' }), // ログファイルにも保存
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
