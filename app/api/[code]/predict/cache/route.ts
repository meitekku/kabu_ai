import { NextResponse, NextRequest } from 'next/server';
import { Database } from '@/lib/database/Mysql';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
): Promise<NextResponse> {
  try {
    const { code } = await params;

    if (!code) {
      return NextResponse.json(
        { cached: false, error: '銘柄コードが必要です' },
        { status: 400 }
      );
    }

    const db = Database.getInstance();

    const cacheResult = await db.select<{
      prediction_data: string;
      report_html: string;
    }>(
      `SELECT prediction_data, report_html FROM prediction_cache
       WHERE code = ? AND prediction_date = CURDATE()`,
      [code]
    );

    if (cacheResult.length > 0) {
      let predictionData;
      try {
        predictionData = typeof cacheResult[0].prediction_data === 'string'
          ? JSON.parse(cacheResult[0].prediction_data)
          : cacheResult[0].prediction_data;
      } catch {
        predictionData = cacheResult[0].prediction_data;
      }

      return NextResponse.json({
        cached: true,
        data: predictionData,
        report: cacheResult[0].report_html,
      });
    }

    return NextResponse.json({ cached: false });
  } catch (error) {
    console.error('Cache check error:', error);
    return NextResponse.json(
      { cached: false, error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}
