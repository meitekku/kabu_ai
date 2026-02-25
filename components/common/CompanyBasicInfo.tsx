import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { CompanyBasicInfoSkeleton } from '@/components/stocks/news/NewsPageSkeleton';

const isJPMarketHours = (): boolean => {
  const now = new Date();
  const jst = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
  const day = jst.getDay();
  if (day === 0 || day === 6) return false;
  const minutes = jst.getHours() * 60 + jst.getMinutes();
  return (minutes >= 540 && minutes <= 690) || (minutes >= 750 && minutes <= 930);
};

const getRelativeTime = (dateStr: string | null): string | null => {
  if (!dateStr) return null;
  const updated = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - updated.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return '更新済み';
  if (diffMin < 60) return `${diffMin}分前に更新`;
  return `${Math.floor(diffMin / 60)}時間前に更新`;
};

interface CompanyInfo {
  code: string;
  name: string;
  market: number;
  industry: string;
  forward_pe: string;
  trailing_pe: string;
  price_to_book: string;
  market_cap: number;
  current_price: string;
  price_change: string;
  diff_percent: string | null;
  dividend_yield: string;
  price_updated_at: string | null;
}

const CompanyBasicInfo = ({ code }: { code: string }) => {
  const [info, setInfo] = useState<CompanyInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCompanyInfo = useCallback(async () => {
    try {
      const response = await fetch(`/api/stocks/${code}/company_info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await response.json();
      if (data.success && data.data?.[0]) {
        setInfo(data.data[0]);
      }
    } catch (error) {
      console.error('Error fetching company info:', error);
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    fetchCompanyInfo();
  }, [fetchCompanyInfo]);

  useEffect(() => {
    if (!isJPMarketHours()) return;

    const interval = setInterval(() => {
      if (!isJPMarketHours()) return;
      fetchCompanyInfo();
    }, 60000);

    return () => clearInterval(interval);
  }, [fetchCompanyInfo]);

  if (loading) {
    return <CompanyBasicInfoSkeleton />;
  }

  if (!info) return null;

  /**
   * 数値文字列を適度に整形する汎用関数
   * @param value 数値文字列
   * @param decimals 小数点桁数
   * @param suffix 後ろにつける文字列(例: '倍', '%')
   */
  const formatNumber = (
    value: string | null | undefined,
    decimals: number = 2,
    suffix: string = ''
  ): string => {
    if (value == null || value === '') return '-';
    const num = parseFloat(value);
    if (isNaN(num)) return '-';
    return `${num.toFixed(decimals)}${suffix}`;
  };

  /**
   * 時価総額を「○兆○○○○億円」の形で表示（兆に満たない場合は億など）
   *  - 1兆 = 1e12
   *  - 1億 = 1e8
   *  - 1万 = 1e4
   */
  const formatMarketCap = (value: number | null | undefined): string => {
    if (value == null || isNaN(value)) {
      return '-';
    }

    // 1) 1兆円以上 → 「○兆○○○○億円」
    if (value >= 1e12) {
      const cho = Math.floor(value / 1e12);          // 兆の部分
      const remainder = Math.floor((value % 1e12) / 1e8);  // 残りを億単位に
      // remainder が 0 でなければ「○兆○○○○億円」、0 なら「○兆円」
      return remainder > 0 ? `${cho}兆${remainder}億円` : `${cho}兆円`;
    }
    // 2) 1兆未満かつ1億以上 → 「○億円」
    else if (value >= 1e8) {
      return `${Math.floor(value / 1e8)}億円`;
    }
    // 3) 1億未満かつ1万以上 → 「○万円」
    else if (value >= 1e4) {
      return `${Math.floor(value / 1e4)}万円`;
    }
    // 4) 1万未満 → 「○円」
    else {
      return `${value}円`;
    }
  };

  /**
   * 市場名を返す例
   */
  const getMarketName = (market: number) => {
    switch (market) {
      case 1:
        return '東証P';
      case 2: return '東証S';
      case 3: return '東証G';
      case 11: return 'ETF';
      case 12: return '指数';
      case 100: return 'US';
      default:
        return '市場不明';
    }
  };

  /**
   * 値上がり幅のパーセンテージを計算
   * diff_percentがDBにあればそれを優先、なければprice_changeから計算
   */
  const calculatePriceChangePercent = () => {
    if (info.diff_percent != null && info.diff_percent !== '') {
      const dp = parseFloat(info.diff_percent);
      if (!isNaN(dp)) return dp;
    }
    const currentPrice = parseFloat(info.current_price);
    const priceChange = parseFloat(info.price_change);
    if (isNaN(currentPrice) || isNaN(priceChange)) return 0;
    return (priceChange / (currentPrice - priceChange)) * 100;
  };

  /**
   * 株価などを 1,234 形式に整形する関数
   */
  const formatPrice = (value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return '-';
    return num.toLocaleString(undefined, { maximumFractionDigits: 0 });
  };

  const formatMarketCapUS = (value: number | null | undefined): string => {
    if (value == null || isNaN(value)) return '-';
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    return `$${value.toLocaleString()}`;
  };

  // market=100(US株) or market=12かつUSD建て指数(NYダウ=1, S&P500=2)
  const isUS = info.market === 100 || (info.market === 12 && ['1', '2'].includes(info.code));

  return (
    <div data-testid="company-basic-info" className="w-full bg-white px-2 animate-in fade-in duration-200">
      {/* 企業コード + 企業名 + 市場名 */}
      <div className="flex items-center justify-between">
        <h1 className="flex items-center space-x-2">
          <div className="text-gray-500">{code}</div>
          <div className="text-lg font-bold">{info.name}</div>
        </h1>
        <div className="text-sm text-gray-600">{getMarketName(info.market)}</div>
      </div>

      {/* 現在株価と値幅の表示 */}
      <div className="flex items-baseline justify-between mt-1">
        <div className="flex items-baseline space-x-4">
          <div className="text-2xl font-bold">
            {isUS ? `$${formatPrice(info.current_price)}` : `${formatPrice(info.current_price)}円`}
          </div>
          <div
            className={`text-lg ${
              parseFloat(info.price_change) >= 0 ? 'text-red-500' : 'text-blue-500'
            }`}
          >
            {parseFloat(info.price_change) >= 0 ? '+' : ''}
            {isUS ? '$' : ''}{formatPrice(info.price_change)} (
            {formatNumber(calculatePriceChangePercent().toString(), 2, '%')})
          </div>
        </div>
        {!isUS && (info.trailing_pe || info.price_to_book) && (
          <Link href={`/stocks/${code}/valuation`} className="text-xs text-blue-500 hover:text-blue-700">
            バリュエーション分析 →
          </Link>
        )}
      </div>

      {isJPMarketHours() && (
        <div className="text-xs text-gray-400 mt-1">
          約5分ディレイ
          {info.price_updated_at && (
            <span> · {getRelativeTime(info.price_updated_at)}</span>
          )}
        </div>
      )}

      {/* 各種指標を4列で表示 */}
      <div className="grid grid-cols-4 text-sm mt-2">
        <div>
          <div className="text-gray-600">PER</div>
          <div>{formatNumber(info.trailing_pe, 2, '倍')}</div>
        </div>
        <div>
          <div className="text-gray-600">PBR</div>
          <div>{formatNumber(info.price_to_book, 2, '倍')}</div>
        </div>
        <div>
          <div className="text-gray-600">利回り</div>
          <div>{formatNumber(info.dividend_yield, 2, '%')}</div>
        </div>
        <div>
          <div className="text-gray-600">時価総額</div>
          <div>{isUS ? formatMarketCapUS(info.market_cap) : formatMarketCap(info.market_cap)}</div>
        </div>
      </div>
    </div>
  );
};

export default CompanyBasicInfo;
