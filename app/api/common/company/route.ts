import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // CSVファイルのパスを取得
    const csvPath = path.join(process.cwd(), 'public', 'company.csv');
    
    // CSVファイルを読み込む
    const csvData = fs.readFileSync(csvPath, 'utf-8');
    
    // CSVをパースして会社データの配列に変換
    const rows = csvData.split('\n').slice(1);
    const companies = rows
      .filter(row => row.trim())
      .map(row => {
        const [id, name] = row.split(',');
        return { id: id.trim(), name: name.trim() };
      });
    
    // キャッシュなしのヘッダーを設定
    return NextResponse.json(companies, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Failed to load companies:', error);
    return NextResponse.json(
      { error: 'Failed to load companies' },
      { status: 500 }
    );
  }
} 