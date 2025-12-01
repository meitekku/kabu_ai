"use client";

import { useState, useEffect, useCallback } from 'react';

interface SubscriptionInfo {
    isPremium: boolean;
    status: 'none' | 'active' | 'canceled' | 'past_due';
    currentPeriodEnd: string | null;
    hasStripeCustomer: boolean;
}

export function useSubscription() {
    const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchSubscription = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const response = await fetch('/api/subscription');

            if (response.status === 401) {
                // 未ログイン
                setSubscription({
                    isPremium: false,
                    status: 'none',
                    currentPeriodEnd: null,
                    hasStripeCustomer: false,
                });
                return;
            }

            if (!response.ok) {
                throw new Error('サブスクリプション情報の取得に失敗しました');
            }

            const data = await response.json();
            setSubscription(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'エラーが発生しました');
            setSubscription({
                isPremium: false,
                status: 'none',
                currentPeriodEnd: null,
                hasStripeCustomer: false,
            });
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSubscription();
    }, [fetchSubscription]);

    return {
        subscription,
        isPremium: subscription?.isPremium ?? false,
        isLoading,
        error,
        refetch: fetchSubscription,
    };
}
