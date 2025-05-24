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
    console.log('🔴 [DEBUG] 🔥 座標学習記録:', {
      index,
      xCoordinate,
      currentPositions: actualChartPositions.slice(),
      date: data[index]?.date,
      学習目的: '次回の初期ツールチップ位置計算で使用'
    });
    
    setActualChartPositions(prev => {
      const newPositions = [...prev];
      newPositions[index] = xCoordinate;
      
      console.log('🔴 [DEBUG] 🔥 actualChartPositions 配列更新:', {
        index,
        oldValue: prev[index],
        newValue: xCoordinate,
        fullArray: newPositions.slice(),
        説明: 'ホバーで取得した実座標を配列に保存'
      });
      
      return newPositions;
    });
  };

  // 📍 改善された位置計算関数
  const calculateTooltipPosition = (index: number) => {
    console.log('🟡 [DEBUG] ❄️ 初期ツールチップ位置計算開始:', {
      index,
      date: data[index]?.date,
      containerWidth,
      actualChartPositions: actualChartPositions.slice(),
      dataLength: data.length
    });

    const tooltipWidth = 80;
    
    // 1. 実際の座標が記録されている場合はそれを使用
    if (actualChartPositions[index] !== undefined) {
      const position = actualChartPositions[index] - (tooltipWidth / 2);
      console.log('🟡 [DEBUG] ✅ 学習済み座標使用:', {
        計算ルート: '1. 学習済み実座標',
        index,
        actualPosition: actualChartPositions[index],
        tooltipWidth,
        calculatedPosition: position,
        説明: 'ホバーで学習した実際の座標を使用'
      });
      return position;
    }
    
    // 2. フォールバック: 記録された座標から補間計算
    if (actualChartPositions.length > 0 && containerWidth > 0) {
      const recordedIndices = actualChartPositions
        .map((pos, idx) => pos !== undefined ? idx : -1)
        .filter(idx => idx !== -1);
      
      console.log('🟡 [DEBUG] 🔍 補間計算検討:', {
        計算ルート: '2. 線形補間',
        recordedIndices,
        actualChartPositions: actualChartPositions.slice(),
        記録済み座標数: recordedIndices.length
      });
      
      if (recordedIndices.length >= 2) {
        // 線形補間で位置を推定
        const firstIdx = recordedIndices[0];
        const lastIdx = recordedIndices[recordedIndices.length - 1];
        const firstPos = actualChartPositions[firstIdx];
        const lastPos = actualChartPositions[lastIdx];
        
        const slope = (lastPos - firstPos) / (lastIdx - firstIdx);
        const estimatedX = firstPos + slope * (index - firstIdx);
        const position = estimatedX - (tooltipWidth / 2);
        
        console.log('🟡 [DEBUG] ✅ 線形補間計算完了:', {
          計算ルート: '2. 線形補間',
          firstIdx,
          lastIdx,
          firstPos,
          lastPos,
          slope,
          estimatedX,
          calculatedPosition: position,
          説明: '記録済み座標から線形補間で推定'
        });
        
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
      
      console.log('🟡 [DEBUG] ✅ 改善推定計算完了:', {
        計算ルート: '3. 改善推定計算',
        containerWidth,
        yAxisWidth,
        rightMargin,
        effectiveWidth,
        dataLength: data.length,
        pointSpacing,
        index,
        estimatedX,
        calculatedPosition: position,
        説明: 'Rechartsレイアウトを正確に模倣した推定'
      });
      
      return position;
    }
    
    console.log('🟡 [DEBUG] ❌ 全計算失敗:', {
      計算ルート: '4. 失敗',
      説明: 'すべての計算方法が失敗、0を返す',
      containerWidth,
      dataLength: data.length
    });
    return 0;
  };

  // 📍 チャート描画完了後の座標一括取得
  const captureAllChartPositions = () => {
    if (!chartContainerRef.current || !containerWidth || data.length === 0) {
      return;
    }

    console.log('🚀 [DEBUG] チャート座標一括取得開始');
    
    // チャートのSVG要素を探す
    const svgElement = chartContainerRef.current.querySelector('svg');
    if (!svgElement) {
      console.log('🚀 [DEBUG] SVG要素が見つかりません');
      return;
    }

    // Rechartsによって生成されたバー要素を探す
    const barElements = svgElement.querySelectorAll('g[class*="recharts-bar"] .recharts-bar-rectangle');
    console.log('🚀 [DEBUG] バー要素数:', barElements.length);

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

      console.log('🚀 [DEBUG] 座標一括取得完了:', {
        取得座標数: newPositions.filter(pos => pos !== undefined).length,
        座標配列: newPositions.slice()
      });

      setActualChartPositions(newPositions);
    }
  };

  // コンテナの幅が変更された時の処理
  const handleResize = (width: number) => {
    console.log('🟢 [DEBUG] handleResize 呼び出し:', {
      oldWidth: containerWidth,
      newWidth: width,
      dataLength: data.length
    });
    
    setContainerWidth(width);
    // 実際の座標記録をリセット（レイアウトが変わったため）
    setActualChartPositions([]);
    // チャートの準備状態をリセット
    setIsChartReady(false);
    
    // チャートのレンダリングが安定するまで少し待ってから座標取得と表示許可
    if (width > 0 && data.length > 0) {
      setTimeout(() => {
        console.log('🟢 [DEBUG] チャート準備完了設定 (handleResize)');
        captureAllChartPositions(); // 📍 座標一括取得
        setIsChartReady(true);
      }, 2000); // 安定化のため300msに延長
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
    console.log('🟠 [DEBUG] ❄️ 初期表示ツールチップ選択結果:', {
      uniqueIndices,
      reasons,
      総データ数: data.length,
      記事付きデータ数: data.filter(d => d.articles && d.articles.length > 0).length,
      選択基準: {
        '1': '最新日のニュース',
        '2': '変動率上位3つ',
        '3': '決算日(settlement=0)'
      }
    });
    
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
          console.error('News data fetch failed:', await newsResponse.text());
          throw new Error('News data fetch failed');
        }

        const newsResult = await newsResponse.json();
        if (!newsResult.success) {
          console.error('News API returned error:', newsResult);
          throw new Error('News API returned error');
        }

        const articles: NewsArticle[] = newsResult.data || [];
        console.log('記事データ:', articles);

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
              const isMatch = articleDateStr === chartDateStr;

              // デバッグ情報を出力（初日のみ）
              if (index === 0) {
                console.log('日付比較:', {
                  articleDate: articleDateStr,
                  chartDate: chartDateStr,
                  isMatch,
                  articleTitle: article.title,
                  articleCreatedAt: article.created_at,
                  chartDateOriginal: item.date,
                  // デバッグ用に日付オブジェクトの詳細も表示
                  articleDateObj: new Date(article.created_at),
                  chartDateObj: new Date(item.date),
                  isDevelopment: process.env.NODE_ENV === 'development'
                });
              }

              return isMatch;
            } catch (error) {
              console.error('日付比較エラー:', {
                article: article,
                item: item,
                error: error
              });
              return false;
            }
          });

          // デバッグ用に記事のマッチング結果をログ出力（マッチした場合のみ）
          if (dayArticles.length > 0) {
            console.log('記事マッチング成功:', {
              date: dateStr,
              rawDate: item.date,
              articleCount: dayArticles.length,
              articles: dayArticles.map(a => ({
                id: a.id,
                title: a.title,
                created_at: a.created_at
              }))
            });
          }

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
            console.log('🟢 [DEBUG] チャート準備完了設定 (useEffect)');
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
  }, [code]);

  // データ変更時の座標再取得
  useEffect(() => {
    if (data.length > 0 && containerWidth > 0) {
      setTimeout(() => {
        captureAllChartPositions();
      }, 100);
    }
  }, [data, containerWidth]);

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

          // デバッグ情報の出力（生成した場合）
          if (item.articles && item.articles.length > 0 && shouldShowTooltip) {
            const tooltipType = hoveredData ? '🔥 ホバー後のツールチップ生成' : '❄️ 初期状態のツールチップ生成';
            const positionSource = hoveredData ? 'tooltipPosition (ホバー座標)' : 'calculateTooltipPosition (計算/学習座標)';
            
            console.log(`${tooltipType}`, {
              date: item.date,
              index,
              articleCount: item.articles.length,
              positionSource,
              '=== 状態詳細 ===': {
                isDefaultTooltip: isDefaultTooltip,
                hoveredDate: hoveredData?.date,
                isHovered: hoveredData?.date === item.date,
                shouldShowTooltip,
                isChartReady
              },
              '=== 位置計算情報 ===': {
                actualChartPositionsAtIndex: actualChartPositions[index],
                tooltipPosition: tooltipPosition,
                calculatedPosition: !hoveredData ? calculateTooltipPosition(index) : 'ホバー時は未計算'
              },
              '=== 日付比較 ===': {
                hoveredTime: hoveredData?.date ? new Date(hoveredData.date).getTime() : 0,
                itemTime: new Date(item.date).getTime(),
                isEqual: hoveredData?.date ? new Date(hoveredData.date).getTime() === new Date(item.date).getTime() : false
              }
            });
          }

          if (!item.articles || item.articles.length === 0 || !shouldShowTooltip) return null;

          const latestArticle = item.articles[item.articles.length - 1];
          const title = latestArticle.title;
          const displayTitle = (() => {
            // 1. %）または%)のパターン
            const index1 = title.indexOf('%）');
            const index2 = title.indexOf('%)');
            // 2. %のパターン
            const index3 = title.indexOf('%');
            // 3. 】のパターン
            const index4 = title.indexOf('】');
            // 4. 半角/全角)のパターン
            const index5 = title.indexOf(')');
            const index6 = title.indexOf('）');

            let result = '';
            // 優先順位に従って処理
            if (index1 !== -1) {
              result = title.substring(index1 + 2);
            } else if (index2 !== -1) {
              result = title.substring(index2 + 2);
            } else if (index3 !== -1) {
              result = title.substring(index3 + 1);
            } else if (index4 !== -1) {
              result = title.substring(index4 + 1);
            } else if (index5 !== -1) {
              result = title.substring(index5 + 1);
            } else if (index6 !== -1) {
              result = title.substring(index6 + 1);
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

          const positionCalculationType = hoveredData ? '🔥 ホバー座標使用' : '❄️ 計算座標使用';
          const positionDetails = hoveredData 
            ? { type: 'hover', source: 'tooltipPosition', value: tooltipPosition }
            : { type: 'calculated', source: 'calculateTooltipPosition', value: calculateTooltipPosition(index) };

          console.log(`🔵 [DEBUG] ${positionCalculationType} - ツールチップ位置決定:`, {
            date: item.date,
            index,
            '=== 基本情報 ===': {
              isHoveredData: !!hoveredData,
              hoveredDataDate: hoveredData?.date,
              tooltipType: hoveredData ? 'ホバー中のツールチップ' : '初期表示ツールチップ'
            },
            '=== 位置情報 ===': {
              ...positionDetails,
              finalTooltipLeft: tooltipLeft,
              actualChartPositionsAtIndex: actualChartPositions[index]
            },
            '=== 計算比較 ===': {
              tooltipPosition: tooltipPosition,
              calculateTooltipPositionResult: calculateTooltipPosition(index),
              差分: Math.abs(tooltipPosition - calculateTooltipPosition(index))
            }
          });

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
                  
                  console.log('🔴 [DEBUG] 🔥 上段チャート onMouseMove イベント:', {
                    payloadDate: payload.date,
                    dataIndex,
                    activeCoordinateX: e.activeCoordinate.x,
                    activeCoordinateY: e.activeCoordinate.y,
                    hasArticles: !!(payload.articles && payload.articles.length > 0),
                    イベント説明: 'ホバー中 - 学習用座標記録'
                  });
                  
                  if (dataIndex !== -1) {
                    // 実際の座標を記録（学習） - データポイントの中央座標
                    recordChartPosition(dataIndex, e.activeCoordinate.x);
                    
                    if (payload.articles && payload.articles.length > 0) {
                      // ホバー時のツールチップ位置：中央座標から左端座標に変換
                      const tooltipWidth = 80;
                      const position = e.activeCoordinate.x - (tooltipWidth / 2);
                      
                      console.log('🔴 [DEBUG] 🔥 ホバーツールチップ位置計算:', {
                        date: payload.date,
                        dataIndex,
                        activeCoordinate: e.activeCoordinate.x,
                        tooltipWidth,
                        calculatedPosition: position,
                        containerWidth,
                        計算式: `${e.activeCoordinate.x} - (${tooltipWidth} / 2) = ${position}`,
                        説明: 'ホバー中のリアルタイム位置 - マウス座標から計算'
                      });
                      
                      setTooltipPosition(position);
                    }
                  }
                }
              }
            }}
            onMouseLeave={() => {
              console.log('🔴 [DEBUG] 🔥➡️❄️ onMouseLeave イベント - ホバー終了、初期状態に戻る');
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
                  
                  console.log('🟣 [DEBUG] 🔥 下段チャート onMouseMove イベント:', {
                    payloadDate: payload.date,
                    dataIndex,
                    activeCoordinateX: e.activeCoordinate.x,
                    activeCoordinateY: e.activeCoordinate.y,
                    説明: '下段チャートでのホバー - 座標学習と位置計算'
                  });
                  
                  if (dataIndex !== -1) {
                    // 実際の座標を記録（学習） - データポイントの中央座標
                    recordChartPosition(dataIndex, e.activeCoordinate.x);
                    
                    // 下段チャートでもツールチップ位置を統一：中央座標から左端座標に変換
                    const tooltipWidth = 80;
                    const position = e.activeCoordinate.x - (tooltipWidth / 2);
                    
                    console.log('🟣 [DEBUG] 🔥 下段チャートツールチップ位置計算:', {
                      date: payload.date,
                      dataIndex,
                      activeCoordinate: e.activeCoordinate.x,
                      tooltipWidth,
                      calculatedPosition: position,
                      計算式: `${e.activeCoordinate.x} - (${tooltipWidth} / 2) = ${position}`,
                      説明: '下段チャートのホバー位置計算'
                    });
                    
                    setTooltipPosition(position);
                  }
                }
              }
            }}
            onMouseLeave={() => {
              console.log('🟣 [DEBUG] 🔥➡️❄️ 下段チャート onMouseLeave イベント - ホバー終了');
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