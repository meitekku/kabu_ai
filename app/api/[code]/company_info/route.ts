import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/database/Mysql';
import { spawn } from 'child_process';
import path from 'path';

// インターフェースの再定義
interface CompanyRecord {
  code: string;
  company_name: string;
}

interface CompanyFullInfo extends CompanyRecord {
  industry: string;
  market: string;
  current_price?: number;
  price_change?: string;  // 追加
  price_change_percent?: number;
}

interface DailyData {
  code: string;
  current_price: number;
  price_change: number;
  price_change_percent: number;
}

// プロジェクトのルートディレクトリからの相対パスを計算
const projectRoot = process.cwd();
const scriptPath = path.join(projectRoot, 'app/api/[code]/company_info/daily_data.py');

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
    try {
      console.log('Executing Python script at:', scriptPath); // パスの確認用

      const pythonProcess = spawn('python', [
        scriptPath,
        code
      ]);
      
      let pythonData = '';
      
      // Pythonスクリプトの出力を取得
      for await (const chunk of pythonProcess.stdout) {
        pythonData += chunk;
      }
      console.log('Python output:', pythonData);

      // エラーハンドリング
      let errorOutput = '';
      for await (const chunk of pythonProcess.stderr) {
        errorOutput += chunk;
      }

      if (errorOutput) {
        console.error('Python script error:', errorOutput);
        throw new Error('Python script execution failed');
      }

      // JSON パース
      const dailyData = JSON.parse(pythonData) as DailyData;

      // resultsの最初の要素に値を上書き
      if (results.length > 0) {
        results[0] = {
          ...results[0],
          current_price: dailyData.current_price,
          price_change: dailyData.price_change.toString(),  // 文字列に変換して保存
          price_change_percent: dailyData.price_change_percent
        };
        console.log('Updated results:', results);
      }
    } catch (error) {
      console.error('Error executing Python script:', error);
      // Pythonスクリプトのエラーでも処理を継続
    }

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