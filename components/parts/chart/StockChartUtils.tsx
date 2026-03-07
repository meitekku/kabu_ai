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
  const result = new Array<number>(data.length).fill(NaN);
  if (days <= 0 || data.length === 0) {
    return result;
  }

  let windowSum = 0;
  for (let i = 0; i < data.length; i++) {
    windowSum += data[i].close;
    if (i >= days) {
      windowSum -= data[i - days].close;
    }
    if (i >= days - 1) {
      result[i] = windowSum / days;
    }
  }
  return result;
};

/* --------------------------------------------------
 * データ取得と加工
 * -------------------------------------------------- */
export const fetchChartAndNewsData = async (code: string, newsInstitution?: string, targetDate?: Date, additionalArticles?: NewsArticle[]): Promise<ExtendedChartData[]> => {
  // 対象日付の設定（デフォルトは2ヶ月前）
  const date = targetDate ? new Date(targetDate) : new Date();
  date.setMonth(date.getMonth() - 2);

  // 日付をYYYY-MM-DD形式に変換
  const formattedDate = date.toISOString().split('T')[0];

  // 株価データと記事データを並列取得
  const [chartResponse, newsResponse] = await Promise.all([
    fetch(`/api/stocks/${code}/chart`, {
      method: 'POST',
      body: JSON.stringify({
        code,
        num: 60,
        target_date: formattedDate // 対象日付を追加
      }),
      headers: { 'Content-Type': 'application/json' }
    }),
    fetch(`/api/stocks/${code}/news`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        limit: 60,
        page: 1,
        institution: newsInstitution,
        target_date: formattedDate // 対象日付を追加
      })
    })
  ]);
  if (!chartResponse.ok) throw new Error('Chart data fetch failed');
  if (!newsResponse.ok) throw new Error('News data fetch failed');

  const [chartResult, newsResult] = await Promise.all([
    chartResponse.json() as Promise<ApiResponse<PriceRecord[]>>,
    newsResponse.json() as Promise<{ success: boolean; data?: NewsArticle[] }>
  ]);
  if (!chartResult.success || !chartResult.data || chartResult.data.length === 0) return [];
  if (!newsResult.success) throw new Error('News API returned error');
  const articles: NewsArticle[] = newsResult.data || [];

  // 日付でソート
  const sortedDataWithMeta = chartResult.data
    .map((item) => {
      const dateObj = item.date instanceof Date ? item.date : new Date(item.date);
      return {
        item,
        dateObj,
        chartDateStr: formatDate(dateObj),
        dateLabel: `${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getDate().toString().padStart(2, '0')}`
      };
    })
    .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
  const sortedData = sortedDataWithMeta.map((entry) => entry.item);
  // 移動平均
  const ma5 = calculateMA(sortedData, 5);
  const ma25 = calculateMA(sortedData, 25);
  const ma75 = calculateMA(sortedData, 75);

  // 記事を日付でグループ化し、各日付で最新の1つだけを残す
  const articlesByDate = new Map<string, { article: NewsArticle; createdAtMs: number }>();
  articles.forEach((article) => {
    try {
      const createdAt = new Date(article.created_at);
      const createdAtMs = createdAt.getTime();
      if (Number.isNaN(createdAtMs)) return;
      const articleDateStr = formatDate(createdAt);
      const existingArticle = articlesByDate.get(articleDateStr);

      // その日付の記事がまだない、または新しい記事の場合は更新
      if (!existingArticle || createdAtMs > existingArticle.createdAtMs) {
        articlesByDate.set(articleDateStr, { article, createdAtMs });
      }
    } catch {
      // エラーは無視
    }
  });

  // 追加記事（未承認記事など）は同日付の承認済み記事を上書きして必ず表示
  if (additionalArticles && additionalArticles.length > 0) {
    additionalArticles.forEach((article) => {
      try {
        const createdAt = new Date(article.created_at);
        if (Number.isNaN(createdAt.getTime())) return;
        const articleDateStr = formatDate(createdAt);
        articlesByDate.set(articleDateStr, { article, createdAtMs: createdAt.getTime() });
      } catch {
        // エラーは無視
      }
    });
  }

  // 整形
  return sortedDataWithMeta.map(({ item, dateLabel, chartDateStr }, index) => {
    const isPositive = item.close >= item.open;

    // その日付の記事を取得（各日付で1つのみ）
    const dayArticle = articlesByDate.get(chartDateStr);
    const articlesToShow = dayArticle ? [dayArticle.article] : [];

    return {
      date: dateLabel,
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
