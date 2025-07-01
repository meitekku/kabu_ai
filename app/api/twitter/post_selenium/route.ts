// app/api/twitter/post_selenium/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

// リクエストボディの型定義
interface TweetRequest {
  message?: string;
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
    
    // summaryフィールドが存在しない場合は手動で作成
    if (!report.summary) {
      report.summary = {
        total_errors: report.errors?.length || 0,
        total_warnings: report.warnings?.length || 0,
        total_success_steps: report.success_steps?.length || 0
      };
    }
    
    // 配列フィールドが存在しない場合は空配列を設定
    if (!report.errors) report.errors = [];
    if (!report.warnings) report.warnings = [];
    if (!report.success_steps) report.success_steps = [];
    
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
  
  // summaryフィールドの存在チェック
  if (report.summary) {
    console.log(`Summary: ${report.summary.total_errors} errors, ${report.summary.total_warnings} warnings, ${report.summary.total_success_steps} success steps`);
  } else {
    // summaryがない場合は配列の長さから計算
    const errorCount = report.errors?.length || 0;
    const warningCount = report.warnings?.length || 0;
    const successCount = report.success_steps?.length || 0;
    console.log(`Summary: ${errorCount} errors, ${warningCount} warnings, ${successCount} success steps`);
  }
  
  // 成功ステップをログ出力
  if (report.success_steps && report.success_steps.length > 0) {
    console.log('\n🟢 SUCCESS STEPS:');
    report.success_steps.forEach((step, index) => {
      console.log(`  ${index + 1}. [${step.step}] ${step.message} (${step.timestamp})`);
    });
  }
  
  // 警告をログ出力
  if (report.warnings && report.warnings.length > 0) {
    console.log('\n🟡 WARNINGS:');
    report.warnings.forEach((warning, index) => {
      console.log(`  ${index + 1}. [${warning.step}] ${warning.message} (${warning.timestamp})`);
    });
  }
  
  // エラーをログ出力
  if (report.errors && report.errors.length > 0) {
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
  imagePath?: string,
  textOnly: boolean = false
): Promise<{ success: boolean; report?: PythonErrorReport }> {
  return new Promise((resolve, reject) => {
    // 修正: Pythonスクリプトのパス（同じディレクトリにある場合）
    const scriptPath = path.join(process.cwd(), 'app', 'api', 'twitter', 'post_selenium', 'twitter_auto_post_secure.py');
    
    // コマンドライン引数を構築
    const args: string[] = [];
    
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
    
    console.log('Executing Python script:', scriptPath);
    console.log('Arguments:', args);
    
    // Python実行環境の確認
    const pythonCommand = process.platform === 'win32' ? 'python' : 'python3';
    
    // Pythonスクリプトを実行
    const pythonProcess = spawn(pythonCommand, [scriptPath, ...args], {
      env: { ...process.env },
      cwd: process.cwd()
    });
    
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
      console.log(`Python process exited with code ${code}`);
      
      // JSONレポートを抽出
      const report = extractJsonReport(stdout);
      
      if (report) {
        // 詳細レポートをコンソールに出力
        try {
          logDetailedReport(report);
        } catch (error) {
          console.error('Error logging detailed report:', error);
        }
        
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
        
        try {
          logDetailedReport(fallbackReport);
        } catch (error) {
          console.error('Error logging fallback report:', error);
        }
        
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
      
      try {
        logDetailedReport(errorReport);
      } catch (logError) {
        console.error('Error logging error report:', logError);
      }
      
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
      
      try {
        logDetailedReport(timeoutReport);
      } catch (error) {
        console.error('Error logging timeout report:', error);
      }
      
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
    if (!body.message && !body.imagePath) {
      console.log('❌ Request validation failed: No message or image path provided');
      return NextResponse.json<TweetResponse>(
        {
          success: false,
          error: 'メッセージまたは画像パスが必要です'
        },
        { status: 400 }
      );
    }
    
    console.log('🚀 Tweet request received:', JSON.stringify(body, null, 2));
    
    // Pythonスクリプトを実行
    const { success, report } = await executePythonScript(
      body.message,
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
      return NextResponse.json<TweetResponse>(
        {
          success: false,
          error: 'ツイートの投稿に失敗しました',
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
    version: '2.1 - Enhanced Error Handling',
    endpoints: {
      POST: {
        description: 'ツイートを投稿します',
        body: {
          message: '投稿するメッセージ（オプション）',
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
      'Detailed error reporting from Python script',
      'Step-by-step execution tracking',
      'JSON-based error communication',
      'Enhanced console logging',
      'Comprehensive error analysis',
      'Robust error handling for missing fields'
    ]
  });
}