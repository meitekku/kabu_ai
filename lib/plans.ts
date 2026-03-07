export const PLANS = {
  standard: {
    id: 'standard' as const,
    name: 'スタンダード',
    nameEn: 'Standard',
    price: 3000,
    stripePriceId: process.env.STRIPE_PRICE_ID_STANDARD || '',
    features: [
      'AIチャット無制限',
      '株価予測無制限',
      'お気に入りニュース',
      'リアルタイム市場分析',
    ],
  },
  agent: {
    id: 'agent' as const,
    name: 'エージェント',
    nameEn: 'Agent',
    price: 1000,
    stripePriceId: process.env.STRIPE_PRICE_ID_AGENT || '',
    features: [
      'スタンダードの全機能',
      'AI Agent利用（高度な投資分析）',
    ],
  },
} as const;

export type PlanType = 'none' | 'standard' | 'agent';

export function getPlanByPriceId(priceId: string): PlanType {
  if (priceId === PLANS.standard.stripePriceId) return 'standard';
  if (priceId === PLANS.agent.stripePriceId) return 'agent';
  return 'none';
}

export function isPremiumPlan(plan: PlanType): boolean {
  return plan === 'standard' || plan === 'agent';
}

export function isAgentPlan(plan: PlanType): boolean {
  return plan === 'agent';
}
