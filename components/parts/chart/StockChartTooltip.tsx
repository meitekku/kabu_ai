import { ExtendedChartData } from './types/StockChartTypes';

// タイトルを整形するユーティリティ関数
export const formatArticleTitle = (title: string): string => {
  let result = title;

  // 最初が【で最後が】の場合（例：【トヨタ自動車(7203)株価0.51%上昇の背景】）
  if (title.startsWith('【') && title.endsWith('】')) {
    // 【】を削除
    result = title.slice(1, -1);

    // 先頭の「-数字%」「数字%上昇」「数字%下落」などを削除
    result = result.replace(/^[+\-–−]?\d+(?:\.\d+)?[%％][^、：]*[、：]?\s*/, '');

    // 「、」「：」がある場合はその後の部分を取得
    const afterDelimiterMatch = result.match(/[、：]\s*(.+)/);
    if (afterDelimiterMatch) {
      result = afterDelimiterMatch[1];
    }

    result = result.trim();

  } else {
    // 先頭の「-数字%」「数字%上昇」「数字%下落」などを削除
    result = result.replace(/^[+\-–−]?\d+(?:\.\d+)?[%％][^、：]*[、：]?\s*/, '');

    // 「、」「：」がある場合はその後の部分を取得
    const afterDelimiterMatch = result.match(/[、：]\s*(.+)/);
    if (afterDelimiterMatch) {
      result = afterDelimiterMatch[1];
    }

    result = result.trim();

    // 最後に【】を削除
    result = result.replace(/【[^】]*】/g, '');
  }

  // 結果が空の場合は元のタイトルから【】だけ削除
  const finalResult = result === '' ? title.replace(/【[^】]*】/g, '').trim() : result;
  return finalResult;
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