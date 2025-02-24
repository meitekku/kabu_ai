import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell
} from 'recharts';
import { RectangleProps, TooltipProps } from 'recharts';
import { ChartData, PriceRecord, ApiResponse } from '@/types/parts/chart/MainChart';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';

/* --------------------------------------------------
 * 型定義
 * -------------------------------------------------- */
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
}

type CustomTooltipProps = TooltipProps<ValueType, NameType> & {
  payload?: Array<{
    payload: ExtendedChartData;
  }>;
};

interface StockChartProps {
  code: string;
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
const CandleBodyShape: React.FC<RectangleProps> = (props) => {
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
 * カスタムツールチップ
 * -------------------------------------------------- */
const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  const chartData = payload[0]?.payload;
  if (!chartData) return null;

  return (
    <div className="bg-white p-4 border rounded shadow">
      <p className="font-bold text-sm">{chartData.date}</p>
      <p className="text-sm">始値: {formatNumber(chartData.open)}</p>
      <p className="text-sm">高値: {formatNumber(chartData.high)}</p>
      <p className="text-sm">安値: {formatNumber(chartData.low)}</p>
      <p className="text-sm">終値: {formatNumber(chartData.close)}</p>
      {/* 出来高を1万株単位に変換 */}
      <p className="text-sm">出来高: {formatNumber(chartData.volume / 10000)}</p>
      <p className="text-sm">MA(5): {formatNumber(chartData.ma5)}</p>
      <p className="text-sm">MA(25): {formatNumber(chartData.ma25)}</p>
      <p className="text-sm">MA(75): {formatNumber(chartData.ma75)}</p>
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 実際のエンドポイントに合わせて修正してください
        const response = await fetch(`/api/${code}/chart`, {
          method: 'POST',
          body: JSON.stringify({ code, num: 60 }),
          headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) throw new Error('Data fetch failed');

        const result = (await response.json()) as ApiResponse<PriceRecord[]>;
        if (!result.success || !result.data || result.data.length === 0) {
          setData([]);
          return;
        }

        // 日付でソート
        const sortedData = result.data.sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        // 移動平均を計算
        const ma5 = calculateMA(sortedData, 5);
        const ma25 = calculateMA(sortedData, 25);
        const ma75 = calculateMA(sortedData, 75);

        // グラフ描画用に整形
        const formattedData: ExtendedChartData[] = sortedData.map((item, index) => {
          const isPositive = item.close >= item.open;
          return {
            date: new Date(item.date).toLocaleDateString(),
            open: item.open,
            high: item.high,
            low: item.low,
            close: item.close,
            volume: item.volume,
            // ヒゲ [low, high]
            highLowBar: [item.low, item.high],
            // 実体 [open, close]
            candlestick: [item.open, item.close],
            // 上昇なら赤、下落なら青
            color: isPositive ? '#ff0000' : '#0000ff',
            ma5: ma5[index],
            ma25: ma25[index],
            ma75: ma75[index]
          };
        });

        setData(formattedData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [code]);

  if (loading) return <div className="text-center p-4">Loading...</div>;
  if (error) return <div className="text-red-500 p-4">Error: {error}</div>;
  if (data.length === 0) return null;

  return (
    <div className="w-full">
      <div className="p-2">
        {/* 上段チャート（ロウソク足 + 移動平均）: 高さはそのまま */}
        <div className="h-32 md:h-48">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} barCategoryGap={0} barGap={0}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} interval="preserveStartEnd" hide />
              <YAxis domain={['auto', 'auto']} tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} wrapperStyle={{ zIndex: 9999 }} />
  
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
  
              {/* 移動平均線 */}
              <Line type="monotone" dataKey="ma5" stroke="#00ff00" dot={false} name="MA(5)" />
              <Line type="monotone" dataKey="ma25" stroke="#ff0000" dot={false} name="MA(25)" />
              <Line type="monotone" dataKey="ma75" stroke="#0000ff" dot={false} name="MA(75)" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
  
        {/* 下段チャート（出来高）の高さを大きく設定 */}
        <div className="h-20 md:h-24 mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} interval="preserveStartEnd" />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(value: number) => formatNumber(value / 10000)}
                label={{ value: '(万株)', position: 'insideLeft', offset: 0, fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
  
              <Bar dataKey="volume" name="出来高">
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
    </div>
  );
};

export default StockChart;