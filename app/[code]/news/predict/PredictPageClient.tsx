'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Area,
  ReferenceLine,
} from 'recharts';
import { ArrowLeft, AlertTriangle, ShieldAlert, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFingerprint } from '@/hooks/useFingerprint';
import StockChart from '@/components/parts/chart/StockChart';
import type { StockChartRef } from '@/components/parts/chart/StockChartTypes';
import Link from 'next/link';

interface DailyForecast {
  date: string;
  predictedClose: number;
  predictedHigh: number;
  predictedLow: number;
  predictedVolume: number;
  reasoning: string;
}

interface PredictionReport {
  summary: string;
  dailyForecasts: DailyForecast[];
  overallAnalysis: string;
  riskFactors: string[];
  confidence: number;
}

interface PredictPageClientProps {
  code: string;
}

const ANALYSIS_STEPS = [
  'チャートパターンを分析中...',
  '出来高トレンドを解析中...',
  '最新ニュースを読み込み中...',
  '業績データを確認中...',
  'AI予測モデルを実行中...',
];

function AnalyzingAnimation({ progress }: { progress: number }) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % ANALYSIS_STEPS.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
      {/* Background animation */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <svg className="w-full h-full opacity-5" viewBox="0 0 800 400">
          <path
            d="M0 200 Q100 150 200 180 Q300 210 400 170 Q500 130 600 190 Q700 250 800 200"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-emerald-500 animate-pulse"
          />
          <path
            d="M0 220 Q100 180 200 200 Q300 220 400 190 Q500 160 600 210 Q700 260 800 220"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            className="text-emerald-400/50 animate-pulse"
            style={{ animationDelay: '0.5s' }}
          />
        </svg>
      </div>

      <div className="relative z-10 w-full max-w-md space-y-8 text-center">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="p-4 rounded-full bg-emerald-500/10 animate-pulse">
            <TrendingUp className="w-10 h-10 text-emerald-500" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold">AIが分析中...</h2>

        {/* Progress bar */}
        <div className="w-full">
          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-green-400 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-muted-foreground mt-2">{Math.round(progress)}%</p>
        </div>

        {/* Cycling analysis steps */}
        <div className="h-8 relative">
          {ANALYSIS_STEPS.map((step, i) => (
            <p
              key={i}
              className={`absolute inset-0 text-sm text-muted-foreground transition-opacity duration-500 ${
                i === currentStep ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {step}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

function ConfidenceCircle({ confidence }: { confidence: number }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (confidence / 100) * circumference;

  const getColor = (c: number) => {
    if (c >= 70) return 'text-emerald-500';
    if (c >= 40) return 'text-amber-500';
    return 'text-red-500';
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="100" height="100" className="-rotate-90">
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          className="text-muted"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={`${getColor(confidence)} transition-all duration-1000 ease-out`}
        />
      </svg>
      <span className="absolute text-lg font-bold">{confidence}%</span>
    </div>
  );
}

interface ChartDataPoint {
  date: string;
  actual?: number;
  predicted?: number;
  predictedHigh?: number;
  predictedLow?: number;
}

function PredictionChart({ report, code }: { report: PredictionReport; code: string }) {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);

  useEffect(() => {
    const fetchActualData = async () => {
      try {
        const res = await fetch(`/api/${code}/chart`);
        if (!res.ok) throw new Error('Chart data fetch failed');
        const data = await res.json();

        // Build actual data points (last 20 days)
        const actualPoints: ChartDataPoint[] = (data.slice(-20) as Array<{ date: string; close: number }>).map(
          (d: { date: string; close: number }) => ({
            date: d.date,
            actual: d.close,
          })
        );

        // Build predicted data points with overlap on last actual date
        const lastActual = actualPoints[actualPoints.length - 1];
        const predictedPoints: ChartDataPoint[] = report.dailyForecasts.map((f) => ({
          date: f.date,
          predicted: f.predictedClose,
          predictedHigh: f.predictedHigh,
          predictedLow: f.predictedLow,
        }));

        // Add overlap point: last actual also shows as first predicted
        if (lastActual && predictedPoints.length > 0) {
          lastActual.predicted = lastActual.actual;
        }

        setChartData([...actualPoints, ...predictedPoints]);
      } catch {
        // Fallback: only show predicted data
        const points: ChartDataPoint[] = report.dailyForecasts.map((f) => ({
          date: f.date,
          predicted: f.predictedClose,
          predictedHigh: f.predictedHigh,
          predictedLow: f.predictedLow,
        }));
        setChartData(points);
      }
    };
    fetchActualData();
  }, [code, report.dailyForecasts]);

  if (chartData.length === 0) return null;

  // Find boundary date (first predicted-only point)
  const boundaryDate = chartData.find((d) => d.predicted !== undefined && d.actual === undefined)?.date;

  return (
    <div className="w-full h-64 md:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="predictGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11 }}
            width={50}
            domain={['auto', 'auto']}
          />
          <Tooltip
            contentStyle={{ fontSize: 12 }}
            formatter={(value: number, name: string) => {
              const labels: Record<string, string> = {
                actual: '実績',
                predicted: '予測',
                predictedHigh: '予測高値',
                predictedLow: '予測安値',
              };
              return [value?.toLocaleString(), labels[name] || name];
            }}
          />
          {boundaryDate && (
            <ReferenceLine
              x={boundaryDate}
              stroke="#9ca3af"
              strokeDasharray="4 4"
              label={{ value: '予測', position: 'top', fontSize: 11, fill: '#9ca3af' }}
            />
          )}
          <Area
            type="monotone"
            dataKey="predicted"
            fill="url(#predictGradient)"
            stroke="none"
          />
          <Line
            type="monotone"
            dataKey="actual"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            name="actual"
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="predicted"
            stroke="#10b981"
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={false}
            name="predicted"
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="predictedHigh"
            stroke="#10b981"
            strokeWidth={1}
            strokeDasharray="2 2"
            dot={false}
            name="predictedHigh"
            opacity={0.4}
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="predictedLow"
            stroke="#10b981"
            strokeWidth={1}
            strokeDasharray="2 2"
            dot={false}
            name="predictedLow"
            opacity={0.4}
            connectNulls={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function PredictionReport({ report, code }: { report: PredictionReport; code: string }) {
  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* Summary + Confidence */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        <div className="flex-1">
          <h2 className="text-xl font-bold mb-2">予測概要</h2>
          <p className="text-muted-foreground leading-relaxed">{report.summary}</p>
        </div>
        <div className="flex flex-col items-center gap-1">
          <ConfidenceCircle confidence={report.confidence} />
          <span className="text-xs text-muted-foreground">信頼度</span>
        </div>
      </div>

      {/* Chart */}
      <div className="border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3">予測チャート</h3>
        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
          <span className="flex items-center gap-1">
            <span className="w-4 h-0.5 bg-blue-500 inline-block" /> 実績
          </span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-0.5 bg-emerald-500 inline-block border-dashed" style={{ borderTop: '2px dashed #10b981', height: 0 }} /> 予測
          </span>
        </div>
        <PredictionChart report={report} code={code} />
      </div>

      {/* Daily forecast table */}
      <div className="border rounded-lg overflow-hidden">
        <h3 className="text-lg font-semibold p-4 pb-2">日別予測</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium">日付</th>
                <th className="text-right p-3 font-medium">予測終値</th>
                <th className="text-right p-3 font-medium hidden md:table-cell">予測高値</th>
                <th className="text-right p-3 font-medium hidden md:table-cell">予測安値</th>
                <th className="text-left p-3 font-medium">根拠</th>
              </tr>
            </thead>
            <tbody>
              {report.dailyForecasts.map((f, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="p-3 whitespace-nowrap">{f.date}</td>
                  <td className="p-3 text-right font-mono">{f.predictedClose.toLocaleString()}</td>
                  <td className="p-3 text-right font-mono hidden md:table-cell">{f.predictedHigh.toLocaleString()}</td>
                  <td className="p-3 text-right font-mono hidden md:table-cell">{f.predictedLow.toLocaleString()}</td>
                  <td className="p-3 text-muted-foreground text-xs">{f.reasoning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Overall Analysis */}
      <div className="border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">総合分析</h3>
        <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{report.overallAnalysis}</p>
      </div>

      {/* Risk Factors */}
      {report.riskFactors.length > 0 && (
        <div className="border rounded-lg p-4 border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
          <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-500" />
            リスク要因
          </h3>
          <ul className="space-y-2">
            {report.riskFactors.map((risk, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                {risk}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-xs text-muted-foreground text-center py-4 border-t">
        ※ AI予測は参考情報です。投資は自己責任で行ってください。
      </p>
    </div>
  );
}

export default function PredictPageClient({ code }: PredictPageClientProps) {
  const router = useRouter();
  const fingerprint = useFingerprint();
  const chartRef = useRef<StockChartRef>(null);
  const [state, setState] = useState<'loading' | 'complete' | 'error'>('loading');
  const [report, setReport] = useState<PredictionReport | null>(null);
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const hasFetched = useRef(false);

  // Fake progress animation
  useEffect(() => {
    if (state !== 'loading') return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        // Slow down as it approaches 90%
        const increment = Math.max(0.5, (90 - prev) * 0.05);
        return Math.min(90, prev + increment);
      });
    }, 200);

    return () => clearInterval(interval);
  }, [state]);

  const fetchPrediction = useCallback(async () => {
    if (!fingerprint || hasFetched.current) return;
    hasFetched.current = true;

    try {
      // Check cache first
      const cacheRes = await fetch(`/api/${code}/predict/cache`);
      const cacheData = await cacheRes.json();

      if (cacheData.cached && cacheData.data) {
        setProgress(100);
        setReport(cacheData.data);
        setState('complete');
        return;
      }

      // Get chart image for the API
      let chartImage: string | undefined;
      try {
        if (chartRef.current) {
          chartImage = await chartRef.current.exportAsImage();
        }
      } catch {
        // Chart image is optional
      }

      // Call prediction API
      const res = await fetch(`/api/${code}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fingerprint, chartImage }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Prediction failed' }));
        throw new Error(err.error || 'Prediction failed');
      }

      const data = await res.json();
      setProgress(100);

      // Small delay for animation completion
      await new Promise((resolve) => setTimeout(resolve, 500));

      setReport(data.report);
      setState('complete');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '予測の取得に失敗しました');
      setState('error');
    }
  }, [fingerprint, code]);

  useEffect(() => {
    if (fingerprint) {
      fetchPrediction();
    }
  }, [fingerprint, fetchPrediction]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/${code}/news`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1" />
            戻る
          </Button>
        </Link>
        <h1 className="text-xl font-bold">AI株価予測</h1>
        <span className="text-sm text-muted-foreground">({code})</span>
      </div>

      {/* Hidden chart for image export */}
      <div className="hidden">
        <StockChart
          ref={chartRef}
          code={code}
          asImage={true}
          pcHeight={{ upper: 200, lower: 100 }}
          mobileHeight={{ upper: 120, lower: 80 }}
          width="800px"
        />
      </div>

      {/* Content */}
      {state === 'loading' && (
        <AnalyzingAnimation progress={progress} />
      )}

      {state === 'complete' && report && (
        <PredictionReport report={report} code={code} />
      )}

      {state === 'error' && (
        <div className="min-h-[40vh] flex flex-col items-center justify-center text-center space-y-4">
          <AlertTriangle className="w-12 h-12 text-amber-500" />
          <h2 className="text-xl font-bold">予測の取得に失敗しました</h2>
          <p className="text-muted-foreground">{errorMessage}</p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => router.push(`/${code}/news`)}>
              ニュースに戻る
            </Button>
            <Button
              onClick={() => {
                hasFetched.current = false;
                setState('loading');
                setProgress(0);
                fetchPrediction();
              }}
            >
              再試行
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
