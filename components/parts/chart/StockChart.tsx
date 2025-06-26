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
  showEmptyAreas?: boolean; // 空白領域を表示するかどうか
  maxNewsTooltips?: number; // 表示する最大ニュース数
}

export interface StockChartRef {
  exportAsImage: () => Promise<string>;
  isTooltipRendered: () => boolean;
}

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
  showEmptyAreas = false, // デフォルトは非表示
  maxNewsTooltips
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

  // チャートを画像として出力する関数
  const exportAsImage = useCallback(async (): Promise<string> => {
    if (!chartContainerRef.current) {
      throw new Error('Chart container not found');
    }

    try {
      const canvas = await html2canvas(chartContainerRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
        windowHeight: chartContainerRef.current.scrollHeight + 100,
        height: chartContainerRef.current.scrollHeight + 50
      });

      const url = canvas.toDataURL('image/png');
      return url;
    } catch (error) {
      console.error('Error exporting chart as image:', error);
      throw error;
    }
  }, []);

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
          setData(formattedData);
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
  }, [code]);

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
      <div className="mt-2 animate-pulse" style={{ width }}>
        <div 
          className="bg-gray-200 rounded"
          style={{
            height: `${window.innerWidth >= 768 ? pcHeight.upper : mobileHeight.upper}px`
          }}
        ></div>
        <div 
          className="bg-gray-200 rounded mt-2"
          style={{
            height: `${window.innerWidth >= 768 ? pcHeight.lower : mobileHeight.lower}px`
          }}
        ></div>
      </div>
    );
  }
  if (error) return <div className="text-red-500 p-4">Error:{error}</div>;
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
    <div className="mt-2" style={{ width }} ref={chartContainerRef}>
      {/* 上段チャート（ロウソク足 + 移動平均） */}
      <div 
        ref={upperChartRef}
        className="relative"
        style={{
          height: `${window.innerWidth >= 768 ? pcHeight.upper : mobileHeight.upper}px`
        }}
      >
        {/* 価格情報を左上に表示 */}
        <div className="absolute top-1 left-9 z-30 pointer-events-none">
          <div className="text-[10px] space-y-0.5 bg-white/80 px-1 py-0.5 rounded">
            <div className="text-gray-600">始値:{displayData.open.toLocaleString()}</div>
            <div className="text-gray-600">高値:{displayData.high.toLocaleString()}</div>
            <div className="text-gray-600">安値:{displayData.low.toLocaleString()}</div>
            <div className="text-gray-600">終値:{displayData.close.toLocaleString()}</div>
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
                <div className="bg-gray-100/80 border-2 border-gray-300 rounded-lg w-full h-full flex items-center justify-center">
                  <span className="text-xs text-gray-500">空白領域 #{zone.zone + 1}</span>
                </div>
              </div>
            );
          }

          // ニュース記事のtooltip表示
          const item = data[zone.index];
          if (!item || !item.articles || item.articles.length === 0) return null;
          const tooltipLeft = Math.max(5, Math.min(containerWidth - 145, zone.xPosition));
          return (
            <React.Fragment key={`tooltip-zone-${zone.index}`}>
              <div 
                className="absolute z-30 pointer-events-none"
                style={{ 
                  left: `${tooltipLeft}px`,
                  top: `${zone.yPosition}px`
                }}
              >
                <div className="bg-white/65 border border-gray-300 rounded-lg px-2 py-1.5 w-[140px] min-w-[140px] max-w-[140px] pointer-events-auto shadow-lg hover:shadow-xl transition-shadow duration-200">
                  <div className="absolute -top-0.5 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
                  <div className="space-y-0.5">
                    <div className="text-[10px] text-gray-500 font-medium">{item.date}</div>
                    <div
                      className="text-xs text-gray-800 hover:text-blue-600 cursor-pointer rounded transition-colors duration-150 leading-[1.3] font-medium"
                      style={{
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
                  y1={zone.yPosition + 30}
                  x2={actualChartPositionsRef.current[zone.index] || ((containerWidth / data.length) * (zone.index + 0.5))}
                  y2={(() => {
                    const dataItem = data[zone.index];
                    const allValues = data.flatMap(d => [d.high, d.low]);
                    const minValue = Math.min(...allValues);
                    const maxValue = Math.max(...allValues);
                    const valueRange = maxValue - minValue;
                    const padding = valueRange * 0.1;
                    const yAxisMin = minValue - padding;
                    const yAxisMax = maxValue + padding;
                    const yAxisRange = yAxisMax - yAxisMin;
                    
                    const centerValue = (dataItem.high + dataItem.low) / 2;
                    const yRatio = 1 - (centerValue - yAxisMin) / yAxisRange;
                    
                    return `${yRatio * 100}%`;
                  })()}
                  stroke="#666"
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
                      fill="#666"
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
            margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
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
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }} 
              interval="preserveStartEnd" 
              hide
            />
            <YAxis 
              domain={['auto', 'auto']} 
              tick={{ fontSize: 12, dx: 2 }} 
              width={35}
            />
            <Tooltip 
              content={() => null}
              cursor={false}
            />
            <Bar
              dataKey="highLowBar"
              fill="none"
              stroke="#000000"
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
            <Line type="monotone" dataKey="ma5" stroke="#00ff00" dot={false} name="MA(5)" />
            <Line type="monotone" dataKey="ma25" stroke="#ff0000" dot={false} name="MA(25)" />
            <Line type="monotone" dataKey="ma75" stroke="#0000ff" dot={false} name="MA(75)" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* 下段チャート（出来高） */}
      <div 
        className="relative"
        style={{
          height: `${window.innerWidth >= 768 ? pcHeight.lower : mobileHeight.lower}px`
        }}
      >
        {/* 出来高情報を左上に表示 */}
        <div className="absolute top-1 left-9 z-30 pointer-events-none">
          <div className="text-[10px] bg-white/80 px-1 py-0.5 rounded">
            <div className="text-gray-600">
              出来高:{(displayData.volume / 10000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}万株
            </div>
          </div>
        </div>
        
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart 
            data={data}
            barCategoryGap={0}
            barGap={0}
            margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
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
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} interval="preserveStartEnd" />
            <YAxis
              tick={{ fontSize: 12, dx: 2 }}
              tickFormatter={(value: number) => formatNumber(value / 10000)}
              label={{ 
                value: '万株', 
                position: 'top',
                offset: -10,
                dx: 0,
                dy: 48,
                fontSize: 11 
              }}
              width={35}
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
              {data.map((entry, index) => (
                <Cell
                  key={`volume-cell-${index}`}
                  fill={entry.color === '#ff0000' ? '#ffcccc' : '#ccccff'}
                  stroke={entry.color === '#ff0000' ? '#ff0000' : '#0000ff'}
                />
              ))}
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

StockChart.displayName = 'StockChart';

export default StockChart;