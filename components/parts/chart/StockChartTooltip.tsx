import React from 'react';
import { ExtendedChartData } from './types/StockChartTypes';

// タイトルを整形するユーティリティ関数
export const formatArticleTitle = (title: string): string => {
  let result = title;
  let hasMatch = false;

  // 1) 先頭の「会社名(code)」「数字＋％＋動詞＋、」など、最初の「、」または「：」までを一括で削除
  //    → -3.62%下落、 や 【〇〇】+5%上昇： などあらゆる前置きをまとめて消せる
  result = result.replace(/^.*?[、：]\s*/, '');

  // 「出来高」を含むフレーズを一時的に保存
  const volumeMatch = result.match(/出来高[^、：]*/);
  const volumePhrase = volumeMatch ? volumeMatch[0] : null;

  // 2) 念のため、本文に紛れ込む可能性のある「大幅」「下落」「上昇」などの文字列をグローバルに削除
  //    ただし、「出来高」「増加」「減少」などの重要なキーワードは保護する
  const movementPatterns = [
    /[+\-–−]?\d+(?:\.\d+)?[%％][^、：]*[、：]?/g,
    /大幅?[^、：]*[、：]?/g,
    /急激?[^、：]*[、：]?/g,
    /下落[^、：]*[、：]?/g,
    /上昇[^、：]*[、：]?/g,
    /急騰[^、：]*[、：]?/g,
    /急落[^、：]*[、：]?/g,
    /反発[^、：]*[、：]?/g,
    /反落[^、：]*[、：]?/g,
    /続落[^、：]*[、：]?/g,
    /続伸[^、：]*[、：]?/g,
    /伸び[^、：]*[、：]?/g,
    /下げ[^、：]*[、：]?/g,
    /上げ[^、：]*[、：]?/g,
    // 「高」「低」は文頭のみ削除（「出来高」などの重要なキーワードを保護）
    /^高[^、：]*[、：]?/g,
    /^低[^、：]*[、：]?/g
  ];
  
  movementPatterns.forEach(pattern => {
    const newResult = result.replace(pattern, '');
    if (newResult !== result) {
      hasMatch = true;
      result = newResult;
    }
  });

  // movementPatternsに一致した場合のみ、以下の処理を実行
  if (hasMatch) {
    // 1) 先頭から最初の「、」か「：」まで（会社名・株価％動き・動詞など何でも）丸ごと削除
    result = result.replace(/^.*?[、：]\s*/, '');

    // 2) 念のため、先頭に残る可能性のある「±数字％動き…」を削除
    result = result.replace(/^[+\-−–]?\d+(?:\.\d+)?[%％][^、：]*[、：]?\s*/, '');
  }

  // 保存しておいた「出来高」フレーズを結果に追加
  if (volumePhrase) {
    result = volumePhrase + result;
  }

  // 前後の空白を削除して、空なら元タイトルを返す
  result = result.trim();
  return result === '' ? title : result;
};

interface StockChartTooltipProps {
  item: ExtendedChartData;
  tooltipLeft: number;
  code: string;
}

export const StockChartTooltip: React.FC<StockChartTooltipProps> = ({ item, tooltipLeft, code }) => {
  if (!item.articles || item.articles.length === 0) return null;
  
  // 変更点: 配列の最初の要素を最新記事として取得
  const latestArticle = item.articles[0];
  const title = latestArticle.title;
  
  const displayTitle = formatArticleTitle(title);
  
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
            <span className="block leading-tight">{displayTitle}</span>
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