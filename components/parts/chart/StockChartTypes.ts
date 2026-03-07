import { ChartTheme } from './StockChartTheme';

export interface NewsArticle {
  id: string;
  created_at: string;
  title: string;
  isPriority?: boolean;
}

export interface ExtendedChartData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  highLowBar: [number, number];
  candlestick: [number, number];
  color: string;
  ma5: number | null;
  ma25: number | null;
  ma75: number | null;
  articles?: NewsArticle[];
  code: string;
  settlement?: number;
  isPrediction?: boolean;
  predictionHigh?: number;
  predictionLow?: number;
  predictionClose?: number | null;
  band1Upper?: number;
  band1Lower?: number;
  band2Upper?: number;
  band2Lower?: number;
}

export interface CompanyInfo {
  companyName: string;
  changePrice: number;
  changePercent: number;
  currentPrice: number;
}

export interface ChartDimensions {
  upper: number;
  lower: number;
}

export interface ChartMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

// チャートのマージン設定を定数化
export const UPPER_CHART_MARGIN: ChartMargins = { top: 22, right: 5, bottom: 5, left: 30 };
export const LOWER_CHART_MARGIN: ChartMargins = { top: 0, right: 5, bottom: 20, left: 30 };

export interface PredictionDataPoint {
  date: string;
  predictedClose: number;
  predictedHigh: number;
  predictedLow: number;
  predictedOpen?: number;
  // ATRベース信頼区間バンド（optional）
  band1Upper?: number;
  band1Lower?: number;
  band2Upper?: number;
  band2Lower?: number;
}

// StockChartProps
export interface StockChartProps {
  code: string;
  width?: string | number;
  pcHeight?: ChartDimensions;
  tabletHeight?: ChartDimensions;
  mobileHeight?: ChartDimensions;
  asImage?: boolean;
  onImageGenerated?: (imageUrl: string) => void;
  onTooltipRendered?: (isRendered: boolean) => void;
  showEmptyAreas?: boolean;
  maxNewsTooltips?: number;
  theme?: ChartTheme;
  company_name?: boolean;
  newsInstitution?: string;
  targetDate?: Date;
  hideNewsTooltips?: boolean;
  predictionData?: PredictionDataPoint[];
  additionalArticles?: NewsArticle[];
}

export interface StockChartRef {
  exportAsImage: () => Promise<string>;
  isTooltipRendered: () => boolean;
} 