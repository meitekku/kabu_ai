"use client";

import { useCallback, useEffect, useState } from 'react';

interface TurnstileStatusResponse {
  enabled?: unknown;
  verified?: unknown;
}

interface TurnstileVerifyResponse extends TurnstileStatusResponse {
  success?: unknown;
  error?: unknown;
}

type TurnstileStatus = {
  enabled: boolean;
  verified: boolean;
};

const DEFAULT_STATUS: TurnstileStatus = {
  enabled: true,
  verified: false,
};

export function useCloudflareTurnstile() {
  const [status, setStatus] = useState<TurnstileStatus>(DEFAULT_STATUS);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshStatus = useCallback(async (): Promise<TurnstileStatus> => {
    try {
      const response = await fetch('/api/cloudflare/turnstile/status', {
        method: 'GET',
        cache: 'no-store',
      });
      if (!response.ok) {
        throw new Error(`Status request failed (${response.status})`);
      }

      const data = (await response.json()) as TurnstileStatusResponse;
      const enabled = data.enabled !== false;
      const verified = data.verified === true || !enabled;
      const nextStatus = { enabled, verified };

      setStatus(nextStatus);
      setError(null);
      return nextStatus;
    } catch (err) {
      const nextStatus = DEFAULT_STATUS;
      setStatus(nextStatus);
      setError(err instanceof Error ? err.message : 'Cloudflare認証状態の取得に失敗しました。');
      return nextStatus;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const verifyToken = useCallback(
    async (token: string, expectedAction = 'ai-feature-access'): Promise<boolean> => {
      const trimmedToken = token.trim();
      if (!trimmedToken) {
        setError('認証トークンを取得できませんでした。');
        return false;
      }

      setIsVerifying(true);
      try {
        const response = await fetch('/api/cloudflare/turnstile/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: trimmedToken, expectedAction }),
        });

        const data = (await response.json().catch(() => ({}))) as TurnstileVerifyResponse;
        const enabled = data.enabled !== false;
        const verified = data.verified === true || !enabled;

        setStatus({ enabled, verified });

        if (!response.ok || data.success === false || !verified) {
          const message =
            typeof data.error === 'string' && data.error.trim()
              ? data.error
              : 'Cloudflare認証に失敗しました。';
          setError(message);
          return false;
        }

        setError(null);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Cloudflare認証の検証に失敗しました。');
        return false;
      } finally {
        setIsVerifying(false);
      }
    },
    []
  );

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  return {
    enabled: status.enabled,
    verified: status.verified,
    requiresVerification: status.enabled && !status.verified,
    isLoading,
    isVerifying,
    error,
    refreshStatus,
    verifyToken,
  };
}
