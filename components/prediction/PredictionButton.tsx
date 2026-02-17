'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { TrendingUp, Loader2 } from 'lucide-react';
import { useFingerprint } from '@/hooks/useFingerprint';
import { useCloudflareTurnstile } from '@/hooks/useCloudflareTurnstile';
import { LoginModal } from '@/components/common/LoginModal';
import { PremiumModal } from '@/components/common/PremiumModal';
import { CloudflareTurnstileModal } from '@/components/common/CloudflareTurnstileModal';

interface PredictionButtonProps {
  code: string;
}

export function PredictionButton({ code }: PredictionButtonProps) {
  const router = useRouter();
  const fingerprint = useFingerprint();
  const [isChecking, setIsChecking] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showTurnstileModal, setShowTurnstileModal] = useState(false);
  const [pendingPredict, setPendingPredict] = useState(false);
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

  const runPredictionFlow = useCallback(async () => {
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
    } catch (error) {
      console.error('Failed to check prediction usage:', error);
      // On error, navigate anyway and let the predict page handle it
      router.push(`/stocks/${code}/predict`);
    } finally {
      setIsChecking(false);
    }
  }, [fingerprint, isChecking, code, router]);

  const handleClick = useCallback(async () => {
    if (!fingerprint || isChecking) return;

    const isHumanVerified = await ensureTurnstileVerified();
    if (!isHumanVerified) {
      setPendingPredict(true);
      setShowTurnstileModal(true);
      return;
    }

    await runPredictionFlow();
  }, [fingerprint, isChecking, ensureTurnstileVerified, runPredictionFlow]);

  const handleTurnstileVerify = useCallback(async (token: string): Promise<boolean> => {
    const ok = await verifyToken(token, 'ai-feature-access');
    if (!ok) {
      return false;
    }

    const shouldRun = pendingPredict;
    setPendingPredict(false);
    setShowTurnstileModal(false);

    if (shouldRun) {
      await runPredictionFlow();
    }

    return true;
  }, [verifyToken, pendingPredict, runPredictionFlow]);

  return (
    <>
      <div className="flex justify-center my-4">
        <Button
          onClick={handleClick}
          disabled={isChecking || !fingerprint}
          className="h-12 px-8 text-base bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white rounded-full shadow-[0_0_20px_rgba(16,185,129,0.15)] transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(16,185,129,0.3)]"
        >
          {isChecking ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <TrendingUp className="w-5 h-5 mr-2" />
          )}
          AIで株価を予測する
        </Button>
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
            setPendingPredict(false);
          }
        }}
        onVerify={handleTurnstileVerify}
        isSubmitting={turnstileVerifying}
        errorMessage={turnstileError}
        title="Cloudflare認証"
        description="株価予測をご利用の前にCloudflare認証を完了してください。"
      />
    </>
  );
}
