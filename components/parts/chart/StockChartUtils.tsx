import { PriceRecord, ApiResponse } from '@/types/parts/chart/MainChart';
import { formatDate } from './StockChartComponents';
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
export const fetchChartAndNewsData = async (code: string, newsInstitution?: string, targetDate?: Date): Promise<ExtendedChartData[]> => {
  // 対象日付の設定（デフォルトは2ヶ月前）
  const date = targetDate || new Date();
  date.setMonth(date.getMonth() - 2);

  // 日付をYYYY-MM-DD形式に変換
  const formattedDate = date.toISOString().split('T')[0];

  // 株価データ取得
  const chartResponse = await fetch(`/api/stocks/${code}/chart`, {
    method: 'POST',
    body: JSON.stringify({ 
      code, 
      num: 60,
      target_date: formattedDate // 対象日付を追加
    }),
    headers: { 'Content-Type': 'application/json' }
  });
  if (!chartResponse.ok) throw new Error('Chart data fetch failed');
  const chartResult = (await chartResponse.json()) as ApiResponse<PriceRecord[]>;
  if (!chartResult.success || !chartResult.data || chartResult.data.length === 0) {
    return [];
  }

  // 記事データ取得
  const newsResponse = await fetch(`/api/stocks/${code}/news`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      limit: 60, 
      page: 1,
      institution: newsInstitution,
      target_date: formattedDate // 対象日付を追加
    })
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
  // 記事を日付でグループ化し、各日付で最新の1つだけを残す
  const articlesByDate = new Map<string, NewsArticle>();
  articles.forEach((article: NewsArticle) => {
    try {
      const articleDateStr = formatDate(article.created_at);
      const existingArticle = articlesByDate.get(articleDateStr);
      
      // その日付の記事がまだない、または新しい記事の場合は更新
      if (!existingArticle || new Date(article.created_at) > new Date(existingArticle.created_at)) {
        articlesByDate.set(articleDateStr, article);
      }
    } catch {
      // エラーは無視
    }
  });
  
  // 整形
  return sortedData.map((item, index) => {
    const isPositive = item.close >= item.open;
    const date = new Date(item.date);
    const dateStr = `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;

    // その日付の記事を取得（各日付で1つのみ）
    const chartDateStr = formatDate(item.date);
    const dayArticle = articlesByDate.get(chartDateStr);
    const articlesToShow = dayArticle ? [dayArticle] : [];

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
      articles: articlesToShow,
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
    const chartHeight = typeof window !== 'undefined' && window.innerWidth >= 768 ? 192 : 148;
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