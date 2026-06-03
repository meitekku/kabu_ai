import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    
    let message: string;
    let imageData: string | null = null;
    
    if (contentType.includes('multipart/form-data')) {
      // FormDataの場合
      const formData = await request.formData();
      message = formData.get('text') as string;
      const imageFile = formData.get('image') as File;
      
      if (imageFile) {
        // 画像をtempディレクトリに保存
        const buffer = Buffer.from(await imageFile.arrayBuffer());
        const tempDir = path.join(process.cwd(), 'temp');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        const imagePath = path.join(tempDir, `twitter_image_${Date.now()}.png`);
        fs.writeFileSync(imagePath, buffer);
        imageData = imagePath;
      }
    } else {
      // JSONの場合
      const data = await request.json();
      message = data.text;
    }

    if (!message) {
      return NextResponse.json(
        { success: false, error: 'メッセージが指定されていません' },
        { status: 400 }
      );
    }

    // Base64エンコード（絵文字対応）
    const encodedMessage = Buffer.from(encodeURIComponent(message), 'utf8').toString('base64');
    
    // Pythonスクリプトを実行
    const projectRoot = process.cwd();
    const venvPath = path.join(projectRoot, 'venv', 'bin', 'activate');
    // const scriptPath = path.join(projectRoot, 'python', 'twitter_auto_post', 'main.py');
    
    const command = `source ${venvPath} && cd ${projectRoot} && python -c "
import sys
sys.path.append('python')
from twitter_auto_post.main import main
result = main(encoded_message='${encodedMessage}'${imageData ? `, image_path='${imageData}'` : ''})
print('SUCCESS' if result else 'FAILED')
"`;

    console.log('Twitter投稿処理を開始:', { message: message.substring(0, 100) });
    
    const { stdout, stderr } = await execAsync(command, {
      timeout: 300000, // 5分のタイムアウト
      env: { ...process.env }
    });

    // 一時画像ファイルを削除
    if (imageData && fs.existsSync(imageData)) {
      fs.unlinkSync(imageData);
    }

    const success = stdout.trim().includes('SUCCESS');
    
    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Twitter投稿が完了しました',
        details: {
          final_result: true,
          timestamp: new Date().toISOString(),
          summary: {
            total_errors: 0,
            total_warnings: 0,
            total_success_steps: 1
          }
        }
      });
    } else {
      throw new Error(stderr || 'Python script failed');
    }

  } catch (error) {
    console.error('Twitter投稿エラー:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Twitter投稿に失敗しました',
        message: error instanceof Error ? error.message : '不明なエラー',
        details: {
          final_result: false,
          timestamp: new Date().toISOString(),
          errors: [{
            step: 'execution',
            message: error instanceof Error ? error.message : '不明なエラー',
            timestamp: new Date().toISOString(),
            type: 'error'
          }],
          summary: {
            total_errors: 1,
            total_warnings: 0,
            total_success_steps: 0
          }
        }
      },
      { status: 500 }
    );
  }
}