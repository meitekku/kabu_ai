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
console.log('Script path:', scriptPath);

export async function POST(request: NextRequest) {
  console.log('--- [1] POST function start ---');

  try {
    const { code } = await request.json();
    console.log('--- [2] Request JSON parsed ---', code);

    const db = Database.getInstance();
    console.log('--- [3] DB instance acquired ---');

    const query = `
      SELECT *
      FROM company c
      JOIN company_info ci ON c.code = ci.code
      WHERE c.code = ?
    `;
    console.log('--- [4] Query ready to execute ---', query);

    const results = (await db.select(query, [code])) as CompanyFullInfo[];
    console.log('--- [5] Results from DB ---', results);

    try {
      console.log('--- [6] Start executing Python script ---', scriptPath);

      const pythonProcess = spawn('python', [scriptPath, code]);
      console.log('--- [7] Python process spawned ---');

      let pythonData = '';

      // Pythonスクリプトのstdout
      for await (const chunk of pythonProcess.stdout) {
        console.log('--- [8] Receiving chunk from Python stdout ---', chunk.toString());
        pythonData += chunk;
      }
      
      console.log('--- [9] Accumulated Python output ---', pythonData);

      // Pythonスクリプトのstderr
      let errorOutput = '';
      for await (const chunk of pythonProcess.stderr) {
        console.log('--- [10] Receiving chunk from Python stderr ---', chunk.toString());
        errorOutput += chunk;
      }
      console.log('--- [11] Accumulated Python errorOutput ---', errorOutput);

      if (errorOutput) {
        console.error('--- [12] Python script error ---', errorOutput);
        throw new Error('Python script execution failed');
      }

      // JSON パース
      const dailyData = JSON.parse(pythonData) as DailyData;
      console.log('--- [13] dailyData parsed ---', dailyData);

      // 結果の反映
      if (results.length > 0) {
        console.log('--- [14] Updating results ---');
        results[0] = {
          ...results[0],
          current_price: dailyData.current_price,
          price_change: dailyData.price_change.toString(),
          price_change_percent: dailyData.price_change_percent
        };
        console.log('--- [15] Updated results ---', results[0]);
      }
    } catch (error) {
      console.error('--- [16] Error executing Python script ---', error);
      // Pythonスクリプトのエラーでも処理を継続
    }

    console.log('--- [17] Return response ---');
    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('--- [18] Error in main block ---', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}