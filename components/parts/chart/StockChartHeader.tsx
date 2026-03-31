'use client';

import React from 'react';
import { ChartTheme } from './StockChartTheme';

interface CompanyInfo {
  companyName: string;
  changePrice: number;
  changePercent: number;
  currentPrice: number;
}

interface CompanyHeaderProps {
  company_name: boolean;
  companyInfo: CompanyInfo | null;
  code: string;
  theme: ChartTheme;
  colors: {
    background: string;
    gridColor: string;
  };
}

export const CompanyHeader: React.FC<CompanyHeaderProps> = ({
  company_name,
  companyInfo,
  code,
  theme,
  colors
}) => {
  if (!company_name || !companyInfo) return null;
  
  return (
    <div 
      className="px-4 py-4 border-t border-b mb-4" 
      style={{ 
        backgroundColor: colors.background,
        borderColor: colors.gridColor,
        borderTopWidth: '1px',
        borderTopStyle: 'solid',
        borderBottomWidth: '1px',
        borderBottomStyle: 'solid'
      }}
    >
      <div className="flex items-center justify-center">
        {/* 会社名を中央に配置 */}
        <div className="text-center">
          <div 
            className="text-xl font-bold" 
            style={{ 
              color: companyInfo.changePrice >= 0 
                ? '#ff0000'  // プラスなら赤
                : (theme === 'black' ? '#00aa00' : '#00aa00')  // マイナスなら緑
            }}
          >
            ({code}) {companyInfo.companyName}
          </div>
          <div 
            style={{ 
              color: companyInfo.changePrice >= 0 
                ? '#ff0000'  // プラスなら赤
                : (theme === 'black' ? '#00aa00' : '#00aa00')  // マイナスなら緑
            }}
          >
            <span className="text-xl font-bold">
              {companyInfo.currentPrice.toLocaleString()}円 {companyInfo.changePrice >= 0 ? '↑' : '↓'}
            </span>
            <span className="text-base font-medium ml-1">
              {Math.abs(companyInfo.changePrice).toFixed(2)} ({companyInfo.changePrice >= 0 ? '+' : ''}{companyInfo.changePercent.toFixed(2)}%)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};