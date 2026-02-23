'use client';

import { useState, useEffect, useCallback } from 'react';
import { Heart, Trash2, Plus, Loader2, Search, Crown, Clock, Star as StarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFavoritesAccess } from '@/hooks/useFavoritesAccess';
import { StarRating } from '@/components/favorites/StarRating';
import { FavoritesNewsReport } from '@/components/favorites/FavoritesNewsReport';
import { LineLinkSettings } from '@/components/favorites/LineLinkSettings';
import Link from 'next/link';

interface Favorite {
  id: number;
  code: string;
  importance: number | null;
  name: string | null;
  current_price: number | null;
  diff_percent: number | null;
}

interface SearchResult {
  code: string;
  name: string;
}

export default function FavoritesPageClient() {
  const { access, isAllowed, isLoading: accessLoading } = useFavoritesAccess();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addingCode, setAddingCode] = useState<string | null>(null);

  const fetchFavorites = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/favorites');
      if (res.ok) {
        const data = await res.json();
        setFavorites(data.favorites || []);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAllowed) {
      fetchFavorites();
    }
  }, [isAllowed, fetchFavorites]);

  useEffect(() => {
    if (!searchQuery || searchQuery.length < 1) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/common/all-company?q=${encodeURIComponent(searchQuery)}&limit=10`);
        if (res.ok) {
          const data = await res.json();
          const items = (data.companies || data || []) as SearchResult[];
          const existingCodes = new Set(favorites.map(f => f.code));
          setSearchResults(items.filter(item => !existingCodes.has(item.code)));
        }
      } catch {
        // ignore
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, favorites]);

  const addFavorite = async (code: string) => {
    setAddingCode(code);
    try {
      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      if (res.ok) {
        setSearchQuery('');
        setSearchResults([]);
        await fetchFavorites();
      }
    } catch {
      // ignore
    } finally {
      setAddingCode(null);
    }
  };

  const removeFavorite = async (code: string) => {
    try {
      const res = await fetch(`/api/favorites?code=${encodeURIComponent(code)}`, { method: 'DELETE' });
      if (res.ok) {
        setFavorites(prev => prev.filter(f => f.code !== code));
      }
    } catch {
      // ignore
    }
  };

  const handleImportanceChange = (code: string, value: number | null) => {
    setFavorites(prev =>
      prev.map(f => f.code === code ? { ...f, importance: value } : f)
    );
  };

  if (accessLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!isAllowed) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <Heart className="w-16 h-16 mx-auto mb-6 text-gray-300" />
        <h1 className="text-2xl font-bold text-gray-900 mb-3">お気に入りニュース</h1>
        <p className="text-gray-600 mb-8">
          お気に入り銘柄のパーソナルAIニュースレポートを毎日お届けします。
        </p>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 mb-6">
          <Crown className="w-8 h-8 text-amber-500 mx-auto mb-3" />
          <p className="text-sm text-amber-800 font-medium mb-1">プレミアム機能</p>
          <p className="text-xs text-amber-700">
            {access?.reason === 'expired'
              ? 'トライアル期間が終了しました。プレミアム会員になると引き続きご利用いただけます。'
              : 'プレミアム会員になると、お気に入り銘柄のAIレポートを毎日受け取れます。登録後48時間は無料でお試しいただけます。'}
          </p>
        </div>
        <Link href="/premium">
          <Button className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white">
            プレミアムについて詳しく見る
          </Button>
        </Link>
      </div>
    );
  }

  const trialBanner = access?.reason === 'trial' && access.trialEndsAt ? (
    <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-50 border border-blue-200 mb-6">
      <Clock className="w-4 h-4 text-blue-500" />
      <span className="text-sm text-blue-700">
        トライアル期間中（{new Date(access.trialEndsAt).toLocaleString('ja-JP')}まで）
      </span>
    </div>
  ) : null;

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Heart className="w-6 h-6 text-red-500" />
        <h1 className="text-2xl font-bold text-gray-900">お気に入り銘柄</h1>
        <span className="text-sm text-gray-500">({favorites.length}/50)</span>
      </div>

      {trialBanner}

      {/* 銘柄追加 */}
      <div className="mb-6 relative">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-300 bg-white focus-within:border-orange-400 focus-within:ring-1 focus-within:ring-orange-400">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="銘柄コードまたは会社名で検索して追加..."
            className="flex-1 outline-none text-sm bg-transparent"
          />
        </div>
        {searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 max-h-60 overflow-y-auto">
            {searchResults.map((item) => (
              <button
                key={item.code}
                onClick={() => void addFavorite(item.code)}
                disabled={addingCode === item.code}
                className="flex items-center justify-between w-full px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors"
              >
                <span>
                  <span className="font-medium text-gray-900">{item.code}</span>
                  <span className="ml-2 text-gray-600">{item.name}</span>
                </span>
                {addingCode === item.code ? (
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                ) : (
                  <Plus className="w-4 h-4 text-orange-500" />
                )}
              </button>
            ))}
          </div>
        )}
        {isSearching && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 p-4 text-center">
            <Loader2 className="w-4 h-4 animate-spin text-gray-400 mx-auto" />
          </div>
        )}
      </div>

      {/* お気に入り一覧 */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : favorites.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <StarIcon className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="text-sm">お気に入り銘柄がありません</p>
          <p className="text-xs mt-1">上の検索バーから銘柄を追加してください</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          {favorites.map((fav) => (
            <div
              key={fav.code}
              className="flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 bg-white hover:border-gray-300 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <Link href={`/stocks/${fav.code}/news`} className="hover:underline">
                  <span className="text-sm font-semibold text-gray-900">{fav.code}</span>
                  <span className="ml-1.5 text-sm text-gray-600 truncate">{fav.name}</span>
                </Link>
                <div className="flex items-center gap-3 mt-1">
                  {fav.current_price != null && (
                    <span className="text-xs text-gray-500">
                      &yen;{fav.current_price.toLocaleString()}
                    </span>
                  )}
                  {fav.diff_percent != null && (
                    <span className={`text-xs font-medium ${
                      fav.diff_percent > 0 ? 'text-red-600' : fav.diff_percent < 0 ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      {fav.diff_percent > 0 ? '+' : ''}{fav.diff_percent.toFixed(2)}%
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 ml-2">
                <StarRating
                  code={fav.code}
                  value={fav.importance}
                  onChange={(val) => handleImportanceChange(fav.code, val)}
                />
                <button
                  onClick={() => void removeFavorite(fav.code)}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  title="削除"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AIレポート */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4">本日のAIレポート</h2>
        <FavoritesNewsReport date={today} />
      </div>

      {/* LINE連携 */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4">通知設定</h2>
        <LineLinkSettings />
      </div>
    </div>
  );
}
