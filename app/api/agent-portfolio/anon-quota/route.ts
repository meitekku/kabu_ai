import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import {
  ANON_DAILY_LIMIT,
  checkAnonQuota,
  extractAnonIdentity,
} from '@/lib/quota/anonymous-quota';

// 匿名クオータの残回数を返す軽量エンドポイント。
// ログイン済みユーザーは触らない (この URL を踏んでも 200 で 0 回を返さない)。
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

  const result = await checkAnonQuota(identity);
  let remaining = ANON_DAILY_LIMIT;
  if (result.kind === 'ok') remaining = result.remaining;
  else if (result.kind === 'limit') remaining = 0;
  // burst の場合は表示上は今日の残数を別途数えたいが、簡略化のため
  // recheck しない (ユーザー側 UI は 10秒待てば回復する旨を表示する)
  if (result.kind === 'burst') {
    // 直近の利用は1回消費後の状態なので、もう一度数える代わりに -1 を返す
    // (UI 上は "あと N 回" 表示なのでズレは小さく、突破ではない)
    remaining = Math.max(0, ANON_DAILY_LIMIT - 1);
  }

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
