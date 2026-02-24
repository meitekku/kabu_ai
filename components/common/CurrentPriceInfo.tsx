import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

const isJPMarketHours = (): boolean => {
  const now = new Date();
  const jst = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
  const day = jst.getDay();
  if (day === 0 || day === 6) return false;
  const minutes = jst.getHours() * 60 + jst.getMinutes();
  return (minutes >= 540 && minutes <= 690) || (minutes >= 750 && minutes <= 930);
};

interface CurrentPriceInfoProps {
  code: string;
  initialData?: CompanyData | null;
  suspendFetch?: boolean;
  isDark?: boolean;
}

export interface CompanyData {
  code: string;
  name: string;
  current_price: number | null;
  price_change: number | null;
  diff_percent: number | null;
  price_updated_at: string | null;
}

export const CurrentPriceInfoSkeleton = ({ isDark = false }: { isDark?: boolean }) => (
  <div className="flex items-center space-x-4 p-2">
    <div className="animate-pulse flex items-center space-x-4">
      <div className={`h-4 rounded w-16 ${isDark ? 'bg-slate-800' : 'bg-gray-200'}`}></div>
      <div className={`h-4 rounded w-14 ${isDark ? 'bg-slate-800' : 'bg-gray-200'}`}></div>
      <div className={`h-4 rounded w-12 ${isDark ? 'bg-slate-800' : 'bg-gray-200'}`}></div>
    </div>
  </div>
);

export const CurrentPriceInfo: React.FC<CurrentPriceInfoProps> = ({ code, initialData, suspendFetch = false, isDark = false }) => {
  const [data, setData] = useState<CompanyData | null>(initialData ?? null);
  const [loading, setLoading] = useState(initialData === undefined);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch(`/api/stocks/${code}/company_info`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      const result = await response.json();
      if (result.success && result.data.length > 0) {
        setData(result.data[0]);
      } else {
        setError('データが見つかりませんでした');
      }
    } catch {
      setError('データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    if (initialData !== undefined) {
      setData(initialData ?? null);
      setLoading(false);
      return;
    }

    if (suspendFetch) {
      setLoading(true);
      return;
    }

    void fetchData();
  }, [code, initialData, suspendFetch, fetchData]);

  useEffect(() => {
    if (initialData !== undefined || suspendFetch) return;
    if (!isJPMarketHours()) return;

    const interval = setInterval(() => {
      if (!isJPMarketHours()) return;
      fetchData();
    }, 60000);

    return () => clearInterval(interval);
  }, [fetchData, initialData, suspendFetch]);

  if (loading) {
    return <CurrentPriceInfoSkeleton isDark={isDark} />;
  }

  if (error) return <div className="text-red-500">{error}</div>;
  if (!data) return null;

  let isPriceUp = false;
  let priceColor = 'text-gray-500';

  if (data.diff_percent) {
    isPriceUp = data.diff_percent < 0;
    priceColor = isPriceUp ? 'text-blue-500' : 'text-red-500';
  }

  return (
    <Link href={`/stocks/${code}/news`} className={`flex items-center gap-2 px-3 py-1.5 rounded-md border transition-all cursor-pointer ${isDark ? 'border-slate-700 hover:bg-slate-800 hover:border-slate-600' : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm'}`}>
      <span className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>{data.name}</span>
      <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
        {data.current_price
          ? `${data.current_price.toLocaleString()}`
          : '---'}
      </span>
      {data.diff_percent ? (
        <span className={`${priceColor} text-xs font-medium`}>
          {data.diff_percent > 0 ? '+' : ''}{data.diff_percent}%
        </span>
      ) : (
        <span className="text-xs text-gray-400">-</span>
      )}
    </Link>
  );
};
