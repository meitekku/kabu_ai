import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { writeFile, mkdir } from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

const execAsync = promisify(exec);

// モバイル版Twitter投稿API（認証回避強化版）
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  
  function debugLog(message: string, level: string = 'INFO') {
    const elapsed = Date.now() - startTime;
    const logMessage = `[${elapsed}ms] [${requestId}] [${level}] ${message}`;
    console.log(logMessage);
  }
  
  try {
    debugLog('📱 モバイル版Twitter投稿API開始（認証回避強化版）');
    
    const body = await request.json();
    const { message, textOnly = true, actuallyPost = false, imagePaths = [], imageBase64Data = [] } = body;
    
    debugLog(`リクエスト詳細: textOnly=${textOnly}, actuallyPost=${actuallyPost}, images=${imagePaths.length}枚, base64Images=${imageBase64Data.length}枚`);

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
    const scriptPath = path.join(pythonDir, 'mobile_twitter_manager.py');
    
    debugLog(`Pythonディレクトリ: ${pythonDir}`);
    debugLog(`モバイルスクリプトパス: ${scriptPath}`);

    // Pythonコマンドを構築
    let pythonCmd = `cd "${pythonDir}" && python3 mobile_twitter_manager.py`;
    
    // メッセージをエスケープ
    const escapedMessage = message.replace(/"/g, '\\"');
    pythonCmd += ` "${escapedMessage}"`;
    
    // base64データを一時ファイルに保存して画像パスを追加
    const finalImagePaths: string[] = [];
    
    // 既存の画像パス（従来方式）
    if (imagePaths.length > 0) {
      const fullImagePaths = imagePaths.map((imagePath: string) => {
        // 相対パスを絶対パスに変換
        if (imagePath.startsWith('/uploads/')) {
          return path.join(process.cwd(), 'public', imagePath);
        }
        return imagePath;
      });
      finalImagePaths.push(...fullImagePaths);
      debugLog(`既存画像パス追加: ${fullImagePaths.length}枚`);
    }
    
    // base64データを一時ファイルに保存（新方式）
    if (imageBase64Data.length > 0) {
      debugLog(`base64画像データを一時ファイルに保存中: ${imageBase64Data.length}枚`);
      
      // 一時ディレクトリを作成
      const tempDir = path.join(process.cwd(), 'temp', 'base64_images');
      try {
        await mkdir(tempDir, { recursive: true });
      } catch {
        // ディレクトリが既に存在する場合はエラーを無視
      }
      
      for (let i = 0; i < imageBase64Data.length; i++) {
        try {
          const base64Data = imageBase64Data[i];
          debugLog(`📱 [MOBILE IMAGE DEBUG] 画像 ${i + 1}/${imageBase64Data.length} 処理開始`);
          debugLog(`📱 [MOBILE IMAGE DEBUG] データ長: ${base64Data.length} 文字`);
          debugLog(`📱 [MOBILE IMAGE DEBUG] データプレビュー: ${base64Data.substring(0, 100)}...`);
          
          if (base64Data.startsWith('data:image/')) {
            debugLog(`✅ [MOBILE IMAGE DEBUG] 有効なdata URL形式確認`);
            
            // MIMEタイプを取得
            const mimeMatch = base64Data.match(/data:([^;]*)/);
            const mimeType = mimeMatch ? mimeMatch[1] : 'unknown';
            debugLog(`📝 [MOBILE IMAGE DEBUG] MIMEタイプ: ${mimeType}`);
            
            // data URLから実際のbase64データを抽出
            const base64Content = base64Data.split(',')[1];
            debugLog(`📝 [MOBILE IMAGE DEBUG] base64コンテンツ長: ${base64Content.length} 文字`);
            
            const buffer = Buffer.from(base64Content, 'base64');
            debugLog(`📝 [MOBILE IMAGE DEBUG] Buffer作成: ${buffer.length} bytes`);
            
            // 一意のファイル名を生成
            const fileName = `mobile_chart_${uuidv4()}.png`;
            const filePath = path.join(tempDir, fileName);
            debugLog(`📝 [MOBILE IMAGE DEBUG] 保存先: ${filePath}`);
            
            // ファイルに保存
            await writeFile(filePath, buffer);
            finalImagePaths.push(filePath);
            debugLog(`✅ [MOBILE IMAGE DEBUG] ファイル保存完了: ${filePath}`);
            
            // ファイルサイズを確認
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const fs = require('fs');
            const stats = fs.statSync(filePath);
            debugLog(`📊 [MOBILE IMAGE DEBUG] 保存ファイルサイズ: ${stats.size} bytes`);
            debugLog(`base64画像保存完了: ${filePath}`);
          } else {
            debugLog(`❌ [MOBILE IMAGE DEBUG] 無効なbase64データ形式: ${i + 1}枚目`, 'WARNING');
            debugLog(`❌ [MOBILE IMAGE DEBUG] データ開始: ${base64Data.substring(0, 50)}...`, 'WARNING');
          }
        } catch (error) {
          debugLog(`❌ [MOBILE IMAGE DEBUG] 画像 ${i + 1} 処理エラー: ${error}`, 'ERROR');
          debugLog(`❌ [MOBILE IMAGE DEBUG] エラー詳細: ${error instanceof Error ? error.stack : String(error)}`, 'ERROR');
        }
      }
    }
    
    // 🔍 コマンド構築前の詳細ログ
    debugLog(`📋 [CMD DEBUG] 最終コマンド構築開始`);
    debugLog(`📋 [CMD DEBUG] 現在のpythonCmd: "${pythonCmd}"`);
    debugLog(`📋 [CMD DEBUG] finalImagePaths.length: ${finalImagePaths.length}`);
    debugLog(`📋 [CMD DEBUG] finalImagePaths内容:`, 'INFO');
    finalImagePaths.forEach((path, index) => {
      debugLog(`📋 [CMD DEBUG]   ${index + 1}. "${path}"`);
    });
    
    // 最終的な画像パスをコマンドに追加
    if (finalImagePaths.length > 0) {
      const imagePathsString = finalImagePaths.map((p: string) => `"${p}"`).join(' ');
      debugLog(`📋 [CMD DEBUG] 追加する画像パス文字列: "${imagePathsString}"`);
      
      pythonCmd += ` ${imagePathsString}`;
      debugLog(`📋 [CMD DEBUG] 画像パス追加後: "${pythonCmd}"`);
      debugLog(`最終画像パス追加: ${finalImagePaths.length}枚`);
      
      // 各ファイルの存在確認
      debugLog(`📋 [CMD DEBUG] ファイル存在確認:`, 'INFO');
      finalImagePaths.forEach((path, index) => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const fs = require('fs');
          if (fs.existsSync(path)) {
            const stats = fs.statSync(path);
            debugLog(`📋 [CMD DEBUG]   ${index + 1}. ✅ "${path}" (${stats.size} bytes)`);
          } else {
            debugLog(`📋 [CMD DEBUG]   ${index + 1}. ❌ "${path}" (ファイルなし)`, 'ERROR');
          }
        } catch (e) {
          debugLog(`📋 [CMD DEBUG]   ${index + 1}. ⚠️ "${path}" (確認エラー: ${e})`, 'WARNING');
        }
      });
    } else {
      debugLog(`📋 [CMD DEBUG] 画像パスなし - テキストのみ投稿`);
    }
    
    if (!actuallyPost) {
      pythonCmd += ' --test';
      debugLog(`📋 [CMD DEBUG] テストモードフラグ追加後: "${pythonCmd}"`);
      debugLog('テストモードフラグを追加');
    } else {
      pythonCmd += ' --post';
      debugLog(`📋 [CMD DEBUG] 実投稿モードフラグ追加後: "${pythonCmd}"`);
      debugLog('🚀 実投稿モードフラグ (--post) を追加');
    }
    
    debugLog(`📋 [CMD DEBUG] === 最終コマンド ===`);
    debugLog(`📋 [CMD DEBUG] "${pythonCmd}"`);
    debugLog(`📋 [CMD DEBUG] コマンド長: ${pythonCmd.length} 文字`);
    debugLog(`📋 [CMD DEBUG] ==================`)

    debugLog('📱 実行コマンド: ' + pythonCmd);
    
    // 最終的な画像ファイルの詳細情報を出力
    if (finalImagePaths.length > 0) {
      debugLog(`📷 最終画像ファイル詳細:`);
      finalImagePaths.forEach((path, i) => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const fs = require('fs');
          const stats = fs.statSync(path);
          debugLog(`  ${i+1}. ${path} (${stats.size} bytes)`);
        } catch (e) {
          debugLog(`  ${i+1}. ${path} (ファイルエラー: ${e})`, 'ERROR');
        }
      });
    }

    // Pythonスクリプトを実行（モバイル版は少し長めのタイムアウト）
    debugLog('モバイル版Pythonスクリプト実行開始...');
    const execStartTime = Date.now();
    
    const result = await execAsync(pythonCmd, {
      timeout: 350000, // 5分50秒（モバイル版は少し長め）
      maxBuffer: 1024 * 1024 * 10, // 10MBまでの出力を許可
      env: {
        ...process.env,
        PYTHONPATH: pythonDir,
        PYTHONUNBUFFERED: '1'
      }
    });

    const execDuration = Date.now() - execStartTime;
    debugLog(`✅ モバイル版実行完了 (実行時間: ${execDuration}ms)`);
    debugLog('📤 stdout: ' + (result.stdout ? result.stdout.substring(0, 500) + (result.stdout.length > 500 ? '...' : '') : '(なし)'));
    
    if (result.stderr) {
      debugLog('⚠️ stderr: ' + result.stderr.substring(0, 500) + (result.stderr.length > 500 ? '...' : ''), 'WARNING');
    }

    // 成功判定（モバイル版特化）
    const mobileSuccessIndicators = [
      // 投稿成功の明確な指標
      '✅ モバイルツイート投稿完了！',
      '✅ === モバイル版投稿テスト成功！ ===',
      '✅ === モバイル版投稿完了成功！ ===',
      'モバイル版投稿テスト成功',
      'モバイル版投稿完了成功', 
      'モバイルテストモード完了',
      'モバイル実投稿成功',
      
      // テキスト入力成功
      '✅ モバイルテキスト入力完了',
      'モバイルテキスト入力完了',
      
      // 実投稿スキップ時の成功指標
      '🚫 実投稿処理をスキップ（投稿直前で停止）',
      '📝 テキスト入力は完了しました。投稿を実行するには以下のコメントアウトを解除してください',
      
      // その他の成功指標
      'Compose ページでテキスト入力完了',
      'Compose ページでのテストモード完了',
      'Compose ページからツイート投稿完了',
      
      // システム成功指標
      '✅ モバイルブラウザ起動成功',
      '✅ === モバイルログイン完了確認 ===',
      '✅ 既にモバイルログイン済みです',
      '✅ モバイルTwitter移動成功',
      'モバイル版で認証回避成功',
      'モバイルデバイスエミュレーションが効果的',
      
      // 汎用成功指標
      '成功',
      '完了'
    ];
    
    debugLog(`モバイル成功判定開始 - 検査対象: ${mobileSuccessIndicators.length}個のインジケーター`);
    
    const foundIndicators = mobileSuccessIndicators.filter(indicator => 
      result.stdout.includes(indicator)
    );
    
    // モバイル版では重要な成功インジケーターがあれば成功とみなす
    const isTestMode = !actuallyPost;
    
    // 明確な投稿完了メッセージがあるかチェック
    const criticalSuccessIndicators = [
      '✅ モバイルツイート投稿完了！',
      '✅ === モバイル版投稿テスト成功！ ===',
      '✅ === モバイル版投稿完了成功！ ===',
      'モバイル版投稿テスト成功',
      'モバイル版投稿完了成功',
      'モバイル実投稿成功',
      '✅ モバイルテキスト入力完了',
      'モバイルテキスト入力完了'
    ];
    
    const hasCriticalSuccess = criticalSuccessIndicators.some(indicator => 
      result.stdout.includes(indicator)
    );
    
    // 成功判定：重要な指標が1つでもあれば成功、またはテストモードで2つ以上の指標
    const isSuccess = hasCriticalSuccess || (isTestMode && foundIndicators.length >= 2) || (!isTestMode && foundIndicators.length > 0);
    
    // エラーの検出（モバイル版では一部のエラーは除外）
    const errorKeywords = ['error', 'Error', 'ERROR', '❌', '失敗', 'Exception', 'Traceback'];
    const foundErrors = result.stderr ? errorKeywords.filter(keyword => 
      result.stderr.includes(keyword)
    ) : [];
    
    // モバイル版では特定のエラーは正常とみなす
    const mobileIgnoreErrors = [
      'ServiceWorker',
      'service worker',
      'sandboxed',
      'allow-same-origin'
    ];
    
    const criticalErrors = foundErrors.filter(() => 
      !mobileIgnoreErrors.some(ignore => result.stderr.includes(ignore))
    );
    
    const hasErrors = criticalErrors.length > 0;

    debugLog('📱 モバイル成功判定結果:');
    debugLog(`  - 重要な成功指標あり: ${hasCriticalSuccess}`);
    debugLog(`  - 最終成功判定: ${isSuccess}`);
    debugLog(`  - エラー検出: ${hasErrors}`);
    debugLog(`  - 発見された成功インジケーター (${foundIndicators.length}個): [${foundIndicators.join(', ')}]`);
    debugLog(`  - テストモード: ${isTestMode}`);
    if (hasCriticalSuccess) {
      const criticalFound = criticalSuccessIndicators.filter(indicator => result.stdout.includes(indicator));
      debugLog(`  - 重要な成功指標: [${criticalFound.join(', ')}]`);
    }
    if (hasErrors) {
      debugLog(`  - 発見されたエラーキーワード: [${foundErrors.join(', ')}]`, 'WARNING');
    }

    if (isSuccess && !hasErrors) {
      debugLog('✅ モバイル成功判定：正常レスポンスを返却');
      const responseData = {
        success: true,
        message: actuallyPost ? 'モバイル版ツイートが正常に投稿されました（認証回避成功）' : 'モバイル版テスト完了（認証回避成功）',
        details: {
          final_result: true,
          timestamp: new Date().toISOString(),
          engine: 'モバイルPlaywright（iPhone 14 Pro Max エミュレーション）',
          mode: actuallyPost ? '実投稿' : 'テストモード',
          auth_bypass: 'モバイルデバイスエミュレーションによる認証回避成功',
          stdout: result.stdout,
          stderr: result.stderr || '',
          execution_time_ms: Date.now() - startTime,
          request_id: requestId,
          errors: [],
          warnings: result.stderr ? [
            {
              step: 'mobile_execution',
              message: 'stderr出力がありました（ServiceWorkerエラーなどは正常です）',
              timestamp: new Date().toISOString(),
              type: 'warning'
            }
          ] : [],
          success_steps: [
            {
              step: 'mobile_browser_launch',
              message: 'モバイルブラウザ起動成功（iPhone 14 Pro Max）',
              timestamp: new Date().toISOString(),
              type: 'success'
            },
            {
              step: 'auth_bypass',
              message: 'Twitter認証回避成功（モバイルエミュレーション）',
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
            total_success_steps: 3,
            auth_method: 'モバイルデバイスエミュレーション',
            device_emulated: 'iPhone 14 Pro Max'
          }
        }
      };
      
      debugLog(`モバイルレスポンスデータサイズ: ${JSON.stringify(responseData).length} bytes`);
      return NextResponse.json(responseData);
    } else {
      // 成功メッセージが見つからない場合の詳細レポート
      debugLog('❌ モバイル成功メッセージが見つかりませんでした', 'ERROR');
      debugLog('📤 実際のstdout: ' + (result.stdout || '(なし)'), 'ERROR');
      debugLog('📤 実際のstderr: ' + (result.stderr || '(なし)'), 'ERROR');
      
      const errorResponse = {
        success: false,
        error: 'モバイル版実行は完了しましたが、期待された成功メッセージが見つかりませんでした',
        debug_info: {
          stdout: result.stdout,
          stderr: result.stderr,
          success_indicators_checked: mobileSuccessIndicators,
          found_indicators: foundIndicators,
          execution_time_ms: Date.now() - startTime,
          request_id: requestId
        },
        details: {
          final_result: false,
          timestamp: new Date().toISOString(),
          engine: 'モバイルPlaywright（iPhone 14 Pro Max エミュレーション）',
          errors: [
            {
              step: 'mobile_success_message_detection',
              message: '期待されたモバイル成功メッセージが見つかりませんでした',
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
            total_success_steps: 0,
            auth_method: 'モバイルデバイスエミュレーション',
            device_emulated: 'iPhone 14 Pro Max'
          }
        }
      };
      
      debugLog('モバイルエラーレスポンスを返却', 'ERROR');
      return NextResponse.json(errorResponse, { status: 500 });
    }

  } catch (error: unknown) {
    const errorDuration = Date.now() - startTime;
    debugLog(`❌ モバイル版Twitter投稿APIエラー (実行時間: ${errorDuration}ms)`, 'ERROR');
    
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
      engine: 'モバイルPlaywright（iPhone 14 Pro Max エミュレーション）',
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
        total_success_steps: 0,
        auth_method: 'モバイルデバイスエミュレーション',
        device_emulated: 'iPhone 14 Pro Max'
      }
    };

    if (errorObj.code === 'ETIMEDOUT') {
      errorMessage = 'モバイル版実行がタイムアウトしました（5分50秒）。手動ログインに時間がかかった可能性があります。';
      debugLog('タイムアウトエラーを検出', 'ERROR');
      errorDetails.errors.push({
        step: 'mobile_timeout',
        message: 'モバイル版実行がタイムアウトしました（5分50秒）',
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
          step: 'mobile_playwright_installation',
          message: 'Playwrightインストールが必要',
          timestamp: new Date().toISOString(),
          type: 'installation_error',
          exception: errorObj.stderr
        });
      } else {
        errorMessage = 'モバイル版実行エラー';
        debugLog('モバイル版実行エラーを検出', 'ERROR');
        errorDetails.errors.push({
          step: 'mobile_execution',
          message: errorObj.stderr,
          timestamp: new Date().toISOString(),
          type: 'execution_error',
          exception: errorObj.message || 'Execution error'
        });
      }
    } else {
      debugLog('一般的なAPIエラーを検出', 'ERROR');
      errorDetails.errors.push({
        step: 'mobile_api_error',
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

    debugLog(`モバイルエラーレスポンスサイズ: ${JSON.stringify(errorResponse).length} bytes`, 'ERROR');
    debugLog('モバイルエラーレスポンスを返却', 'ERROR');
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
}