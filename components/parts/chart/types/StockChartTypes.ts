import { ChartData } from '@/types/parts/chart/MainChart';

export interface NewsArticle {
  id: number;
  title: string;
  content: string;
  created_at: string;
  code: string;
}

export interface ExtendedChartData extends ChartData {
  // ヒゲ用: [low, high]
  highLowBar: [number, number];
  // 実体用: [open, close]
  candlestick: [number, number];
  // ロウソク足の色 (上昇/下落で変える)
  color: string;
  // 移動平均
  ma5: number;
  ma25: number;
  ma75: number;
  // 記事データ
  articles?: NewsArticle[];
  // 企業コード
  code: string;
  // 決算フラグ
  settlement?: number;
} 