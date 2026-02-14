'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { TrendingUp, Loader2 } from 'lucide-react';
import { useFingerprint } from '@/hooks/useFingerprint';
import { LoginModal } from '@/components/common/LoginModal';
import { PremiumModal } from '@/components/common/PremiumModal';

interface PredictionButtonProps {
  code: string;
}

export function PredictionButton({ code }: PredictionButtonProps) {
  const router = useRouter();
  const fingerprint = useFingerprint();
  const [isChecking, setIsChecking] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  const handleClick = async () => {
    if (!fingerprint || isChecking) return;

    setIsChecking(true);
    try {
      const res = await fetch(`/api/${code}/predict/check-usage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fingerprint }),
      });
      const data = await res.json();

      if (data.canPredict) {
        router.push(`/${code}/news/predict`);
      } else if (data.requireLogin) {
        setShowLoginModal(true);
      } else if (data.requirePremium) {
        setShowPremiumModal(true);
      }
    } catch (error) {
      console.error('Failed to check prediction usage:', error);
      // On error, navigate anyway and let the predict page handle it
      router.push(`/${code}/news/predict`);
    } finally {
      setIsChecking(false);
    }
  };

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
    </>
  );
}
