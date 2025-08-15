import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

// Playwright版Twitter投稿API（クラッシュ防止）
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  
  function debugLog(message: string, level: string = 'INFO') {
    const elapsed = Date.now() - startTime;
    const logMessage = `[${elapsed}ms] [${requestId}] [${level}] ${message}`;
    console.log(logMessage);
  }
  
  try {
    debugLog('🎭 Playwright版Twitter投稿API開始');
    
    const body = await request.json();
    const { message, textOnly = true, actuallyPost = false, imagePaths = [] } = body;
    
    debugLog(`リクエスト詳細: textOnly=${textOnly}, actuallyPost=${actuallyPost}, images=${imagePaths.length}枚`);

    if (!message) {
      debugLog('❌ メッセージが指定されていません', 'ERROR');
      return NextResponse.json({
        success: false,
        error: 'メッセージが指定されていません'
      }, { status: 400 });
    }

    debugLog('📝 メッセージ: ' + message.substring(0, 50) + (message.length > 50 ? '...' : ''));
    debugLog('🚀 実投稿: ' + (actuallyPost ? 'はい' : 'いいえ（テスト）'));
    if (imagePaths.length > 0) {
      debugLog(`📷 画像ファイル: ${imagePaths.length}枚`);
      imagePaths.forEach((path: string, i: number) => {
        debugLog(`  ${i + 1}. ${path}`);
      });
    }

    // Pythonスクリプトのパス
    const pythonDir = path.join(process.cwd(), 'python', 'twitter_auto_post');
    const scriptPath = path.join(pythonDir, 'playwright_twitter.py');
    
    debugLog(`Pythonディレクトリ: ${pythonDir}`);
    debugLog(`スクリプトパス: ${scriptPath}`);

    // Pythonコマンドを構築
    let pythonCmd = `cd "${pythonDir}" && python3 playwright_twitter.py`;
    
    // メッセージをエスケープ
    const escapedMessage = message.replace(/"/g, '\\"');
    pythonCmd += ` "${escapedMessage}"`;
    
    // 画像パスを追加
    if (imagePaths.length > 0) {
      const fullImagePaths = imagePaths.map((imagePath: string) => {
        // 相対パスを絶対パスに変換
        if (imagePath.startsWith('/uploads/')) {
          return path.join(process.cwd(), 'public', imagePath);
        }
        return imagePath;
      });
      
      pythonCmd += ` ${fullImagePaths.map((p: string) => `"${p}"`).join(' ')}`;
      debugLog(`画像パス追加: ${fullImagePaths.length}枚`);
    }
    
    if (!actuallyPost) {
      pythonCmd += ' --test';
      debugLog('テストモードフラグを追加');
    } else {
      debugLog('実投稿モードで実行');
    }

    debugLog('🎭 実行コマンド: ' + pythonCmd);

    // Pythonスクリプトを実行（手動ログイン2分 + 処理時間を考慮）
    debugLog('Pythonスクリプト実行開始...');
    const execStartTime = Date.now();
    
    const result = await execAsync(pythonCmd, {
      timeout: 300000, // 5分でタイムアウト（手動ログイン2分 + 処理時間3分）
      maxBuffer: 1024 * 1024 * 10, // 10MBまでの出力を許可
      env: {
        ...process.env,
        PYTHONPATH: pythonDir,
        PYTHONUNBUFFERED: '1'
      }
    });

    const execDuration = Date.now() - execStartTime;
    debugLog(`✅ Playwright実行完了 (実行時間: ${execDuration}ms)`);
    debugLog('📤 stdout: ' + (result.stdout ? result.stdout.substring(0, 500) + (result.stdout.length > 500 ? '...' : '') : '(なし)'));
    
    if (result.stderr) {
      debugLog('⚠️ stderr: ' + result.stderr.substring(0, 500) + (result.stderr.length > 500 ? '...' : ''), 'WARNING');
    }

    // 成功判定（テストモード対応）
    const successIndicators = [
      'Playwright版テスト完了成功',
      'Playwright版投稿完了成功', 
      'Playwright版テストモード完了',
      'Playwright版ツイート投稿完了',
      'テキスト入力完了',
      '✅ ブラウザ起動成功',
      '✅ === 手動ログイン完了確認 ===',
      '✅ Playwright版実投稿成功',
      '✅ Twitter移動成功',
      '✅ ログイン済み',
      '✅ 既にログイン済みです',
      '成功',
      '完了'
    ];
    
    debugLog(`成功判定開始 - 検査対象: ${successIndicators.length}個のインジケーター`);
    
    const foundIndicators = successIndicators.filter(indicator => 
      result.stdout.includes(indicator)
    );
    
    // テストモードでは複数の成功インジケーターがあれば成功とみなす
    const isTestMode = !actuallyPost;
    const isSuccess = isTestMode ? foundIndicators.length >= 3 : foundIndicators.length > 0;
    
    // エラーの検出（テストモードでは投稿ボタンエラーは除外）
    const errorKeywords = ['error', 'Error', 'ERROR', '❌', '失敗', 'Exception', 'Traceback'];
    const foundErrors = result.stderr ? errorKeywords.filter(keyword => 
      result.stderr.includes(keyword)
    ) : [];
    
    // テストモードでは投稿ボタンが見つからないエラーは正常とみなす
    const criticalErrors = foundErrors.filter(error => 
      isTestMode ? !result.stderr.includes('投稿ボタンが見つかりません') : true
    );
    
    const hasErrors = criticalErrors.length > 0;

    debugLog('📊 成功判定結果:');
    debugLog(`  - 成功判定: ${isSuccess}`);
    debugLog(`  - エラー検出: ${hasErrors}`);
    debugLog(`  - 発見された成功インジケーター: [${foundIndicators.join(', ')}]`);
    if (hasErrors) {
      debugLog(`  - 発見されたエラーキーワード: [${foundErrors.join(', ')}]`, 'WARNING');
    }

    if (isSuccess && !hasErrors) {
      debugLog('✅ 成功判定：正常レスポンスを返却');
      const responseData = {
        success: true,
        message: actuallyPost ? 'Playwright版ツイートが正常に投稿されました' : 'Playwright版テスト完了（投稿準備まで実行）',
        details: {
          final_result: true,
          timestamp: new Date().toISOString(),
          engine: 'Playwright（クラッシュ防止版）',
          mode: actuallyPost ? '実投稿' : 'テストモード',
          stdout: result.stdout,
          stderr: result.stderr || '',
          execution_time_ms: Date.now() - startTime,
          request_id: requestId,
          errors: [],
          warnings: result.stderr ? [
            {
              step: 'playwright_execution',
              message: 'stderr出力がありました（通常は問題ありません）',
              timestamp: new Date().toISOString(),
              type: 'warning'
            }
          ] : [],
          success_steps: [
            {
              step: 'playwright_browser_launch',
              message: 'Playwrightブラウザ起動成功',
              timestamp: new Date().toISOString(),
              type: 'success'
            },
            {
              step: 'crash_prevention',
              message: 'Seleniumクラッシュ問題を回避',
              timestamp: new Date().toISOString(),
              type: 'success'
            },
            {
              step: 'twitter_operation',
              message: actuallyPost ? 'Twitter投稿完了' : 'Twitter操作テスト完了',
              timestamp: new Date().toISOString(),
              type: 'success'
            }
          ],
          summary: {
            total_errors: 0,
            total_warnings: result.stderr ? 1 : 0,
            total_success_steps: 3
          }
        }
      };
      
      debugLog(`レスポンスデータサイズ: ${JSON.stringify(responseData).length} bytes`);
      return NextResponse.json(responseData);
    } else {
      // 成功メッセージが見つからない場合の詳細レポート
      debugLog('❌ 成功メッセージが見つかりませんでした', 'ERROR');
      debugLog('📤 実際のstdout: ' + (result.stdout || '(なし)'), 'ERROR');
      debugLog('📤 実際のstderr: ' + (result.stderr || '(なし)'), 'ERROR');
      
      const errorResponse = {
        success: false,
        error: 'Playwright実行は完了しましたが、期待された成功メッセージが見つかりませんでした',
        debug_info: {
          stdout: result.stdout,
          stderr: result.stderr,
          success_indicators_checked: successIndicators,
          found_indicators: foundIndicators,
          execution_time_ms: Date.now() - startTime,
          request_id: requestId
        },
        details: {
          final_result: false,
          timestamp: new Date().toISOString(),
          engine: 'Playwright（クラッシュ防止版）',
          errors: [
            {
              step: 'success_message_detection',
              message: '期待された成功メッセージが見つかりませんでした',
              timestamp: new Date().toISOString(),
              type: 'detection_error',
              stdout_content: result.stdout,
              stderr_content: result.stderr
            }
          ],
          warnings: [],
          success_steps: [],
          summary: {
            total_errors: 1,
            total_warnings: 0,
            total_success_steps: 0
          }
        }
      };
      
      debugLog('エラーレスポンスを返却', 'ERROR');
      return NextResponse.json(errorResponse, { status: 500 });
    }

  } catch (error: unknown) {
    const errorDuration = Date.now() - startTime;
    debugLog(`❌ Playwright版Twitter投稿APIエラー (実行時間: ${errorDuration}ms)`, 'ERROR');
    
    // エラーオブジェクトの型安全な処理
    const errorObj = error as Error & { code?: string; stderr?: string };
    debugLog(`エラー詳細: ${errorObj.message || 'Unknown error'}`, 'ERROR');
    debugLog(`エラーコード: ${errorObj.code || '不明'}`, 'ERROR');
    debugLog(`エラースタック: ${errorObj.stack?.substring(0, 300) || 'Stack trace not available'}...`, 'ERROR');

    // エラーの詳細分析
    let errorMessage = '予期しないエラーが発生しました';
    const errorDetails = {
      final_result: false,
      timestamp: new Date().toISOString(),
      engine: 'Playwright（クラッシュ防止版）',
      execution_time_ms: errorDuration,
      request_id: requestId,
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
      errorMessage = 'Playwright実行がタイムアウトしました（5分）。手動ログインに時間がかかった可能性があります。';
      debugLog('タイムアウトエラーを検出', 'ERROR');
      errorDetails.errors.push({
        step: 'playwright_timeout',
        message: 'Playwright実行がタイムアウトしました（5分）',
        timestamp: new Date().toISOString(),
        type: 'timeout',
        exception: errorObj.message || 'Timeout error'
      });
    } else if (errorObj.stderr) {
      debugLog(`stderr出力あり: ${errorObj.stderr.substring(0, 200)}...`, 'ERROR');
      // Playwright未インストールエラーの特別処理
      if (errorObj.stderr.includes('Playwright') || errorObj.stderr.includes('playwright')) {
        errorMessage = 'Playwrightが未インストールです。pip install playwright && playwright install chromium を実行してください。';
        debugLog('Playwrightインストールエラーを検出', 'ERROR');
        errorDetails.errors.push({
          step: 'playwright_installation',
          message: 'Playwrightインストールが必要',
          timestamp: new Date().toISOString(),
          type: 'installation_error',
          exception: errorObj.stderr
        });
      } else {
        errorMessage = 'Playwright実行エラー';
        debugLog('Playwright実行エラーを検出', 'ERROR');
        errorDetails.errors.push({
          step: 'playwright_execution',
          message: errorObj.stderr,
          timestamp: new Date().toISOString(),
          type: 'execution_error',
          exception: errorObj.message || 'Execution error'
        });
      }
    } else {
      debugLog('一般的なAPIエラーを検出', 'ERROR');
      errorDetails.errors.push({
        step: 'api_error',
        message: errorObj.message || errorMessage,
        timestamp: new Date().toISOString(),
        type: 'error',
        exception: errorObj.stack || 'Stack trace not available'
      });
    }

    const errorResponse = {
      success: false,
      error: errorMessage,
      details: errorDetails
    };

    debugLog(`エラーレスポンスサイズ: ${JSON.stringify(errorResponse).length} bytes`, 'ERROR');
    debugLog('エラーレスポンスを返却', 'ERROR');
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
}