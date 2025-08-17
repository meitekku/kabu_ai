import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { writeFile, mkdir } from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

const execAsync = promisify(exec);

// 安全なTwitter投稿API
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, textOnly = true, actuallyPost = false, imagePath, imageBase64, imageBase64Data = [] } = body;

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
    
    // base64画像データがある場合は一時ファイルに保存
    let finalImagePath: string | undefined = undefined;
    
    console.log('🔍 [IMAGE DEBUG] 画像処理開始 - 詳細ログ');
    console.log('🔍 [IMAGE DEBUG] imageBase64存在:', !!imageBase64);
    console.log('🔍 [IMAGE DEBUG] imageBase64長さ:', imageBase64 ? imageBase64.length : 0);
    console.log('🔍 [IMAGE DEBUG] imageBase64Data存在:', !!imageBase64Data);
    console.log('🔍 [IMAGE DEBUG] imageBase64Data配列長:', imageBase64Data.length);
    console.log('🔍 [IMAGE DEBUG] imagePath存在:', !!imagePath);
    console.log('🔍 [IMAGE DEBUG] imagePath値:', imagePath || 'なし');
    
    // 画像データの優先順位: imageBase64Data > imageBase64 > imagePath
    let imageDataToProcess = null;
    if (imageBase64Data.length > 0) {
      imageDataToProcess = imageBase64Data[0]; // 配列の最初の画像を使用
      console.log('🔍 [IMAGE DEBUG] imageBase64Data配列から画像データを使用');
      console.log('🔍 [IMAGE DEBUG] 選択された画像データ長:', imageDataToProcess.length);
    } else if (imageBase64) {
      imageDataToProcess = imageBase64;
      console.log('🔍 [IMAGE DEBUG] 単一imageBase64を使用');
    }
    
    if (imageDataToProcess) {
      console.log('📷 [IMAGE DEBUG] base64画像データを一時ファイルに保存中...');
      console.log('📷 [IMAGE DEBUG] base64データプレビュー:', imageDataToProcess.substring(0, 100) + '...');
      
      try {
        if (imageDataToProcess.startsWith('data:image/')) {
          console.log('📷 [IMAGE DEBUG] 有効なdata URL形式を確認');
          
          // MIMEタイプを取得
          const mimeMatch = imageDataToProcess.match(/data:([^;]*)/);
          const mimeType = mimeMatch ? mimeMatch[1] : 'unknown';
          console.log('📷 [IMAGE DEBUG] MIMEタイプ:', mimeType);
          
          // 一時ディレクトリを作成
          const tempDir = path.join(process.cwd(), 'temp', 'base64_images');
          console.log('📷 [IMAGE DEBUG] 一時ディレクトリ:', tempDir);
          
          try {
            await mkdir(tempDir, { recursive: true });
            console.log('📷 [IMAGE DEBUG] ディレクトリ作成成功');
          } catch (dirError) {
            console.log('📷 [IMAGE DEBUG] ディレクトリ作成エラー（既存の場合は正常）:', dirError);
          }
          
          // data URLから実際のbase64データを抽出
          const base64Content = imageDataToProcess.split(',')[1];
          console.log('📷 [IMAGE DEBUG] base64コンテンツ長さ:', base64Content.length);
          console.log('📷 [IMAGE DEBUG] base64コンテンツプレビュー:', base64Content.substring(0, 50) + '...');
          
          const buffer = Buffer.from(base64Content, 'base64');
          console.log('📷 [IMAGE DEBUG] Bufferサイズ:', buffer.length, 'bytes');
          console.log('📷 [IMAGE DEBUG] Buffer作成成功');
          
          // 一意のファイル名を生成
          const fileName = `safe_chart_${uuidv4()}.png`;
          const filePath = path.join(tempDir, fileName);
          console.log('📷 [IMAGE DEBUG] 保存ファイルパス:', filePath);
          
          // ファイルに保存
          await writeFile(filePath, buffer);
          finalImagePath = filePath;
          
          // ファイルサイズ確認
          const fs = require('fs');
          const stats = fs.statSync(filePath);
          console.log('📷 [IMAGE DEBUG] 保存されたファイルサイズ:', stats.size, 'bytes');
          console.log('📷 [IMAGE DEBUG] ファイル保存成功:', filePath);
          console.log(`✅ base64画像保存完了: ${filePath}`);
        } else {
          console.log('⚠️ [IMAGE DEBUG] 無効なbase64データ形式');
          console.log('⚠️ [IMAGE DEBUG] 受信データの最初の50文字:', imageDataToProcess.substring(0, 50));
        }
      } catch (error) {
        console.log(`❌ [IMAGE DEBUG] base64画像保存エラー:`, error);
        console.error('❌ [IMAGE DEBUG] エラー詳細:', error);
      }
    } else if (imagePath) {
      console.log('📷 [IMAGE DEBUG] 従来のファイルパス方式を使用');
      // 従来のファイルパス方式
      if (imagePath.startsWith('/uploads/')) {
        finalImagePath = path.join(process.cwd(), 'public', imagePath);
        console.log('📷 [IMAGE DEBUG] uploads相対パスを絶対パスに変換:', finalImagePath);
      } else {
        finalImagePath = imagePath;
        console.log('📷 [IMAGE DEBUG] 絶対パスをそのまま使用:', finalImagePath);
      }
      console.log(`📷 既存画像パス使用: ${finalImagePath}`);
    } else {
      console.log('📷 [IMAGE DEBUG] 画像データなし - テキストのみ投稿');
    }
    
    // 🔍 コマンド構築前の詳細ログ
    console.log('📋 [SAFE CMD DEBUG] 最終コマンド構築開始');
    console.log('📋 [SAFE CMD DEBUG] 現在のpythonCmd:', `"${pythonCmd}"`);
    console.log('📋 [SAFE CMD DEBUG] finalImagePath:', finalImagePath || 'なし');
    console.log('📋 [SAFE CMD DEBUG] textOnly:', textOnly);
    console.log('📋 [SAFE CMD DEBUG] actuallyPost:', actuallyPost);
    
    // 画像パスがある場合はコマンドに追加
    console.log('🔍 [COMMAND DEBUG] Pythonコマンド構築開始');
    
    if (finalImagePath) {
      console.log('📋 [SAFE CMD DEBUG] 画像パス追加処理開始');
      console.log('📋 [SAFE CMD DEBUG] 追加前コマンド:', `"${pythonCmd}"`);
      
      pythonCmd += ` "${finalImagePath}"`;
      
      console.log('📋 [SAFE CMD DEBUG] 画像パス追加後:', `"${pythonCmd}"`);
      console.log(`📷 [COMMAND DEBUG] 画像パス追加: ${finalImagePath}`);
      
      // ファイル存在確認
      const fs = require('fs');
      try {
        if (fs.existsSync(finalImagePath)) {
          const stats = fs.statSync(finalImagePath);
          console.log(`📷 [SAFE CMD DEBUG] ✅ ファイル存在確認: OK (${stats.size} bytes)`);
        } else {
          console.log(`❌ [SAFE CMD DEBUG] ファイル存在確認: NG - ファイルが見つかりません`);
          console.log(`❌ [SAFE CMD DEBUG] 絶対パス: ${require('path').resolve(finalImagePath)}`);
        }
      } catch (fileError) {
        console.log(`❌ [SAFE CMD DEBUG] ファイル確認エラー:`, fileError);
      }
    } else {
      console.log('📋 [SAFE CMD DEBUG] 画像パスなし - テキストのみ投稿');
    }
    
    if (textOnly && !finalImagePath) {
      console.log('📋 [SAFE CMD DEBUG] textOnlyフラグ追加処理');
      console.log('📋 [SAFE CMD DEBUG] フラグ追加前:', `"${pythonCmd}"`);
      pythonCmd += ' --text-only';
      console.log('📋 [SAFE CMD DEBUG] フラグ追加後:', `"${pythonCmd}"`);
      console.log('🔍 [COMMAND DEBUG] --text-only フラグ追加');
    }
    
    if (actuallyPost) {
      console.log('📋 [SAFE CMD DEBUG] actually-postフラグ追加処理');
      console.log('📋 [SAFE CMD DEBUG] フラグ追加前:', `"${pythonCmd}"`);
      pythonCmd += ' --actually-post';
      console.log('📋 [SAFE CMD DEBUG] フラグ追加後:', `"${pythonCmd}"`);
      console.log('🔍 [COMMAND DEBUG] --actually-post フラグ追加');
    } else {
      console.log('📋 [SAFE CMD DEBUG] testフラグ追加処理');
      console.log('📋 [SAFE CMD DEBUG] フラグ追加前:', `"${pythonCmd}"`);
      pythonCmd += ' --test';
      console.log('📋 [SAFE CMD DEBUG] フラグ追加後:', `"${pythonCmd}"`);
      console.log('🔍 [COMMAND DEBUG] --test フラグ追加');
    }

    console.log('📋 [SAFE CMD DEBUG] === 最終コマンド ===');
    console.log('📋 [SAFE CMD DEBUG]', `"${pythonCmd}"`);
    console.log('📋 [SAFE CMD DEBUG] コマンド長:', pythonCmd.length, '文字');
    console.log('📋 [SAFE CMD DEBUG] ====================');
    console.log('🐍 [COMMAND DEBUG] 最終実行コマンド:', pythonCmd);

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