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
} 