import React from 'react';
import { ExtendedChartData } from './types/StockChartTypes';

interface StockChartTooltipProps {
  item: ExtendedChartData;
  tooltipLeft: number;
  code: string;
}

export const StockChartTooltip: React.FC<StockChartTooltipProps> = ({ item, tooltipLeft, code }) => {
  if (!item.articles || item.articles.length === 0) return null;

  const latestArticle = item.articles[item.articles.length - 1];
  const title = latestArticle.title;
  const displayTitle = (() => {
    // 1. 】のパターン
    const index4 = title.indexOf('】');
    // 2. %のパターン
    const index3 = title.indexOf('%');

    let result = '';
    // 優先順位に従って処理
    if (index4 !== -1) {
      result = title.substring(index4 + 1);
    } else if (index3 !== -1) {
      result = title.substring(index3 + 1);
    } else {
      result = title;
    }

    // 結果が空文字列や【】のみの場合は元のタイトルを返す
    return result.trim() === '' || result === '【】' ? title : result;
  })();

  return (
    <div 
      className="absolute z-10 pointer-events-none"
      style={{ 
        left: `${tooltipLeft}px`,
        top: '10px'
      }}
    >
      <div className="pointer-events-auto animate-fadeIn">
        {/* グラスモーフィズム効果とモダンなスタイリング */}
        <div className="relative bg-white/90 backdrop-blur-md border border-gray-200/50 rounded-xl p-3 w-[100px] min-w-[100px] max-w-[100px] shadow-lg shadow-black/5 before:absolute before:inset-0 before:rounded-xl before:bg-gradient-to-b before:from-white/20 before:to-transparent before:pointer-events-none">
          {/* 小さなインジケーター */}
          <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full"></div>
          
          {/* コンテンツ */}
          <div
            key={latestArticle.id}
            className="relative text-xs font-medium text-gray-700 hover:text-blue-600 cursor-pointer p-1 rounded-lg transition-all duration-200 ease-out hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-purple-50/50 line-clamp-3"
            onClick={() => window.location.href = `/${code}/news/article/${latestArticle.id}`}
            role="button"
            tabIndex={0}
            title={displayTitle}
          >
            <span className="block leading-relaxed">{displayTitle}</span>
          </div>

          {/* 底部の装飾ライン */}
          <div className="absolute bottom-0 left-3 right-3 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
        </div>
      </div>
    </div>
  );
};

// アニメーション用のスタイル（Tailwindのカスタムクラスとして追加）
// tailwind.config.jsに以下を追加してください：
/*
module.exports = {
  theme: {
    extend: {
      animation: {
        'fadeIn': 'fadeIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { 
            opacity: '0',
            transform: 'translateY(-10px)'
          },
          '100%': { 
            opacity: '1',
            transform: 'translateY(0)'
          },
        }
      }
    }
  }
}
*/

export const getDefaultTooltipIndices = (data: ExtendedChartData[]): number[] => {
  const indices: number[] = [];
  const reasons: { [key: number]: string[] } = {};

  // 1. 最新日のニュースがある場合は必ず表示
  const latestDayIndex = data.length - 1;
  if (data[latestDayIndex]?.articles && data[latestDayIndex].articles.length > 0) {
    indices.push(latestDayIndex);
    reasons[latestDayIndex] = ['最新日のニュースあり'];
  }

  // 2. 変動率の計算と上位3つの抽出
  const changeRates: { index: number; closeChangeRate: number; highLowChangeRate: number }[] = [];
  
  data.forEach((item, index) => {
    if (index === 0) return; // 最初の日は前日データがないのでスキップ

    const prevClose = data[index - 1].close;
    const currentClose = item.close;
    const currentHigh = item.high;
    const currentLow = item.low;

    // 前日比の計算
    const closeChangeRate = Math.abs((currentClose - prevClose) / prevClose * 100);
    // 高値安値の変動率計算
    const highLowChangeRate = Math.abs((currentHigh - currentLow) / prevClose * 100);

    if (item.articles && item.articles.length > 0) {
      changeRates.push({
        index,
        closeChangeRate,
        highLowChangeRate
      });
    }
  });

  // 変動率の合計でソートして上位3つを取得
  const topChanges = changeRates
    .sort((a, b) => {
      const aTotal = a.closeChangeRate + a.highLowChangeRate;
      const bTotal = b.closeChangeRate + b.highLowChangeRate;
      return bTotal - aTotal;
    })
    .slice(0, 3);

  // 上位3つをインデックスに追加
  topChanges.forEach(change => {
    indices.push(change.index);
    reasons[change.index] = [
      `前日比変動率: ${change.closeChangeRate.toFixed(2)}%`,
      `高値安値変動率: ${change.highLowChangeRate.toFixed(2)}%`,
      `合計変動率: ${(change.closeChangeRate + change.highLowChangeRate).toFixed(2)}%`
    ];
  });

  // 3. settlement: 0の日を抽出
  data.forEach((item, index) => {
    if (item.settlement === 0 && item.articles && item.articles.length > 0 && !indices.includes(index)) {
      indices.push(index);
      reasons[index] = ['決算日'];
    }
  });

  // 重複を除去して最大4つまでに制限
  return [...new Set(indices)].slice(0, 4);
};