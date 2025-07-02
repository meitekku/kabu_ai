import React from 'react';
import { ExtendedChartData } from './types/StockChartTypes';

// タイトルを整形するユーティリティ関数
export const formatArticleTitle = (title: string): string => {
  console.log('🔍 formatArticleTitle - 処理前:', title);
  
  let result = title;
  
  // 最初が【で最後が】の場合（例：【トヨタ自動車(7203)株価0.51%上昇の背景】）
  if (title.startsWith('【') && title.endsWith('】')) {
    console.log('🔍 formatArticleTitle - 全体が【】で囲まれている場合');
    
    // 【】を削除
    result = title.slice(1, -1);
    console.log('🔍 formatArticleTitle - 【】削除後:', result);
    
    // 先頭の「-数字%」「数字%上昇」「数字%下落」などを削除
    result = result.replace(/^[+\-–−]?\d+(?:\.\d+)?[%％][^、：]*[、：]?\s*/, '');
    console.log('🔍 formatArticleTitle - パーセント削除後:', result);
    
    // 「、」「：」がある場合はその後の部分を取得
    const afterDelimiterMatch = result.match(/[、：]\s*(.+)/);
    if (afterDelimiterMatch) {
      result = afterDelimiterMatch[1];
      console.log('🔍 formatArticleTitle - 区切り文字後:', result);
    }
    
    result = result.trim();
    
  } else {
    console.log('🔍 formatArticleTitle - 通常の場合');
    
    // 先頭の「-数字%」「数字%上昇」「数字%下落」などを削除
    result = result.replace(/^[+\-–−]?\d+(?:\.\d+)?[%％][^、：]*[、：]?\s*/, '');
    console.log('🔍 formatArticleTitle - パーセント削除後:', result);
    
    // 「、」「：」がある場合はその後の部分を取得
    const afterDelimiterMatch = result.match(/[、：]\s*(.+)/);
    if (afterDelimiterMatch) {
      result = afterDelimiterMatch[1];
      console.log('🔍 formatArticleTitle - 区切り文字後:', result);
    }
    
    result = result.trim();
    
    // 最後に【】を削除
    result = result.replace(/【[^】]*】/g, '');
    console.log('🔍 formatArticleTitle - 【】削除後:', result);
  }
  
  // 結果が空の場合は元のタイトルから【】だけ削除
  const finalResult = result === '' ? title.replace(/【[^】]*】/g, '').trim() : result;
  console.log('🔍 formatArticleTitle - 最終結果:', finalResult);
  return finalResult;
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

const getDefaultTooltipIndices = (data: ExtendedChartData[], maxNewsTooltips?: number): number[] => {
  const indices: number[] = [];
  
  // 最新日のニュースがある場合は必ず表示
  const latestDayIndex = data.length - 1;
  if (data[latestDayIndex]?.articles && data[latestDayIndex].articles.length > 0) {
    indices.push(latestDayIndex);
  }
  
  // 変動率の計算と上位の抽出（maxNewsTooltipsに基づいて数を調整）
  const changeRates: { index: number; totalChangeRate: number }[] = [];
  
  data.forEach((item, index) => {
    if (index === 0 || !item.articles || item.articles.length === 0) return;
    
    const prevClose = data[index - 1].close;
    const closeChangeRate = Math.abs((item.close - prevClose) / prevClose * 100);
    const highLowChangeRate = Math.abs((item.high - item.low) / prevClose * 100);
    const totalChangeRate = closeChangeRate + highLowChangeRate;
    
    changeRates.push({ index, totalChangeRate });
  });
  
  // maxNewsTooltipsが指定されている場合は、その数から最新日分を引いた数を上限とする
  const topChangesLimit = maxNewsTooltips ? maxNewsTooltips - indices.length : 3;
  
  // 上位の変動率を持つ日を取得
  const topChanges = changeRates
    .sort((a, b) => b.totalChangeRate - a.totalChangeRate)
    .slice(0, topChangesLimit);
  
  topChanges.forEach(change => {
    if (!indices.includes(change.index)) {
      indices.push(change.index);
    }
  });
  
  // 決算日を追加（まだmaxNewsTooltipsに達していない場合）
  if (!maxNewsTooltips || indices.length < maxNewsTooltips) {
    data.forEach((item, index) => {
      if (item.settlement === 0 && item.articles && item.articles.length > 0 && !indices.includes(index)) {
        indices.push(index);
        // maxNewsTooltipsに達したら終了
        if (maxNewsTooltips && indices.length >= maxNewsTooltips) {
          return;
        }
      }
    });
  }
  
  // 記事がある日をすべて追加（まだmaxNewsTooltipsに達していない場合）
  if (!maxNewsTooltips || indices.length < maxNewsTooltips) {
    data.forEach((item, index) => {
      if (item.articles && item.articles.length > 0 && !indices.includes(index)) {
        indices.push(index);
        // maxNewsTooltipsに達したら終了
        if (maxNewsTooltips && indices.length >= maxNewsTooltips) {
          return;
        }
      }
    });
  }
  
  // maxNewsTooltipsが指定されている場合はその数まで、
  // 指定がない場合は画面サイズに応じて2つまたは4つまで表示
  const maxTooltips = maxNewsTooltips ?? (window.innerWidth < 768 ? 2 : 4);
  return [...new Set(indices)].slice(0, maxTooltips);
};

export { getDefaultTooltipIndices };