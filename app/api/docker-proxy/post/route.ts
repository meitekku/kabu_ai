import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    
    let dockerBody;
    let dockerHeaders: Record<string, string> = {
      'Accept': 'application/json',
    };

    if (contentType.includes('multipart/form-data')) {
      // FormDataの場合はそのまま転送（Content-Typeは自動設定される）
      dockerBody = await request.formData();
      // multipart/form-dataの場合、boundary情報を含むヘッダーが必要なため自動設定に任せる
    } else {
      // JSONの場合 - テキストではなくJSONオブジェクトを確実に送信
      const jsonData = await request.json();
      dockerBody = JSON.stringify(jsonData);
      dockerHeaders['Content-Type'] = 'application/json';
    }

    // DockerのAPIエンドポイントにプロキシ
    const dockerResponse = await fetch('http://localhost:5000/post', {
      method: 'POST',
      headers: dockerHeaders,
      body: dockerBody,
      // タイムアウトを300秒に設定（Twitter投稿処理は最大5分かかる可能性があるため）
      signal: AbortSignal.timeout(300000),
    });

    if (!dockerResponse.ok) {
      const errorText = await dockerResponse.text();
      throw new Error(`Docker API responded with status: ${dockerResponse.status}, body: ${errorText}`);
    }

    const data = await dockerResponse.json();
    
    return NextResponse.json(data, { 
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });

  } catch (error) {
    console.error('Docker proxy post error:', error);
    
    if (error instanceof Error && error.name === 'TimeoutError') {
      return NextResponse.json(
        { 
          success: false,
          error: 'Post timeout',
          message: 'Tweet posting process timed out after 300 seconds'
        },
        { 
          status: 504,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST',
            'Access-Control-Allow-Headers': 'Content-Type',
          }
        }
      );
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Docker service error',
        message: error instanceof Error ? error.message : 'Unknown error',
        troubleshooting: {
          'common_causes': [
            'Twitter authentication requires phone/email verification',
            'Docker container may be restarting',
            'Network connectivity issues'
          ],
          'next_steps': [
            'Check Docker container logs: docker logs twitter-auto-post-secure',
            'Verify Twitter account settings',
            'Restart Docker service if needed'
          ]
        }
      },
      { 
        status: 503,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      }
    );
  }
}

// OPTIONSリクエストの対応
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept',
    },
  });
}