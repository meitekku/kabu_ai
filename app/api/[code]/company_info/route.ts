import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/database/Mysql';
import { spawn } from 'child_process';
import path from 'path';
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
  price_change?: string; // 追加
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
const scriptPath = path.join(projectRoot, 'python/daily_data.py');
logger.info(`Script path: ${scriptPath}`);

export async function POST(request: NextRequest) {
  logger.info('--- [1] POST function start ---');

  try {
    const { code } = await request.json();
    logger.info(`--- [2] Request JSON parsed --- Code: ${code}`);

    const db = Database.getInstance();
    logger.info('--- [3] DB instance acquired ---');

    const query = `
      SELECT *
      FROM company c
      JOIN company_info ci ON c.code = ci.code
      WHERE c.code = ?
    `;
    logger.info(`--- [4] Query ready to execute --- Query: ${query}`);

    const results = (await db.select(query, [code])) as CompanyFullInfo[];
    logger.info(`--- [5] Results from DB --- Results: ${JSON.stringify(results)}`);

    try {
      logger.info(`--- [6] Start executing Python script --- Script Path: ${scriptPath}`);

      const pythonProcess = spawn('python', [scriptPath, code]);
      logger.info('--- [7] Python process spawned ---');

      let pythonData = '';

      // Pythonスクリプトのstdout
      for await (const chunk of pythonProcess.stdout) {
        logger.info(`--- [8] Receiving chunk from Python stdout --- ${chunk.toString()}`);
        pythonData += chunk;
      }

      logger.info(`--- [9] Accumulated Python output --- ${pythonData}`);

      // Pythonスクリプトのstderr
      let errorOutput = '';
      for await (const chunk of pythonProcess.stderr) {
        logger.error(`--- [10] Receiving chunk from Python stderr --- ${chunk.toString()}`);
        errorOutput += chunk;
      }
      logger.error(`--- [11] Accumulated Python errorOutput --- ${errorOutput}`);

      if (errorOutput) {
        throw new Error('Python script execution failed');
      }

      // JSON パース
      const dailyData = JSON.parse(pythonData) as DailyData;
      logger.info(`--- [13] dailyData parsed --- ${JSON.stringify(dailyData)}`);

      // 結果の反映
      if (results.length > 0) {
        logger.info('--- [14] Updating results ---');
        results[0] = {
          ...results[0],
          current_price: dailyData.current_price,
          price_change: dailyData.price_change.toString(),
          price_change_percent: dailyData.price_change_percent,
        };
        logger.info(`--- [15] Updated results --- ${JSON.stringify(results[0])}`);
      }
    } catch (error) {
      logger.error(`--- [16] Error executing Python script --- ${error}`);
      // Pythonスクリプトのエラーでも処理を継続
    }

    logger.info('--- [17] Return response ---');
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