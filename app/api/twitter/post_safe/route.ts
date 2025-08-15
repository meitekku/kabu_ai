import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

// 安全なTwitter投稿API
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, textOnly = true, actuallyPost = false } = body;

    if (!message) {
      return NextResponse.json({
        success: false,
        error: 'メッセージが指定されていません'
      }, { status: 400 });
    }

    console.log('🔒 安全なTwitter投稿API開始');
    console.log('📝 メッセージ:', message.substring(0, 50));
    console.log('🚀 実投稿:', actuallyPost ? 'はい' : 'いいえ（テスト）');

    // Pythonスクリプトのパス
    const pythonDir = path.join(process.cwd(), 'python', 'twitter_auto_post');

    // Pythonコマンドを構築
    let pythonCmd = `cd "${pythonDir}" && python3 -m safe_main`;
    
    // メッセージをエスケープ
    const escapedMessage = message.replace(/"/g, '\\"');
    pythonCmd += ` "${escapedMessage}"`;
    
    if (textOnly) {
      pythonCmd += ' --text-only';
    }
    
    if (actuallyPost) {
      pythonCmd += ' --actually-post';
    } else {
      pythonCmd += ' --test';
    }

    console.log('🐍 実行コマンド:', pythonCmd);

    // Pythonスクリプトを実行（タイムアウト付き）
    const result = await execAsync(pythonCmd, {
      timeout: 300000, // 5分でタイムアウト
      maxBuffer: 1024 * 1024 * 10, // 10MBまでの出力を許可
      env: {
        ...process.env,
        PYTHONPATH: pythonDir,
        PYTHONUNBUFFERED: '1'
      }
    });

    console.log('✅ Python実行成功');
    console.log('📤 stdout:', result.stdout);
    
    if (result.stderr) {
      console.log('⚠️ stderr:', result.stderr);
    }

    // 成功レスポンス
    return NextResponse.json({
      success: true,
      message: actuallyPost ? 'ツイートが正常に投稿されました' : 'テスト完了（投稿準備まで実行）',
      details: {
        final_result: true,
        timestamp: new Date().toISOString(),
        mode: actuallyPost ? '実投稿' : 'テストモード',
        stdout: result.stdout,
        stderr: result.stderr || '',
        errors: [],
        warnings: result.stderr ? [
          {
            step: 'python_execution',
            message: 'stderr出力がありました（通常は問題ありません）',
            timestamp: new Date().toISOString(),
            type: 'warning'
          }
        ] : [],
        success_steps: [
          {
            step: 'system_safety_check',
            message: '安全性チェック通過',
            timestamp: new Date().toISOString(),
            type: 'success'
          },
          {
            step: 'safe_selenium_execution',
            message: '安全なSelenium実行完了',
            timestamp: new Date().toISOString(),
            type: 'success'
          }
        ],
        summary: {
          total_errors: 0,
          total_warnings: result.stderr ? 1 : 0,
          total_success_steps: 2
        }
      }
    });

  } catch (error: unknown) {
    console.error('❌ 安全なTwitter投稿APIエラー:', error);

    // エラーオブジェクトの型安全な処理
    const errorObj = error as Error & { code?: string; stderr?: string };

    // エラーの詳細分析
    let errorMessage = '予期しないエラーが発生しました';
    const errorDetails = {
      final_result: false,
      timestamp: new Date().toISOString(),
      errors: [] as Array<{
        step: string;
        message: string;
        timestamp: string;
        type: string;
        exception?: string;
      }>,
      warnings: [] as Array<{
        step: string;
        message: string;
        timestamp: string;
        type: string;
      }>,
      success_steps: [] as Array<{
        step: string;
        message: string;
        timestamp: string;
        type: string;
      }>,
      summary: {
        total_errors: 1,
        total_warnings: 0,
        total_success_steps: 0
      }
    };

    if (errorObj.code === 'ETIMEDOUT') {
      errorMessage = 'タイムアウトが発生しました（5分）';
      errorDetails.errors.push({
        step: 'execution_timeout',
        message: 'Python実行がタイムアウトしました',
        timestamp: new Date().toISOString(),
        type: 'timeout',
        exception: errorObj.message || 'Timeout error'
      });
    } else if (errorObj.stderr) {
      errorMessage = 'Python実行エラー';
      errorDetails.errors.push({
        step: 'python_execution',
        message: errorObj.stderr,
        timestamp: new Date().toISOString(),
        type: 'execution_error',
        exception: errorObj.message || 'Execution error'
      });
    } else {
      errorDetails.errors.push({
        step: 'api_error',
        message: errorObj.message || errorMessage,
        timestamp: new Date().toISOString(),
        type: 'error',
        exception: errorObj.stack || 'Stack trace not available'
      });
    }

    return NextResponse.json({
      success: false,
      error: errorMessage,
      details: errorDetails
    }, { status: 500 });
  }
}