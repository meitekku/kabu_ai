import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { PriceRecord, ApiResponse } from '@/types/parts/chart/MainChart';
import { ExtendedChartData, NewsArticle } from './types/StockChartTypes';
import { getDefaultTooltipIndices } from './StockChartTooltip';

/* --------------------------------------------------
 * 型定義
 * -------------------------------------------------- */
interface StockChartProps {
  code: string;
}

interface CandleBodyProps extends RectangleProps {
  payload?: {
    index: number;
    articles?: NewsArticle[];
  };
}

interface TooltipZone {
  index: number;
  zone: number;
  xPosition: number;
  yPosition: number;
  isTop: boolean;
}

/* --------------------------------------------------
 * 数値フォーマッタ (カンマ区切り)
 * -------------------------------------------------- */
const formatNumber = (value: number | undefined): string => {
  if (typeof value === 'undefined' || Number.isNaN(value)) return '-';
  return value.toLocaleString();
};

/* --------------------------------------------------
 * 移動平均計算
 * -------------------------------------------------- */
const calculateMA = (data: PriceRecord[], days: number): number[] => {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < days - 1) {
      result.push(NaN);
      continue;
    }
    const sum = data.slice(i - days + 1, i + 1).reduce((acc, curr) => acc + curr.close, 0);
    result.push(sum / days);
  }
  return result;
};

/* --------------------------------------------------
 * 空白領域検出とTooltip配置計算
 * -------------------------------------------------- */
const findEmptySpaces = (
  data: ExtendedChartData[],
  containerWidth: number,
  chartHeight: number,
  actualChartPositions: number[],
  tooltipIndices: number[]
): { index: number; yPosition: number; isTop: boolean; xPosition: number }[] => {
  // Y軸の範囲を計算
  const allValues = data.flatMap(d => [d.high, d.low]);
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const valueRange = maxValue - minValue;
  const padding = valueRange * 0.1;
  const yAxisMin = minValue - padding;
  const yAxisMax = maxValue + padding;
  const yAxisRange = yAxisMax - yAxisMin;
  
  const result: { index: number; yPosition: number; isTop: boolean; xPosition: number }[] = [];
  
  // 各tooltipインデックスについて最適な位置を計算
  tooltipIndices.slice(0, 4).forEach(index => {
    const dataItem = data[index];
    const xPos = (actualChartPositions[index] || 0) || ((containerWidth / data.length) * index);
    
    // 周辺のデータポイントを確認（左右3つずつ）
    const range = 3;
    const start = Math.max(0, index - range);
    const end = Math.min(data.length - 1, index + range);
    
    let nearbyMaxHigh = dataItem.high;
    let nearbyMinLow = dataItem.low;
    
    for (let i = start; i <= end; i++) {
      nearbyMaxHigh = Math.max(nearbyMaxHigh, data[i].high);
      nearbyMinLow = Math.min(nearbyMinLow, data[i].low);
    }
    
    // 上部と下部の空きスペースを計算
    const topSpace = yAxisMax - nearbyMaxHigh;
    const bottomSpace = nearbyMinLow - yAxisMin;
    
    // より広い方を選択
    const isTop = topSpace >= bottomSpace;
    
    let yPosition: number;
    if (isTop) {
      // 上部に配置: 近傍の最高値から少し上
      const targetValue = nearbyMaxHigh + (valueRange * 0.08);
      const yRatio = 1 - (targetValue - yAxisMin) / yAxisRange;
      yPosition = chartHeight * yRatio - 35; // tooltip高さ分調整
    } else {
      // 下部に配置: 近傍の最低値から少し下
      const targetValue = nearbyMinLow - (valueRange * 0.08);
      const yRatio = 1 - (targetValue - yAxisMin) / yAxisRange;
      yPosition = chartHeight * yRatio + 5;
    }
    
    // 境界内に収める
    yPosition = Math.max(5, Math.min(chartHeight - 35, yPosition));
    
    result.push({
      index,
      yPosition,
      isTop,
      xPosition: xPos
    });
  });
  
  // 重なりを防ぐために位置を調整
  const adjustedResult = [...result];
  const tooltipHeight = 35;
  const tooltipWidth = 80;
  const minGap = 5;
  
  // X軸方向の重なりチェックと調整
  for (let i = 0; i < adjustedResult.length; i++) {
    for (let j = i + 1; j < adjustedResult.length; j++) {
      const a = adjustedResult[i];
      const b = adjustedResult[j];
      
      // X軸方向の重なりチェック
      const xOverlap = Math.abs(a.xPosition - b.xPosition) < tooltipWidth + minGap;
      
      if (xOverlap) {
        // Y軸方向の重なりもチェック
        const yOverlap = Math.abs(a.yPosition - b.yPosition) < tooltipHeight + minGap;
        
        if (yOverlap) {
          // 同じ高さにある場合、片方を少しずらす
          if (a.isTop === b.isTop) {
            // 片方を少しずらす
            if (j % 2 === 0) {
              b.yPosition += tooltipHeight + minGap;
            } else {
              b.yPosition -= tooltipHeight + minGap;
            }
            // 境界チェック
            b.yPosition = Math.max(5, Math.min(chartHeight - 35, b.yPosition));
          }
        }
      }
    }
  }
  
  return adjustedResult;
};

const calculateTooltipZones = (
  tooltipIndices: number[],
  actualChartPositions: number[],
  containerWidth: number,
  data: ExtendedChartData[],
  chartHeight: number
): TooltipZone[] => {
  // 空白領域を検出して最適な配置を計算
  const positions = findEmptySpaces(
    data,
    containerWidth,
    chartHeight,
    actualChartPositions,
    tooltipIndices
  );
  
  // TooltipZone形式に変換
  return positions.map((pos, i) => ({
    index: pos.index,
    zone: i, // ゾーンは使用しないが、互換性のため保持
    xPosition: pos.xPosition,
    yPosition: pos.yPosition,
    isTop: pos.isTop
  }));
};

/* --------------------------------------------------
 * ヒゲ（高値安値）描画用カスタムシェイプ
 * -------------------------------------------------- */
const CandleWickShape: React.FC<RectangleProps> = (props) => {
  const { x, y, width, height, stroke, strokeWidth } = props;

  if (x == null || y == null || width == null || height == null) {
    return null;
  }

  const candleWidth = Math.min(width * 1.2, 8);
  const offset = width / 2;
  const adjustedX = x - offset;
  const cx = adjustedX + (candleWidth * 1.3);
  const top = height < 0 ? y + height : y;
  const bottom = height < 0 ? y : y + height;

  return (
    <line
      x1={cx}
      y1={top}
      x2={cx}
      y2={bottom}
      stroke={stroke}
      strokeWidth={strokeWidth ?? 1}
    />
  );
};

/* --------------------------------------------------
 * 実体（始値終値）描画用カスタムシェイプ
 * -------------------------------------------------- */
const CandleBodyShape: React.FC<CandleBodyProps> = (props) => {
  const { x, y, width, height, fill, stroke } = props;

  if (x == null || y == null || width == null || height == null) {
    return null;
  }

  const candleWidth = Math.min(width * 1.2, 8);
  const offset = width / 2;
  const adjustedX = x - offset;
  const top = height < 0 ? y + height : y;
  const bodyHeight = Math.abs(height);

  return (
    <rect
      x={adjustedX}
      y={top}
      width={candleWidth}
      height={bodyHeight}
      fill={fill}
      stroke={stroke}
    />
  );
};

/* --------------------------------------------------
 * 出来高バー描画用カスタムシェイプ
 * -------------------------------------------------- */
const VolumeBarShape: React.FC<RectangleProps> = (props) => {
  const { x, y, width, height, fill, stroke } = props;

  if (x == null || y == null || width == null || height == null) {
    return null;
  }

  const barWidth = Math.min(width * 1.2, 8);
  const offset = width / 2;
  const adjustedX = x - offset;

  return (
    <rect
      x={adjustedX}
      y={y}
      width={barWidth}
      height={height}
      fill={fill}
      stroke={stroke}
    />
  );
};

/* --------------------------------------------------
 * 株価情報表示コンポーネント
 * -------------------------------------------------- */
const PriceInfo: React.FC<{
  data: ExtendedChartData[];
  hoveredData: ExtendedChartData | null;
}> = ({ data, hoveredData }) => {
  const displayData = hoveredData || (data.length > 0 ? data[data.length - 1] : null);
  
  if (!displayData) return null;

  return (
    <div className="flex justify-between items-center px-2 bg-gray-100 rounded-lg text-sm font-mono">
      <div className="flex gap-1">
        <span>始値: {formatNumber(displayData.open)}</span>
        <span>高値: {formatNumber(displayData.high)}</span>
        <span>安値: {formatNumber(displayData.low)}</span>
        <span>終値: {formatNumber(displayData.close)}</span>
      </div>
      <div>{displayData.date}</div>
    </div>
  );
};

/* --------------------------------------------------
 * メインのチャートコンポーネント
 * -------------------------------------------------- */
const StockChart: React.FC<StockChartProps> = ({ code }) => {
  const [data, setData] = useState<ExtendedChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredData, setHoveredData] = useState<ExtendedChartData | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const actualChartPositionsRef = useRef<number[]>([]);
  const [isChartReady, setIsChartReady] = useState(false);
  const [tooltipZones, setTooltipZones] = useState<TooltipZone[]>([]);
  
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // ホバー時の座標を記録
  const recordChartPosition = (index: number, xCoordinate: number) => {
    const positions = actualChartPositionsRef.current;
    if (positions.length <= index) {
      // 配列を拡張
      for (let i = positions.length; i <= index; i++) {
        positions[i] = 0;
      }
    }
    positions[index] = xCoordinate;
    actualChartPositionsRef.current = positions;
  };

  const captureAllChartPositions = useCallback(() => {
    if (!chartContainerRef.current || !containerWidth || data.length === 0) {
      return;
    }
    
    const svgElement = chartContainerRef.current.querySelector('svg');
    if (!svgElement) {
      return;
    }

    const barElements = svgElement.querySelectorAll('g[class*="recharts-bar"] .recharts-bar-rectangle');

    if (barElements.length > 0) {
      const newPositions = new Array(data.length).fill(0);
      
      barElements.forEach((element, idx) => {
        if (idx < data.length) {
          const rect = element.getBoundingClientRect();
          const containerRect = chartContainerRef.current!.getBoundingClientRect();
          const relativeX = rect.left - containerRect.left + (rect.width / 2);
          newPositions[idx] = relativeX;
        }
      });

      actualChartPositionsRef.current = newPositions;
      
      // tooltip zonesを計算
      const defaultIndices = getDefaultTooltipIndices(data);
      const chartHeight = window.innerWidth >= 768 ? 192 : 128;
      const zones = calculateTooltipZones(
        defaultIndices, 
        actualChartPositionsRef.current,
        containerWidth, 
        data, 
        chartHeight
      );
      setTooltipZones(zones);
    }
  }, [data, containerWidth]);

  // コンテナの幅が変更された時の処理
  const handleResize = (width: number) => {
    setContainerWidth(width);
    actualChartPositionsRef.current = []; // refをリセット
    setIsChartReady(false);
    
    if (width > 0 && data.length > 0) {
      setTimeout(() => {
        captureAllChartPositions();
        setIsChartReady(true);
      }, 1500);
    }
  };

  // データ取得用のuseEffect（初回のみ実行）
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        // 株価データの取得
        const chartResponse = await fetch(`/api/${code}/chart`, {
          method: 'POST',
          body: JSON.stringify({ code, num: 40 }),
          headers: { 'Content-Type': 'application/json' }
        });

        if (!chartResponse.ok) throw new Error('Chart data fetch failed');

        const chartResult = (await chartResponse.json()) as ApiResponse<PriceRecord[]>;
        if (!chartResult.success || !chartResult.data || chartResult.data.length === 0) {
          if (isMounted) setData([]);
          return;
        }

        // 記事データの取得
        const newsResponse = await fetch(`/api/${code}/news`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            limit: 60,
            page: 1
          })
        });

        if (!newsResponse.ok) {
          throw new Error('News data fetch failed');
        }

        const newsResult = await newsResponse.json();
        if (!newsResult.success) {
          throw new Error('News API returned error');
        }

        const articles: NewsArticle[] = newsResult.data || [];

        // 日付でソート
        const sortedData = chartResult.data.sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        // 移動平均を計算
        const ma5 = calculateMA(sortedData, 5);
        const ma25 = calculateMA(sortedData, 25);
        const ma75 = calculateMA(sortedData, 75);

        // グラフ描画用に整形
        const formattedData: ExtendedChartData[] = sortedData.map((item, index) => {
          const isPositive = item.close >= item.open;
          const date = new Date(item.date);
          const dateStr = `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
          
          const dayArticles = articles.filter((article: NewsArticle) => {
            try {
              const formatDate = (date: Date | string) => {
                const d = new Date(date);
                if (process.env.NODE_ENV === 'development') {
                  const jpDate = new Date(d.getTime() + (9 * 60 * 60 * 1000));
                  return jpDate.toISOString().split('T')[0];
                }
                return d.toISOString().split('T')[0];
              };

              const articleDateStr = formatDate(article.created_at);
              const chartDateStr = formatDate(item.date);

              return articleDateStr === chartDateStr;
            } catch {
              return false;
            }
          });

          return {
            date: dateStr,
            open: item.open,
            high: item.high,
            low: item.low,
            close: item.close,
            volume: item.volume,
            highLowBar: [item.low, item.high],
            candlestick: [item.open, item.close],
            color: isPositive ? '#ff0000' : '#0000ff',
            ma5: ma5[index],
            ma25: ma25[index],
            ma75: ma75[index],
            articles: dayArticles,
            code: code
          } as ExtendedChartData;
        });

        if (isMounted) {
          setData(formattedData);
          
          if (containerWidth > 0) {
            setTimeout(() => {
              captureAllChartPositions();
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
  }, [code]); // 依存配列からcaptureAllChartPositionsとcontainerWidthを削除

  // データ変更時の座標再取得（別のuseEffectで管理）
  useEffect(() => {
    if (data.length > 0 && containerWidth > 0) {
      const timer = setTimeout(() => {
        captureAllChartPositions();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [data, containerWidth, captureAllChartPositions]);

  if (loading) {
    return (
      <div className="w-full mt-2 animate-pulse">
        <div className="mb-2">
          <div className="h-8 bg-gray-200 rounded"></div>
        </div>
        <div className="h-32 md:h-48 bg-gray-200 rounded"></div>
        <div className="h-20 md:h-24 bg-gray-200 rounded mt-2"></div>
      </div>
    );
  }

  if (error) return <div className="text-red-500 p-4">Error: {error}</div>;
  if (data.length === 0) return null;

  return (
    <div className="w-full mt-2" ref={chartContainerRef}>
      {/* 株価情報表示 */}
      <div className="mb-2">
        <PriceInfo data={data} hoveredData={hoveredData} />
      </div>

      {/* 上段チャート（ロウソク足 + 移動平均） */}
      <div className="h-32 md:h-48 relative">
        {/* Tooltipとその矢印をチャート内に絶対配置 */}
        {isChartReady && tooltipZones.map((zone) => {
          const item = data[zone.index];
          if (!item || !item.articles || item.articles.length === 0) return null;

          // tooltipをX座標に基づいて配置（中央揃え）
          const tooltipLeft = Math.max(5, Math.min(containerWidth - 85, zone.xPosition - 40)); // 境界チェック

          return (
            <React.Fragment key={`tooltip-zone-${zone.index}`}>
              <div 
                className="absolute z-20 pointer-events-none"
                style={{ 
                  left: `${tooltipLeft}px`,
                  top: `${zone.yPosition}px`
                }}
              >
                <div className="bg-white border border-gray-700 rounded p-1 w-[80px] min-w-[80px] max-w-[80px] pointer-events-auto shadow-md">
                  <div
                    className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer p-0.5 hover:bg-gray-100 line-clamp-2"
                    onClick={() => {
                      if (item.articles && item.articles[0]) {
                        window.location.href = `/${code}/news/article/${item.articles[0].id}`;
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    title={item.articles[0]?.title || ''}
                  >
                    {(() => {
                      const title = item.articles[0]?.title || '';
                      const index4 = title.indexOf('】');
                      const index3 = title.indexOf('%');
                      let result = '';
                      if (index4 !== -1) {
                        result = title.substring(index4 + 1);
                      } else if (index3 !== -1) {
                        result = title.substring(index3 + 1);
                      } else {
                        result = title;
                      }
                      return result.trim() === '' || result === '【】' ? title : result;
                    })()}
                  </div>
                </div>
              </div>
              {/* 矢印の描画 */}
              <svg
                className="absolute top-0 left-0 w-full h-full pointer-events-none z-10"
                style={{ overflow: 'visible' }}
              >
                <line
                  x1={zone.xPosition}
                  y1={zone.isTop ? zone.yPosition + 30 : zone.yPosition}
                  x2={zone.xPosition}
                  y2={(() => {
                    // 該当日のローソク足の位置を計算
                    const dataItem = data[zone.index];
                    const allValues = data.flatMap(d => [d.high, d.low]);
                    const minValue = Math.min(...allValues);
                    const maxValue = Math.max(...allValues);
                    const valueRange = maxValue - minValue;
                    const padding = valueRange * 0.1;
                    const yAxisMin = minValue - padding;
                    const yAxisMax = maxValue + padding;
                    const yAxisRange = yAxisMax - yAxisMin;
                    
                    // 矢印の先端位置を計算（上配置なら高値、下配置なら安値）
                    const targetValue = zone.isTop ? dataItem.high : dataItem.low;
                    const yRatio = 1 - (targetValue - yAxisMin) / yAxisRange;
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

        <ResponsiveContainer width="100%" height="100%" onResize={handleResize}>
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
                    recordChartPosition(dataIndex, e.activeCoordinate.x);
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
            <CartesianGrid strokeDasharray="3 3" />
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

            {/* ヒゲ */}
            <Bar
              dataKey="highLowBar"
              fill="none"
              stroke="#000000"
              strokeWidth={1}
              name="値幅"
              shape={(props: unknown) => <CandleWickShape {...(props as RectangleProps)} />}
            />

            {/* 実体 */}
            <Bar
              dataKey="candlestick"
              name="株価"
              shape={(props: unknown) => <CandleBodyShape {...(props as CandleBodyProps)} />}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  stroke={entry.color}
                />
              ))}
            </Bar>

            {/* 移動平均線 */}
            <Line type="monotone" dataKey="ma5" stroke="#00ff00" dot={false} name="MA(5)" />
            <Line type="monotone" dataKey="ma25" stroke="#ff0000" dot={false} name="MA(25)" />
            <Line type="monotone" dataKey="ma75" stroke="#0000ff" dot={false} name="MA(75)" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* 下段チャート（出来高） */}
      <div className="h-20 md:h-24">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart 
            data={data}
            margin={{ top: 0, right: 5, bottom: 0, left: 0 }}
            onMouseMove={(e) => {
              if (e.activePayload?.[0]?.payload) {
                const payload = e.activePayload[0].payload;
                setHoveredData(payload);
                
                if (e.activeCoordinate) {
                  const dataIndex = data.findIndex(item => item.date === payload.date);
                  if (dataIndex !== -1) {
                    recordChartPosition(dataIndex, e.activeCoordinate.x);
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
            <CartesianGrid strokeDasharray="3 3" />
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

            <Bar dataKey="volume" name="出来高" shape={(props: unknown) => <VolumeBarShape {...(props as RectangleProps)} />}>
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