"use client";

import DefaultTemplate from "@/components/template/DefaultTemplate";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, CreditCard, AlertCircle, Loader2, Crown } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@/lib/auth/auth-client";
import Link from "next/link";

interface SubscriptionInfo {
    isPremium: boolean;
    plan: 'none' | 'standard' | 'agent';
    status: 'none' | 'active' | 'canceled' | 'past_due';
    currentPeriodEnd: string | null;
    hasFincodeCustomer: boolean;
    canCancel: boolean;
}

export default function BillingPage() {
    const [loading, setLoading] = useState<'standard' | 'agent' | null>(null);
    const [showCancelDialog, setShowCancelDialog] = useState(false);
    const [cancelLoading, setCancelLoading] = useState(false);
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
        } catch (error) {
            console.error('Failed to fetch subscription:', error);
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

    const handleCheckout = async (planType: 'standard' | 'agent' = 'standard') => {
        setLoading(planType);
        try {
            const response = await fetch('/api/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ planType }),
            });

            const data = await response.json();

            if (data.url) {
                window.location.href = data.url;
            } else {
                console.error('Checkout error:', data.error);
                alert(data.error || '決済の開始に失敗しました。');
            }
        } catch (error) {
            console.error('Checkout error:', error);
            alert('エラーが発生しました。');
        } finally {
            setLoading(null);
        }
    };

    const handleCancelSubscription = async () => {
        setCancelLoading(true);
        try {
            const response = await fetch('/api/subscription/portal', {
                method: 'POST',
            });

            const data = await response.json();

            if (data.success) {
                setShowCancelDialog(false);
                await fetchSubscription();
            } else {
                alert(data.error || '解約に失敗しました。');
            }
        } catch (error) {
            console.error('Cancel error:', error);
            alert('エラーが発生しました。');
        } finally {
            setCancelLoading(false);
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

    const getPlanDisplayName = () => {
        if (!subscription) return '';
        switch (subscription.plan) {
            case 'agent': return 'エージェントプラン';
            case 'standard': return 'スタンダードプラン';
            default: return 'プレミアムプラン';
        }
    };

    const hasSubscribedPlan = subscription?.plan === 'standard' || subscription?.plan === 'agent';

    const getPlanPrice = () => {
        if (!subscription) return '¥3,000';
        return subscription.plan === 'agent' ? '¥1,000' : '¥3,000';
    };

    const getPlanDescription = () => {
        if (!subscription) return '';
        return subscription.plan === 'agent'
            ? '全機能 + AI Agentが利用可能です'
            : 'AIチャット・株価予測が無制限で利用可能です';
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
                    <Card className="max-w-md mx-auto bg-card border-destructive/30">
                        <CardContent className="pt-6">
                            <div className="text-center">
                                <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                                <p className="text-destructive">{error}</p>
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

    return (
        <DefaultTemplate>
            <div className="container mx-auto py-6 sm:py-10 px-4">
                <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-slate-900">請求・プラン管理</h1>

                <div className="max-w-3xl space-y-6">
                    {/* 現在のプラン状態 */}
                    {subscription && (
                        <Card className="bg-card border-border text-foreground shadow-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    <span>現在のプラン</span>
                                    {getStatusBadge()}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {hasSubscribedPlan ? (
                                    <div className="space-y-4">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                                            <div>
                                                <h3 className="font-bold text-lg text-emerald-900">{getPlanDisplayName()}</h3>
                                                <p className="text-sm text-emerald-700">{getPlanDescription()}</p>
                                            </div>
                                            <div className="sm:text-right">
                                                <div className="text-2xl font-bold text-emerald-600">{getPlanPrice()}<span className="text-sm font-normal">/月</span></div>
                                            </div>
                                        </div>
                                        {subscription.currentPeriodEnd && (
                                            <p className="text-sm text-slate-600">
                                                次回更新日: {formatDate(subscription.currentPeriodEnd)}
                                            </p>
                                        )}
                                        {subscription.plan === 'standard' && (
                                            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Crown className="w-4 h-4 text-amber-600" />
                                                    <span className="font-bold text-sm text-amber-900">エージェントプランにアップグレード</span>
                                                </div>
                                                <p className="text-xs text-amber-700 mb-3">AI Agentによる高度な投資分析が利用可能になります。</p>
                                                <Button
                                                    onClick={() => handleCheckout('agent')}
                                                    disabled={loading !== null}
                                                    size="sm"
                                                    className="bg-amber-600 hover:bg-amber-700 text-white"
                                                >
                                                    {loading === 'agent' ? (
                                                        <>
                                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                            処理中...
                                                        </>
                                                    ) : (
                                                        'プランを変更する'
                                                    )}
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                                        <h3 className="font-bold text-lg text-slate-900">無料プラン</h3>
                                        <p className="text-sm text-slate-500">一部機能のみ利用可能です</p>
                                    </div>
                                )}
                            </CardContent>
                            {subscription.canCancel && (
                                <CardFooter>
                                    <Button
                                        onClick={() => setShowCancelDialog(true)}
                                        variant="outline"
                                        className="w-full sm:w-auto"
                                    >
                                        サブスクリプションを解約
                                    </Button>
                                </CardFooter>
                            )}
                        </Card>
                    )}

                    {/* プラン申し込み（未登録の場合） */}
                    {subscription && !hasSubscribedPlan && (
                        <Card className="bg-card border-border text-foreground shadow-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <CreditCard className="w-5 h-5 text-emerald-600" />
                                    プレミアムプランに登録
                                </CardTitle>
                                <CardDescription className="text-slate-500">
                                    AI分析・株価予測の全機能をお使いいただけます
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Agent Plan */}
                                <div className={`p-4 rounded-lg border ${searchParams.get('plan') === 'agent' ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400' : 'bg-amber-50/50 border-amber-200'}`}>
                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-bold text-lg text-slate-900">エージェントプラン</h3>
                                                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-[10px] font-bold text-white tracking-wider">RECOMMENDED</span>
                                            </div>
                                            <p className="text-sm text-slate-500">全機能 + AI Agent</p>
                                        </div>
                                        <div className="sm:text-right">
                                            <div className="text-2xl font-bold text-amber-600">¥1,000<span className="text-sm text-slate-500 font-normal">/月</span></div>
                                        </div>
                                    </div>
                                    <ul className="space-y-2 text-sm text-slate-600 mb-4">
                                        {['スタンダードの全機能', 'AI Agent（高度な投資分析）'].map((f, i) => (
                                            <li key={i} className="flex items-center">
                                                <CheckCircle2 className="w-4 h-4 text-amber-600 mr-2" />
                                                {f}
                                            </li>
                                        ))}
                                    </ul>
                                    <Button
                                        onClick={() => handleCheckout('agent')}
                                        disabled={loading !== null}
                                        className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white font-bold"
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

                                {/* Standard Plan */}
                                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
                                        <div>
                                            <h3 className="font-bold text-lg text-slate-900">スタンダードプラン</h3>
                                            <p className="text-sm text-slate-500">AIチャット・株価予測が無制限</p>
                                        </div>
                                        <div className="sm:text-right">
                                            <div className="text-2xl font-bold text-primary">¥3,000<span className="text-sm text-slate-500 font-normal">/月</span></div>
                                        </div>
                                    </div>
                                    <ul className="space-y-2 text-sm text-slate-600 mb-4">
                                        {['AIチャット無制限', '株価予測無制限', 'お気に入りニュース', 'リアルタイム市場分析'].map((f, i) => (
                                            <li key={i} className="flex items-center">
                                                <CheckCircle2 className="w-4 h-4 text-primary mr-2" />
                                                {f}
                                            </li>
                                        ))}
                                    </ul>
                                    <Button
                                        onClick={() => handleCheckout('standard')}
                                        disabled={loading !== null}
                                        className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white font-bold"
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
                            </CardContent>
                            <CardFooter>
                                <div className="w-full">
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
                                </div>
                            </CardFooter>
                        </Card>
                    )}
                </div>
            </div>

            {/* 解約確認ダイアログ */}
            {showCancelDialog && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-card rounded-lg p-6 max-w-sm mx-4 shadow-xl">
                        <h3 className="text-lg font-bold text-slate-900 mb-2">サブスクリプションを解約</h3>
                        <p className="text-sm text-slate-600 mb-6">解約すると、次回以降の自動課金を停止し、プレミアム機能は利用できなくなります。本当に解約しますか？</p>
                        <div className="flex gap-3">
                            <Button
                                onClick={() => setShowCancelDialog(false)}
                                variant="outline"
                                className="flex-1"
                                disabled={cancelLoading}
                            >
                                キャンセル
                            </Button>
                            <Button
                                onClick={handleCancelSubscription}
                                className="flex-1 bg-destructive hover:bg-destructive/90 text-white"
                                disabled={cancelLoading}
                            >
                                {cancelLoading ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />処理中...</>
                                ) : '解約する'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </DefaultTemplate>
    );
}
