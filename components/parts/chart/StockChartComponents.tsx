import React from 'react';
import { ExtendedChartData } from './types/StockChartTypes';
import { formatNumber } from './StockChartUtils';

// windowオブジェクトを拡張する型定義
declare global {
  interface Window {
    _formatDateLogCount?: number;
  }
}

/* --------------------------------------------------
 * 日付フォーマット関数
 * -------------------------------------------------- */
export const formatDate = (date: Date | string): string => {
  const d = new Date(date);
  const originalDateStr = typeof date === 'string' ? date : date.toISOString();
  let result: string;
  
  if (process.env.NODE_ENV === 'development') {
    const jpDate = new Date(d.getTime() + (9 * 60 * 60 * 1000));
    result = jpDate.toISOString().split('T')[0];
  } else {
    result = d.toISOString().split('T')[0];
  }
  
  // デバッグログ（最初の数回のみ）
  if (typeof window !== 'undefined' && !window._formatDateLogCount) {
    window._formatDateLogCount = 0;
  }
  if (typeof window !== 'undefined' && window._formatDateLogCount !== undefined && window._formatDateLogCount < 5) {
    console.log(`formatDate: 入力=${originalDateStr} → 出力=${result} (開発環境=${process.env.NODE_ENV === 'development'})`);
    window._formatDateLogCount++;
  }
  
  return result;
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