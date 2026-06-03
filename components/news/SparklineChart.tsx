'use client';

import { useState, useEffect } from 'react';

interface SparklineData {
  prices: number[];
  change: number | null;
}

interface SparklineChartProps {
  code: string;
  width?: number;
  height?: number;
  data?: SparklineData | null;
}

export default function SparklineChart({ code, width = 80, height = 36, data: propData }: SparklineChartProps) {
  const [prices, setPrices] = useState<number[]>([]);

  useEffect(() => {
    if (propData !== undefined) {
      // Use provided data — no fetch needed
      if (propData && propData.prices.length > 1) {
        setPrices(propData.prices);
      } else {
        setPrices([]);
      }
      return;
    }
    // Self-fetch
    if (!code || !/^[0-9A-Z]{4}$/.test(code)) return;
    fetch(`/api/stocks/${code}/sparkline`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.prices?.length > 1) {
          setPrices(d.prices);
        }
      })
      .catch(() => {});
  }, [code, propData]);

  if (prices.length < 2) return null;

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  const pad = 2;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;

  const points = prices.map((p, i) => {
    const x = pad + (i / (prices.length - 1)) * innerW;
    const y = pad + (1 - (p - min) / range) * innerH;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  // 前日比（最後の2点）で色を判定
  const dayChange = prices[prices.length - 1] - prices[prices.length - 2];
  const lineColor = dayChange >= 0 ? '#ef4444' : '#3b82f6';

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
    >
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={lineColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
