'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, AlertTriangle, ShieldAlert, TrendingUp, Check, Database, Newspaper, BarChart3, BrainCircuit, FileCheck, Tag, Shield, Loader2, X } from 'lucide-react';
import { FaXTwitter, FaLine, FaFacebookF } from 'react-icons/fa6';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useFingerprint } from '@/hooks/useFingerprint';
import { useCloudflareTurnstile } from '@/hooks/useCloudflareTurnstile';
import { CloudflareTurnstileModal } from '@/components/common/CloudflareTurnstileModal';
import StockChart, { type StockChartRef } from '@/components/parts/chart/StockChart';
import CompanyBasicInfo from '@/components/common/CompanyBasicInfo';
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
  dailyForecasts: DailyForecast[];
  overallAnalysis: string;
  riskFactors: string[];
  technicalAnalysis?: string;
  fundamentalAnalysis?: string;
  catalystAnalysis?: string;
  investmentStrategy?: string;
  currentPrice?: number;
  scores?: PredictionScores;
}

interface PredictPageClientProps {
  code: string;
  companyName?: string;
}

const ANALYSIS_STEPS = [
  { icon: Database, label: 'データ取得中', description: '株価・出来高データを収集しています' },
  { icon: Newspaper, label: 'ニュース分析中', description: '最新ニュースと業績データを確認しています' },
  { icon: BrainCircuit, label: 'AI分析中', description: 'AIモデルが株価パターンを解析しています' },
  { icon: BarChart3, label: '品質チェック中', description: '予測レポートの精度を検証しています' },
  { icon: FileCheck, label: 'レポート生成中', description: '予測結果をまとめています' },
];

const STEP_TIMINGS = [3000, 10000, 60000, 120000];

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
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-3 sm:px-4">
      <div className="relative z-10 w-full max-w-md space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="p-3 sm:p-4 rounded-full bg-emerald-500/10 animate-pulse">
              <TrendingUp className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-500" />
            </div>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold">AIが分析中...</h2>
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
          AIが複数のデータソースを分析してレポートを作成します。通常2〜4分ほどかかります。
        </p>
      </div>
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
    <span className={`inline-flex items-center justify-center text-xs font-bold border rounded-full px-2 py-0.5 ml-auto ${color}`}>
      {clamped}<span className="text-[10px] font-normal ml-0.5">/100</span>
    </span>
  );
}

function PredictionReport({ report, code, chartRef }: { report: PredictionReport; code: string; chartRef: React.RefObject<StockChartRef | null> }) {
  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-700">
      {/* 1. Chart with prediction overlay (no news tooltips) */}
      <div className="border rounded-lg p-2 sm:p-4">
        <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3">株価チャート</h3>
        <StockChart
          ref={chartRef}
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
        <h2 className="text-lg sm:text-xl font-bold mb-2">予測概要</h2>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">{report.summary}</p>
      </div>

      {/* 3.5 Themes & Risks */}
      {((report.themes && report.themes.length > 0) || (report.risks && report.risks.length > 0)) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
          {report.themes && report.themes.length > 0 && (
            <div className="border rounded-lg p-3 sm:p-4 border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-blue-500 flex-shrink-0" />
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
            <div className="border rounded-lg p-3 sm:p-4 border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-amber-500 flex-shrink-0" />
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
        <div className="border rounded-lg p-3 sm:p-4">
          <h3 className="text-base sm:text-lg font-semibold mb-2 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 flex-shrink-0" />
            <span className="min-w-0">テクニカル分析</span>
            <ScoreBadge score={report.scores?.technical} />
          </h3>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed whitespace-pre-wrap">{report.technicalAnalysis}</p>
        </div>
      )}

      {report.fundamentalAnalysis && (
        <div className="border rounded-lg p-3 sm:p-4">
          <h3 className="text-base sm:text-lg font-semibold mb-2 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 flex-shrink-0" />
            <span className="min-w-0">ファンダメンタルズ分析</span>
            <ScoreBadge score={report.scores?.fundamental} />
          </h3>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed whitespace-pre-wrap">{report.fundamentalAnalysis}</p>
        </div>
      )}

      {report.catalystAnalysis && (
        <div className="border rounded-lg p-3 sm:p-4">
          <h3 className="text-base sm:text-lg font-semibold mb-2 flex items-center gap-2">
            <Newspaper className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500 flex-shrink-0" />
            <span className="min-w-0">カタリスト・材料分析</span>
            <ScoreBadge score={report.scores?.catalyst} />
          </h3>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed whitespace-pre-wrap">{report.catalystAnalysis}</p>
        </div>
      )}

      {report.investmentStrategy && (
        <div className="border rounded-lg p-3 sm:p-4">
          <h3 className="text-base sm:text-lg font-semibold mb-2 flex items-center gap-2">
            <BrainCircuit className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500 flex-shrink-0" />
            <span className="min-w-0">投資戦略</span>
            <ScoreBadge score={report.scores?.strategy} />
          </h3>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed whitespace-pre-wrap">{report.investmentStrategy}</p>
        </div>
      )}

      {/* 5. Overall Analysis */}
      <div className="border rounded-lg p-3 sm:p-4">
        <h3 className="text-base sm:text-lg font-semibold mb-2 flex items-center gap-2">
          総合分析
          <ScoreBadge score={report.scores?.overall} />
        </h3>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed whitespace-pre-wrap">{report.overallAnalysis}</p>
      </div>

      {/* 6. Risk Factors */}
      {report.riskFactors.length > 0 && (
        <div className="border rounded-lg p-3 sm:p-4 border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
          <h3 className="text-base sm:text-lg font-semibold mb-2 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 flex-shrink-0" />
            リスク要因
          </h3>
          <ul className="space-y-2">
            {report.riskFactors.map((risk, i) => (
              <li key={i} className="flex items-start gap-2 text-xs sm:text-sm text-muted-foreground">
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

export default function PredictPageClient({ code, companyName }: PredictPageClientProps) {
  const router = useRouter();
  const fingerprint = useFingerprint();
  const [state, setState] = useState<'loading' | 'complete' | 'error'>('loading');
  const [report, setReport] = useState<PredictionReport | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [showTurnstileModal, setShowTurnstileModal] = useState(false);
  const [shareModal, setShareModal] = useState<{
    platform: 'twitter' | 'line' | 'facebook';
    loading: boolean;
    posting: boolean;
    imageUrl: string | null;
    text: string;
    url: string;
    posted: boolean;
    tweetUrl: string | null;
    error: string | null;
  } | null>(null);
  const hasFetched = useRef(false);
  const stepTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const chartRef = useRef<StockChartRef | null>(null);
  const {
    enabled: turnstileEnabled,
    verified: turnstileVerified,
    requiresVerification: turnstileRequired,
    isLoading: turnstileLoading,
    isVerifying: turnstileVerifying,
    error: turnstileError,
    verifyToken,
  } = useCloudflareTurnstile();

  // Time-based step progression
  useEffect(() => {
    if (state !== 'loading' || !hasFetched.current) return;

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

  useEffect(() => {
    if (!turnstileLoading && turnstileRequired) {
      setShowTurnstileModal(true);
    }
  }, [turnstileLoading, turnstileRequired]);

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
      const maxPolls = 120; // 最大6分間（3秒 x 120回）
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
    if (fingerprint && !turnstileLoading && !turnstileRequired) {
      fetchPrediction();
    }
  }, [fingerprint, turnstileLoading, turnstileRequired, fetchPrediction]);

  const handleTurnstileVerify = useCallback(
    (token: string): Promise<boolean> => verifyToken(token, 'ai-feature-access'),
    [verifyToken]
  );

  const openSharePreview = useCallback(async (platform: 'twitter' | 'line' | 'facebook') => {
    if (!report) return;

    const displayName = companyName ? `${companyName}(${code})` : code;
    const shareUrl = `https://kabu-ai.jp/stocks/${code}/predict`;

    // 1ヶ月後の予測価格と変動率を計算
    const lastForecast = report.dailyForecasts[report.dailyForecasts.length - 1];
    const predictedPrice = lastForecast ? Math.round(lastForecast.predictedClose) : null;
    const currentPrice = report.currentPrice;
    let priceLine = '';
    if (predictedPrice && currentPrice) {
      const changePercent = ((predictedPrice - currentPrice) / currentPrice * 100).toFixed(1);
      const sign = Number(changePercent) >= 0 ? '+' : '';
      priceLine = `\n1ヶ月後予想: ${predictedPrice.toLocaleString()}円（${sign}${changePercent}%） 現在値: ${Math.round(currentPrice).toLocaleString()}円`;
    }

    const shareText = `${displayName} AI株価予測${priceLine}\n${report.summary}\n#株AI #AI株価予測`;

    setShareModal({ platform, loading: true, posting: false, imageUrl: null, text: shareText, url: shareUrl, posted: false, tweetUrl: null, error: null });

    // チャート画像をキャプチャ
    if (chartRef.current) {
      try {
        const dataUrl = await chartRef.current.exportAsImage();
        setShareModal(prev => prev ? { ...prev, loading: false, imageUrl: dataUrl } : null);
      } catch {
        setShareModal(prev => prev ? { ...prev, loading: false } : null);
      }
    } else {
      setShareModal(prev => prev ? { ...prev, loading: false } : null);
    }
  }, [report, code, companyName]);

  const executeShare = useCallback(async () => {
    if (!shareModal) return;
    const { platform, text, url, imageUrl } = shareModal;

    if (platform === 'twitter') {
      // X: API経由で画像付き投稿
      setShareModal(prev => prev ? { ...prev, posting: true, error: null } : null);
      try {
        const res = await fetch('/api/twitter/post', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tweetContent: text,
            url,
            imageUrl: imageUrl || undefined,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setShareModal(prev => prev ? { ...prev, posting: false, posted: true, tweetUrl: data.tweetUrl } : null);
        } else {
          setShareModal(prev => prev ? { ...prev, posting: false, error: data.message || '投稿に失敗しました' } : null);
        }
      } catch {
        setShareModal(prev => prev ? { ...prev, posting: false, error: '投稿に失敗しました' } : null);
      }
      return;
    }

    // LINE / Facebook: URL intentでシェア
    let dest = '';
    switch (platform) {
      case 'line':
        dest = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
        break;
      case 'facebook':
        dest = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        break;
    }
    window.open(dest, '_blank');
    setShareModal(null);
  }, [shareModal]);

  return (
    <div className="px-4 sm:px-6">
      {/* Header */}
      <div className="mb-6">
        <CompanyBasicInfo code={code} />
        <div className="mt-3 flex items-center justify-between gap-2 px-2">
          <Link href={`/stocks/${code}/news`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" />
              戻る
            </Button>
          </Link>
          {state === 'complete' && report && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => openSharePreview('twitter')}
                className="w-8 h-8 rounded-full bg-black hover:bg-gray-800 flex items-center justify-center transition-colors"
                aria-label="Xでシェア"
              >
                <FaXTwitter className="w-4 h-4 text-white" />
              </button>
              <button
                onClick={() => openSharePreview('line')}
                className="w-8 h-8 rounded-full bg-[#06C755] hover:bg-[#05b34c] flex items-center justify-center transition-colors"
                aria-label="LINEでシェア"
              >
                <FaLine className="w-4 h-4 text-white" />
              </button>
              <button
                onClick={() => openSharePreview('facebook')}
                className="w-8 h-8 rounded-full bg-[#1877F2] hover:bg-[#1565d8] flex items-center justify-center transition-colors"
                aria-label="Facebookでシェア"
              >
                <FaFacebookF className="w-4 h-4 text-white" />
              </button>
            </div>
          )}
        </div>
        <h1 className="px-2 pt-1 text-xl font-bold">AI株価予測</h1>
      </div>

      <CloudflareTurnstileModal
        open={showTurnstileModal}
        onOpenChange={setShowTurnstileModal}
        onVerify={handleTurnstileVerify}
        isSubmitting={turnstileVerifying}
        errorMessage={turnstileError}
        title="Cloudflare認証"
        description="株価予測を利用する前にCloudflare認証を完了してください。"
      />

      {/* Content */}
      {state === 'loading' && (
        <>
          {!fingerprint && (
            <div className="min-h-[50vh] flex items-center justify-center text-sm text-muted-foreground">
              端末情報を取得しています...
            </div>
          )}
          {fingerprint && turnstileLoading && (
            <div className="min-h-[50vh] flex items-center justify-center text-sm text-muted-foreground">
              Cloudflare認証状態を確認しています...
            </div>
          )}
          {fingerprint && !turnstileLoading && turnstileRequired && (
            <div className="min-h-[50vh] flex flex-col items-center justify-center text-center space-y-4">
              <ShieldAlert className="w-10 h-10 text-amber-500" />
              <h2 className="text-xl font-bold">Cloudflare認証が必要です</h2>
              <p className="text-muted-foreground text-sm">
                株価予測を開始する前にCloudflare認証を完了してください。
              </p>
              <Button onClick={() => setShowTurnstileModal(true)}>
                認証を開始する
              </Button>
            </div>
          )}
          {fingerprint && !turnstileLoading && !turnstileRequired && (
            <AnalyzingAnimation activeStep={activeStep} />
          )}
        </>
      )}

      {state === 'complete' && report && (
        <PredictionReport report={report} code={code} chartRef={chartRef} />
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
                if (turnstileEnabled && !turnstileVerified) {
                  setShowTurnstileModal(true);
                  return;
                }
                void fetchPrediction();
              }}
            >
              再試行
            </Button>
          </div>
        </div>
      )}

      {/* シェアプレビューポップアップ */}
      {shareModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={() => !shareModal.posting && setShareModal(null)}>
          <div className="bg-background border rounded-t-xl sm:rounded-xl w-full max-w-lg sm:mx-4 max-h-[85vh] sm:max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* ヘッダー: タイトル左・投稿ボタン右・☓ボタン右上 */}
            <div className="flex items-center justify-between p-3 sm:p-4 pb-0">
              <h3 className="text-base sm:text-lg font-semibold">
                {shareModal.platform === 'twitter' ? 'X (Twitter)' : shareModal.platform === 'line' ? 'LINE' : 'Facebook'}でシェア
              </h3>
              <div className="flex items-center gap-2">
                {shareModal.posted ? (
                  shareModal.tweetUrl && (
                    <a href={shareModal.tweetUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline">
                      投稿を確認
                    </a>
                  )
                ) : (
                  <Button
                    size="sm"
                    onClick={executeShare}
                    disabled={shareModal.loading || shareModal.posting}
                    className={
                      shareModal.platform === 'twitter' ? 'bg-black hover:bg-gray-800 text-white' :
                      shareModal.platform === 'line' ? 'bg-[#06C755] hover:bg-[#05b34c] text-white' :
                      'bg-[#1877F2] hover:bg-[#1565d8] text-white'
                    }
                  >
                    {shareModal.posting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-1" />
                        投稿中...
                      </>
                    ) : '投稿する'}
                  </Button>
                )}
                <button onClick={() => !shareModal.posting && setShareModal(null)} className="text-muted-foreground hover:text-foreground p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 space-y-4">
              {/* 投稿成功メッセージ */}
              {shareModal.posted && (
                <div className="border rounded-lg p-3 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800">
                  <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">投稿が完了しました</p>
                </div>
              )}

              {/* エラーメッセージ */}
              {shareModal.error && (
                <div className="border rounded-lg p-3 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-700 dark:text-red-400">{shareModal.error}</p>
                </div>
              )}

              {/* チャート画像プレビュー */}
              <div className="border rounded-lg overflow-hidden bg-muted">
                {shareModal.loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">チャート画像を生成中...</span>
                  </div>
                ) : shareModal.imageUrl ? (
                  <Image src={shareModal.imageUrl} alt="チャートプレビュー" width={800} height={400} className="w-full h-auto" unoptimized />
                ) : (
                  <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                    画像を取得できませんでした
                  </div>
                )}
              </div>

              {/* シェアテキストプレビュー */}
              <div className="border rounded-lg p-3 bg-muted/50">
                <p className="text-sm whitespace-pre-wrap break-words">{shareModal.text}</p>
                <p className="text-xs text-blue-500 mt-2">{shareModal.url}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
