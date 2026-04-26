"use client";

import { useCallback, useEffect, useState } from "react";

export interface AgentQuotaState {
  remaining: number;
  total: number;
  isUnlimited: boolean;
  resetAt: string | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

const DEFAULT_TOTAL = 3;

interface QuotaApiResponse {
  remaining?: number;
  total?: number;
  isUnlimited?: boolean;
  resetAt?: string | null;
}

export function useAgentQuota(): AgentQuotaState {
  const [remaining, setRemaining] = useState(DEFAULT_TOTAL);
  const [total, setTotal] = useState(DEFAULT_TOTAL);
  const [isUnlimited, setIsUnlimited] = useState(false);
  const [resetAt, setResetAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuota = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch("/api/agent-portfolio/quota", { cache: "no-store" });
      if (res.status === 401) {
        // unauthenticated — treat as 0 quota; UI shows login prompt
        setRemaining(0);
        setTotal(DEFAULT_TOTAL);
        setIsUnlimited(false);
        setResetAt(null);
        return;
      }
      if (!res.ok) {
        throw new Error(`quota fetch failed: ${res.status}`);
      }
      const data = (await res.json()) as QuotaApiResponse;
      const unlimited = !!data.isUnlimited;
      const apiTotal = typeof data.total === "number" ? data.total : DEFAULT_TOTAL;
      // WHY: backend returns remaining=-1 for unlimited; show full bar instead
      const apiRemaining = typeof data.remaining === "number" ? data.remaining : DEFAULT_TOTAL;
      setIsUnlimited(unlimited);
      setTotal(apiTotal);
      setRemaining(unlimited ? apiTotal : Math.max(0, apiRemaining));
      setResetAt(data.resetAt ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "quota fetch error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuota();
  }, [fetchQuota]);

  return {
    remaining,
    total,
    isUnlimited,
    resetAt,
    isLoading,
    error,
    refetch: fetchQuota,
  };
}
