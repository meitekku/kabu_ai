// Turnstile 認証通過 cookie の署名/検証ヘルパー。
// 旧実装は cookie 値 "1" を直接書いていたため、curl から自由に偽装できた。
// 本実装は HMAC-SHA256(secret, expUnixSec) で署名し、cookie 値を
// `<expUnixSec>.<sigHex>` 形式にする。検証時は exp 期限切れと署名一致を両方確認。

import { createHmac, timingSafeEqual } from 'crypto';

export const TURNSTILE_TOKEN_TTL_SECONDS = 60 * 30; // 30分

export interface SignedTurnstileToken {
  exp: number; // unix sec
  signature: string; // hex
}

function getSecret(): string | null {
  // 専用の secret を優先し、未設定なら ANON_QUOTA_SALT にフォールバック。
  // 本番では明示的に TURNSTILE_COOKIE_SECRET を設定することを推奨。
  const dedicated = process.env.TURNSTILE_COOKIE_SECRET;
  if (dedicated && dedicated.length >= 16) return dedicated;
  const fallback = process.env.ANON_QUOTA_SALT;
  if (fallback && fallback.length >= 16) return fallback;
  return null;
}

export function isCookieSigningAvailable(): boolean {
  return getSecret() !== null;
}

function hmacHex(secret: string, message: string): string {
  return createHmac('sha256', secret).update(message).digest('hex');
}

export function signTurnstileCookie(now: Date = new Date()): string | null {
  const secret = getSecret();
  if (!secret) return null;
  const exp = Math.floor(now.getTime() / 1000) + TURNSTILE_TOKEN_TTL_SECONDS;
  const sig = hmacHex(secret, String(exp));
  return `${exp}.${sig}`;
}

// 戻り値:
//   true  : 署名が一致し、有効期限内
//   false : 不正な形式 / 署名不一致 / 期限切れ / secret 未設定
export function verifyTurnstileCookie(
  value: string | undefined | null,
  now: Date = new Date(),
): boolean {
  if (!value || typeof value !== 'string') return false;
  const secret = getSecret();
  if (!secret) return false;

  const dot = value.indexOf('.');
  if (dot <= 0 || dot === value.length - 1) return false;
  const expStr = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  if (!/^\d+$/.test(expStr)) return false;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp <= 0) return false;

  const expected = hmacHex(secret, String(exp));
  // 長さが一致しないと timingSafeEqual が例外。先に判定する。
  if (sig.length !== expected.length) return false;
  let sigBuf: Buffer;
  let expBuf: Buffer;
  try {
    sigBuf = Buffer.from(sig, 'hex');
    expBuf = Buffer.from(expected, 'hex');
  } catch {
    return false;
  }
  if (sigBuf.length !== expBuf.length) return false;
  if (!timingSafeEqual(sigBuf, expBuf)) return false;

  const nowSec = Math.floor(now.getTime() / 1000);
  if (exp <= nowSec) return false;
  return true;
}
