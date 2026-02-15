'use client';

import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle, useCallback, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
  ReferenceDot,
  RectangleProps
} from 'recharts';
import { ExtendedChartData } from './types/StockChartTypes';
import { formatNumber, fetchChartAndNewsData, recordChartPosition, handleResize } from './StockChartUtils';
import { CandleWickShape, CandleBodyShape } from './StockChartShapes';
import { TooltipZone, calculateTooltipZones } from './StockChartLayoutUtils';
import { formatArticleTitle } from './StockChartTooltip';
import { StockChartProps, StockChartRef, UPPER_CHART_MARGIN, LOWER_CHART_MARGIN } from './StockChartTypes';
import { getThemeColors, convertBlueToGreen } from './StockChartTheme';
import { fetchCompanyInfo } from './StockChartApi';
import { CompanyHeader } from './StockChartHeader';
import { StockChartImage, exportAsImage } from './StockChartImage';

// Add this type definition after imports
interface ExtendedRectangleProps extends RectangleProps {
  payload?: ExtendedChartData & {
    date: string;
    articles?: Array<{ id: string; title: string }>;
    code?: string;
    index: number;
  };
}

/* --------------------------------------------------
 * メインのチャートコンポーネント
 * -------------------------------------------------- */
// 画面幅に応じたチャート高さを返すヘルパー
function getResponsiveHeight(
  pcHeight: { upper: number; lower: number },
  tabletHeight: { upper: number; lower: number },
  mobileHeight: { upper: number; lower: number },
  dimension: 'upper' | 'lower'
): number {
  if (typeof window === 'undefined') return pcHeight[dimension];
  const w = window.innerWidth;
  if (w >= 1024) return pcHeight[dimension];
  if (w >= 640) return tabletHeight[dimension];
  return mobileHeight[dimension];
}

const StockChart = forwardRef<StockChartRef, StockChartProps>(({
  code,
  width = '100%',
  pcHeight = {
    upper: 192,
    lower: 96
  },
  tabletHeight: tabletHeightProp,
  mobileHeight = {
    upper: 148,
    lower: 80
  },
  asImage = false,
  onImageGenerated,
  onTooltipRendered,
  showEmptyAreas = false,
  maxNewsTooltips,
  theme = 'default',
  company_name = false,
  newsInstitution,
  targetDate,
  hideNewsTooltips = false,
  predictionData
}, ref) => {
  // 高さの値をuseMemoで安定化（依存配列の不安定を防止）
  const { upper: pcUpper, lower: pcLower } = pcHeight;
  const { upper: mobileUpper, lower: mobileLower } = mobileHeight;
  const stablePcHeight = useMemo(() => ({ upper: pcUpper, lower: pcLower }), [pcUpper, pcLower]);
  const stableMobileHeight = useMemo(() => ({ upper: mobileUpper, lower: mobileLower }), [mobileUpper, mobileLower]);
  const tabletHeight = useMemo(() => tabletHeightProp ?? {
    upper: Math.round((stablePcHeight.upper + stableMobileHeight.upper) / 2),
    lower: Math.round((stablePcHeight.lower + stableMobileHeight.lower) / 2),
  }, [tabletHeightProp, stablePcHeight, stableMobileHeight]);

  const [data, setData] = useState<ExtendedChartData[]>([]);
  const [predictionStartIndex, setPredictionStartIndex] = useState<number | null>(null);
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
  const [companyInfo, setCompanyInfo] = useState<{
    companyName: string;
    changePrice: number;
    changePercent: number;
    currentPrice: number;
  } | null>(null);
  
  // チャートがレンダリングされ、初期位置が計算されたかを追跡
  const [isInitialPositionCalculated, setIsInitialPositionCalculated] = useState(false);
  
  // ローソク足描画時の実際のX座標を記録するref
  const candleXPositionsRef = useRef<number[]>([]);

  // テーマに基づく色設定
  const colors = getThemeColors(theme);

  // Y軸のドメインを事前に計算する関数（きれいな区切りに丸める）
  const calculateYDomain = useCallback(() => {
    if (data.length === 0) return { min: 0, max: 100 };

    const allValues = data.flatMap(d => [d.high, d.low]);
    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);
    const valueRange = maxValue - minValue;
    const padding = valueRange * 0.1;

    // きれいな区切り値を計算
    const magnitude = Math.pow(10, Math.floor(Math.log10(valueRange)));
    const normalized = valueRange / magnitude;
    const niceStep = normalized <= 1.5 ? magnitude * 0.2
      : normalized <= 3 ? magnitude * 0.5
      : normalized <= 7 ? magnitude
      : magnitude * 2;

    return {
      min: Math.floor((minValue - padding) / niceStep) * niceStep,
      max: Math.ceil((maxValue + padding) / niceStep) * niceStep
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

  // tooltip座標を再計算する関数
  const recalculateTooltipZones = useCallback(() => {
    const chartHeight = getResponsiveHeight(stablePcHeight, tabletHeight, stableMobileHeight, 'upper');
    const zones = calculateTooltipZones(
      data,
      actualChartPositionsRef.current,
      containerWidth,
      chartHeight,
      showEmptyAreas,
      maxNewsTooltips
    );
    setTooltipZones(zones);
  }, [data, containerWidth, stablePcHeight, tabletHeight, stableMobileHeight, showEmptyAreas, maxNewsTooltips]);


  const calculateCandleXPosition = useCallback((index: number, totalDataPoints: number, chartWidth: number) => {
    // ローソク足描画時に記録された実際のX座標があればそれを使用
    if (candleXPositionsRef.current[index] && candleXPositionsRef.current[index] > 0) {
      return candleXPositionsRef.current[index];
    }
    
    // チャートの描画領域の幅を計算
    const drawableWidth = chartWidth - UPPER_CHART_MARGIN.left - UPPER_CHART_MARGIN.right;
    
    // Rechartsのバンドスケールを模倣
    // barCategoryGap=0の場合でも、Rechartsは内部的に小さなパディングを適用
    const bandWidth = drawableWidth / totalDataPoints;
    
    // barCategoryGap=0の場合の実際のバー位置計算
    // Rechartsは各バンドの中心にバーを配置
    const bandCenter = UPPER_CHART_MARGIN.left + (index + 0.5) * bandWidth;
    
    return bandCenter;
  }, []);

  // 初期位置の計算と記録
  const calculateInitialPositions = useCallback(() => {
    if (data.length > 0 && containerWidth > 0 && !isInitialPositionCalculated) {
      // 初期位置を計算して記録（実際の位置は後でhover時に更新される）
      actualChartPositionsRef.current = new Array(data.length).fill(0);
      candleXPositionsRef.current = new Array(data.length).fill(0);
      setIsInitialPositionCalculated(true);
    }
  }, [data, containerWidth, isInitialPositionCalculated]);

  // refに関数を公開
  useImperativeHandle(ref, () => ({
    exportAsImage: () => {
      return exportAsImage(chartContainerRef, colors, stablePcHeight, tabletHeight, stableMobileHeight, company_name, companyInfo);
    },
    isTooltipRendered: () => isTooltipRendered
  }), [colors, stablePcHeight, tabletHeight, stableMobileHeight, company_name, companyInfo, isTooltipRendered]);

  // データ取得用のuseEffect
  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const formattedData = await fetchChartAndNewsData(code, newsInstitution, targetDate);
        if (isMounted) {
          // 黒テーマの時だけデータの色を変換
          const convertedData = theme === 'black' ? formattedData.map(item => ({
            ...item,
            color: convertBlueToGreen(item.color)
          })) : formattedData;
          // 予測データがある場合はマージ
          if (predictionData && predictionData.length > 0) {
            const predictionEntries: ExtendedChartData[] = predictionData.map(p => {
              const open = p.predictedOpen ?? p.predictedClose;
              const close = p.predictedClose;
              const isPositive = close >= open;
              return {
                date: p.date,
                open,
                high: p.predictedHigh,
                low: p.predictedLow,
                close,
                volume: 0,
                highLowBar: [p.predictedLow, p.predictedHigh] as [number, number],
                candlestick: [open, close] as [number, number],
                color: isPositive ? '#ff0000' : '#0000ff',
                ma5: null,
                ma25: null,
                ma75: null,
                code: code,
                isPrediction: true,
                predictionHigh: p.predictedHigh,
                predictionLow: p.predictedLow,
                predictionClose: close,
              };
            });
            setPredictionStartIndex(convertedData.length);
            // 最後の実データにprediction値を設定してライン・バンドを接続
            if (convertedData.length > 0) {
              const lastActual = convertedData[convertedData.length - 1];
              convertedData[convertedData.length - 1] = {
                ...lastActual,
                predictionClose: lastActual.close,
                predictionHigh: lastActual.close,
                predictionLow: lastActual.close,
              };
            }
            const mergedData = [...convertedData, ...predictionEntries];
            setData(mergedData);
          } else {
            setData(convertedData);
          }
          setIsChartReady(true);
          
          // company_nameがtrueの場合、会社情報を取得して前日比を計算
          if (company_name && convertedData.length >= 2) {
            const latestData = convertedData[convertedData.length - 1];
            const previousData = convertedData[convertedData.length - 2];
            const changePrice = latestData.close - previousData.close;
            const changePercent = (changePrice / previousData.close) * 100;
            
            // APIから会社情報を取得
            const companyData = await fetchCompanyInfo(code);
            const companyDisplayName = companyData ? companyData.name : '会社名';
            
            setCompanyInfo({
              companyName: companyDisplayName,
              changePrice: changePrice,
              changePercent: changePercent,
              currentPrice: latestData.close
            });
          }
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
  }, [code, theme, company_name, newsInstitution, targetDate, predictionData]);

  // 初期位置の計算
  useEffect(() => {
    calculateInitialPositions();
  }, [calculateInitialPositions]);

  // tooltip座標計算（candleXPositionsRef.currentを依存関係から削除）
  useEffect(() => {
    if (data.length > 0 && containerWidth > 0 && isChartReady) {
      const timer = setTimeout(() => {
        recalculateTooltipZones();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [data, containerWidth, isChartReady, recalculateTooltipZones]);

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
          const url = await exportAsImage(chartContainerRef, colors, stablePcHeight, tabletHeight, stableMobileHeight, company_name, companyInfo);
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
  }, [asImage, isChartReady, data, onImageGenerated, colors, stablePcHeight, tabletHeight, stableMobileHeight, company_name, companyInfo]);

  if (loading) {
    const upperH = getResponsiveHeight(stablePcHeight, tabletHeight, stableMobileHeight, 'upper');
    const lowerH = getResponsiveHeight(stablePcHeight, tabletHeight, stableMobileHeight, 'lower');
    return (
      <div className="mt-2 flex items-center justify-center" style={{ width, height: `${upperH + lowerH + 8}px`, backgroundColor: colors.background }}>
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-gray-600"></div>
      </div>
    );
  }
  if (error) return <div className="p-4" style={{ color: colors.errorText }}>Error:{error}</div>;
  if (data.length === 0) return null;

  if (asImage && imageUrl) {
    return (
      <StockChartImage
        chartContainerRef={chartContainerRef}
        colors={colors}
        pcHeight={stablePcHeight}
        tabletHeight={tabletHeight}
        mobileHeight={stableMobileHeight}
        company_name={company_name}
        companyInfo={companyInfo}
        code={code}
        theme={theme}
        imageUrl={imageUrl}
      />
    );
  }

  const displayData = hoveredData || data[data.length - 1];

  return (
    <div className="mt-2" style={{ width, backgroundColor: colors.background }} ref={chartContainerRef}>
      <CompanyHeader
        company_name={company_name}
        companyInfo={companyInfo}
        code={code}
        theme={theme}
        colors={colors}
      />
      
      {/* 上段チャート（ロウソク足 + 移動平均） */}
      <div 
        ref={upperChartRef}
        className="relative"
        style={{
          height: `${getResponsiveHeight(stablePcHeight, tabletHeight, stableMobileHeight, 'upper')}px`,
          backgroundColor: colors.background
        }}
      >
        {/* 価格情報を左上に表示 */}
        <div className="absolute top-1 left-20 z-30 pointer-events-none">
          <div className="text-[10px] space-y-0.5 px-1 py-0.5 rounded" style={{ backgroundColor: colors.infoBg }}>
            <div style={{ color: colors.textSecondary }}>始値:{displayData.open.toLocaleString()}</div>
            <div style={{ color: colors.textSecondary }}>高値:{displayData.high.toLocaleString()}</div>
            <div style={{ color: colors.textSecondary }}>安値:{displayData.low.toLocaleString()}</div>
            <div style={{ color: colors.textSecondary }}>終値:{displayData.close.toLocaleString()}</div>
          </div>
        </div>

        {/* Tooltip配置 */}
        {isChartReady && !asImage && !hideNewsTooltips && tooltipZones.map((zone, index) => {
          // 空白領域の表示
          if (zone.index === -1) {
            return (
              <div 
                key={`empty-tooltip-${index}`}
                className="absolute z-30"
                style={{ 
                  left: `${zone.xPosition}px`,
                  top: `${zone.yPosition}px`,
                  width: '110px',
                  height: '44px'
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
          const tooltipLeft = Math.max(5, Math.min(containerWidth - 115, zone.xPosition));
          
          // チャートの高さを取得
          const chartHeight = getResponsiveHeight(stablePcHeight, tabletHeight, stableMobileHeight, 'upper');
          
          // ロウソク足の中心座標を計算
          let candleX;
          
          // 優先順位：
          // 1. hover時に記録された実際の位置
          // 2. ローソク足描画時に記録された位置
          // 3. 計算値
          if (actualChartPositionsRef.current[zone.index] && actualChartPositionsRef.current[zone.index] > 0) {
            candleX = actualChartPositionsRef.current[zone.index];
          } else if (candleXPositionsRef.current[zone.index] && candleXPositionsRef.current[zone.index] > 0) {
            candleX = candleXPositionsRef.current[zone.index];
          } else {
            // まだ記録されていない場合は計算値を使用
            candleX = calculateCandleXPosition(zone.index, data.length, containerWidth);
          }
          
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
                  className="border rounded-md px-1.5 py-1 w-[110px] min-w-[110px] max-w-[110px] pointer-events-auto shadow-sm"
                  style={{
                    backgroundColor: colors.tooltipBg,
                    borderColor: colors.tooltipBorder
                  }}
                >
                  <div
                    className="text-[10px] leading-tight hover:text-blue-400 cursor-pointer transition-colors duration-150 font-medium line-clamp-2"
                    style={{
                      color: theme === 'black' ? '#e0e0e0' : '#374151',
                    }}
                    onClick={() => {
                      if (!item.articles?.length) return;
                      const article = item.articles[0];
                      const articleCode = item.code || code;
                      if (typeof window !== 'undefined') {
                        window.location.href = `/stocks/${articleCode}/news/${article.id}`;
                      }
                    }}
                  >
                    {formatArticleTitle(item.articles[0]?.title || '')}
                  </div>
                </div>
              </div>
              <svg
                className="absolute top-0 left-0 w-full h-full pointer-events-none z-10"
                style={{ overflow: 'visible' }}
              >
                {(() => {
                  // tooltipの情報
                  const tooltipWidth = 110;
                  const tooltipHeight = 22; // おおよその高さ
                  const tooltipBottom = zone.yPosition + tooltipHeight;
                  
                  // ローソク足とtooltipの相対位置を計算
                  let startX: number;
                  let startY: number;
                  
                  // X軸方向の判定
                  if (candleX < tooltipLeft) {
                    // ローソク足が左側にある場合：tooltipの左辺から
                    startX = tooltipLeft;
                  } else if (candleX > tooltipLeft + tooltipWidth) {
                    // ローソク足が右側にある場合：tooltipの右辺から
                    startX = tooltipLeft + tooltipWidth;
                  } else {
                    // ローソク足が真下にある場合：X座標をそのまま使用
                    startX = candleX;
                  }
                  
                  // Y軸方向の判定
                  if (candleY > tooltipBottom) {
                    // ローソク足が下にある場合：tooltipの下辺から
                    startY = tooltipBottom;
                  } else {
                    // ローソク足が上または同じ高さの場合：tooltipの中央の高さから
                    startY = zone.yPosition + tooltipHeight / 2;
                  }
                  
                  return (
                    <>
                      <line
                        x1={startX}
                        y1={startY}
                        x2={candleX}
                        y2={candleY}
                        stroke={colors.lineConnector}
                        strokeWidth="0.8"
                        strokeDasharray="3 3"
                        strokeOpacity="0.5"
                        markerEnd={`url(#arrowhead-${zone.index})`}
                      />
                      <defs>
                        <marker
                          id={`arrowhead-${zone.index}`}
                          markerWidth="6"
                          markerHeight="5"
                          refX="5"
                          refY="2.5"
                          orient="auto"
                        >
                          <polygon
                            points="0 0, 6 2.5, 0 5"
                            fill={colors.lineConnector}
                            fillOpacity="0.5"
                          />
                        </marker>
                      </defs>
                    </>
                  );
                })()}
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
              recalculateTooltipZones();
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
                    const previousValue = actualChartPositionsRef.current[dataIndex];
                    recordChartPosition(actualChartPositionsRef, dataIndex, e.activeCoordinate.x);

                    // 初めて実際の位置が記録された場合、tooltipゾーンを再計算
                    if (!previousValue || previousValue === 0) {
                      recalculateTooltipZones();
                    }
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
                if (typeof window !== 'undefined') {
                  window.location.href = `/stocks/${articleCode}/news/${article.id}`;
                }
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
              tick={{ fontSize: 11, dx: -3, fill: colors.text }}
              width={45}
              allowDecimals={false}
              tickFormatter={(value: number) => value.toLocaleString()}
            />
            <Tooltip 
              content={() => null}
              cursor={false}
            />
            <Bar
              dataKey="highLowBar"
              fill="none"
              stroke={theme === 'black' ? '#ffffff' : '#000000'}
              strokeWidth={1}
              name="値幅"
              shape={(props: unknown) => <CandleWickShape {...(props as RectangleProps)} />}
            />
            <Bar
              dataKey="candlestick"
              name="株価"
              shape={(props: unknown) => {
                const chartProps = props as ExtendedRectangleProps;
                const articles = chartProps.payload?.articles;
                const date = chartProps.payload?.date;
                if (articles?.length && date && chartProps.x && chartProps.width) {
                  const dataIndex = data.findIndex(item => item.date === date);
                  const centerX = chartProps.x + chartProps.width / 2;

                  // ローソク足の中心X座標を記録
                  if (dataIndex !== -1) {
                    candleXPositionsRef.current[dataIndex] = centerX;
                  }
                }
                return <CandleBodyShape {...chartProps} />;
              }}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  stroke={entry.color}
                  fillOpacity={entry.isPrediction ? 0.4 : 1}
                  strokeOpacity={entry.isPrediction ? 0.5 : 1}
                  strokeDasharray={entry.isPrediction ? '4 2' : undefined}
                />
              ))}
            </Bar>
            <Line type="monotone" dataKey="ma5" stroke={colors.ma5Color} dot={false} name="MA(5)" />
            <Line type="monotone" dataKey="ma25" stroke={colors.ma25Color} dot={false} name="MA(25)" />
            <Line type="monotone" dataKey="ma75" stroke={colors.ma75Color} dot={false} name="MA(75)" />
            {predictionStartIndex !== null && data[predictionStartIndex] && (
              <ReferenceLine
                x={data[predictionStartIndex].date}
                stroke="#9ca3af"
                strokeDasharray="6 4"
                strokeWidth={1.5}
                label={{
                  value: '予測開始',
                  position: 'top',
                  fill: '#9ca3af',
                  fontSize: 10,
                }}
              />
            )}
            {/* 予測レンジバンド（High-Low間の塗りつぶし） */}
            {predictionStartIndex !== null && (
              <>
                <Area
                  dataKey="predictionHigh"
                  type="monotone"
                  baseValue={calculateYDomain().min}
                  fill="rgba(16, 185, 129, 0.08)"
                  stroke="none"
                  isAnimationActive={false}
                  connectNulls={false}
                />
                <Area
                  dataKey="predictionLow"
                  type="monotone"
                  baseValue={calculateYDomain().min}
                  fill={colors.background}
                  stroke="none"
                  isAnimationActive={false}
                  connectNulls={false}
                />
              </>
            )}
            {/* 予測ライン */}
            {predictionStartIndex !== null && (
              <>
                <Line type="monotone" dataKey="predictionHigh" stroke="rgba(16, 185, 129, 0.35)" strokeWidth={1} strokeDasharray="4 3" dot={false} isAnimationActive={false} connectNulls={false} name="予測高値" />
                <Line type="monotone" dataKey="predictionLow" stroke="rgba(16, 185, 129, 0.35)" strokeWidth={1} strokeDasharray="4 3" dot={false} isAnimationActive={false} connectNulls={false} name="予測安値" />
                <Line type="monotone" dataKey="predictionClose" stroke="#10b981" strokeWidth={2.5} dot={false} isAnimationActive={false} connectNulls={false} name="予測終値" />
              </>
            )}
            {/* 最終予測価格のマーカー */}
            {predictionStartIndex !== null && data.length > 0 && data[data.length - 1]?.isPrediction && data[data.length - 1]?.predictionClose && (
              <ReferenceDot
                x={data[data.length - 1].date}
                y={data[data.length - 1].predictionClose!}
                r={5}
                fill="#10b981"
                stroke="white"
                strokeWidth={2}
                label={{
                  value: `¥${Math.round(data[data.length - 1].predictionClose!).toLocaleString()}`,
                  position: 'left',
                  fill: '#10b981',
                  fontSize: 11,
                  fontWeight: 'bold',
                  offset: 8,
                }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* 下段チャート（出来高） */}
      <div 
        className="relative -mt-1"
        style={{
          height: `${getResponsiveHeight(stablePcHeight, tabletHeight, stableMobileHeight, 'lower')}px`,
          backgroundColor: colors.background
        }}
      >
        {/* 出来高情報を左上に表示 */}
        <div className="absolute top-1 left-20 z-30 pointer-events-none">
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
                if (typeof window !== 'undefined') {
                  window.location.href = `/stocks/${articleCode}/news/${article.id}`;
                }
              }
            }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.gridColor} />
            <XAxis dataKey="date" tick={{ fontSize: 12, fill: colors.text }} interval="preserveStartEnd" />
            <YAxis
              tick={{ fontSize: 11, dx: -3, fill: colors.text }}
              tickFormatter={(value: number) => formatNumber(value / 10000)}
              width={45}
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
                    fill={entry.isPrediction ? 'transparent' : (convertedColor === '#ff0000' ? colors.volumeUpFill : colors.volumeDownFill)}
                    stroke={entry.isPrediction ? 'transparent' : (convertedColor === '#ff0000' ? colors.volumeUpStroke : colors.volumeDownStroke)}
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
export type { StockChartRef } from './StockChartTypes';