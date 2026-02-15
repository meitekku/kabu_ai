'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, AlertTriangle, ShieldAlert, TrendingUp, TrendingDown, Check, Database, Newspaper, BarChart3, BrainCircuit, FileCheck, Tag, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFingerprint } from '@/hooks/useFingerprint';
import StockChart from '@/components/parts/chart/StockChart';
import Link from 'next/link';

interface DailyForecast {
  date: string;
  predictedOpen?: number;
  predictedClose: number;
  predictedHigh: number;
  predictedLow: number;
  predictedVolume: number;
  reasoning: string;
}

interface TrendDirection {
  direction: 'up' | 'neutral' | 'down';
  strength: number;
  reason: string;
}

interface PredictionScores {
  technical: number;
  fundamental: number;
  catalyst: number;
  strategy: number;
  overall: number;
}

interface PredictionReport {
  summary: string;
  themes?: string[];
  risks?: string[];
  trends?: {
    oneWeek: TrendDirection;
    twoWeeks: TrendDirection;
    oneMonth: TrendDirection;
  };
  dailyForecasts: DailyForecast[];
  overallAnalysis: string;
  riskFactors: string[];
  technicalAnalysis?: string;
  fundamentalAnalysis?: string;
  catalystAnalysis?: string;
  investmentStrategy?: string;
  scores?: PredictionScores;
}

interface PredictPageClientProps {
  code: string;
}

const ANALYSIS_STEPS = [
  { icon: Database, label: 'データ取得中', description: '株価・出来高データを収集しています' },
  { icon: Newspaper, label: 'ニュース分析中', description: '最新ニュースと業績データを確認しています' },
  { icon: BrainCircuit, label: 'AI分析中', description: 'AIモデルが株価パターンを解析しています' },
  { icon: BarChart3, label: '品質チェック中', description: '予測レポートの精度を検証しています' },
  { icon: FileCheck, label: 'レポート生成中', description: '予測結果をまとめています' },
];

const STEP_TIMINGS = [2000, 4000, 15000, 25000];

function AnalyzingAnimation({ activeStep }: { activeStep: number }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return min > 0 ? `${min}分${sec}秒` : `${sec}秒`;
  };

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
      <div className="relative z-10 w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="p-4 rounded-full bg-emerald-500/10 animate-pulse">
              <TrendingUp className="w-10 h-10 text-emerald-500" />
            </div>
          </div>
          <h2 className="text-2xl font-bold">AIが分析中...</h2>
          <p className="text-sm text-muted-foreground">経過時間: {formatTime(elapsed)}</p>
        </div>

        {/* Step indicator */}
        <div className="space-y-1">
          {ANALYSIS_STEPS.map((step, i) => {
            const StepIcon = step.icon;
            const isCompleted = i < activeStep;
            const isActive = i === activeStep;
            const isPending = i > activeStep;

            return (
              <div key={i} className="flex items-start gap-4">
                {/* Step circle + connector */}
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500 ${
                      isCompleted
                        ? 'bg-emerald-500 text-white'
                        : isActive
                          ? 'bg-emerald-500/20 border-2 border-emerald-500'
                          : 'bg-muted border-2 border-muted-foreground/20'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-5 h-5" />
                    ) : isActive ? (
                      <StepIcon className="w-5 h-5 text-emerald-500 animate-pulse" />
                    ) : (
                      <StepIcon className="w-5 h-5 text-muted-foreground/40" />
                    )}
                  </div>
                  {i < ANALYSIS_STEPS.length - 1 && (
                    <div
                      className={`w-0.5 h-6 transition-colors duration-500 ${
                        isCompleted ? 'bg-emerald-500' : 'bg-muted-foreground/20'
                      }`}
                    />
                  )}
                </div>

                {/* Step text */}
                <div className={`pt-2 pb-4 ${isPending ? 'opacity-40' : ''}`}>
                  <p
                    className={`text-sm font-medium transition-colors duration-500 ${
                      isActive ? 'text-emerald-500' : isCompleted ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {step.label}
                    {isCompleted && (
                      <span className="ml-2 text-xs text-emerald-500">完了</span>
                    )}
                  </p>
                  {(isActive || isCompleted) && (
                    <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Tip text */}
        <p className="text-xs text-muted-foreground text-center">
          AIが複数のデータソースを分析してレポートを作成します。通常30秒〜1分ほどかかります。
        </p>
      </div>
    </div>
  );
}


function StrengthScore({ strength }: { strength: number }) {
  return (
    <span className="text-lg font-bold tabular-nums">{strength}<span className="text-xs font-normal text-muted-foreground">/5</span></span>
  );
}

function TrendCard({ label, trend }: { label: string; trend: TrendDirection }) {
  const config = {
    up: { Icon: TrendingUp, color: 'text-emerald-500', borderColor: 'border-emerald-200 dark:border-emerald-900' },
    neutral: { Icon: ArrowRight, color: 'text-gray-400', borderColor: 'border-gray-200 dark:border-gray-700' },
    down: { Icon: TrendingDown, color: 'text-red-500', borderColor: 'border-red-200 dark:border-red-900' },
  }[trend.direction];

  return (
    <div className={`border rounded-lg p-4 flex flex-col items-center gap-2 ${config.borderColor}`}>
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
      <config.Icon className={`w-8 h-8 ${config.color}`} />
      <div className={config.color}>
        <StrengthScore strength={trend.strength} />
      </div>
      <p className="text-xs text-muted-foreground text-center leading-snug">{trend.reason}</p>
    </div>
  );
}

function ScoreBadge({ score }: { score?: number }) {
  if (score == null) return null;
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const color = clamped >= 80
    ? 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/40 dark:border-emerald-800'
    : clamped >= 60
      ? 'text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950/40 dark:border-blue-800'
      : clamped >= 40
        ? 'text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/40 dark:border-amber-800'
        : 'text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950/40 dark:border-red-800';
  return (
    <span className={`inline-flex items-center justify-center text-xs font-bold border rounded-full px-2 py-0.5 ml-2 ${color}`}>
      {clamped}<span className="text-[10px] font-normal ml-0.5">/100</span>
    </span>
  );
}

function TrendSection({ trends }: { trends: NonNullable<PredictionReport['trends']> }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <TrendCard label="1週間" trend={trends.oneWeek} />
      <TrendCard label="2週間" trend={trends.twoWeeks} />
      <TrendCard label="1ヶ月" trend={trends.oneMonth} />
    </div>
  );
}

function PredictionReport({ report, code }: { report: PredictionReport; code: string }) {
  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* 1. Trend Arrows */}
      {report.trends && <TrendSection trends={report.trends} />}

      {/* 2. Chart with prediction overlay (no news tooltips) */}
      <div className="border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3">株価チャート</h3>
        <StockChart
          code={code}
          hideNewsTooltips={true}
          predictionData={report.dailyForecasts.map(f => ({
            date: f.date,
            predictedOpen: f.predictedOpen ?? f.predictedClose,
            predictedClose: f.predictedClose,
            predictedHigh: f.predictedHigh,
            predictedLow: f.predictedLow,
          }))}
          pcHeight={{ upper: 250, lower: 100 }}
          tabletHeight={{ upper: 220, lower: 96 }}
          mobileHeight={{ upper: 160, lower: 80 }}
          width="100%"
        />
      </div>

      {/* 3. Summary */}
      <div>
        <h2 className="text-xl font-bold mb-2">予測概要</h2>
        <p className="text-muted-foreground leading-relaxed">{report.summary}</p>
      </div>

      {/* 3.5 Themes & Risks */}
      {((report.themes && report.themes.length > 0) || (report.risks && report.risks.length > 0)) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {report.themes && report.themes.length > 0 && (
            <div className="border rounded-lg p-4 border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-blue-500" />
                関連テーマ
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {report.themes.map((theme, i) => (
                  <span key={i} className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                    {theme}
                  </span>
                ))}
              </div>
            </div>
          )}
          {report.risks && report.risks.length > 0 && (
            <div className="border rounded-lg p-4 border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-amber-500" />
                主要リスク
              </h3>
              <ul className="space-y-1">
                {report.risks.map((risk, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <span className="text-amber-500 mt-0.5">•</span>
                    {risk}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* 4. Content Sections */}
      {report.technicalAnalysis && (
        <div className="border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-500" />
            テクニカル分析
            <ScoreBadge score={report.scores?.technical} />
          </h3>
          <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{report.technicalAnalysis}</p>
        </div>
      )}

      {report.fundamentalAnalysis && (
        <div className="border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            ファンダメンタルズ分析
            <ScoreBadge score={report.scores?.fundamental} />
          </h3>
          <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{report.fundamentalAnalysis}</p>
        </div>
      )}

      {report.catalystAnalysis && (
        <div className="border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <Newspaper className="w-5 h-5 text-orange-500" />
            カタリスト・材料分析
            <ScoreBadge score={report.scores?.catalyst} />
          </h3>
          <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{report.catalystAnalysis}</p>
        </div>
      )}

      {report.investmentStrategy && (
        <div className="border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-purple-500" />
            投資戦略
            <ScoreBadge score={report.scores?.strategy} />
          </h3>
          <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{report.investmentStrategy}</p>
        </div>
      )}

      {/* 5. Overall Analysis */}
      <div className="border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
          総合分析
          <ScoreBadge score={report.scores?.overall} />
        </h3>
        <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{report.overallAnalysis}</p>
      </div>

      {/* 6. Risk Factors */}
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

      {/* 7. Disclaimer */}
      <p className="text-xs text-muted-foreground text-center py-4 border-t">
        ※ AI予測は参考情報です。投資は自己責任で行ってください。
      </p>
    </div>
  );
}

export default function PredictPageClient({ code }: PredictPageClientProps) {
  const router = useRouter();
  const fingerprint = useFingerprint();
  const [state, setState] = useState<'loading' | 'complete' | 'error'>('loading');
  const [report, setReport] = useState<PredictionReport | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const hasFetched = useRef(false);
  const stepTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Time-based step progression
  useEffect(() => {
    if (state !== 'loading') return;

    // Schedule step transitions based on expected API timing
    let cumulative = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    STEP_TIMINGS.forEach((delay, i) => {
      cumulative += delay;
      const timer = setTimeout(() => {
        setActiveStep((prev) => Math.max(prev, i + 1));
      }, cumulative);
      timers.push(timer);
    });
    stepTimers.current = timers;

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [state]);

  const fetchPrediction = useCallback(async () => {
    if (!fingerprint || hasFetched.current) return;
    hasFetched.current = true;

    try {
      // Check cache first
      setActiveStep(0);
      const cacheRes = await fetch(`/api/stocks/${code}/predict/cache`);
      const cacheData = await cacheRes.json();

      if (cacheData.cached && cacheData.data) {
        stepTimers.current.forEach(clearTimeout);
        setReport(cacheData.data);
        setState('complete');
        return;
      }

      // If not already processing, start prediction
      if (!cacheData.processing) {
        const res = await fetch(`/api/stocks/${code}/predict`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fingerprint }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Prediction failed' }));
          throw new Error(err.error || 'Prediction failed');
        }
      }

      // Poll cache until result is ready
      const maxPolls = 60; // 最大3分間（3秒 x 60回）
      for (let i = 0; i < maxPolls; i++) {
        await new Promise((resolve) => setTimeout(resolve, 3000));

        const pollRes = await fetch(`/api/stocks/${code}/predict/cache`);
        const pollData = await pollRes.json();

        if (pollData.cached && pollData.data) {
          stepTimers.current.forEach(clearTimeout);
          setActiveStep(ANALYSIS_STEPS.length);
          await new Promise((resolve) => setTimeout(resolve, 400));
          setReport(pollData.data);
          setState('complete');
          return;
        }

        if (!pollData.processing) {
          // processing フラグがない = エラーで終了した
          throw new Error('予測の生成に失敗しました。再度お試しください。');
        }
      }

      throw new Error('予測がタイムアウトしました。再度お試しください。');
    } catch (err) {
      stepTimers.current.forEach(clearTimeout);
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
        <Link href={`/stocks/${code}/news`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1" />
            戻る
          </Button>
        </Link>
        <h1 className="text-xl font-bold">AI株価予測</h1>
        <span className="text-sm text-muted-foreground">({code})</span>
      </div>

      {/* Content */}
      {state === 'loading' && (
        <AnalyzingAnimation activeStep={activeStep} />
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
            <Button variant="outline" onClick={() => router.push(`/stocks/${code}/news`)}>
              ニュースに戻る
            </Button>
            <Button
              onClick={() => {
                hasFetched.current = false;
                setState('loading');
                setActiveStep(0);
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
