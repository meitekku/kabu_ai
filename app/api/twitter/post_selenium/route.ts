// app/api/twitter/post_selenium/route.ts
// メインAPIルート - 絵文字対応版
import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

// リクエストボディの型定義
interface TweetRequest {
  message?: string;
  encodedMessage?: string;  // 絵文字対応のためのBase64エンコードメッセージ
  hasEmoji?: boolean;       // 絵文字が含まれているかのフラグ
  imagePath?: string;
  textOnly?: boolean;
}

// レスポンスの型定義
interface TweetResponse {
  success: boolean;
  message?: string;
  error?: string;
  details?: PythonErrorReport;
}

// Pythonスクリプトからのエラーレポート型定義
interface ErrorDetail {
  step: string;
  message: string;
  timestamp: string;
  type: 'error' | 'warning' | 'success';
  exception?: string;
  traceback?: string;
}

interface PythonErrorReport {
  final_result: boolean;
  timestamp: string;
  errors: ErrorDetail[];
  warnings: ErrorDetail[];
  success_steps: ErrorDetail[];
  summary: {
    total_errors: number;
    total_warnings: number;
    total_success_steps: number;
  };
}

// JSONレポートを抽出する関数
function extractJsonReport(output: string): PythonErrorReport | null {
  try {
    const startMarker = '=== JSON_REPORT_START ===';
    const endMarker = '=== JSON_REPORT_END ===';
    
    const startIndex = output.indexOf(startMarker);
    const endIndex = output.indexOf(endMarker);
    
    if (startIndex === -1 || endIndex === -1) {
      console.warn('JSON report markers not found in output');
      return null;
    }
    
    const jsonString = output.substring(
      startIndex + startMarker.length,
      endIndex
    ).trim();
    
    const report = JSON.parse(jsonString) as PythonErrorReport;
    return report;
  } catch (error) {
    console.error('Failed to parse JSON report:', error);
    return null;
  }
}

// エラーレポートをコンソールに詳細表示する関数
function logDetailedReport(report: PythonErrorReport) {
  console.log('\n=== PYTHON SCRIPT DETAILED REPORT ===');
  console.log(`Final Result: ${report.final_result}`);
  console.log(`Timestamp: ${report.timestamp}`);
  console.log(`Summary: ${report.summary.total_errors} errors, ${report.summary.total_warnings} warnings, ${report.summary.total_success_steps} success steps`);
  
  // 成功ステップをログ出力
  if (report.success_steps.length > 0) {
    console.log('\n🟢 SUCCESS STEPS:');
    report.success_steps.forEach((step, index) => {
      console.log(`  ${index + 1}. [${step.step}] ${step.message} (${step.timestamp})`);
    });
  }
  
  // 警告をログ出力
  if (report.warnings.length > 0) {
    console.log('\n🟡 WARNINGS:');
    report.warnings.forEach((warning, index) => {
      console.log(`  ${index + 1}. [${warning.step}] ${warning.message} (${warning.timestamp})`);
    });
  }
  
  // エラーをログ出力
  if (report.errors.length > 0) {
    console.log('\n🔴 ERRORS:');
    report.errors.forEach((error, index) => {
      console.log(`  ${index + 1}. [${error.step}] ${error.message} (${error.timestamp})`);
      if (error.exception) {
        console.log(`     Exception: ${error.exception}`);
      }
      if (error.traceback) {
        console.log(`     Traceback:\n${error.traceback}`);
      }
    });
  }
  
  console.log('=== END DETAILED REPORT ===\n');
}

// Pythonスクリプトを実行する関数
async function executePythonScript(
  message?: string,
  encodedMessage?: string,
  hasEmoji?: boolean,
  imagePath?: string,
  textOnly: boolean = false
): Promise<{ success: boolean; report?: PythonErrorReport }> {
  return new Promise((resolve, reject) => {
    // Pythonスクリプトのパス（プロジェクトディレクトリ直下のpythonフォルダ）
    const scriptPath = path.join(process.cwd(), 'python', 'twitter_auto_post_secure.py');
    
    // コマンドライン引数を構築
    const args: string[] = [];
    
    // 絵文字が含まれている場合は、エンコードされたメッセージを使用
    if (hasEmoji && encodedMessage) {
      args.push('--encoded-message', encodedMessage);
      // 画像がある場合
      if (imagePath && !textOnly) {
        args.push('--image', imagePath);
      }
    } else {
      // 通常のメッセージ処理
      if (textOnly) {
        args.push('--text-only');
        if (message) {
          args.push(message);
        }
      } else if (imagePath) {
        args.push('--image');
        args.push(imagePath);
        if (message) {
          args.push(message);
        }
      } else if (message) {
        args.push(message);
      }
    }
    
    console.log('Executing Python script:', scriptPath);
    console.log('Arguments:', args);
    if (hasEmoji) {
      console.log('Note: Message contains emoji, using encoded format');
    }
    
    // Pythonスクリプトを実行
    const pythonProcess = spawn('python', [scriptPath, ...args]);
    
    let stdout = '';
    let stderr = '';

    // 標準出力を収集
    pythonProcess.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      console.log('Python stdout:', output);
    });
    
    // エラー出力を収集
    pythonProcess.stderr.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      console.error('Python stderr:', output);
    });
    
    // プロセス終了時の処理
    pythonProcess.on('close', (code) => {
      console.log(`\nPython process exited with code ${code}`);
      
      // JSONレポートを抽出
      const report = extractJsonReport(stdout);
      
      if (report) {
        // 詳細レポートをコンソールに出力
        logDetailedReport(report);
        
        // レポートの final_result を基に成功/失敗を判定
        resolve({ success: report.final_result, report });
      } else {
        console.warn('No detailed report available, falling back to exit code');
        
        // JSONレポートが取得できない場合は終了コードで判定
        const success = code === 0;
        
        // 最低限のレポートを作成
        const fallbackReport: PythonErrorReport = {
          final_result: success,
          timestamp: new Date().toISOString(),
          errors: success ? [] : [{
            step: 'unknown',
            message: `Process exited with code ${code}`,
            timestamp: new Date().toISOString(),
            type: 'error'
          }],
          warnings: [],
          success_steps: success ? [{
            step: 'process_completion',
            message: 'Process completed successfully',
            timestamp: new Date().toISOString(),
            type: 'success'
          }] : [],
          summary: {
            total_errors: success ? 0 : 1,
            total_warnings: 0,
            total_success_steps: success ? 1 : 0
          }
        };
        
        if (stderr) {
          fallbackReport.errors.push({
            step: 'stderr',
            message: stderr,
            timestamp: new Date().toISOString(),
            type: 'error'
          });
          fallbackReport.summary.total_errors++;
        }
        
        logDetailedReport(fallbackReport);
        resolve({ success, report: fallbackReport });
      }
    });
    
    // エラー処理
    pythonProcess.on('error', (error) => {
      console.error('Failed to start Python process:', error);
      
      // プロセス起動エラーの場合のレポート
      const errorReport: PythonErrorReport = {
        final_result: false,
        timestamp: new Date().toISOString(),
        errors: [{
          step: 'process_start',
          message: `Failed to start Python process: ${error.message}`,
          timestamp: new Date().toISOString(),
          type: 'error',
          exception: error.message
        }],
        warnings: [],
        success_steps: [],
        summary: {
          total_errors: 1,
          total_warnings: 0,
          total_success_steps: 0
        }
      };
      
      logDetailedReport(errorReport);
      reject(error);
    });
    
    // タイムアウト設定（5分）
    setTimeout(() => {
      console.warn('Python script timeout - killing process');
      pythonProcess.kill();
      
      const timeoutReport: PythonErrorReport = {
        final_result: false,
        timestamp: new Date().toISOString(),
        errors: [{
          step: 'timeout',
          message: 'Python script execution timed out (5 minutes)',
          timestamp: new Date().toISOString(),
          type: 'error'
        }],
        warnings: [],
        success_steps: [],
        summary: {
          total_errors: 1,
          total_warnings: 0,
          total_success_steps: 0
        }
      };
      
      logDetailedReport(timeoutReport);
      reject(new Error('Python script timeout'));
    }, 5 * 60 * 1000);
  });
}

// POSTリクエストハンドラー
export async function POST(request: NextRequest) {
  try {
    // リクエストボディを取得
    const body: TweetRequest = await request.json();
    
    // 入力検証
    if (!body.message && !body.encodedMessage && !body.imagePath) {
      console.log('❌ Request validation failed: No message, encoded message, or image path provided');
      return NextResponse.json<TweetResponse>(
        {
          success: false,
          error: 'メッセージまたは画像パスが必要です'
        },
        { status: 400 }
      );
    }
    
    console.log('🚀 Tweet request received:', JSON.stringify({
      ...body,
      encodedMessage: body.encodedMessage ? '[BASE64 ENCODED]' : undefined
    }, null, 2));
    
    // 絵文字が含まれているかのログ
    if (body.hasEmoji) {
      console.log('📝 Message contains emoji - using special handling');
    }
    
    // Pythonスクリプトを実行
    const { success, report } = await executePythonScript(
      body.message,
      body.encodedMessage,
      body.hasEmoji,
      body.imagePath,
      body.textOnly || false
    );
    
    // 結果に基づいてレスポンスを返す
    if (success) {
      console.log('✅ Tweet posted successfully');
      return NextResponse.json<TweetResponse>(
        {
          success: true,
          message: 'ツイートが正常に投稿されました',
          details: report
        },
        { status: 200 }
      );
    } else {
      console.log('❌ Tweet posting failed');
      
      // 絵文字関連のエラーかチェック
      const isEmojiError = report?.errors.some(error => 
        error.message.includes('ChromeDriver only supports characters in the BMP') ||
        error.exception?.includes('ChromeDriver only supports characters in the BMP')
      );
      
      if (isEmojiError) {
        console.error('⚠️ Emoji-related error detected. The emoji handling may not be working properly.');
      }
      
      return NextResponse.json<TweetResponse>(
        {
          success: false,
          error: isEmojiError 
            ? '絵文字の処理でエラーが発生しました。再度お試しください。' 
            : 'ツイートの投稿に失敗しました',
          details: report
        },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('💥 API error:', error);
    
    // エラーレスポンス
    return NextResponse.json<TweetResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : '予期しないエラーが発生しました'
      },
      { status: 500 }
    );
  }
}

// GETリクエストハンドラー（APIの動作確認用）
export async function GET() {
  return NextResponse.json({
    message: 'Twitter投稿API',
    version: '3.0 - Emoji Support & Enhanced Error Reporting',
    endpoints: {
      POST: {
        description: 'ツイートを投稿します（絵文字対応）',
        body: {
          message: '投稿するメッセージ（オプション）',
          encodedMessage: 'Base64エンコードされたメッセージ（絵文字対応、オプション）',
          hasEmoji: '絵文字が含まれているかのフラグ（オプション）',
          imagePath: '画像のパス（オプション）',
          textOnly: 'テキストのみの投稿かどうか（オプション、デフォルト: false）'
        },
        response: {
          success: '成功/失敗のブール値',
          message: '成功時のメッセージ',
          error: 'エラー時のメッセージ',
          details: '詳細なエラーレポート（PythonErrorReport型）'
        }
      }
    },
    features: [
      'Full emoji support using JavaScript injection',
      'Base64 encoding for non-BMP characters',
      'Detailed error reporting from Python script',
      'Step-by-step execution tracking',
      'JSON-based error communication',
      'Enhanced console logging',
      'Comprehensive error analysis',
      'Automatic emoji detection in React component'
    ],
    notes: [
      'Emoji handling: Messages containing emoji are Base64 encoded and sent to Python script',
      'Python script uses JavaScript injection to bypass ChromeDriver emoji limitations',
      'All text input now uses JavaScript instead of send_keys for better compatibility'
    ]
  });
}