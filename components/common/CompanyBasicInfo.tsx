import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';

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
        const response = await fetch(`/api/${code}/company_info`, {
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

  if (loading) return <div>Loading...</div>;
  if (!info) return null;

  const formatNumber = (value: string | null | undefined, decimals: number = 2, suffix: string = '') => {
    if (value === null || value === undefined || value === '') {
      return '-';
    }
    const num = parseFloat(value);
    if (isNaN(num)) return '-';
    return `${num.toFixed(decimals)}${suffix}`;
  };

  const formatMarketCap = (value: number | null | undefined) => {
    if (value === null || value === undefined || typeof value !== 'number' || isNaN(value)) {
      return '-';
    }
    return `${(value / 100000000).toFixed(0)}億円`;
  };

  const getMarketName = (market: number) => {
    switch (market) {
      case 1:
        return '東証P';
      default:
        return '市場不明';
    }
  };

  const calculatePriceChangePercent = () => {
    const currentPrice = parseFloat(info.current_price);
    const priceChange = parseFloat(info.price_change);
    if (isNaN(currentPrice) || isNaN(priceChange)) return 0;
    return (priceChange / (currentPrice - priceChange)) * 100;
  };

  const formatPrice = (value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return '-';
    return num.toLocaleString(undefined, { maximumFractionDigits: 0 });
  };

  return (
    <Card className="w-full bg-white">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="text-gray-500">{code}</div>
            <div className="text-lg font-bold">{info.name}</div>
          </div>
          <div className="text-sm text-gray-600">
            {getMarketName(info.market)}
          </div>
        </div>

        <div className="flex items-baseline space-x-4 mb-4">
          <div className="text-2xl font-bold">
            {formatPrice(info.current_price)}円
          </div>
          <div className={`text-lg ${parseFloat(info.price_change) >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
            {parseFloat(info.price_change) >= 0 ? '+' : ''}{formatPrice(info.price_change)} 
            ({formatNumber(calculatePriceChangePercent().toString(), 2, '%')})
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-gray-600">PER</div>
            <div>{formatNumber(info.forward_pe, 2, '倍')}</div>
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
            <div>{formatMarketCap(info.market_cap)}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CompanyBasicInfo;