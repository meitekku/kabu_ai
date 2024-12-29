import { RowDataPacket } from 'mysql2';

export interface PriceRecord extends RowDataPacket {
    id: number;
    code: string;
    date: Date;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    created_at: Date;
  }
  
  export interface ChartData {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }
  
  export interface ApiResponse<T> {
    success: boolean;
    data: T;
    error?: string;
  }