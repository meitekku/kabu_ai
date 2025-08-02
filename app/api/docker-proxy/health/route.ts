import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // DockerのAPIエンドポイントにプロキシ
    const dockerResponse = await fetch('http://localhost:5000/health', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!dockerResponse.ok) {
      throw new Error(`Docker API responded with status: ${dockerResponse.status}`);
    }

    const data = await dockerResponse.json();
    
    return NextResponse.json(data, { 
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });

  } catch (error) {
    console.error('Docker proxy health check error:', error);
    
    return NextResponse.json(
      { 
        error: 'Docker service unavailable',
        message: error instanceof Error ? error.message : 'Unknown error',
        status: 'unhealthy'
      },
      { 
        status: 503,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      }
    );
  }
}