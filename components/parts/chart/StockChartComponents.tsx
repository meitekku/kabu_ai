import React from 'react';
import { ExtendedChartData } from './types/StockChartTypes';
import { formatNumber } from './StockChartUtils';

/* --------------------------------------------------
 * 日付フォーマット関数
 * -------------------------------------------------- */
export const formatDate = (date: Date | string): string => {
  const d = new Date(date);
  if (process.env.NODE_ENV === 'development') {
    const jpDate = new Date(d.getTime() + (9 * 60 * 60 * 1000));
    return jpDate.toISOString().split('T')[0];
  }
  return d.toISOString().split('T')[0];
};

/* --------------------------------------------------
 * 株価情報表示コンポーネント
 * -------------------------------------------------- */
export const PriceInfo: React.FC<{
  data: ExtendedChartData[];
  hoveredData: ExtendedChartData | null;
}> = ({ data, hoveredData }) => {
  const displayData = hoveredData || (data.length > 0 ? data[data.length - 1] : null);
  
  if (!displayData) return null;

  return (
    <div className="flex justify-between items-center px-2 bg-gray-100 rounded-lg text-sm font-mono">
      <div className="flex gap-1">
        <span>始値: {formatNumber(displayData.open)}</span>
        <span>高値: {formatNumber(displayData.high)}</span>
        <span>安値: {formatNumber(displayData.low)}</span>
        <span>終値: {formatNumber(displayData.close)}</span>
      </div>
      <div>{displayData.date}</div>
    </div>
  );
}; 