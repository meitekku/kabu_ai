'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Crown, CheckCircle2, TrendingUp, MessageSquare, Sparkles } from 'lucide-react';
import Link from 'next/link';

interface PremiumFeature {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
}

const DEFAULT_FEATURES: PremiumFeature[] = [
  { icon: MessageSquare, text: 'AIチャット無制限' },
  { icon: TrendingUp, text: '株価予測無制限' },
  { icon: Sparkles, text: 'リアルタイム市場分析' },
];

interface PremiumModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  features?: PremiumFeature[];
}

export function PremiumModal({
  open,
  onOpenChange,
  title = 'プレミアム会員限定',
  description = '無料の利用回数を使い切りました。プレミアム会員になると無制限でご利用いただけます。',
  features = DEFAULT_FEATURES,
}: PremiumModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <Crown className="w-5 h-5 text-amber-500" />
            </div>
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {features.map((feature, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <feature.icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm">{feature.text}</span>
            </div>
          ))}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            閉じる
          </Button>
          <Link href="/premium">
            <Button className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white">
              <Crown className="w-4 h-4 mr-2" />
              プレミアム会員になる
            </Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
