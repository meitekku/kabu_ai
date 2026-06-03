export const TURNSTILE_COOKIE_NAME = 'cf_turnstile_verified';
export const TURNSTILE_COOKIE_MAX_AGE_SECONDS = 60 * 30;

export function isTurnstileEnabled(): boolean {
  return Boolean(
    process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY &&
      process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY
  );
}
