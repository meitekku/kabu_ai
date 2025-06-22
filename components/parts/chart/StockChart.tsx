import React, { useState, useEffect, useRef } from 'react';
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
import { ExtendedChartData } from './types/StockChartTypes';
import { formatNumber } from './StockChartUtils';
import { CandleWickShape, CandleBodyShape } from './StockChartShapes';
import { TooltipZone } from './StockChartLayoutUtils';
import { fetchChartAndNewsData } from './StockChartDataUtils';
import { recordChartPosition, captureAllChartPositions, handleResize } from './StockChartPositionUtils';
import { formatArticleTitle } from './StockChartTooltip';

/* --------------------------------------------------
 * 型定義
 * -------------------------------------------------- */
interface StockChartProps {
  code: string;
  width?: string | number;  // チャートの幅（デフォルト: '100%'）
  pcHeight?: {
    upper: number;  // 上段チャートの高さ（PC）
    lower: number;  // 下段チャートの高さ（PC）
  };
  mobileHeight?: {
    upper: number;  // 上段チャートの高さ（モバイル）
    lower: number;  // 下段チャートの高さ（モバイル）
  };
}

/* --------------------------------------------------
 * メインのチャートコンポーネント
 * -------------------------------------------------- */
const StockChart: React.FC<StockChartProps> = ({ 
  code,
  width = '100%',
  pcHeight = {
    upper: 192,  // 現在のデフォルト: h-48 = 12rem = 192px
    lower: 96    // 現在のデフォルト: h-24 = 6rem = 96px
  },
  mobileHeight = {
    upper: 128,  // 現在のデフォルト: h-32 = 8rem = 128px
    lower: 80    // 現在のデフォルト: h-20 = 5rem = 80px
  }
}) => {
  const [data, setData] = useState<ExtendedChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredData, setHoveredData] = useState<ExtendedChartData | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const actualChartPositionsRef = useRef<number[]>([]);
  const [isChartReady, setIsChartReady] = useState(false);
  const [tooltipZones, setTooltipZones] = useState<TooltipZone[]>([]);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // データ取得用のuseEffect（初回のみ実行）
  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const formattedData = await fetchChartAndNewsData(code);
        if (isMounted) {
          setData(formattedData);
          if (containerWidth > 0) {
            setTimeout(() => {
              captureAllChartPositions(
                chartContainerRef,
                containerWidth,
                formattedData,
                setTooltipZones
              );
              setIsChartReady(true);
            }, 300);
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
  }, [code]);

  // データ変更時の座標再取得（別のuseEffectで管理）
  useEffect(() => {
    if (data.length > 0 && containerWidth > 0) {
      const timer = setTimeout(() => {
        captureAllChartPositions(
          chartContainerRef,
          containerWidth,
          data,
          setTooltipZones
        );
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [data, containerWidth]);

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

  // 表示するデータを決定（ホバー中のデータまたは最新データ）
  const displayData = hoveredData || data[data.length - 1];

  return (
    <div className="mt-2" style={{ width }} ref={chartContainerRef}>
      {/* 上段チャート（ロウソク足 + 移動平均） */}
      <div 
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

        {/* Tooltipとその矢印をチャート内に絶対配置 */}
        {isChartReady && tooltipZones.map((zone) => {
          const item = data[zone.index];
          if (!item || !item.articles || item.articles.length === 0) return null;
          const tooltipLeft = Math.max(5, Math.min(containerWidth - 145, zone.xPosition - 70));
          return (
            <React.Fragment key={`tooltip-zone-${zone.index}`}>
              <div 
                className="absolute z-20 pointer-events-none"
                style={{ 
                  left: `${tooltipLeft}px`,
                  top: `${zone.yPosition}px`
                }}
              >
                <div className="bg-white/65 border border-gray-300 rounded-lg p-2 w-[140px] min-w-[140px] max-w-[140px] pointer-events-auto shadow-lg hover:shadow-xl transition-shadow duration-200">
                  <div className="absolute -top-0.5 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
                  <div className="space-y-0.5">
                    <div className="text-[10px] text-gray-500 font-medium">{item.date}</div>
                    <div
                      className="text-xs text-gray-800 hover:text-blue-600 cursor-pointer rounded transition-colors duration-150 line-clamp-3 leading-[1.3] font-medium"
                      onClick={() => {
                        if (item.articles && item.articles[0]) {
                          window.location.href = `/${code}/news/article/${item.articles[0].id}`;
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      title={formatArticleTitle(item.articles[0]?.title || '')}
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
                  x1={zone.xPosition}
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
                    
                    // ヒゲの上下中央を正確に計算
                    const centerValue = (dataItem.high + dataItem.low) / 2;
                    
                    // Y座標の割合を計算（0%が上端、100%が下端）
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
          () => captureAllChartPositions(
            chartContainerRef,
            containerWidth,
            data,
            setTooltipZones
          )
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
                // バーの位置を右に調整（バー幅の20%分右にずらす）
                const adjustedX = x + width * 0.2;
                const adjustedWidth = width * 0.6; // バー幅も少し細くする
                
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
};

export default StockChart;