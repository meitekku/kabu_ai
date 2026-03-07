'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TrendingUp, MessageSquare, Loader2 } from 'lucide-react';
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
      <div className="mt-4 mb-4 animate-in fade-in duration-200">
        <h3 className="text-[18px] font-bold text-shikiho-text-primary mb-4 pb-2 border-b border-shikiho-bg-border relative before:absolute before:bottom-[-1px] before:left-0 before:w-10 before:h-[2px] before:bg-shikiho-accent-red">
          AI機能
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => void handleFeatureClick('predict')}
            disabled={isChecking || !fingerprint}
            className="flex flex-col items-center justify-center gap-1.5 py-4 px-2 bg-white border border-shikiho-bg-border hover:bg-shikiho-bg-gray-light transition-colors disabled:opacity-60 disabled:hover:bg-white"
          >
            <div className="flex items-center gap-2">
              {isChecking ? (
                <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
              ) : (
                <TrendingUp className="w-5 h-5 text-shikiho-accent-red" />
              )}
              <div className="text-[15px] font-bold text-shikiho-text-primary">AI株価予想</div>
            </div>
            <div className="text-[11px] font-bold text-shikiho-text-tertiary">1ヶ月間の株価を予測</div>
          </button>

          <button
            type="button"
            onClick={() => void handleFeatureClick('chat')}
            className="flex flex-col items-center justify-center gap-1.5 py-4 px-2 bg-white border border-shikiho-bg-border hover:bg-shikiho-bg-gray-light transition-colors"
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-shikiho-accent-blue" />
              <div className="text-[15px] font-bold text-shikiho-text-primary">AIチャット</div>
            </div>
            <div className="text-[11px] font-bold text-shikiho-text-tertiary">AIに何でも質問</div>
          </button>
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
