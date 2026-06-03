import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { isTurnstileEnabled, TURNSTILE_COOKIE_NAME } from '@/lib/security/turnstile';
import { verifyTurnstileCookie } from '@/lib/security/turnstile-cookie';

export async function GET(): Promise<NextResponse> {
  const enabled = isTurnstileEnabled();
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(TURNSTILE_COOKIE_NAME)?.value;
  const verified = !enabled || verifyTurnstileCookie(cookieValue);

  const response = NextResponse.json({ enabled, verified });
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
