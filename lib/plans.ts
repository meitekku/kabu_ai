export const PLANS = {
  standard: {
    id: 'standard' as const,
    name: 'スタンダード',
    nameEn: 'Standard',
    price: 3000,
    fincodePlanId: process.env.FINCODE_PLAN_ID_STANDARD || '',
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
    fincodePlanId: process.env.FINCODE_PLAN_ID_AGENT || '',
    features: [
      'スタンダードの全機能',
      'AI Agent利用（高度な投資分析）',
    ],
  },
} as const;

export type PlanType = 'none' | 'standard' | 'agent';

export function getPlanByPlanId(planId: string): PlanType {
  if (planId === PLANS.standard.fincodePlanId) return 'standard';
  if (planId === PLANS.agent.fincodePlanId) return 'agent';
  return 'none';
}

export function isPremiumPlan(plan: PlanType): boolean {
  return plan === 'standard' || plan === 'agent';
}

export function isAgentPlan(plan: PlanType): boolean {
  return plan === 'agent';
}
