import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // DockerのAPIエンドポイントにプロキシ
    const dockerResponse = await fetch('http://localhost:5000/login', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      // タイムアウトを120秒に設定（Twitter認証は時間がかかる）
      signal: AbortSignal.timeout(120000),
    });

    if (!dockerResponse.ok) {
      throw new Error(`Docker API responded with status: ${dockerResponse.status}`);
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
    console.error('Docker proxy login error:', error);
    
    if (error instanceof Error && error.name === 'TimeoutError') {
      return NextResponse.json(
        { 
          success: false,
          error: 'Login timeout',
          message: 'Twitter login process timed out after 120 seconds'
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
        error: 'Docker service unavailable',
        message: error instanceof Error ? error.message : 'Unknown error'
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
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept',
    },
  });
}