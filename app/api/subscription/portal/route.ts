import { NextResponse } from 'next/server';
import { fincode } from '@/lib/fincode';
import { Database } from '@/lib/database/Mysql';
import { RowDataPacket } from 'mysql2';
import { auth } from '@/lib/auth/auth';
import { headers } from 'next/headers';
import {
    createBillingRequestId,
    logBillingError,
    logBillingInfo,
    logBillingWarn,
    maskIdentifier,
} from '@/lib/billing-log';

interface UserRow extends RowDataPacket {
    fincode_customer_id: string | null;
    subscription_id: string | null;
}

export async function POST() {
    const requestId = createBillingRequestId('cancel');

    try {
        logBillingInfo('subscription.cancel.request.received', { requestId });

        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user?.id) {
            logBillingWarn('subscription.cancel.request.unauthorized', { requestId });
            return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
        }

        const db = Database.getInstance();
        const users = await db.select<UserRow>(
            'SELECT fincode_customer_id, subscription_id FROM user WHERE id = ?',
            [session.user.id]
        );

        if (users.length === 0) {
            logBillingWarn('subscription.cancel.user.not_found', {
                requestId,
                userId: maskIdentifier(session.user.id),
            });
            return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 });
        }

        const user = users[0];

        if (!user.subscription_id) {
            logBillingWarn('subscription.cancel.subscription_missing', {
                requestId,
                userId: maskIdentifier(session.user.id),
            });
            return NextResponse.json({ error: 'アクティブなサブスクリプションが見つかりません' }, { status: 404 });
        }

        // fincodeサブスクリプションを解約
        await fincode.subscriptions.cancel(user.subscription_id, {
            pay_type: 'Card',
        });

        // DBを更新
        await db.update(
            `UPDATE user
             SET subscription_status = 'canceled',
                 subscription_id = NULL,
                 subscription_plan = 'none',
                 subscription_plan_pending = NULL,
                 subscription_current_period_end = NULL
             WHERE id = ?`,
            [session.user.id]
        );

        logBillingInfo('subscription.cancel.completed', {
            requestId,
            userId: maskIdentifier(session.user.id),
            customerId: maskIdentifier(user.fincode_customer_id),
            subscriptionId: maskIdentifier(user.subscription_id),
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        logBillingError('subscription.cancel.failed', error, { requestId });
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'サブスクリプションの解約に失敗しました' },
            { status: 500 }
        );
    }
}
