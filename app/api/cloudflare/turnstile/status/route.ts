import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { isTurnstileEnabled, TURNSTILE_COOKIE_NAME } from '@/lib/security/turnstile';

export async function GET(): Promise<NextResponse> {
  const enabled = isTurnstileEnabled();
  const cookieStore = await cookies();
  const verified = !enabled || cookieStore.get(TURNSTILE_COOKIE_NAME)?.value === '1';

  const response = NextResponse.json({ enabled, verified });
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
