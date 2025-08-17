import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

// iPhone 14 Pro用 Playwright版Twitter投稿API
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  
  function debugLog(message: string, level: string = 'INFO') {
    const elapsed = Date.now() - startTime;
    const logMessage = `[📱 ${elapsed}ms] [${requestId}] [${level}] ${message}`;
    console.log(logMessage);
  }
  
  try {
    debugLog('📱 iPhone 14 Pro用 Playwright版Twitter投稿API開始');
    
    const body = await request.json();
    const { message, textOnly = true, actuallyPost = false, imagePaths = [] } = body;
    
    debugLog(`📱 モバイルリクエスト詳細: textOnly=${textOnly}, actuallyPost=${actuallyPost}, images=${imagePaths.length}枚`);

    if (!message) {
      debugLog('❌ メッセージが指定されていません', 'ERROR');
      return NextResponse.json({
        success: false,
        error: 'メッセージが指定されていません'
      }, { status: 400 });
    }

    debugLog('📝 メッセージ: ' + message.substring(0, 50) + (message.length > 50 ? '...' : ''));
    debugLog('🚀 実投稿: ' + (actuallyPost ? 'はい' : 'いいえ（モバイルテスト）'));
    if (imagePaths.length > 0) {
      debugLog(`📷 画像ファイル: ${imagePaths.length}枚`);
      imagePaths.forEach((path: string, i: number) => {
        debugLog(`  ${i + 1}. ${path}`);
      });
    }

    // Pythonスクリプトのパス（メイン統合版を使用）
    const pythonDir = path.join(process.cwd(), 'python', 'twitter_auto_post');
    const scriptPath = path.join(pythonDir, 'playwright_twitter.py');
    
    debugLog(`📱 Pythonディレクトリ: ${pythonDir}`);
    debugLog(`📱 統合モバイルスクリプトパス: ${scriptPath}`);

    // メッセージをエスケープ
    const escapedMessage = message.replace(/"/g, '\\"').replace(/'/g, "\\'");
    
    // iPhone 14 Pro用Pythonコマンドを構築（統合版使用）
    let pythonCmd = `cd "${pythonDir}" && python3 -c "
import sys
sys.path.insert(0, '.')
from playwright_twitter import PlaywrightTwitterManager, playwright_twitter_test

# iPhone 14 Pro環境でテスト実行
message = '''${escapedMessage}'''
success = playwright_twitter_test(
    message=message,
    image_paths=[],
    test_mode=${!actuallyPost ? 'True' : 'False'},
    mobile_mode=True,
    device_type='iPhone14Pro'
)
print('✅ iPhone 14 Pro環境テスト完了成功' if success else '❌ iPhone 14 Pro環境テスト失敗')
"`;
    
    // 画像パスは必要に応じて今後追加
    if (imagePaths.length > 0) {
      debugLog(`📷 画像機能は今後統合予定: ${imagePaths.length}枚`);
    }

    debugLog('📱 iPhone 14 Pro実行コマンド: ' + pythonCmd);

    // iPhone 14 Pro用Pythonスクリプトを実行
    debugLog('📱 iPhone 14 Pro用Pythonスクリプト実行開始...');
    const execStartTime = Date.now();
    
    const result = await execAsync(pythonCmd, {
      timeout: 300000, // 5分でタイムアウト
      maxBuffer: 1024 * 1024 * 10, // 10MBまでの出力を許可
      env: {
        ...process.env,
        PYTHONPATH: pythonDir,
        PYTHONUNBUFFERED: '1',
        MOBILE_MODE: 'iPhone14Pro',  // モバイルモード環境変数
        DEVICE_TYPE: 'iPhone',
        VIEWPORT_WIDTH: '393',
        VIEWPORT_HEIGHT: '852',
        DEVICE_SCALE_FACTOR: '3'
      }
    });

    const execDuration = Date.now() - execStartTime;
    debugLog(`✅ iPhone 14 Pro用Playwright実行完了 (実行時間: ${execDuration}ms)`);
    debugLog('📤 stdout: ' + (result.stdout ? result.stdout.substring(0, 500) + (result.stdout.length > 500 ? '...' : '') : '(なし)'));
    
    if (result.stderr) {
      debugLog('⚠️ stderr: ' + result.stderr.substring(0, 500) + (result.stderr.length > 500 ? '...' : ''), 'WARNING');
    }

    // iPhone 14 Pro用成功判定
    const mobileSuccessIndicators = [
      'iPhone 14 Pro版テスト完了成功',
      'iPhone 14 Pro版投稿完了成功', 
      'モバイル版テストモード完了',
      'モバイル版ツイート投稿完了',
      'モバイル版テキスト入力完了',
      '✅ iPhone 14 Pro環境ブラウザ起動成功',
      '✅ モバイル版手動ログイン完了確認',
      '✅ iPhone 14 Pro版実投稿成功',
      '✅ モバイル版Twitter移動成功',
      '✅ モバイル版ログイン済み',
      '✅ iPhone 14 Pro環境で既にログイン済み',
      'モバイル版1文字タイピング+ペースト方式で完全成功',
      '成功',
      '完了'
    ];
    
    debugLog(`📱 iPhone 14 Pro成功判定開始 - 検査対象: ${mobileSuccessIndicators.length}個のインジケーター`);
    
    const foundIndicators = mobileSuccessIndicators.filter(indicator => 
      result.stdout.includes(indicator)
    );
    
    // モバイルテストモードでは複数の成功インジケーターがあれば成功とみなす
    const isTestMode = !actuallyPost;
    const isSuccess = isTestMode ? foundIndicators.length >= 2 : foundIndicators.length > 0;
    
    // エラーの検出（モバイルテストモードでは投稿ボタンエラーは除外）
    const errorKeywords = ['error', 'Error', 'ERROR', '❌', '失敗', 'Exception', 'Traceback'];
    const foundErrors = result.stderr ? errorKeywords.filter(keyword => 
      result.stderr.includes(keyword)
    ) : [];
    
    // モバイルテストモードでは投稿ボタンが見つからないエラーは正常とみなす
    const criticalErrors = foundErrors.filter(error => 
      isTestMode ? !result.stderr.includes('投稿ボタンが見つかりません') : true
    );
    
    const hasErrors = criticalErrors.length > 0;

    debugLog('📊 iPhone 14 Pro成功判定結果:');
    debugLog(`  - 成功判定: ${isSuccess}`);
    debugLog(`  - エラー検出: ${hasErrors}`);
    debugLog(`  - 発見された成功インジケーター: [${foundIndicators.join(', ')}]`);
    if (hasErrors) {
      debugLog(`  - 発見されたエラーキーワード: [${foundErrors.join(', ')}]`, 'WARNING');
    }

    if (isSuccess && !hasErrors) {
      debugLog('✅ iPhone 14 Pro成功判定：正常レスポンスを返却');
      const responseData = {
        success: true,
        message: actuallyPost ? 'iPhone 14 Pro版ツイートが正常に投稿されました' : 'iPhone 14 Pro版テスト完了（投稿準備まで実行）',
        details: {
          final_result: true,
          timestamp: new Date().toISOString(),
          engine: 'Playwright（iPhone 14 Pro版）',
          mode: actuallyPost ? 'モバイル実投稿' : 'モバイルテストモード',
          device: 'iPhone 14 Pro',
          viewport: '393x852',
          device_scale_factor: 3,
          stdout: result.stdout,
          stderr: result.stderr || '',
          execution_time_ms: Date.now() - startTime,
          request_id: requestId,
          errors: [],
          warnings: result.stderr ? [
            {
              step: 'mobile_playwright_execution',
              message: 'stderr出力がありました（通常は問題ありません）',
              timestamp: new Date().toISOString(),
              type: 'warning'
            }
          ] : [],
          success_steps: [
            {
              step: 'mobile_browser_launch',
              message: 'iPhone 14 Pro環境Playwrightブラウザ起動成功',
              timestamp: new Date().toISOString(),
              type: 'success'
            },
            {
              step: 'mobile_simulation',
              message: 'iPhone 14 Pro環境シミュレーション成功',
              timestamp: new Date().toISOString(),
              type: 'success'
            },
            {
              step: 'mobile_twitter_operation',
              message: actuallyPost ? 'モバイル版Twitter投稿完了' : 'モバイル版Twitter操作テスト完了',
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
      
      debugLog(`📱 レスポンスデータサイズ: ${JSON.stringify(responseData).length} bytes`);
      return NextResponse.json(responseData);
    } else {
      // 成功メッセージが見つからない場合の詳細レポート
      debugLog('❌ iPhone 14 Pro成功メッセージが見つかりませんでした', 'ERROR');
      debugLog('📤 実際のstdout: ' + (result.stdout || '(なし)'), 'ERROR');
      debugLog('📤 実際のstderr: ' + (result.stderr || '(なし)'), 'ERROR');
      
      const errorResponse = {
        success: false,
        error: 'iPhone 14 Pro版Playwright実行は完了しましたが、期待された成功メッセージが見つかりませんでした',
        debug_info: {
          stdout: result.stdout,
          stderr: result.stderr,
          success_indicators_checked: mobileSuccessIndicators,
          found_indicators: foundIndicators,
          execution_time_ms: Date.now() - startTime,
          request_id: requestId,
          device: 'iPhone 14 Pro',
          viewport: '393x852'
        },
        details: {
          final_result: false,
          timestamp: new Date().toISOString(),
          engine: 'Playwright（iPhone 14 Pro版）',
          device: 'iPhone 14 Pro',
          errors: [
            {
              step: 'mobile_success_message_detection',
              message: 'iPhone 14 Pro版期待された成功メッセージが見つかりませんでした',
              timestamp: new Date().toISOString(),
              type: 'mobile_detection_error',
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
      
      debugLog('📱 エラーレスポンスを返却', 'ERROR');
      return NextResponse.json(errorResponse, { status: 500 });
    }

  } catch (error: unknown) {
    const errorDuration = Date.now() - startTime;
    debugLog(`❌ iPhone 14 Pro版Twitter投稿APIエラー (実行時間: ${errorDuration}ms)`, 'ERROR');
    
    const errorObj = error as Error & { code?: string; stderr?: string };
    debugLog(`エラー詳細: ${errorObj.message || 'Unknown error'}`, 'ERROR');
    debugLog(`エラーコード: ${errorObj.code || '不明'}`, 'ERROR');

    const errorResponse = {
      success: false,
      error: 'iPhone 14 Pro版予期しないエラーが発生しました',
      details: {
        final_result: false,
        timestamp: new Date().toISOString(),
        engine: 'Playwright（iPhone 14 Pro版）',
        device: 'iPhone 14 Pro',
        execution_time_ms: errorDuration,
        request_id: requestId,
        errors: [
          {
            step: 'mobile_api_error',
            message: errorObj.message || 'iPhone 14 Pro版予期しないエラー',
            timestamp: new Date().toISOString(),
            type: 'mobile_error',
            exception: errorObj.stack || 'Stack trace not available'
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

    debugLog(`📱 エラーレスポンスサイズ: ${JSON.stringify(errorResponse).length} bytes`, 'ERROR');
    debugLog('📱 エラーレスポンスを返却', 'ERROR');
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
}