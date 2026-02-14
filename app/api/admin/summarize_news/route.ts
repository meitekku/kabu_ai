import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function POST(): Promise<NextResponse> {
  try {
    const pythonScriptPath = path.join(process.cwd(), 'python', 'get_data', 'aricleSummarize.py');
    
    return await new Promise<NextResponse>((resolve) => {
      // 本番環境では仮想環境のPythonを使用
      const pythonExecutable = process.env.NODE_ENV === 'production' 
        ? '/var/www/kabu_ai/venv/bin/python' 
        : 'python3';
      
      const pythonProcess = spawn(pythonExecutable, [pythonScriptPath], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          PYTHONPATH: process.env.NODE_ENV === 'production' 
            ? '/var/www/kabu_ai/venv/lib/python3.12/site-packages'
            : process.env.PYTHONPATH,
          PATH: process.env.NODE_ENV === 'production'
            ? `/var/www/kabu_ai/venv/bin:${process.env.PATH}`
            : process.env.PATH
        }
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
          // Python スクリプトからの出力を解析してニュース情報を取得
          let generatedNews = null;
          
          try {
            // stdout から生成されたニュースを解析
            const lines = stdout.split('\n');
            let title = '';
            let content = '';
            const postCode = stdout; // 全体のコードを保存
            
            // Pythonスクリプトからの出力を解析
            let foundContent = false;
            let contentStarted = false;
            
            for (const line of lines) {
              const trimmedLine = line.trim();
              
              // 「生成されたタイトル:」の後のテキストをタイトルとして取得
              if (trimmedLine.includes('生成されたタイトル:')) {
                const titleMatch = trimmedLine.match(/生成されたタイトル:\s*(.+)/);
                if (titleMatch) {
                  title = titleMatch[1].trim();
                }
              }
              
              // 「コンテンツ:」の次の行からコンテンツ開始
              if (trimmedLine === 'コンテンツ:') {
                foundContent = true;
                contentStarted = true;
                continue;
              }
              
              // 「コンテンツ終了」でコンテンツ収集終了
              if (trimmedLine === 'コンテンツ終了') {
                foundContent = false;
                continue;
              }
              
              // コンテンツ部分を収集
              if (foundContent && contentStarted) {
                if (content) {
                  content += '\n' + line; // インデントを保持するため、trimmedLineではなくlineを使用
                } else {
                  content = line;
                }
              }
            }
            
            // タイトルとコンテンツが見つからない場合、デフォルト値を設定
            if (!title || !content) {
              const now = new Date();
              title = `株式ニュース要約 - ${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
              content = stdout || 'ニュース要約が生成されました。';
            }
            
            generatedNews = {
              title: title,
              content: content,
              postCode: postCode
            };
          } catch (parseError) {
            console.error('Failed to parse generated news:', parseError);
            // パース失敗時のフォールバック
            const now = new Date();
            generatedNews = {
              title: `株式ニュース要約 - ${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`,
              content: stdout || 'ニュース要約が生成されました。',
              postCode: stdout
            };
          }
          
          resolve(NextResponse.json({
            success: true,
            message: 'ニュース要約が正常に生成されました',
            output: stdout,
            generatedNews: generatedNews,
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