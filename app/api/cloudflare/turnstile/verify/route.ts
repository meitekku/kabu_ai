import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import {
  isTurnstileEnabled,
  TURNSTILE_COOKIE_MAX_AGE_SECONDS,
  TURNSTILE_COOKIE_NAME,
} from '@/lib/security/turnstile';

interface VerifyRequestBody {
  token?: unknown;
  expectedAction?: unknown;
}

interface TurnstileVerifyResponse {
  success: boolean;
  action?: string;
  ['error-codes']?: string[];
}

function getClientIp(headersList: Headers): string | null {
  const forwardedFor = headersList.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const cfConnectingIp = headersList.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  const realIp = headersList.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  return null;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const enabled = isTurnstileEnabled();

  // 開発環境などで未設定の場合はバイパス
  if (!enabled) {
    const bypassResponse = NextResponse.json({ success: true, enabled: false, verified: true });
    bypassResponse.headers.set('Cache-Control', 'no-store');
    return bypassResponse;
  }

  const secretKey = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json(
      { success: false, enabled: true, verified: false, error: 'Turnstile secret key is not configured' },
      { status: 500 }
    );
  }

  let body: VerifyRequestBody;
  try {
    body = (await request.json()) as VerifyRequestBody;
  } catch {
    return NextResponse.json(
      { success: false, enabled: true, verified: false, error: '不正なリクエスト形式です。' },
      { status: 400 }
    );
  }

  const token = typeof body.token === 'string' ? body.token.trim() : '';
  if (!token) {
    return NextResponse.json(
      { success: false, enabled: true, verified: false, error: '認証トークンが不足しています。' },
      { status: 400 }
    );
  }

  const expectedAction =
    typeof body.expectedAction === 'string' ? body.expectedAction.trim() : '';

  try {
    const formData = new URLSearchParams();
    formData.set('secret', secretKey);
    formData.set('response', token);

    const headersList = await headers();
    const clientIp = getClientIp(headersList);
    if (clientIp) {
      formData.set('remoteip', clientIp);
    }

    const verifyResponse = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
        cache: 'no-store',
      }
    );

    if (!verifyResponse.ok) {
      throw new Error(`Cloudflare verify endpoint returned ${verifyResponse.status}`);
    }

    const verifyData = (await verifyResponse.json()) as TurnstileVerifyResponse;
    const actionMatched = !expectedAction || verifyData.action === expectedAction;

    if (!verifyData.success || !actionMatched) {
      return NextResponse.json(
        {
          success: false,
          enabled: true,
          verified: false,
          error: actionMatched
            ? 'Cloudflare認証に失敗しました。再度お試しください。'
            : 'Cloudflare認証アクションが一致しませんでした。',
          errorCodes: verifyData['error-codes'] ?? [],
        },
        { status: 403 }
      );
    }

    const response = NextResponse.json({ success: true, enabled: true, verified: true });
    response.cookies.set(TURNSTILE_COOKIE_NAME, '1', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: TURNSTILE_COOKIE_MAX_AGE_SECONDS,
    });
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch (error) {
    console.error('Cloudflare turnstile verification failed:', error);
    return NextResponse.json(
      {
        success: false,
        enabled: true,
        verified: false,
        error: 'Cloudflare認証の検証に失敗しました。時間をおいて再試行してください。',
      },
      { status: 502 }
    );
  }
}
