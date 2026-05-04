import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  isCookieSigningAvailable,
  signTurnstileCookie,
  verifyTurnstileCookie,
} from '@/lib/security/turnstile-cookie';

describe('turnstile-cookie HMAC 署名', () => {
  const ORIG_COOKIE_SECRET = process.env.TURNSTILE_COOKIE_SECRET;
  const ORIG_SALT = process.env.ANON_QUOTA_SALT;

  beforeEach(() => {
    process.env.TURNSTILE_COOKIE_SECRET = 'a-test-secret-32chars-ok-123456';
    delete process.env.ANON_QUOTA_SALT;
  });

  afterEach(() => {
    if (ORIG_COOKIE_SECRET === undefined) delete process.env.TURNSTILE_COOKIE_SECRET;
    else process.env.TURNSTILE_COOKIE_SECRET = ORIG_COOKIE_SECRET;
    if (ORIG_SALT === undefined) delete process.env.ANON_QUOTA_SALT;
    else process.env.ANON_QUOTA_SALT = ORIG_SALT;
  });

  it('isCookieSigningAvailable: secret あり → true', () => {
    expect(isCookieSigningAvailable()).toBe(true);
  });

  it('isCookieSigningAvailable: 両方空 → false', () => {
    delete process.env.TURNSTILE_COOKIE_SECRET;
    delete process.env.ANON_QUOTA_SALT;
    expect(isCookieSigningAvailable()).toBe(false);
  });

  it('TURNSTILE_COOKIE_SECRET 不在なら ANON_QUOTA_SALT にフォールバック', () => {
    delete process.env.TURNSTILE_COOKIE_SECRET;
    process.env.ANON_QUOTA_SALT = 'fallback-salt-32chars-aaaaaaaaaaa';
    expect(isCookieSigningAvailable()).toBe(true);
    const t = signTurnstileCookie();
    expect(t).toBeTruthy();
    expect(verifyTurnstileCookie(t!)).toBe(true);
  });

  it('短すぎる secret は無効扱い', () => {
    process.env.TURNSTILE_COOKIE_SECRET = 'short';
    delete process.env.ANON_QUOTA_SALT;
    expect(isCookieSigningAvailable()).toBe(false);
    expect(signTurnstileCookie()).toBeNull();
  });

  it('sign したトークンは verify で true', () => {
    const t = signTurnstileCookie();
    expect(t).toMatch(/^\d+\.[0-9a-f]+$/);
    expect(verifyTurnstileCookie(t!)).toBe(true);
  });

  it('値が "1" など固定値の偽装は false', () => {
    expect(verifyTurnstileCookie('1')).toBe(false);
    expect(verifyTurnstileCookie('verified')).toBe(false);
    expect(verifyTurnstileCookie('')).toBe(false);
    expect(verifyTurnstileCookie(null)).toBe(false);
    expect(verifyTurnstileCookie(undefined)).toBe(false);
  });

  it('exp は数値で署名一致が必要(中身を弄ったら false)', () => {
    const t = signTurnstileCookie()!;
    const [exp, sig] = t.split('.', 2);
    // 別の exp + 元の sig → 不一致
    const tampered = `${Number(exp) + 100}.${sig}`;
    expect(verifyTurnstileCookie(tampered)).toBe(false);
  });

  it('別 secret で sign したトークンは verify で false', () => {
    process.env.TURNSTILE_COOKIE_SECRET = 'secret-A-32chars-aaaaaaaaaaaaaaa';
    const t = signTurnstileCookie()!;
    process.env.TURNSTILE_COOKIE_SECRET = 'secret-B-32chars-bbbbbbbbbbbbbbb';
    expect(verifyTurnstileCookie(t)).toBe(false);
  });

  it('期限切れトークンは false', () => {
    const past = new Date('2020-01-01T00:00:00Z');
    const expired = signTurnstileCookie(past);
    expect(verifyTurnstileCookie(expired!, new Date())).toBe(false);
  });

  it('不正な形式は false', () => {
    expect(verifyTurnstileCookie('abc')).toBe(false);
    expect(verifyTurnstileCookie('abc.def')).toBe(false);
    expect(verifyTurnstileCookie('123.notHex')).toBe(false);
    expect(verifyTurnstileCookie('.abc')).toBe(false);
    expect(verifyTurnstileCookie('123.')).toBe(false);
  });

  it('sig 長が違うと false (timing-safe な比較で失敗)', () => {
    const t = signTurnstileCookie()!;
    const [exp] = t.split('.', 2);
    const shorterSig = '0'.repeat(20);
    expect(verifyTurnstileCookie(`${exp}.${shorterSig}`)).toBe(false);
  });
});
