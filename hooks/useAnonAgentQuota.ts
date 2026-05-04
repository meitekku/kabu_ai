"use client";

import { useCallback, useEffect, useState } from "react";

interface AnonQuotaResponse {
  authenticated?: boolean;
  remaining?: number;
  limit?: number;
  cfRequired?: boolean;
}

export interface AnonAgentQuotaState {
  remaining: number;
  limit: number;
  isLoading: boolean;
  cfRequired: boolean;
  refetch: () => Promise<void>;
}

const DEFAULT_LIMIT = 3;

export function useAnonAgentQuota(enabled: boolean): AnonAgentQuotaState {
  const [remaining, setRemaining] = useState(DEFAULT_LIMIT);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [isLoading, setIsLoading] = useState(false);
  const [cfRequired, setCfRequired] = useState(false);

  const refetch = useCallback(async () => {
    if (!enabled) {
      setRemaining(DEFAULT_LIMIT);
      setLimit(DEFAULT_LIMIT);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/agent-portfolio/anon-quota", {
        cache: "no-store",
      });
      if (!res.ok) {
        return;
      }
      const data = (await res.json()) as AnonQuotaResponse;
      setRemaining(typeof data.remaining === "number" ? data.remaining : DEFAULT_LIMIT);
      setLimit(typeof data.limit === "number" ? data.limit : DEFAULT_LIMIT);
      setCfRequired(!!data.cfRequired);
    } catch {
      // 取得失敗は楽観表示(送信時にサーバーが弾く)
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { remaining, limit, isLoading, cfRequired, refetch };
}
