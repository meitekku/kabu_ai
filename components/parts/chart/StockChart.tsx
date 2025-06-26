'use client';

import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  RectangleProps
} from 'recharts';
import html2canvas from 'html2canvas';
import { ExtendedChartData } from './types/StockChartTypes';
import { formatNumber } from './StockChartUtils';
import { CandleWickShape, CandleBodyShape } from './StockChartShapes';
import { TooltipZone, calculateTooltipZones } from './StockChartLayoutUtils';
import { fetchChartAndNewsData } from './StockChartDataUtils';
import { recordChartPosition, handleResize } from './StockChartPositionUtils';
import { formatArticleTitle } from './StockChartTooltip';
import Image from 'next/image';

/* --------------------------------------------------
 * 型定義
 * -------------------------------------------------- */
interface StockChartProps {
  code: string;
  width?: string | number;
  pcHeight?: {
    upper: number;
    lower: number;
  };
  mobileHeight?: {
    upper: number;
    lower: number;
  };
  asImage?: boolean;
  onImageGenerated?: (imageUrl: string) => void;
  onTooltipRendered?: (isRendered: boolean) => void;
  showEmptyAreas?: boolean;
  maxNewsTooltips?: number;
  theme?: 'default' | 'black';  // 新しいプロパティを追加
}

export interface StockChartRef {
  exportAsImage: () => Promise<string>;
  isTooltipRendered: () => boolean;
}

// チャートのマージン設定を定数化
const UPPER_CHART_MARGIN = { top: 10, right: 5, bottom: 5, left: 30 };
const LOWER_CHART_MARGIN = { top: 0, right: 5, bottom: 20, left: 30 };

/* --------------------------------------------------
 * メインのチャートコンポーネント
 * -------------------------------------------------- */
const StockChart = forwardRef<StockChartRef, StockChartProps>(({ 
  code,
  width = '100%',
  pcHeight = {
    upper: 192,
    lower: 96
  },
  mobileHeight = {
    upper: 128,
    lower: 80
  },
  asImage = false,
  onImageGenerated,
  onTooltipRendered,
  showEmptyAreas = false,
  maxNewsTooltips,
  theme = 'default'  // デフォルトは通常のテーマ
}, ref) => {
  const [data, setData] = useState<ExtendedChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredData, setHoveredData] = useState<ExtendedChartData | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const actualChartPositionsRef = useRef<number[]>([]);
  const [isChartReady, setIsChartReady] = useState(false);
  const [tooltipZones, setTooltipZones] = useState<TooltipZone[]>([]);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isTooltipRendered, setIsTooltipRendered] = useState(false);
  const upperChartRef = useRef<HTMLDivElement>(null);

  // テーマに基づく色設定
  const isBlackTheme = theme === 'black';
  const colors = {
    background: isBlackTheme ? '#0f0f1e' : '#ffffff',
    text: isBlackTheme ? '#ffffff' : '#000000',
    textSecondary: isBlackTheme ? '#b8b8c8' : '#666666',
    gridColor: isBlackTheme ? '#1f1f33' : '#e0e0e0',
    tooltipBg: isBlackTheme ? 'rgba(15, 15, 30, 0.3)' : 'rgba(255, 255, 255, 0.65)',
    tooltipBorder: isBlackTheme ? '#ffffff' : '#cccccc',
    infoBg: isBlackTheme ? 'rgba(15, 15, 30, 0.85)' : 'rgba(255, 255, 255, 0.8)',
    emptyAreaBg: isBlackTheme ? 'rgba(31, 31, 51, 0.8)' : 'rgba(243, 244, 246, 0.8)',
    emptyAreaBorder: isBlackTheme ? '#3d3d5a' : '#d1d5db',
    emptyAreaText: isBlackTheme ? '#9898b8' : '#6b7280',
    loadingBg: isBlackTheme ? '#1f1f33' : '#e5e7eb',
    errorText: isBlackTheme ? '#ff6b6b' : '#ef4444',
    lineConnector: isBlackTheme ? '#7878a3' : '#666666',
    ma5Color: isBlackTheme ? '#ffd700' : '#00ff00',
    ma25Color: isBlackTheme ? '#ff8c00' : '#ff0000',
    ma75Color: isBlackTheme ? '#ff6347' : '#0000ff',
    volumeUpFill: isBlackTheme ? '#ffd700' : '#ffcccc',
    volumeUpStroke: isBlackTheme ? '#ffc700' : '#ff0000',
    volumeDownFill: isBlackTheme ? '#ffd700' : '#ccccff',
    volumeDownStroke: isBlackTheme ? '#ffc700' : '#0000ff'
  };

  // 色変換関数：青色を緑色に変換
  const convertBlueToGreen = (color: string): string => {
    // 青系の色を緑色に変換
    if (color === '#0000ff' || color === '#0000FF' || color === 'blue') {
      return '#00aa00'; // 緑色に変換
    }
    if (color === '#4169e1' || color === '#4169E1') { // Royal Blue
      return '#32cd32'; // Lime Green
    }
    if (color === '#1e90ff' || color === '#1E90FF') { // Dodger Blue
      return '#00ff00'; // Pure Green
    }
    if (color === '#00bfff' || color === '#00BFFF') { // Deep Sky Blue
      return '#00ff7f'; // Spring Green
    }
    // その他の青系の色もここで変換可能
    return color; // 青系でない場合はそのまま返す
  };

  // Y軸のドメインを事前に計算する関数
  const calculateYDomain = useCallback(() => {
    if (data.length === 0) return { min: 0, max: 100 };
    
    const allValues = data.flatMap(d => [d.high, d.low]);
    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);
    const valueRange = maxValue - minValue;
    const padding = valueRange * 0.1;
    
    return {
      min: minValue - padding,
      max: maxValue + padding
    };
  }, [data]);

  // ロウソク足の中心Y座標を計算する関数
  const calculateCandleYPosition = useCallback((dataItem: ExtendedChartData, chartHeight: number) => {
    const { min: yAxisMin, max: yAxisMax } = calculateYDomain();
    const yAxisRange = yAxisMax - yAxisMin;
    
    // ロウソク足の中心値（高値と安値の中間）
    const candleCenter = (dataItem.high + dataItem.low) / 2;
    
    // Y軸における相対位置（0が上、1が下）
    const yRatio = (yAxisMax - candleCenter) / yAxisRange;
    
    // 実際の描画領域の高さ
    const drawableHeight = chartHeight - UPPER_CHART_MARGIN.top - UPPER_CHART_MARGIN.bottom;
    
    // 実際のピクセル位置
    const yPosition = UPPER_CHART_MARGIN.top + (yRatio * drawableHeight);
    
    return yPosition;
  }, [calculateYDomain]);

  // チャートを画像として出力する関数
  const exportAsImage = useCallback(async (): Promise<string> => {
    if (!chartContainerRef.current) {
      throw new Error('Chart container not found');
    }

    try {
      const container = chartContainerRef.current;
      
      // 上段と下段のチャートの高さを正確に計算
      const upperHeight = window.innerWidth >= 768 ? pcHeight.upper : mobileHeight.upper;
      const lowerHeight = window.innerWidth >= 768 ? pcHeight.lower : mobileHeight.lower;
      const totalHeight = upperHeight + lowerHeight;
      
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
      
      const url = ctx.canvas.toDataURL('image/png');
      return url;
    } catch (error) {
      console.error('Error exporting chart as image:', error);
      throw error;
    }
  }, [colors.background, pcHeight, mobileHeight]);

  // refに関数を公開
  useImperativeHandle(ref, () => ({
    exportAsImage,
    isTooltipRendered: () => isTooltipRendered
  }), [exportAsImage, isTooltipRendered]);

  // データ取得用のuseEffect
  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const formattedData = await fetchChartAndNewsData(code);
        if (isMounted) {
          // 黒テーマの時だけデータの色を変換
          const convertedData = theme === 'black' ? formattedData.map(item => ({
            ...item,
            color: convertBlueToGreen(item.color)
          })) : formattedData;
          setData(convertedData);
          setIsChartReady(true);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'An error occurred');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    fetchData();
    return () => {
      isMounted = false;
    };
  }, [code, theme]);

  // tooltip座標計算
  useEffect(() => {
    if (data.length > 0 && containerWidth > 0 && isChartReady) {
      const timer = setTimeout(() => {
        const chartHeight = window.innerWidth >= 768 ? pcHeight.upper : mobileHeight.upper;
        const zones = calculateTooltipZones(
          data,
          actualChartPositionsRef.current,
          containerWidth,
          chartHeight,
          showEmptyAreas,
          maxNewsTooltips
        );
        setTooltipZones(zones);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [data, containerWidth, isChartReady, pcHeight.upper, mobileHeight.upper, showEmptyAreas, maxNewsTooltips]);

  // Tooltip描画完了の検知
  useEffect(() => {
    if (isChartReady && !asImage && tooltipZones.length > 0) {
      const timer = setTimeout(() => {
        setIsTooltipRendered(true);
        if (onTooltipRendered) {
          onTooltipRendered(true);
        }
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setIsTooltipRendered(false);
      if (onTooltipRendered) {
        onTooltipRendered(false);
      }
    }
  }, [isChartReady, asImage, tooltipZones, onTooltipRendered]);

  useEffect(() => {
    if (asImage && isChartReady && data.length > 0) {
      const generateImage = async () => {
        try {
          const url = await exportAsImage();
          setImageUrl(url);
          if (onImageGenerated) {
            onImageGenerated(url);
          }
        } catch (error) {
          console.error('Failed to generate image:', error);
        }
      };
      
      setTimeout(generateImage, 500);
    }
  }, [asImage, isChartReady, data, onImageGenerated, exportAsImage]);

  if (loading) {
    return (
      <div className="mt-2 animate-pulse" style={{ width, backgroundColor: colors.background }}>
        <div 
          className="rounded"
          style={{
            height: `${window.innerWidth >= 768 ? pcHeight.upper : mobileHeight.upper}px`,
            backgroundColor: colors.loadingBg
          }}
        ></div>
        <div 
          className="rounded mt-2"
          style={{
            height: `${window.innerWidth >= 768 ? pcHeight.lower : mobileHeight.lower}px`,
            backgroundColor: colors.loadingBg
          }}
        ></div>
      </div>
    );
  }
  if (error) return <div className="p-4" style={{ color: colors.errorText }}>Error:{error}</div>;
  if (data.length === 0) return null;

  if (asImage && imageUrl) {
    return (
      <div className="mt-2" style={{ width }}>
        <Image 
          src={imageUrl} 
          alt={`Stock chart for ${code}`} 
          className="w-full"
          width={800}
          height={600}
        />
      </div>
    );
  }

  const displayData = hoveredData || data[data.length - 1];

  return (
    <div className="mt-2" style={{ width, backgroundColor: colors.background }} ref={chartContainerRef}>
      {/* 上段チャート（ロウソク足 + 移動平均） */}
      <div 
        ref={upperChartRef}
        className="relative"
        style={{
          height: `${window.innerWidth >= 768 ? pcHeight.upper : mobileHeight.upper}px`,
          backgroundColor: colors.background
        }}
      >
        {/* 価格情報を左上に表示 */}
        <div className="absolute top-1 left-14 z-30 pointer-events-none">
          <div className="text-[10px] space-y-0.5 px-1 py-0.5 rounded" style={{ backgroundColor: colors.infoBg }}>
            <div style={{ color: colors.textSecondary }}>始値:{displayData.open.toLocaleString()}</div>
            <div style={{ color: colors.textSecondary }}>高値:{displayData.high.toLocaleString()}</div>
            <div style={{ color: colors.textSecondary }}>安値:{displayData.low.toLocaleString()}</div>
            <div style={{ color: colors.textSecondary }}>終値:{displayData.close.toLocaleString()}</div>
          </div>
        </div>

        {/* Tooltip配置 */}
        {isChartReady && !asImage && tooltipZones.map((zone, index) => {
          // 空白領域の表示
          if (zone.index === -1) {
            return (
              <div 
                key={`empty-tooltip-${index}`}
                className="absolute z-30"
                style={{ 
                  left: `${zone.xPosition}px`,
                  top: `${zone.yPosition}px`,
                  width: '140px',
                  height: '60px'
                }}
              >
                <div 
                  className="border-2 rounded-lg w-full h-full flex items-center justify-center"
                  style={{ 
                    backgroundColor: colors.emptyAreaBg,
                    borderColor: colors.emptyAreaBorder
                  }}
                >
                  <span className="text-xs" style={{ color: colors.emptyAreaText }}>空白領域 #{zone.zone + 1}</span>
                </div>
              </div>
            );
          }

          // ニュース記事のtooltip表示
          const item = data[zone.index];
          if (!item || !item.articles || item.articles.length === 0) return null;
          const tooltipLeft = Math.max(5, Math.min(containerWidth - 145, zone.xPosition));
          
          // チャートの高さを取得
          const chartHeight = window.innerWidth >= 768 ? pcHeight.upper : mobileHeight.upper;
          
          // ロウソク足の中心座標を計算
          const candleX = actualChartPositionsRef.current[zone.index] || 
            (UPPER_CHART_MARGIN.left + ((containerWidth - UPPER_CHART_MARGIN.left - UPPER_CHART_MARGIN.right) / data.length) * (zone.index + 0.5));
          const candleY = calculateCandleYPosition(item, chartHeight);
          
          return (
            <React.Fragment key={`tooltip-zone-${zone.index}`}>
              <div 
                className="absolute z-30 pointer-events-none"
                style={{ 
                  left: `${tooltipLeft}px`,
                  top: `${zone.yPosition}px`
                }}
              >
                <div 
                  className="border rounded-lg px-2 py-1.5 w-[140px] min-w-[140px] max-w-[140px] pointer-events-auto shadow-lg hover:shadow-xl transition-shadow duration-200"
                  style={{ 
                    backgroundColor: colors.tooltipBg,
                    borderColor: colors.tooltipBorder
                  }}
                >
                  <div className="space-y-0.5">
                    <div className="text-[10px] font-medium" style={{ color: colors.textSecondary }}>{item.date}</div>
                    <div
                      className="text-xs hover:text-blue-400 cursor-pointer rounded transition-colors duration-150 leading-[1.3] font-medium"
                      style={{
                        color: isBlackTheme ? '#e0e0e0' : '#374151',
                        wordWrap: 'break-word',
                        wordBreak: 'break-word',
                        display: 'block',
                        lineHeight: '1.3em',
                      }}
                      onClick={() => {
                        if (!item.articles?.length) return;
                        const article = item.articles[0];
                        const articleCode = item.code || code;
                        window.location.href = `/${articleCode}/news/article/${article.id}`;
                      }}
                    >
                      {formatArticleTitle(item.articles[0]?.title || '')}
                    </div>
                  </div>
                </div>
              </div>
              <svg
                className="absolute top-0 left-0 w-full h-full pointer-events-none z-10"
                style={{ overflow: 'visible' }}
              >
                <line
                  x1={tooltipLeft + 70} // tooltip中心からスタート
                  y1={zone.yPosition + 30} // tooltipの下辺から
                  x2={candleX}
                  y2={candleY}
                  stroke={colors.lineConnector}
                  strokeWidth="1.5"
                  strokeDasharray="2,2"
                  markerEnd={`url(#arrowhead-${zone.index})`}
                />
                <defs>
                  <marker
                    id={`arrowhead-${zone.index}`}
                    markerWidth="10"
                    markerHeight="7"
                    refX="9"
                    refY="3.5"
                    orient="auto"
                  >
                    <polygon
                      points="0 0, 10 3.5, 0 7"
                      fill={colors.lineConnector}
                    />
                  </marker>
                </defs>
              </svg>
            </React.Fragment>
          );
        })}

        <ResponsiveContainer width="100%" height="100%" onResize={handleResize(
          setContainerWidth,
          actualChartPositionsRef,
          setIsChartReady,
          containerWidth,
          data,
          () => {
            if (data.length > 0) {
              const chartHeight = window.innerWidth >= 768 ? pcHeight.upper : mobileHeight.upper;
              const zones = calculateTooltipZones(
                data,
                actualChartPositionsRef.current,
                containerWidth,
                chartHeight,
                showEmptyAreas,
                maxNewsTooltips
              );
              setTooltipZones(zones);
            }
          }
        )}>
          <ComposedChart 
            data={data} 
            barCategoryGap={0} 
            barGap={0}
            margin={UPPER_CHART_MARGIN}
            onMouseMove={(e) => {
              if (e.activePayload?.[0]?.payload) {
                const payload = e.activePayload[0].payload;
                setHoveredData(payload);
                if (e.activeCoordinate) {
                  const dataIndex = data.findIndex(item => item.date === payload.date);
                  if (dataIndex !== -1) {
                    recordChartPosition(actualChartPositionsRef, dataIndex, e.activeCoordinate.x);
                  }
                }
              }
            }}
            onMouseLeave={() => {
              setHoveredData(null);
            }}
            onClick={(e) => {
              if (e.activePayload?.[0]?.payload?.articles && e.activePayload[0].payload.articles.length > 0) {
                const article = e.activePayload[0].payload.articles[0];
                const articleCode = e.activePayload[0].payload.code || code;
                window.location.href = `/${articleCode}/news/article/${article.id}`;
              }
            }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.gridColor} />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12, fill: colors.text }} 
              interval="preserveStartEnd" 
              hide
            />
            <YAxis 
              domain={[calculateYDomain().min, calculateYDomain().max]}
              tick={{ fontSize: 12, dx: -5, fill: colors.text }} 
              width={25}
            />
            <Tooltip 
              content={() => null}
              cursor={false}
            />
            <Bar
              dataKey="highLowBar"
              fill="none"
              stroke={isBlackTheme ? '#ffffff' : '#000000'}
              strokeWidth={1}
              name="値幅"
              shape={(props: unknown) => <CandleWickShape {...(props as RectangleProps)} />}
            />
            <Bar
              dataKey="candlestick"
              name="株価"
              shape={(props: unknown) => <CandleBodyShape {...(props as RectangleProps)} />}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  stroke={entry.color}
                />
              ))}
            </Bar>
            <Line type="monotone" dataKey="ma5" stroke={colors.ma5Color} dot={false} name="MA(5)" />
            <Line type="monotone" dataKey="ma25" stroke={colors.ma25Color} dot={false} name="MA(25)" />
            <Line type="monotone" dataKey="ma75" stroke={colors.ma75Color} dot={false} name="MA(75)" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* 下段チャート（出来高） */}
      <div 
        className="relative -mt-1"
        style={{
          height: `${window.innerWidth >= 768 ? pcHeight.lower : mobileHeight.lower}px`,
          backgroundColor: colors.background
        }}
      >
        {/* 出来高情報を左上に表示 */}
        <div className="absolute top-1 left-14 z-30 pointer-events-none">
          <div className="text-[10px] px-1 py-0.5 rounded" style={{ backgroundColor: colors.infoBg }}>
            <div style={{ color: colors.textSecondary }}>
              出来高:{(displayData.volume / 10000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}万株
            </div>
          </div>
        </div>
        
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart 
            data={data}
            barCategoryGap={0}
            barGap={0}
            margin={LOWER_CHART_MARGIN}
            onMouseMove={(e) => {
              if (e.activePayload?.[0]?.payload) {
                const payload = e.activePayload[0].payload;
                setHoveredData(payload);
                if (e.activeCoordinate) {
                  const dataIndex = data.findIndex(item => item.date === payload.date);
                  if (dataIndex !== -1) {
                    recordChartPosition(actualChartPositionsRef, dataIndex, e.activeCoordinate.x);
                  }
                }
              }
            }}
            onMouseLeave={() => {
              setHoveredData(null);
            }}
            onClick={(e) => {
              if (e.activePayload?.[0]?.payload?.articles && e.activePayload[0].payload.articles.length > 0) {
                const article = e.activePayload[0].payload.articles[0];
                const articleCode = e.activePayload[0].payload.code || code;
                window.location.href = `/${articleCode}/news/article/${article.id}`;
              }
            }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.gridColor} />
            <XAxis dataKey="date" tick={{ fontSize: 12, fill: colors.text }} interval="preserveStartEnd" />
            <YAxis
              tick={{ fontSize: 12, dx: -5, fill: colors.text }}
              tickFormatter={(value: number) => formatNumber(value / 10000)}
              width={25}
            />
            <Tooltip 
              content={() => null}
              cursor={false}
            />
            <Bar 
              dataKey="volume" 
              name="出来高" 
              shape={(props: unknown) => {
                const { x, y, width, height, fill, stroke } = props as RectangleProps;
                if (x == null || y == null || width == null || height == null) {
                  return <></>;
                }
                const adjustedX = x + width * 0.2;
                const adjustedWidth = width * 0.6;
                
                return (
                  <rect
                    x={adjustedX}
                    y={y}
                    width={adjustedWidth}
                    height={height}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={1}
                  />
                );
              }}
            >
              {data.map((entry, index) => {
                // 黒テーマの時だけ青色系を緑色系に変換
                const originalColor = entry.color;
                const convertedColor = theme === 'black' ? convertBlueToGreen(originalColor) : originalColor;
                
                return (
                  <Cell
                    key={`volume-cell-${index}`}
                    fill={convertedColor === '#ff0000' ? colors.volumeUpFill : colors.volumeDownFill}
                    stroke={convertedColor === '#ff0000' ? colors.volumeUpStroke : colors.volumeDownStroke}
                  />
                );
              })}
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

StockChart.displayName = 'StockChart';

export default StockChart;