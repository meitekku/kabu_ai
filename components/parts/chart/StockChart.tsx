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
import { ChartData, PriceRecord, ApiResponse } from '@/types/parts/chart/MainChart';

/* --------------------------------------------------
 * 型定義
 * -------------------------------------------------- */
interface NewsArticle {
  id: number;
  title: string;
  content: string;
  created_at: string;
  code: string;
}

interface ExtendedChartData extends ChartData {
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

interface StockChartProps {
  code: string;
}

interface CandleBodyProps extends RectangleProps {
  payload?: {
    index: number;
    articles?: NewsArticle[];
  };
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
 * ヒゲ（高値安値）描画用カスタムシェイプ
 * -------------------------------------------------- */
const CandleWickShape: React.FC<RectangleProps> = (props) => {
  const { x, y, width, height, stroke, strokeWidth } = props;

  if (x == null || y == null || width == null || height == null) {
    return null;
  }

  // 実体バーの固定幅 (CandleBodyShapeと同じ)
  const candleWidth = Math.min(width * 1.2, 8);
  
  // x座標を左にオフセット（CandleBodyShapeと同じ）
  const offset = width / 2;
  const adjustedX = x - offset;

  // ヒゲは実体の中央に配置
  const cx = adjustedX + (candleWidth * 1.3);

  // top/bottom 計算
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

  // 実体バーの固定幅 (スマホでも横伸びしないようにする)
  const candleWidth = Math.min(width * 1.2, 8);
  
  // x座標を左にオフセット
  const offset = width / 2;
  const adjustedX = x - offset;

  // height が負の場合にも対応
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

  // 実体バーの固定幅 (CandleBodyShapeと同じ)
  const barWidth = Math.min(width * 1.2, 8);
  
  // x座標を左にオフセット（CandleBodyShapeと同じ）
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
  const [tooltipPosition, setTooltipPosition] = useState<number>(0);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [actualChartPositions, setActualChartPositions] = useState<number[]>([]);
  const [isChartReady, setIsChartReady] = useState(false);
  
  // チャート要素への参照
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // ホバー時の座標を記録して実際のチャート配置を学習する
  const recordChartPosition = (index: number, xCoordinate: number) => {
    setActualChartPositions(prev => {
      const newPositions = [...prev];
      newPositions[index] = xCoordinate;
      return newPositions;
    });
  };

  // 📍 改善された位置計算関数
  const calculateTooltipPosition = (index: number) => {
    const tooltipWidth = 80;
    
    // 1. 実際の座標が記録されている場合はそれを使用
    if (actualChartPositions[index] !== undefined) {
      const position = actualChartPositions[index] - (tooltipWidth / 2);
      return position;
    }
    
    // 2. フォールバック: 記録された座標から補間計算
    if (actualChartPositions.length > 0 && containerWidth > 0) {
      const recordedIndices = actualChartPositions
        .map((pos, idx) => pos !== undefined ? idx : -1)
        .filter(idx => idx !== -1);
      
      if (recordedIndices.length >= 2) {
        // 線形補間で位置を推定
        const firstIdx = recordedIndices[0];
        const lastIdx = recordedIndices[recordedIndices.length - 1];
        const firstPos = actualChartPositions[firstIdx];
        const lastPos = actualChartPositions[lastIdx];
        
        const slope = (lastPos - firstPos) / (lastIdx - firstIdx);
        const estimatedX = firstPos + slope * (index - firstIdx);
        const position = estimatedX - (tooltipWidth / 2);
        
        return position;
      }
    }
    
    // 3. 📍 改善された推定計算
    if (containerWidth > 0 && data.length > 0) {
      // より正確なRechartsレイアウト計算
      const yAxisWidth = 35; // YAxisのwidth設定値
      const rightMargin = 7; // 下段チャートのright margin
      const effectiveWidth = containerWidth - yAxisWidth - rightMargin;
      
      // データポイント間の実際の間隔を計算
      const pointSpacing = effectiveWidth / Math.max(data.length - 1, 1);
      
      // X座標を計算（Rechartsの実際の配置に近似）
      const estimatedX = yAxisWidth + (pointSpacing * index);
      const position = estimatedX - (tooltipWidth / 2);
      
      return position;
    }
    
    return 0;
  };

  const captureAllChartPositions = useCallback(() => {
    if (!chartContainerRef.current || !containerWidth || data.length === 0) {
      return;
    }
    
    // チャートのSVG要素を探す
    const svgElement = chartContainerRef.current.querySelector('svg');
    if (!svgElement) {
      return;
    }

    // Rechartsによって生成されたバー要素を探す
    const barElements = svgElement.querySelectorAll('g[class*="recharts-bar"] .recharts-bar-rectangle');

    if (barElements.length > 0) {
      const newPositions = new Array(data.length);
      
      barElements.forEach((element, idx) => {
        if (idx < data.length) {
          const rect = element.getBoundingClientRect();
          const containerRect = chartContainerRef.current!.getBoundingClientRect();
          const relativeX = rect.left - containerRect.left + (rect.width / 2);
          newPositions[idx] = relativeX;
        }
      });

      setActualChartPositions(newPositions);
    }
  }, [data.length, containerWidth]);

  // コンテナの幅が変更された時の処理
  const handleResize = (width: number) => {
    setContainerWidth(width);
    // 実際の座標記録をリセット（レイアウトが変わったため）
    setActualChartPositions([]);
    // チャートの準備状態をリセット
    setIsChartReady(false);
    
    // チャートのレンダリングが安定するまで少し待ってから座標取得と表示許可
    if (width > 0 && data.length > 0) {
      setTimeout(() => {
        captureAllChartPositions(); // 📍 座標一括取得
        setIsChartReady(true);
      }, 1500); // 安定化のため300msに延長
    }
  };

  // 常時表示するツールチップのインデックスを計算
  const getDefaultTooltipIndices = () => {
    const indices: number[] = [];
    const reasons: { [key: number]: string[] } = {};

    // 1. 最新日のニュースがある場合は必ず表示
    const latestDayIndex = data.length - 1;
    if (data[latestDayIndex]?.articles && data[latestDayIndex].articles.length > 0) {
      indices.push(latestDayIndex);
      reasons[latestDayIndex] = ['最新日のニュースあり'];
    }

    // 2. 変動率の計算と上位3つの抽出
    const changeRates: { index: number; closeChangeRate: number; highLowChangeRate: number }[] = [];
    
    data.forEach((item, index) => {
      if (index === 0) return; // 最初の日は前日データがないのでスキップ

      const prevClose = data[index - 1].close;
      const currentClose = item.close;
      const currentHigh = item.high;
      const currentLow = item.low;

      // 前日比の計算
      const closeChangeRate = Math.abs((currentClose - prevClose) / prevClose * 100);
      // 高値安値の変動率計算
      const highLowChangeRate = Math.abs((currentHigh - currentLow) / prevClose * 100);

      if (item.articles && item.articles.length > 0) {
        changeRates.push({
          index,
          closeChangeRate,
          highLowChangeRate
        });
      }
    });

    // 変動率の合計でソートして上位3つを取得
    const topChanges = changeRates
      .sort((a, b) => {
        const aTotal = a.closeChangeRate + a.highLowChangeRate;
        const bTotal = b.closeChangeRate + b.highLowChangeRate;
        return bTotal - aTotal;
      })
      .slice(0, 3);

    // 上位3つをインデックスに追加
    topChanges.forEach(change => {
      indices.push(change.index);
      reasons[change.index] = [
        `前日比変動率: ${change.closeChangeRate.toFixed(2)}%`,
        `高値安値変動率: ${change.highLowChangeRate.toFixed(2)}%`,
        `合計変動率: ${(change.closeChangeRate + change.highLowChangeRate).toFixed(2)}%`
      ];
    });

    // 3. settlement: 0の日を抽出
    data.forEach((item, index) => {
      if (item.settlement === 0 && item.articles && item.articles.length > 0 && !indices.includes(index)) {
        indices.push(index);
        reasons[index] = ['決算日'];
      }
    });

    // 重複を除去して返す
    const uniqueIndices = [...new Set(indices)];
    return uniqueIndices;
  };

  useEffect(() => {
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
          setData([]);
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
          
          // その日の記事をフィルタリング
          const dayArticles = articles.filter((article: NewsArticle) => {
            try {
              // 日付文字列を YYYY-MM-DD 形式に変換
              const formatDate = (date: Date | string) => {
                const d = new Date(date);
                // localhost環境の場合のみ+9時間の処理を適用
                if (process.env.NODE_ENV === 'development') {
                  const jpDate = new Date(d.getTime() + (9 * 60 * 60 * 1000));
                  return jpDate.toISOString().split('T')[0];
                }
                return d.toISOString().split('T')[0];
              };

              const articleDateStr = formatDate(article.created_at);
              const chartDateStr = formatDate(item.date);

              // 日付文字列を直接比較
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

        setData(formattedData);
        
        // データ設定後、コンテナサイズが確定していればチャートの準備完了
        if (containerWidth > 0) {
          setTimeout(() => {
            captureAllChartPositions(); // 📍 座標一括取得
            setIsChartReady(true);
          }, 300);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [code, captureAllChartPositions, containerWidth]);

  // データ変更時の座標再取得
  useEffect(() => {
    if (data.length > 0 && containerWidth > 0) {
      setTimeout(() => {
        captureAllChartPositions();
      }, 100);
    }
  }, [data, containerWidth, captureAllChartPositions]);

  if (loading) {
    return (
      <div className="w-full mt-2 animate-pulse">
        {/* 株価情報表示のスケルトン */}
        <div className="mb-2">
          <div className="h-8 bg-gray-200 rounded"></div>
        </div>

        {/* 上段チャートのスケルトン */}
        <div className="h-32 md:h-48 bg-gray-200 rounded"></div>

        {/* 下段チャートのスケルトン */}
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
        {/* 関連記事の吹き出しをチャート上に絶対配置 */}
        {isChartReady && data.map((item, index) => {
          const isDefaultTooltip = getDefaultTooltipIndices().includes(index);
          const shouldShowTooltip = (isDefaultTooltip && !hoveredData) || 
                                  (hoveredData && 
                                   new Date(hoveredData.date).getTime() === new Date(item.date).getTime() && 
                                   item.articles && 
                                   item.articles.length > 0);

          if (!item.articles || item.articles.length === 0 || !shouldShowTooltip) return null;

          const latestArticle = item.articles[item.articles.length - 1];
          const title = latestArticle.title;
          const displayTitle = (() => {
            // 1. 】のパターン
            const index4 = title.indexOf('】');
            // 2. %のパターン
            const index3 = title.indexOf('%');

            let result = '';
            // 優先順位に従って処理
            if (index4 !== -1) {
              result = title.substring(index4 + 1);
            } else if (index3 !== -1) {
              result = title.substring(index3 + 1);
            } else {
              result = title;
            }

            // 結果が空文字列や【】のみの場合は元のタイトルを返す
            return result.trim() === '' || result === '【】' ? title : result;
          })();

          // ツールチップの位置を計算
          const tooltipLeft = hoveredData 
            ? tooltipPosition  // ホバー時はマウス位置を使用
            : calculateTooltipPosition(index);  // 初期表示時は学習した位置または推定位置を使用

          return (
            <div 
              key={`article-${index}`}
              className="absolute z-10 flex pointer-events-none"
              style={{ 
                left: `${tooltipLeft}px`
              }}
            >
              <div className="speech-bubble bg-white border border-black p-1 w-[80px] min-w-[80px] max-w-[80px] pointer-events-auto">
                <div
                  key={latestArticle.id}
                  className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer p-0.5 hover:bg-gray-100 line-clamp-2"
                  onClick={() => window.location.href = `/${code}/news/article/${latestArticle.id}`}
                  role="button"
                  tabIndex={0}
                  title={displayTitle}
                >
                  {displayTitle}
                </div>
              </div>
              <style jsx>{`
                .speech-bubble {
                  position: relative;
                }
                .speech-bubble:after {
                  content: '';
                  position: absolute;
                  left: 50%;
                  bottom: -8px;
                  transform: translateX(-50%);
                  border-width: 4px 4px 0 4px;
                  border-style: solid;
                  border-color: #000 transparent transparent transparent;
                  display: block;
                  width: 0;
                }
                .speech-bubble:before {
                  content: '';
                  position: absolute;
                  left: 50%;
                  bottom: -7px;
                  transform: translateX(-50%);
                  border-width: 3px 3px 0 3px;
                  border-style: solid;
                  border-color: #fff transparent transparent transparent;
                  display: block;
                  width: 0;
                }
              `}</style>
            </div>
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
                  // データポイントのインデックスを取得
                  const dataIndex = data.findIndex(item => item.date === payload.date);
                  
                  if (dataIndex !== -1) {
                    // 実際の座標を記録（学習） - データポイントの中央座標
                    recordChartPosition(dataIndex, e.activeCoordinate.x);
                    
                    if (payload.articles && payload.articles.length > 0) {
                      // ホバー時のツールチップ位置：中央座標から左端座標に変換
                      const tooltipWidth = 80;
                      const position = e.activeCoordinate.x - (tooltipWidth / 2);
                      setTooltipPosition(position);
                    }
                  }
                }
              }
            }}
            onMouseLeave={() => {
              setHoveredData(null);
            }}
            onClick={(e) => {
              if (e.activePayload?.[0]?.payload?.articles?.[0]) {
                const article = e.activePayload[0].payload.articles[0];
                window.location.href = `/${e.activePayload[0].payload.code}/news/article/${article.id}`;
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
            margin={{ top: 0, right: -7, bottom: 0, left: 0 }}
            onMouseMove={(e) => {
              if (e.activePayload?.[0]?.payload) {
                const payload = e.activePayload[0].payload;
                setHoveredData(payload);
                
                if (e.activeCoordinate) {
                  // データポイントのインデックスを取得
                  const dataIndex = data.findIndex(item => item.date === payload.date);
                  
                  if (dataIndex !== -1) {
                    // 実際の座標を記録（学習） - データポイントの中央座標
                    recordChartPosition(dataIndex, e.activeCoordinate.x);
                    
                    // 下段チャートでもツールチップ位置を統一：中央座標から左端座標に変換
                    const tooltipWidth = 80;
                    const position = e.activeCoordinate.x - (tooltipWidth / 2);
                    setTooltipPosition(position);
                  }
                }
              }
            }}
            onMouseLeave={() => {
              setHoveredData(null);
            }}
            onClick={(e) => {
              if (e.activePayload?.[0]?.payload?.articles?.[0]) {
                const article = e.activePayload[0].payload.articles[0];
                window.location.href = `/${e.activePayload[0].payload.code}/news/article/${article.id}`;
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