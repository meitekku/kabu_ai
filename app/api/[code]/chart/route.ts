import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/database/Mysql';

// 定義済みの型
interface PriceRecord {
  date: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}

interface NumericPriceRecord {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export async function POST(request: NextRequest) {
  try {
    const { code, num } = await request.json();
    const db = Database.getInstance();

    const query = `
      SELECT *
      FROM price
      WHERE code = ?
      ORDER BY date DESC
      LIMIT ?
    `;

    // 型アサーションを追加
    const prices = (await db.select(query, [code, num])) as PriceRecord[];

    // 数値型に変換
    const numericPrices: NumericPriceRecord[] = prices.map((p) => ({
      date: p.date,
      open: Number(p.open),
      high: Number(p.high),
      low: Number(p.low),
      close: Number(p.close),
      volume: Number(p.volume),
    }));

    return NextResponse.json({
      success: true,
      data: numericPrices,
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
