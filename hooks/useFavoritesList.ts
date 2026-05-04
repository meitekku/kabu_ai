"use client";

import { useCallback, useEffect, useState } from "react";

export interface FavoriteItem {
  id: number;
  code: string;
  importance: number | null;
  created_at: string;
  name: string | null;
  current_price: number | null;
  diff_percent: number | null;
}

interface FavoritesResponse {
  favorites?: FavoriteItem[];
  error?: string;
}

export function useFavoritesList(enabled: boolean) {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!enabled) {
      setFavorites([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/favorites", {
        credentials: "include",
        cache: "no-store",
      });
      if (res.ok) {
        const json = (await res.json()) as FavoritesResponse;
        setFavorites(json.favorites ?? []);
      } else {
        setFavorites([]);
      }
    } catch {
      setFavorites([]);
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { favorites, isLoading, refetch };
}
