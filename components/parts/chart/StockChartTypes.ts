import { ChartTheme } from './StockChartTheme';

export interface NewsArticle {
  id: string;
  created_at: string;
  title: string;
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
  ma5: number;
  ma25: number;
  ma75: number;
  articles?: NewsArticle[];
  code: string;
  settlement?: number;
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
export const UPPER_CHART_MARGIN: ChartMargins = { top: 10, right: 5, bottom: 5, left: 30 };
export const LOWER_CHART_MARGIN: ChartMargins = { top: 0, right: 5, bottom: 20, left: 30 };

// StockChartProps
export interface StockChartProps {
  code: string;
  width?: string | number;
  pcHeight?: ChartDimensions;
  mobileHeight?: ChartDimensions;
  asImage?: boolean;
  onImageGenerated?: (imageUrl: string) => void;
  onTooltipRendered?: (isRendered: boolean) => void;
  showEmptyAreas?: boolean;
  maxNewsTooltips?: number;
  theme?: ChartTheme;
  company_name?: boolean;
}

export interface StockChartRef {
  exportAsImage: () => Promise<string>;
  isTooltipRendered: () => boolean;
} 