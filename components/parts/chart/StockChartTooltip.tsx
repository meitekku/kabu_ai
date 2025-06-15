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
      className="absolute z-10 flex pointer-events-none"
      style={{ 
        left: `${tooltipLeft}px`
      }}
    >
      <div className="speech-bubble bg-white border border-black p-1 w-[80px] min-w-[80px] max-w-[80px] pointer-events-auto">
        <div
          key={latestArticle.id}
          className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer p-0.5 hover:bg-gray-100 line-clamp-2"
          onClick={() => window.location.href = `/${code}/news/article/${latestArticle.id}`}
          role="button"
          tabIndex={0}
          title={displayTitle}
        >
          {displayTitle}
        </div>
      </div>
      <style jsx>{`
        .speech-bubble {
          position: relative;
        }
        .speech-bubble:after {
          content: '';
          position: absolute;
          left: 50%;
          bottom: -8px;
          transform: translateX(-50%);
          border-width: 4px 4px 0 4px;
          border-style: solid;
          border-color: #000 transparent transparent transparent;
          display: block;
          width: 0;
        }
        .speech-bubble:before {
          content: '';
          position: absolute;
          left: 50%;
          bottom: -7px;
          transform: translateX(-50%);
          border-width: 3px 3px 0 3px;
          border-style: solid;
          border-color: #fff transparent transparent transparent;
          display: block;
          width: 0;
        }
      `}</style>
    </div>
  );
};

export const calculateTooltipPosition = (
  index: number,
  actualChartPositions: number[],
  containerWidth: number,
  data: ExtendedChartData[]
): number => {
  const tooltipWidth = 80;
  
  // 1. 実際の座標が記録されている場合はそれを使用
  if (actualChartPositions[index] !== undefined) {
    const position = actualChartPositions[index] - (tooltipWidth / 2);
    return position;
  }
  
  // 2. フォールバック: 記録された座標から補間計算
  if (actualChartPositions.length > 0 && containerWidth > 0) {
    const recordedIndices = actualChartPositions
      .map((pos, idx) => pos !== undefined ? idx : -1)
      .filter(idx => idx !== -1);
    
    if (recordedIndices.length >= 2) {
      // 線形補間で位置を推定
      const firstIdx = recordedIndices[0];
      const lastIdx = recordedIndices[recordedIndices.length - 1];
      const firstPos = actualChartPositions[firstIdx];
      const lastPos = actualChartPositions[lastIdx];
      
      const slope = (lastPos - firstPos) / (lastIdx - firstIdx);
      const estimatedX = firstPos + slope * (index - firstIdx);
      const position = estimatedX - (tooltipWidth / 2);
      
      return position;
    }
  }
  
  // 3. 改善された推定計算
  if (containerWidth > 0 && data.length > 0) {
    // より正確なRechartsレイアウト計算
    const yAxisWidth = 35; // YAxisのwidth設定値
    const rightMargin = 7; // 下段チャートのright margin
    const effectiveWidth = containerWidth - yAxisWidth - rightMargin;
    
    // データポイント間の実際の間隔を計算
    const pointSpacing = effectiveWidth / Math.max(data.length - 1, 1);
    
    // X座標を計算（Rechartsの実際の配置に近似）
    const estimatedX = yAxisWidth + (pointSpacing * index);
    const position = estimatedX - (tooltipWidth / 2);
    
    return position;
  }
  
  return 0;
};

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

  // 重複を除去して返す
  return [...new Set(indices)];
}; 