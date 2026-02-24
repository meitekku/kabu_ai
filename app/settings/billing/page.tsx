"use client";

import DefaultTemplate from "@/components/template/DefaultTemplate";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, CreditCard, AlertCircle, Loader2, Bot } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@/lib/auth/auth-client";
import Link from "next/link";

interface SubscriptionInfo {
    isPremium: boolean;
    plan: 'none' | 'standard' | 'agent';
    status: 'none' | 'active' | 'canceled' | 'past_due';
    currentPeriodEnd: string | null;
    hasStripeCustomer: boolean;
}

const PLAN_DETAILS = {
    standard: {
        name: 'スタンダードプラン',
        description: 'AI株価予測 & AIチャット',
        price: 3000,
        features: ['AIチャット無制限', '株価予測無制限', 'お気に入りニュース', 'リアルタイム市場分析'],
    },
    agent: {
        name: 'エージェントプラン',
        description: '全機能 + AI Agent',
        price: 5000,
        features: ['スタンダードの全機能', 'AI Agent（高度な投資分析）'],
    },
} as const;

export default function BillingPage() {
    const [loading, setLoading] = useState<string | null>(null);
    const [portalLoading, setPortalLoading] = useState(false);
    const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const searchParams = useSearchParams();
    const { data: session, isPending: sessionLoading } = useSession();

    const fetchSubscription = useCallback(async () => {
        try {
            const response = await fetch('/api/subscription');
            if (response.ok) {
                const data = await response.json();
                setSubscription(data);
            } else if (response.status === 401) {
                router.push('/login');
            } else {
                const data = await response.json();
                setError(data.error || 'エラーが発生しました');
            }
        } catch {
            setError('サブスクリプション情報の取得に失敗しました');
        } finally {
            setIsLoading(false);
        }
    }, [router]);

    useEffect(() => {
        if (!sessionLoading) {
            if (!session?.user) {
                router.push('/login');
            } else {
                fetchSubscription();
            }
        }
    }, [session, sessionLoading, router, fetchSubscription]);

    const handleCheckout = async (planType: 'standard' | 'agent') => {
        setLoading(planType);
        try {
            const response = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ planType }),
            });

            const data = await response.json();

            if (data.url) {
                window.location.href = data.url;
            } else {
                alert(data.error || '決済の開始に失敗しました。');
            }
        } catch {
            alert('エラーが発生しました。');
        } finally {
            setLoading(null);
        }
    };

    const handleManageSubscription = async () => {
        setPortalLoading(true);
        try {
            const response = await fetch('/api/subscription/portal', {
                method: 'POST',
            });

            const data = await response.json();

            if (data.url) {
                window.location.href = data.url;
            } else {
                alert(data.error || 'ポータルを開けませんでした。');
            }
        } catch {
            alert('エラーが発生しました。');
        } finally {
            setPortalLoading(false);
        }
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const getStatusBadge = () => {
        if (!subscription) return null;

        switch (subscription.status) {
            case 'active':
                return (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        有効
                    </span>
                );
            case 'past_due':
                return (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        支払い遅延
                    </span>
                );
            case 'canceled':
                return (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-slate-100 text-slate-800">
                        キャンセル済み
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-slate-100 text-slate-600">
                        未登録
                    </span>
                );
        }
    };

    // URLパラメータからハイライトするプランを取得
    const highlightedPlan = searchParams.get('plan') as 'standard' | 'agent' | null;

    if (isLoading || sessionLoading) {
        return (
            <DefaultTemplate>
                <div className="container mx-auto py-10 px-4 flex justify-center items-center min-h-[400px]">
                    <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                </div>
            </DefaultTemplate>
        );
    }

    if (error) {
        return (
            <DefaultTemplate>
                <div className="container mx-auto py-10 px-4">
                    <Card className="max-w-md mx-auto bg-white border-red-200">
                        <CardContent className="pt-6">
                            <div className="text-center">
                                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                                <p className="text-red-600">{error}</p>
                                <Button
                                    onClick={() => window.location.reload()}
                                    variant="outline"
                                    className="mt-4"
                                >
                                    再読み込み
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </DefaultTemplate>
        );
    }

    const currentPlan = subscription?.plan || 'none';
    const currentPlanDetails = currentPlan !== 'none' ? PLAN_DETAILS[currentPlan] : null;

    return (
        <DefaultTemplate>
            <div className="container mx-auto py-10 px-4">
                <h1 className="text-3xl font-bold mb-8 text-slate-900">請求・プラン管理</h1>

                <div className="max-w-4xl space-y-6">
                    {/* 現在のプラン状態 */}
                    {subscription && (
                        <Card className="bg-white border-slate-200 text-slate-900 shadow-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    <span>現在のプラン</span>
                                    {getStatusBadge()}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {subscription.isPremium && currentPlanDetails ? (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                                            <div>
                                                <h3 className="font-bold text-lg text-emerald-900">{currentPlanDetails.name}</h3>
                                                <p className="text-sm text-emerald-700">{currentPlanDetails.description}</p>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-2xl font-bold text-emerald-600">¥{currentPlanDetails.price.toLocaleString()}<span className="text-sm font-normal">/月</span></div>
                                            </div>
                                        </div>
                                        {subscription.currentPeriodEnd && (
                                            <p className="text-sm text-slate-600">
                                                次回更新日: {formatDate(subscription.currentPeriodEnd)}
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                                        <h3 className="font-bold text-lg text-slate-900">無料プラン</h3>
                                        <p className="text-sm text-slate-500">一部機能のみ利用可能です</p>
                                    </div>
                                )}
                            </CardContent>
                            {subscription.hasStripeCustomer && (
                                <CardFooter>
                                    <Button
                                        onClick={handleManageSubscription}
                                        disabled={portalLoading}
                                        variant="outline"
                                        className="w-full sm:w-auto"
                                    >
                                        {portalLoading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                処理中...
                                            </>
                                        ) : (
                                            'サブスクリプションを管理'
                                        )}
                                    </Button>
                                </CardFooter>
                            )}
                        </Card>
                    )}

                    {/* プラン申し込み（未登録の場合） */}
                    {subscription && !subscription.isPremium && (
                        <Card className="bg-white border-slate-200 text-slate-900 shadow-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <CreditCard className="w-5 h-5 text-emerald-600" />
                                    プレミアムプランに登録
                                </CardTitle>
                                <CardDescription className="text-slate-500">
                                    あなたの投資スタイルに合ったプランをお選びください
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Standard Plan */}
                                    <div className={`p-5 rounded-lg border-2 transition-all ${highlightedPlan === 'standard' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-slate-50'}`}>
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="font-bold text-lg text-slate-900">スタンダード</h3>
                                                <p className="text-sm text-slate-500">AI株価予測 & AIチャット</p>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-2xl font-bold text-blue-600">¥3,000<span className="text-sm text-slate-500 font-normal">/月</span></div>
                                            </div>
                                        </div>
                                        <ul className="space-y-2 text-sm text-slate-600 mb-4">
                                            {PLAN_DETAILS.standard.features.map((f, i) => (
                                                <li key={i} className="flex items-center">
                                                    <CheckCircle2 className="w-4 h-4 text-blue-500 mr-2 flex-shrink-0" />
                                                    {f}
                                                </li>
                                            ))}
                                        </ul>
                                        <Button
                                            onClick={() => handleCheckout('standard')}
                                            disabled={loading !== null}
                                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold"
                                        >
                                            {loading === 'standard' ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    処理中...
                                                </>
                                            ) : (
                                                'スタンダードを申し込む'
                                            )}
                                        </Button>
                                    </div>

                                    {/* Agent Plan */}
                                    <div className={`p-5 rounded-lg border-2 transition-all relative ${highlightedPlan === 'agent' ? 'border-amber-500 bg-amber-50' : 'border-slate-200 bg-slate-50'}`}>
                                        <div className="absolute -top-3 left-4 px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 text-[10px] font-bold text-white tracking-wider">
                                            RECOMMENDED
                                        </div>
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-bold text-lg text-slate-900">エージェント</h3>
                                                    <Bot className="w-4 h-4 text-amber-500" />
                                                </div>
                                                <p className="text-sm text-slate-500">全機能 + AI Agent</p>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-2xl font-bold text-amber-600">¥5,000<span className="text-sm text-slate-500 font-normal">/月</span></div>
                                            </div>
                                        </div>
                                        <ul className="space-y-2 text-sm text-slate-600 mb-4">
                                            {PLAN_DETAILS.agent.features.map((f, i) => (
                                                <li key={i} className="flex items-center">
                                                    <CheckCircle2 className="w-4 h-4 text-amber-500 mr-2 flex-shrink-0" />
                                                    {f}
                                                </li>
                                            ))}
                                        </ul>
                                        <Button
                                            onClick={() => handleCheckout('agent')}
                                            disabled={loading !== null}
                                            className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold"
                                        >
                                            {loading === 'agent' ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    処理中...
                                                </>
                                            ) : (
                                                'エージェントを申し込む'
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <p className="text-xs text-slate-500">
                                    申込みにより
                                    <Link href="/terms" className="mx-1 text-emerald-700 underline">
                                        利用規約
                                    </Link>
                                    ・
                                    <Link href="/privacy-policy" className="mx-1 text-emerald-700 underline">
                                        プライバシーポリシー
                                    </Link>
                                    ・
                                    <Link href="/commercial-transactions" className="mx-1 text-emerald-700 underline">
                                        特定商取引法に基づく表記
                                    </Link>
                                    をご確認ください。
                                </p>
                            </CardFooter>
                        </Card>
                    )}
                </div>
            </div>
        </DefaultTemplate>
    );
}
