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
  <div className="flex flex-col justify-center px-3 py-1.5 animate-pulse">
    <div className={`h-[10px] rounded w-14 mb-1.5 ${isDark ? 'bg-slate-800' : 'bg-secondary'}`}></div>
    <div className="flex items-center gap-1.5">
      <div className={`h-[13px] rounded w-16 ${isDark ? 'bg-slate-800' : 'bg-secondary'}`}></div>
      <div className={`h-[11px] rounded w-12 ${isDark ? 'bg-slate-800' : 'bg-secondary'}`}></div>
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

  if (error) return <div className="text-destructive">{error}</div>;
  if (!data) return null;

  let isPriceUp = false;
  let priceColor = 'text-muted-foreground';

  if (data.diff_percent) {
    isPriceUp = data.diff_percent > 0;
    priceColor = isPriceUp ? 'text-shikiho-positive' : 'text-shikiho-negative';
  }

  return (
    <Link
      href={`/stocks/${code}/news`}
      className={`flex flex-col justify-center px-3 py-1.5 rounded transition-all cursor-pointer ${isDark ? 'hover:bg-white/5' : 'hover:bg-card hover:shadow-card'}`}
    >
      <span className={`text-[10px] leading-none mb-1 ${isDark ? 'text-gray-500' : 'text-muted-foreground'}`}>
        {data.name}
      </span>
      <div className="flex items-center gap-1.5">
        <span className={`text-[13px] font-bold tabular-nums leading-none ${isDark ? 'text-gray-100' : 'text-foreground'}`}>
          {data.current_price ? data.current_price.toLocaleString() : '---'}
        </span>
        {data.diff_percent ? (
          <span className={`${priceColor} text-[11px] font-bold tabular-nums leading-none`}>
            {isPriceUp ? '▲' : '▼'}{Math.abs(data.diff_percent).toFixed(2)}%
          </span>
        ) : (
          <span className={`text-[11px] leading-none ${isDark ? 'text-gray-600' : 'text-muted-foreground'}`}>-</span>
        )}
      </div>
    </Link>
  );
};
