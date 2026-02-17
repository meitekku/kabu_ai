'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TrendingUp, MessageSquare, Loader2, Sparkles } from 'lucide-react';
import { useFingerprint } from '@/hooks/useFingerprint';
import { useCloudflareTurnstile } from '@/hooks/useCloudflareTurnstile';
import { LoginModal } from '@/components/common/LoginModal';
import { PremiumModal } from '@/components/common/PremiumModal';
import { CloudflareTurnstileModal } from '@/components/common/CloudflareTurnstileModal';

interface AiFeatureNavProps {
  code: string;
}

type PendingAction = 'predict' | 'chat';

export function AiFeatureNav({ code }: AiFeatureNavProps) {
  const router = useRouter();
  const fingerprint = useFingerprint();
  const [isChecking, setIsChecking] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showTurnstileModal, setShowTurnstileModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const {
    enabled: turnstileEnabled,
    verified: turnstileVerified,
    isVerifying: turnstileVerifying,
    error: turnstileError,
    refreshStatus,
    verifyToken,
  } = useCloudflareTurnstile();

  const ensureTurnstileVerified = useCallback(async (): Promise<boolean> => {
    if (!turnstileEnabled || turnstileVerified) {
      return true;
    }

    const latestStatus = await refreshStatus();
    return !latestStatus.enabled || latestStatus.verified;
  }, [turnstileEnabled, turnstileVerified, refreshStatus]);

  const runPredictFlow = useCallback(async () => {
    if (!fingerprint || isChecking) return;

    setIsChecking(true);
    try {
      const res = await fetch(`/api/stocks/${code}/predict/check-usage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fingerprint }),
      });
      const data = await res.json();

      if (data.canPredict) {
        router.push(`/stocks/${code}/predict`);
      } else if (data.requireLogin) {
        setShowLoginModal(true);
      } else if (data.requirePremium) {
        setShowPremiumModal(true);
      }
    } catch {
      router.push(`/stocks/${code}/predict`);
    } finally {
      setIsChecking(false);
    }
  }, [fingerprint, isChecking, code, router]);

  const runChatFlow = useCallback(() => {
    router.push(`/chat?code=${encodeURIComponent(code)}`);
  }, [router, code]);

  const handleFeatureClick = useCallback(async (action: PendingAction) => {
    if (action === 'predict' && (!fingerprint || isChecking)) {
      return;
    }

    const isHumanVerified = await ensureTurnstileVerified();
    if (!isHumanVerified) {
      setPendingAction(action);
      setShowTurnstileModal(true);
      return;
    }

    if (action === 'predict') {
      await runPredictFlow();
      return;
    }
    runChatFlow();
  }, [fingerprint, isChecking, ensureTurnstileVerified, runPredictFlow, runChatFlow]);

  const handleTurnstileVerify = useCallback(async (token: string): Promise<boolean> => {
    const ok = await verifyToken(token, 'ai-feature-access');
    if (!ok) {
      return false;
    }

    const nextAction = pendingAction;
    setPendingAction(null);
    setShowTurnstileModal(false);

    if (nextAction === 'predict') {
      await runPredictFlow();
    } else if (nextAction === 'chat') {
      runChatFlow();
    }

    return true;
  }, [verifyToken, pendingAction, runPredictFlow, runChatFlow]);

  return (
    <>
      <div className="my-2 mx-auto max-w-lg">
        {/* Container with premium border */}
        <div className="relative rounded-2xl bg-gradient-to-b from-white to-gray-50/80 dark:from-gray-900 dark:to-gray-900/80 border border-gray-200/60 dark:border-gray-700/60 shadow-sm overflow-hidden">
          {/* Subtle top accent line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-400 via-amber-400 to-emerald-400" />

          {/* Header */}
          <div className="flex items-center justify-center gap-1.5 pt-4 pb-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400 tracking-wide">
              AI PREMIUM FEATURES
            </span>
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 p-4 pt-2">
            {/* AI株価予想 */}
            <button
              onClick={() => void handleFeatureClick('predict')}
              disabled={isChecking || !fingerprint}
              className="flex-1 group relative flex flex-col items-center gap-2 py-4 px-3 rounded-xl bg-gradient-to-br from-emerald-500/[0.08] to-green-500/[0.04] dark:from-emerald-500/[0.12] dark:to-green-500/[0.06] border border-emerald-200/60 dark:border-emerald-700/40 hover:border-emerald-300 dark:hover:border-emerald-600 hover:shadow-[0_0_24px_rgba(16,185,129,0.1)] transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none"
            >
              <div className="p-2.5 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/30 transition-shadow">
                {isChecking ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <TrendingUp className="w-5 h-5" />
                )}
              </div>
              <div className="text-center">
                <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                  AI株価予想
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                  1ヶ月間の株価を予測
                </div>
              </div>
            </button>

            {/* AIチャット */}
            <button
              type="button"
              onClick={() => void handleFeatureClick('chat')}
              className="flex-1 group relative flex flex-col items-center gap-2 py-4 px-3 rounded-xl bg-gradient-to-br from-violet-500/[0.08] to-purple-500/[0.04] dark:from-violet-500/[0.12] dark:to-purple-500/[0.06] border border-violet-200/60 dark:border-violet-700/40 hover:border-violet-300 dark:hover:border-violet-600 hover:shadow-[0_0_24px_rgba(139,92,246,0.1)] transition-all duration-300 hover:-translate-y-0.5"
            >
              <div className="p-2.5 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/20 group-hover:shadow-violet-500/30 transition-shadow">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div className="text-center">
                <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                  AIチャット
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                  AIに何でも質問
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      <LoginModal
        open={showLoginModal}
        onOpenChange={setShowLoginModal}
        description="株価予測をさらに利用するには、ログインしてください。ログインすると3回まで無料でご利用いただけます。"
      />
      <PremiumModal
        open={showPremiumModal}
        onOpenChange={setShowPremiumModal}
        description="無料の株価予測回数を使い切りました。プレミアム会員になると無制限でAI株価予測をご利用いただけます。"
      />

      <CloudflareTurnstileModal
        open={showTurnstileModal}
        onOpenChange={(open) => {
          setShowTurnstileModal(open);
          if (!open) {
            setPendingAction(null);
          }
        }}
        onVerify={handleTurnstileVerify}
        isSubmitting={turnstileVerifying}
        errorMessage={turnstileError}
        title="Cloudflare認証"
        description="AIチャット・株価予測をご利用の前にCloudflare認証を完了してください。"
      />
    </>
  );
}
