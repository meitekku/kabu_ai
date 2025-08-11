import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Docker機能は無効化され、ローカルSeleniumを使用
    return NextResponse.json({
      status: 'healthy',
      service: 'local-selenium',
      message: 'ローカルSelenium環境で稼働中（Docker機能は無効）',
      timestamp: new Date().toISOString(),
      mode: 'local'
    }, { 
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });

  } catch (error) {
    console.error('Health check error:', error);
    
    return NextResponse.json(
      { 
        status: 'healthy',
        service: 'local-selenium',
        message: 'ローカルSelenium環境で稼働中',
        mode: 'local',
        note: 'Docker機能は無効化されています'
      },
      { 
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      }
    );
  }
}