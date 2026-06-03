"use client";

import { useState, useEffect, useCallback } from 'react';

interface FavoritesAccessInfo {
  allowed: boolean;
  reason: 'premium' | 'trial' | 'expired' | 'not_logged_in';
  trialEndsAt?: string;
}

export function useFavoritesAccess() {
  const [access, setAccess] = useState<FavoritesAccessInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAccess = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/favorites/access');
      const data = await response.json();
      setAccess(data);
    } catch {
      setAccess({ allowed: false, reason: 'not_logged_in' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccess();
  }, [fetchAccess]);

  return {
    access,
    isAllowed: access?.allowed ?? false,
    isLoading,
    refetch: fetchAccess,
  };
}
