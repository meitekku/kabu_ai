'use client';

import React from 'react';
import Image from 'next/image';
import html2canvas from 'html2canvas';
import { CompanyHeader } from './StockChartHeader';
import { ChartTheme } from './StockChartTheme';

interface CompanyInfo {
  companyName: string;
  changePrice: number;
  changePercent: number;
  currentPrice: number;
}

interface StockChartImageProps {
  chartContainerRef: React.RefObject<HTMLDivElement>;
  colors: {
    background: string;
    gridColor: string;
  };
  pcHeight: {
    upper: number;
    lower: number;
  };
  mobileHeight: {
    upper: number;
    lower: number;
  };
  company_name: boolean;
  companyInfo: CompanyInfo | null;
  code: string;
  theme: ChartTheme;
  imageUrl: string;
}

// チャートを画像として出力する関数
export const exportAsImage = async (
  chartContainerRef: React.RefObject<HTMLDivElement>,
  colors: { background: string; gridColor: string },
  pcHeight: { upper: number; lower: number },
  mobileHeight: { upper: number; lower: number },
  company_name: boolean,
  companyInfo: CompanyInfo | null
): Promise<string> => {
  if (!chartContainerRef.current) {
    throw new Error('Chart container not found');
  }

  try {
    const container = chartContainerRef.current;
    
    // 上段と下段のチャートの高さを正確に計算
    const upperHeight = window.innerWidth >= 768 ? pcHeight.upper : mobileHeight.upper;
    const lowerHeight = window.innerWidth >= 768 ? pcHeight.lower : mobileHeight.lower;
    const headerHeight = company_name && companyInfo ? 60 : 0; // ヘッダーの高さを追加
    const totalHeight = upperHeight + lowerHeight + headerHeight;
    
    // mt-2クラスのマージンを考慮（0.5rem = 8px）
    const marginTop = 8;
    const expectedTotalHeight = totalHeight + marginTop;
    
    const canvas = await html2canvas(container, {
      backgroundColor: colors.background,
      scale: 2,
      logging: false,
      useCORS: true,
      // 高さを明示的に制限
      height: expectedTotalHeight,
      // windowHeightを削除して自動計算させる
      // クリッピングエリアを設定
      width: container.offsetWidth,
      x: 0,
      y: 0,
      scrollX: -window.scrollX,
      scrollY: -window.scrollY
    });

    // 余白をトリミング（必要に応じて）
    const ctx = document.createElement('canvas').getContext('2d');
    if (!ctx) throw new Error('Canvas context not available');
    
    ctx.canvas.width = canvas.width;
    ctx.canvas.height = Math.min(canvas.height, expectedTotalHeight * 2); // scale: 2を考慮
    ctx.drawImage(canvas, 0, 0);
    
    return ctx.canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Error exporting chart as image:', error);
    throw error;
  }
};

// 画像表示用コンポーネント
export const StockChartImage: React.FC<StockChartImageProps> = ({
  colors,
  code,
  company_name,
  companyInfo,
  theme,
  imageUrl
}) => {
  return (
    <div className="mt-2" style={{ width: '100%' }}>
      <CompanyHeader
        company_name={company_name}
        companyInfo={companyInfo}
        code={code}
        theme={theme}
        colors={colors}
      />
      <Image 
        src={imageUrl} 
        alt={`Stock chart for ${code}`} 
        className="w-full"
        width={800}
        height={600}
      />
    </div>
  );
}; 