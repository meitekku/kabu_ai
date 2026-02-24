import { NextResponse } from 'next/server';
import { Database } from '@/lib/database/Mysql';
import { RowDataPacket } from 'mysql2';
import { auth } from '@/lib/auth/auth';
import { headers } from 'next/headers';

interface SubscriptionRow extends RowDataPacket {
    subscription_status: 'none' | 'active' | 'canceled' | 'past_due' | null;
    subscription_plan: 'none' | 'standard' | 'agent';
    subscription_id: string | null;
    subscription_current_period_end: Date | null;
    stripe_customer_id: string | null;
}

export async function GET() {
    try {
        // better-authのセッションからユーザーを取得
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'ログインが必要です' },
                { status: 401 }
            );
        }

        const db = Database.getInstance();
        const users = await db.select<SubscriptionRow>(
            `SELECT subscription_status, subscription_plan, subscription_id, subscription_current_period_end, stripe_customer_id
             FROM user WHERE id = ?`,
            [session.user.id]
        );

        if (users.length === 0) {
            return NextResponse.json(
                { error: 'ユーザーが見つかりません' },
                { status: 404 }
            );
        }

        const user = users[0];
        const isPremium = user.subscription_status === 'active';

        return NextResponse.json({
            isPremium,
            plan: user.subscription_plan || 'none',
            status: user.subscription_status || 'none',
            currentPeriodEnd: user.subscription_current_period_end,
            hasStripeCustomer: !!user.stripe_customer_id,
        });
    } catch (error) {
        console.error('Subscription check error:', error);
        return NextResponse.json(
            { error: 'サブスクリプション情報の取得に失敗しました' },
            { status: 500 }
        );
    }
}
