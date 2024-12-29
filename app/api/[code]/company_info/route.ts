import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/database/Mysql';

interface CompanyRecord {
  code: string;
  company_name: string;
}

interface CompanyFullInfo extends CompanyRecord {
  industry: string;
  market: string;
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