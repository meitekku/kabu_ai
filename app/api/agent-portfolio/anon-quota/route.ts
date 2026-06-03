import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import {
  ANON_DAILY_LIMIT,
  extractAnonIdentity,
  peekAnonQuota,
} from '@/lib/quota/anonymous-quota';

// 匿名クオータの残回数を返す軽量エンドポイント(参照のみ・書き込みなし)。
// ログイン済みユーザーは触らない。
export async function GET(): Promise<NextResponse> {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  if (session?.user?.id) {
    return NextResponse.json(
      { authenticated: true, limit: ANON_DAILY_LIMIT, remaining: ANON_DAILY_LIMIT },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const identity = extractAnonIdentity(headersList);
  if (!identity.cfConnectingIp) {
    return NextResponse.json(
      {
        authenticated: false,
        limit: ANON_DAILY_LIMIT,
        remaining: ANON_DAILY_LIMIT,
        cfRequired: true,
      },
      { status: 200, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const result = await peekAnonQuota(identity);
  const remaining =
    result.kind === 'ok' ? result.remaining : 0;

  return NextResponse.json(
    {
      authenticated: false,
      limit: ANON_DAILY_LIMIT,
      remaining,
      cfRequired: false,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
