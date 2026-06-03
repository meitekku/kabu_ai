import { NextResponse } from 'next/server';
import { Database } from '@/lib/database/Mysql';
import { RowDataPacket } from 'mysql2';
import { auth } from '@/lib/auth/auth';
import { headers } from 'next/headers';
import {
    createBillingRequestId,
    logBillingError,
    logBillingWarn,
    maskIdentifier,
} from '@/lib/billing-log';

interface SubscriptionRow extends RowDataPacket {
    subscription_status: 'none' | 'active' | 'canceled' | 'past_due' | null;
    subscription_plan: 'none' | 'standard' | 'agent';
    subscription_id: string | null;
    subscription_current_period_end: Date | null;
    fincode_customer_id: string | null;
}

export async function GET() {
    const requestId = createBillingRequestId('subscription-status');

    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user?.id) {
            logBillingWarn('subscription.status.unauthorized', { requestId });
            return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
        }

        const db = Database.getInstance();
        const users = await db.select<SubscriptionRow>(
            `SELECT subscription_status, subscription_plan, subscription_id, subscription_current_period_end, fincode_customer_id
             FROM user WHERE id = ?`,
            [session.user.id]
        );

        if (users.length === 0) {
            logBillingWarn('subscription.status.user_not_found', {
                requestId,
                userId: maskIdentifier(session.user.id),
            });
            return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 });
        }

        const user = users[0];
        const isPremium = user.subscription_status === 'active';

        return NextResponse.json({
            isPremium,
            plan: user.subscription_plan || 'none',
            status: user.subscription_status || 'none',
            currentPeriodEnd: user.subscription_current_period_end,
            hasFincodeCustomer: !!user.fincode_customer_id,
            canCancel: !!user.subscription_id && ['active', 'past_due'].includes(user.subscription_status || ''),
        });
    } catch (error) {
        logBillingError('subscription.status.fetch_failed', error, { requestId });
        return NextResponse.json({ error: 'サブスクリプション情報の取得に失敗しました' }, { status: 500 });
    }
}
