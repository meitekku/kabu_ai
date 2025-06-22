import { calculateMA } from './StockChartUtils';
import { formatDate } from './StockChartComponents';
import { ApiResponse, PriceRecord } from '@/types/parts/chart/MainChart';
import { ExtendedChartData, NewsArticle } from './types/StockChartTypes';

export const fetchChartAndNewsData = async (code: string): Promise<ExtendedChartData[]> => {
  // 株価データ取得
  const chartResponse = await fetch(`/api/${code}/chart`, {
    method: 'POST',
    body: JSON.stringify({ code, num: 60 }),
    headers: { 'Content-Type': 'application/json' }
  });
  if (!chartResponse.ok) throw new Error('Chart data fetch failed');
  const chartResult = (await chartResponse.json()) as ApiResponse<PriceRecord[]>;
  if (!chartResult.success || !chartResult.data || chartResult.data.length === 0) {
    return [];
  }
  // 記事データ取得
  const newsResponse = await fetch(`/api/${code}/news`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ limit: 60, page: 1 })
  });
  if (!newsResponse.ok) throw new Error('News data fetch failed');
  const newsResult = await newsResponse.json();
  if (!newsResult.success) throw new Error('News API returned error');
  const articles: NewsArticle[] = newsResult.data || [];
  // 日付でソート
  const sortedData = chartResult.data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  // 移動平均
  const ma5 = calculateMA(sortedData, 5);
  const ma25 = calculateMA(sortedData, 25);
  const ma75 = calculateMA(sortedData, 75);
  // 整形
  return sortedData.map((item, index) => {
    const isPositive = item.close >= item.open;
    const date = new Date(item.date);
    const dateStr = `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
    const dayArticles = articles.filter((article: NewsArticle) => {
      try {
        const articleDateStr = formatDate(article.created_at);
        const chartDateStr = formatDate(item.date);
        return articleDateStr === chartDateStr;
      } catch {
        return false;
      }
    });
    return {
      date: dateStr,
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
      volume: item.volume,
      highLowBar: [item.low, item.high],
      candlestick: [item.open, item.close],
      color: isPositive ? '#ff0000' : '#0000ff',
      ma5: ma5[index],
      ma25: ma25[index],
      ma75: ma75[index],
      articles: dayArticles,
      code: code
    } as ExtendedChartData;
  });
}; 