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
    const index4 = title.indexOf('】');
    const index3 = title.indexOf('%');

    let result = '';
    if (index4 !== -1) {
      result = title.substring(index4 + 1);
    } else if (index3 !== -1) {
      result = title.substring(index3 + 1);
    } else {
      result = title;
    }

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
        <div className="relative bg-white/90 backdrop-blur-md border border-gray-200/50 rounded-xl p-3 w-[100px] min-w-[100px] max-w-[100px] shadow-lg shadow-black/5 before:absolute before:inset-0 before:rounded-xl before:bg-gradient-to-b before:from-white/20 before:to-transparent before:pointer-events-none">
          <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full"></div>
          
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

          <div className="absolute bottom-0 left-3 right-3 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
        </div>
      </div>
    </div>
  );
};

const getDefaultTooltipIndices = (data: ExtendedChartData[]): number[] => {
  const indices: number[] = [];

  // 最新日のニュースがある場合は必ず表示
  const latestDayIndex = data.length - 1;
  if (data[latestDayIndex]?.articles && data[latestDayIndex].articles.length > 0) {
    indices.push(latestDayIndex);
  }

  // 変動率の計算と上位3つの抽出
  const changeRates: { index: number; totalChangeRate: number }[] = [];
  
  data.forEach((item, index) => {
    if (index === 0 || !item.articles || item.articles.length === 0) return;

    const prevClose = data[index - 1].close;
    const closeChangeRate = Math.abs((item.close - prevClose) / prevClose * 100);
    const highLowChangeRate = Math.abs((item.high - item.low) / prevClose * 100);
    const totalChangeRate = closeChangeRate + highLowChangeRate;

    changeRates.push({ index, totalChangeRate });
  });

  // 上位3つを取得
  const topChanges = changeRates
    .sort((a, b) => b.totalChangeRate - a.totalChangeRate)
    .slice(0, 3);

  topChanges.forEach(change => {
    indices.push(change.index);
  });

  // 決算日を追加
  data.forEach((item, index) => {
    if (item.settlement === 0 && item.articles && item.articles.length > 0 && !indices.includes(index)) {
      indices.push(index);
    }
  });

  return [...new Set(indices)].slice(0, 4);
};

export { getDefaultTooltipIndices };