export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/database/Mysql';
import { getCacheTTL, cacheGet, cacheSet, makeCacheKey } from '@/lib/cache';

interface ValuationReport {
  id: number;
  code: string;
  per: number | null;
  pbr: number | null;
  industry_avg_per: number | null;
  industry_avg_pbr: number | null;
  per_evaluation: string;
  pbr_evaluation: string;
  report_content: string;
  report_type: string;
  created_at: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    const cacheKey = makeCacheKey('valuation-report', { code });
    const ttl = getCacheTTL('static');
    const cached = cacheGet(cacheKey, ttl);
    if (cached) {
      return NextResponse.json(cached, {
        headers: { 'Cache-Control': `public, s-maxage=${ttl}, stale-while-revalidate=${ttl * 2}`, 'X-Cache': 'HIT' }
      });
    }

    const db = Database.getInstance();

    const results = await db.select<ValuationReport>(
      `SELECT id, code, per, pbr, industry_avg_per, industry_avg_pbr,
              per_evaluation, pbr_evaluation, report_content, report_type, created_at
       FROM valuation_report
       WHERE code = ?
       ORDER BY created_at DESC
       LIMIT 1`,
      [code]
    );

    const report = results.length > 0 ? results[0] : null;
    const responseData = { success: true, data: report };
    cacheSet(cacheKey, responseData);

    return NextResponse.json(responseData, {
      headers: { 'Cache-Control': `public, s-maxage=${ttl}, stale-while-revalidate=${ttl * 2}`, 'X-Cache': 'MISS' }
    });
  } catch (error) {
    console.error('Error fetching valuation report:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
