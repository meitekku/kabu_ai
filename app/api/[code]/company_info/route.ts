import { NextResponse } from 'next/server';

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

export async function POST() {
  // モック用のダミーデータ（必要に応じて値を変更してください）
  const dummyData: CompanyFullInfo[] = [
    {
      code: '1234',
      company_name: 'Dummy Company',
      industry: 'Dummy Industry',
      market: 'Dummy Market',
      current_price: 1000,
      price_change: '+10',
      price_change_percent: 1.0,
    },
  ];

  return NextResponse.json({
    success: true,
    data: dummyData,
  });
}
