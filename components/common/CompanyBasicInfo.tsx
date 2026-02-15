import React, { useState, useEffect } from 'react';
import Link from 'next/link';

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
  dividend_yield: string;
}

const CompanyBasicInfo = ({ code }: { code: string }) => {
  const [info, setInfo] = useState<CompanyInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompanyInfo = async () => {
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
    };

    fetchCompanyInfo();
  }, [code]);

  if (loading) {
    return (
      <div className="w-full bg-white px-2 min-h-[90px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-gray-600"></div>
      </div>
    );
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
      case 100: return 'US';
      default:
        return '市場不明';
    }
  };

  /**
   * 値上がり幅のパーセンテージを計算
   */
  const calculatePriceChangePercent = () => {
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

  const isUS = info.market === 100;

  return (
    <div className="w-full bg-white px-2">
      {/* 企業コード + 企業名 + 市場名 */}
      <div className="flex items-center justify-between">
        <h1 className="flex items-center space-x-2">
          <div className="text-gray-500">{code}</div>
          <div className="text-lg font-bold">{info.name}</div>
        </h1>
        <div className="text-sm text-gray-600">{getMarketName(info.market)}</div>
      </div>

      {/* 現在株価と値幅の表示 */}
      <div className="flex items-baseline space-x-4 mt-1">
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
      {!isUS && (
        <Link href={`/stocks/${code}/valuation`} className="text-xs text-blue-500 hover:text-blue-700 mt-1 inline-block">
          バリュエーション分析 →
        </Link>
      )}
    </div>
  );
};

export default CompanyBasicInfo;