import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function POST() {
  try {
    const pythonScriptPath = path.join(process.cwd(), 'python', 'get_data', 'aricleSummarize.py');
    
    return new Promise((resolve) => {
      const pythonProcess = spawn('python3', [pythonScriptPath], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          resolve(NextResponse.json({
            success: true,
            message: 'ニュース要約が正常に生成されました',
            output: stdout,
            data: {
              stdout: stdout,
              stderr: stderr
            }
          }));
        } else {
          resolve(NextResponse.json({
            success: false,
            message: 'ニュース要約の生成に失敗しました',
            error: stderr || 'Python実行エラー',
            code: code,
            data: {
              stdout: stdout,
              stderr: stderr
            }
          }, { status: 500 }));
        }
      });

      pythonProcess.on('error', (error) => {
        resolve(NextResponse.json({
          success: false,
          message: 'Python実行エラー',
          error: error.message
        }, { status: 500 }));
      });

      // タイムアウト設定（5分）
      setTimeout(() => {
        pythonProcess.kill();
        resolve(NextResponse.json({
          success: false,
          message: 'タイムアウト: ニュース要約の生成に時間がかかりすぎています',
          error: 'Timeout after 5 minutes'
        }, { status: 408 }));
      }, 5 * 60 * 1000);
    });
  } catch (error) {
    console.error('Summarize news error:', error);
    return NextResponse.json({
      success: false,
      message: 'サーバーエラーが発生しました',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}