'use client';

import { useState, useEffect } from 'react';

interface SparklineChartProps {
  code: string;
  width?: number;
  height?: number;
}

export default function SparklineChart({ code, width = 80, height = 36 }: SparklineChartProps) {
  const [prices, setPrices] = useState<number[]>([]);
  const [change, setChange] = useState<number | null>(null);

  useEffect(() => {
    if (!code || !/^\d{4}$/.test(code)) return;
    fetch(`/api/stocks/${code}/sparkline`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.prices?.length > 1) {
          setPrices(data.prices);
          setChange(data.change);
        }
      })
      .catch(() => {});
  }, [code]);

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

  const isPositive = change === null ? null : change >= 0;
  const lineColor = isPositive === null ? '#9ca3af' : isPositive ? '#ef4444' : '#3b82f6';

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
