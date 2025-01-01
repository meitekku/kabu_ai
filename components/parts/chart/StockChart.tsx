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
  Legend,
  Cell,
  TooltipProps
} from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { ChartData, PriceRecord, ApiResponse } from '@/types/parts/chart/MainChart';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';

interface ExtendedChartData extends ChartData {
  highLowBar: [number, number];
  candlestick: [number, number];
  color: string;
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

const formatNumber = (value: number | undefined): string => {
  if (typeof value === 'undefined' || Number.isNaN(value)) return '-';
  return value.toLocaleString();
};

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

const StockChart: React.FC<StockChartProps> = ({ code }) => {
  const [data, setData] = useState<ExtendedChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
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

        const sortedData = result.data.sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        const ma5 = calculateMA(sortedData, 5);
        const ma25 = calculateMA(sortedData, 25);
        const ma75 = calculateMA(sortedData, 75);

        const formattedData: ExtendedChartData[] = result.data.map((item, index) => {
          const isPositive = item.close >= item.open;
          return {
            date: new Date(item.date).toLocaleDateString(),
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
            ma75: ma75[index]
          };
        });

        formattedData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
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

  const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
    if (!active || !payload || payload.length === 0) return null;
    const chartData = payload[0]?.payload;
    if (!chartData) return null;

    return (
      <div className="bg-white p-4 border rounded shadow">
        <p className="font-bold">{chartData.date}</p>
        <p>始値: {formatNumber(chartData.open)}</p>
        <p>高値: {formatNumber(chartData.high)}</p>
        <p>安値: {formatNumber(chartData.low)}</p>
        <p>終値: {formatNumber(chartData.close)}</p>
        <p>出来高: {formatNumber(chartData.volume)}</p>
        <p>MA(5): {formatNumber(chartData.ma5)}</p>
        <p>MA(25): {formatNumber(chartData.ma25)}</p>
        <p>MA(75): {formatNumber(chartData.ma75)}</p>
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardContent>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="70%">
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} interval="preserveStartEnd" hide />
              <YAxis domain={['auto', 'auto']} tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="highLowBar" fill="none" stroke="#000000" strokeWidth={1} name="値幅" />
              <Bar dataKey="candlestick" name="株価" maxBarSize={8}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke={entry.color} />
                ))}
              </Bar>
              <Line type="monotone" dataKey="ma5" stroke="#00ff00" dot={false} name="MA(5)" />
              <Line type="monotone" dataKey="ma25" stroke="#ff0000" dot={false} name="MA(25)" />
              <Line type="monotone" dataKey="ma75" stroke="#0000ff" dot={false} name="MA(75)" />
            </ComposedChart>
          </ResponsiveContainer>

          <ResponsiveContainer width="100%" height="30%">
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 12 }} />
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
      </CardContent>
    </Card>
  );
};

export default StockChart;