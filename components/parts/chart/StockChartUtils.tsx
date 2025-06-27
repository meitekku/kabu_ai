import { PriceRecord } from '@/types/parts/chart/MainChart';
import { formatDate } from './StockChartComponents';
import { ApiResponse } from '@/types/parts/chart/MainChart';
import { ExtendedChartData, NewsArticle } from './types/StockChartTypes';
import { getDefaultTooltipIndices } from './StockChartTooltip';
import { calculateTooltipZones, TooltipZone } from './StockChartLayoutUtils';

/* --------------------------------------------------
 * 数値フォーマッタ (カンマ区切り)
 * -------------------------------------------------- */
export const formatNumber = (value: number | undefined): string => {
  if (typeof value === 'undefined' || Number.isNaN(value)) return '-';
  return value.toLocaleString();
};

/* --------------------------------------------------
 * 移動平均計算
 * -------------------------------------------------- */
export const calculateMA = (data: PriceRecord[], days: number): number[] => {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < days - 1) {
      result.push(NaN);
      continue;
    }
    const sum = data.slice(i - days + 1, i + 1).reduce((acc, curr) => acc + curr.close, 0);
    result.push(sum / days);
  }
  return result;
};

/* --------------------------------------------------
 * データ取得と加工
 * -------------------------------------------------- */
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

/* --------------------------------------------------
 * チャートポジション関連
 * -------------------------------------------------- */
export const recordChartPosition = (actualChartPositionsRef: React.MutableRefObject<number[]>, index: number, xCoordinate: number) => {
  const positions = actualChartPositionsRef.current;
  if (positions.length <= index) {
    for (let i = positions.length; i <= index; i++) {
      positions[i] = 0;
    }
  }
  positions[index] = xCoordinate;
  actualChartPositionsRef.current = positions;
};

export const captureAllChartPositions = (
  chartContainerRef: React.RefObject<HTMLDivElement>,
  containerWidth: number,
  data: ExtendedChartData[],
  setTooltipZones: (zones: TooltipZone[]) => void
) => {
  if (!chartContainerRef.current || !containerWidth || data.length === 0) return;
  const svgElement = chartContainerRef.current.querySelector('svg');
  if (!svgElement) return;
  const barElements = svgElement.querySelectorAll('g[class*="recharts-bar"] .recharts-bar-rectangle');
  if (barElements.length > 0) {
    const newPositions = new Array(data.length).fill(0);
    barElements.forEach((element, idx) => {
      if (idx < data.length) {
        const rect = element.getBoundingClientRect();
        const containerRect = chartContainerRef.current ? chartContainerRef.current.getBoundingClientRect() : { left: 0 };
        const relativeX = rect.left - containerRect.left + (rect.width / 2);
        newPositions[idx] = relativeX;
      }
    });
    const defaultIndices = getDefaultTooltipIndices(data);
    const chartHeight = window.innerWidth >= 768 ? 192 : 128;
    const zones = calculateTooltipZones(
      defaultIndices.map(index => data[index]),
      newPositions,
      containerWidth,
      chartHeight
    );
    setTooltipZones(zones);
    return newPositions;
  }
};

export const handleResize = (
  setContainerWidth: (w: number) => void,
  actualChartPositionsRef: React.MutableRefObject<number[]>,
  setIsChartReady: (b: boolean) => void,
  containerWidth: number,
  data: ExtendedChartData[],
  captureAllChartPositions: () => void
) => (width: number) => {
  setContainerWidth(width);
  actualChartPositionsRef.current = [];
  setIsChartReady(false);
  if (width > 0 && data.length > 0) {
    setTimeout(() => {
      captureAllChartPositions();
      setIsChartReady(true);
    }, 1500);
  }
}; 