import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import {
  isTurnstileEnabled,
  TURNSTILE_COOKIE_MAX_AGE_SECONDS,
  TURNSTILE_COOKIE_NAME,
} from '@/lib/security/turnstile';
import {
  signTurnstileCookie,
  isCookieSigningAvailable,
} from '@/lib/security/turnstile-cookie';

interface VerifyRequestBody {
  token?: unknown;
  expectedAction?: unknown;
}

interface TurnstileVerifyResponse {
  success: boolean;
  action?: string;
  hostname?: string;
  ['error-codes']?: string[];
}

// CF-Connecting-IP のみ信頼する。X-Forwarded-For はクライアントが偽装可能で、
// オリジンが Cloudflare 配下なら CF-Connecting-IP の方が真実(=Cloudflare 提供値)。
function getTrustedClientIp(headersList: Headers): string | null {
  const cfConnectingIp = headersList.get('cf-connecting-ip');
  if (cfConnectingIp && cfConnectingIp.trim()) {
    return cfConnectingIp.trim();
  }
  return null;
}

// hostname 検証で許容するホスト名のリスト。
// Production の本番ドメインと、開発時の localhost を許容。
function expectedHostnames(): Set<string> {
  const set = new Set<string>(['kabu-ai.jp', 'localhost']);
  const additional = process.env.TURNSTILE_ALLOWED_HOSTNAMES;
  if (additional) {
    additional.split(',').forEach((h) => {
      const trimmed = h.trim();
      if (trimmed) set.add(trimmed);
    });
  }
  return set;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const enabled = isTurnstileEnabled();

  // 開発環境などで未設定の場合はバイパス
  if (!enabled) {
    const bypassResponse = NextResponse.json({
      success: true,
      enabled: false,
      verified: true,
    });
    bypassResponse.headers.set('Cache-Control', 'no-store');
    return bypassResponse;
  }

  const secretKey = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json(
      {
        success: false,
        enabled: true,
        verified: false,
        error: 'Turnstile secret key is not configured',
      },
      { status: 500 },
    );
  }

  let body: VerifyRequestBody;
  try {
    body = (await request.json()) as VerifyRequestBody;
  } catch {
    return NextResponse.json(
      {
        success: false,
        enabled: true,
        verified: false,
        error: '不正なリクエスト形式です。',
      },
      { status: 400 },
    );
  }

  const token = typeof body.token === 'string' ? body.token.trim() : '';
  if (!token) {
    return NextResponse.json(
      {
        success: false,
        enabled: true,
        verified: false,
        error: '認証トークンが不足しています。',
      },
      { status: 400 },
    );
  }

  const expectedAction =
    typeof body.expectedAction === 'string' ? body.expectedAction.trim() : '';

  try {
    const formData = new URLSearchParams();
    formData.set('secret', secretKey);
    formData.set('response', token);

    const headersList = await headers();
    const clientIp = getTrustedClientIp(headersList);
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
      },
    );

    if (!verifyResponse.ok) {
      throw new Error(
        `Cloudflare verify endpoint returned ${verifyResponse.status}`,
      );
    }

    const verifyData = (await verifyResponse.json()) as TurnstileVerifyResponse;
    const actionMatched = !expectedAction || verifyData.action === expectedAction;

    // hostname 検証(siteverify が返す widget 発行ホスト名と現行ドメインを照合)
    const hosts = expectedHostnames();
    const hostnameMatched =
      !verifyData.hostname || hosts.has(verifyData.hostname);

    if (!verifyData.success || !actionMatched || !hostnameMatched) {
      const reason = !actionMatched
        ? 'Cloudflare認証アクションが一致しませんでした。'
        : !hostnameMatched
          ? 'Cloudflare認証のホスト名が一致しませんでした。'
          : 'Cloudflare認証に失敗しました。再度お試しください。';
      return NextResponse.json(
        {
          success: false,
          enabled: true,
          verified: false,
          error: reason,
          errorCodes: verifyData['error-codes'] ?? [],
        },
        { status: 403 },
      );
    }

    // 検証成功 → 署名付き cookie を発行。secret 未設定時のフォールバックで
    // 平文 "1" を吐くのは安全側の判断としてあえて拒否する。
    if (!isCookieSigningAvailable()) {
      return NextResponse.json(
        {
          success: false,
          enabled: true,
          verified: false,
          error: 'サーバー側の cookie 署名鍵が未設定です。',
        },
        { status: 500 },
      );
    }
    const signed = signTurnstileCookie();
    if (!signed) {
      return NextResponse.json(
        {
          success: false,
          enabled: true,
          verified: false,
          error: 'cookie 署名に失敗しました。',
        },
        { status: 500 },
      );
    }

    const response = NextResponse.json({
      success: true,
      enabled: true,
      verified: true,
    });
    response.cookies.set(TURNSTILE_COOKIE_NAME, signed, {
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
        error:
          'Cloudflare認証の検証に失敗しました。時間をおいて再試行してください。',
      },
      { status: 502 },
    );
  }
}
