export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/database/Mysql';
import winston from 'winston';
import { getCacheTTL, cacheGet, cacheSet, makeCacheKey } from '@/lib/cache';

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
  name: string;
}

interface CompanyFullInfo extends CompanyRecord {
  industry: string | null;
  market: number | null;
  current_price: number | null;
  price_change: string | null;
  price_change_percent: number | null;
  price_updated_at: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    // キャッシュチェック（株価は市場時間帯に頻繁に変わる）
    const cacheKey = makeCacheKey('company-info', { code });
    const ttl = getCacheTTL('market');
    const cached = cacheGet(cacheKey, ttl);
    if (cached) {
      return NextResponse.json(cached, {
        headers: { 'Cache-Control': `public, s-maxage=${ttl}, stale-while-revalidate=${ttl * 2}`, 'X-Cache': 'HIT' }
      });
    }

    const db = Database.getInstance();

    const query = `
      SELECT *
      FROM company c
      LEFT JOIN company_info ci ON c.code = ci.code
      WHERE c.code = ?
    `;

    const results = (await db.select(query, [code])) as CompanyFullInfo[];
    const responseData = { success: true, data: results };
    cacheSet(cacheKey, responseData);
    return NextResponse.json(responseData, {
      headers: { 'Cache-Control': `public, s-maxage=${ttl}, stale-while-revalidate=${ttl * 2}`, 'X-Cache': 'MISS' }
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
