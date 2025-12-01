"use client";

import DefaultTemplate from "@/components/template/DefaultTemplate";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, CreditCard, AlertCircle, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

interface SubscriptionInfo {
    isPremium: boolean;
    status: 'none' | 'active' | 'canceled' | 'past_due';
    currentPeriodEnd: string | null;
    hasStripeCustomer: boolean;
}

export default function BillingPage() {
    const [loading, setLoading] = useState(false);
    const [portalLoading, setPortalLoading] = useState(false);
    const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchSubscription();
    }, []);

    const fetchSubscription = async () => {
        try {
            const response = await fetch('/api/subscription');
            if (response.ok) {
                const data = await response.json();
                setSubscription(data);
            }
        } catch (error) {
            console.error('Failed to fetch subscription:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCheckout = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({}),
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
            setLoading(false);
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
                console.error('Portal error:', data.error);
                alert(data.error || 'ポータルを開けませんでした。');
            }
        } catch (error) {
            console.error('Portal error:', error);
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

    if (isLoading) {
        return (
            <DefaultTemplate>
                <div className="container mx-auto py-10 px-4 flex justify-center items-center min-h-[400px]">
                    <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                </div>
            </DefaultTemplate>
        );
    }

    return (
        <DefaultTemplate>
            <div className="container mx-auto py-10 px-4">
                <h1 className="text-3xl font-bold mb-8 text-slate-900">請求・プラン管理</h1>

                <div className="max-w-3xl space-y-6">
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
                                {subscription.isPremium ? (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                                            <div>
                                                <h3 className="font-bold text-lg text-emerald-900">プレミアムプラン</h3>
                                                <p className="text-sm text-emerald-700">全機能が利用可能です</p>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-2xl font-bold text-emerald-600">¥3,000<span className="text-sm font-normal">/月</span></div>
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
                                    AI分析・株価予測の全機能をお使いいただけます
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                                    <div className="flex justify-between items-center mb-4">
                                        <div>
                                            <h3 className="font-bold text-lg text-slate-900">プレミアムプラン</h3>
                                            <p className="text-sm text-slate-500">AI分析と株価予測の全機能が使い放題</p>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-bold text-emerald-600">¥3,000<span className="text-sm text-slate-500 font-normal">/月</span></div>
                                        </div>
                                    </div>

                                    <ul className="space-y-2 text-sm text-slate-600">
                                        <li className="flex items-center">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-600 mr-2" />
                                            AIへの質問が無制限
                                        </li>
                                        <li className="flex items-center">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-600 mr-2" />
                                            高精度な株価予測機能
                                        </li>
                                        <li className="flex items-center">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-600 mr-2" />
                                            リアルタイム市場分析
                                        </li>
                                    </ul>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button
                                    onClick={handleCheckout}
                                    disabled={loading}
                                    className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            処理中...
                                        </>
                                    ) : (
                                        '今すぐ申し込む'
                                    )}
                                </Button>
                            </CardFooter>
                        </Card>
                    )}
                </div>
            </div>
        </DefaultTemplate>
    );
}
