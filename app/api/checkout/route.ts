import { NextResponse } from 'next/server';
import { fincode } from '@/lib/fincode';
import { Database } from '@/lib/database/Mysql';
import { RowDataPacket } from 'mysql2';
import { auth } from '@/lib/auth/auth';
import { headers } from 'next/headers';
import { PLANS } from '@/lib/plans';
import {
    createBillingRequestId,
    logBillingError,
    logBillingInfo,
    logBillingWarn,
    maskEmail,
    maskIdentifier,
} from '@/lib/billing-log';

interface UserRow extends RowDataPacket {
    id: string;
    email: string;
    fincode_customer_id: string | null;
    subscription_plan: 'none' | 'standard' | 'agent';
    subscription_status: 'none' | 'active' | 'canceled' | 'past_due' | null;
}

type CheckoutPlanType = 'standard' | 'agent';

function isCheckoutPlanType(value: unknown): value is CheckoutPlanType {
    return value === 'standard' || value === 'agent';
}

function formatFincodeDateTime(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
}

export async function POST(req: Request) {
    const requestId = createBillingRequestId('checkout');

    try {
        logBillingInfo('checkout.request.received', {
            requestId,
            requestUrl: req.url,
        });

        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user?.id) {
            logBillingWarn('checkout.request.unauthorized', { requestId });
            return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
        }

        const { planType } = await req.json();

        if (!isCheckoutPlanType(planType)) {
            logBillingWarn('checkout.request.invalid_plan', {
                requestId,
                userId: maskIdentifier(session.user.id),
                planType: typeof planType === 'string' ? planType : null,
            });
            return NextResponse.json({ error: '不正なプランです' }, { status: 400 });
        }

        const plan = PLANS[planType];

        if (!plan.fincodePlanId) {
            logBillingError('checkout.request.plan_id_missing', new Error('FINCODE plan id is not configured'), {
                requestId,
                userId: maskIdentifier(session.user.id),
                planType,
            });
            return NextResponse.json({ error: 'プランIDが設定されていません' }, { status: 500 });
        }

        const db = Database.getInstance();
        const users = await db.select<UserRow>(
            `SELECT id, email, fincode_customer_id, subscription_plan, subscription_status
             FROM user
             WHERE id = ?`,
            [session.user.id]
        );

        if (users.length === 0) {
            logBillingWarn('checkout.user.not_found', {
                requestId,
                userId: maskIdentifier(session.user.id),
            });
            return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 });
        }

        const user = users[0];

        if (user.subscription_status === 'active' && user.subscription_plan === plan.id) {
            logBillingWarn('checkout.request.duplicate_plan', {
                requestId,
                userId: maskIdentifier(user.id),
                planType,
                subscriptionStatus: user.subscription_status,
            });
            return NextResponse.json({ error: 'すでに同じプランを利用中です' }, { status: 409 });
        }

        let customerId = user.fincode_customer_id;

        // fincodeカスタマーがまだなければ作成
        if (!customerId) {
            const customer = await fincode.customers.create({
                email: user.email,
            });
            customerId = customer.id;

            await db.update(
                'UPDATE user SET fincode_customer_id = ? WHERE id = ?',
                [customerId, user.id]
            );

            logBillingInfo('checkout.customer.created', {
                requestId,
                userId: maskIdentifier(user.id),
                customerId: maskIdentifier(customerId),
                email: maskEmail(user.email),
            });
        } else {
            logBillingInfo('checkout.customer.reused', {
                requestId,
                userId: maskIdentifier(user.id),
                customerId: maskIdentifier(customerId),
            });
        }

        // 選択中のプランをDBに仮保存（webhook受信時に使用）
        await db.update(
            'UPDATE user SET subscription_plan_pending = ? WHERE id = ?',
            [plan.id, user.id]
        );

        logBillingInfo('checkout.pending_plan.saved', {
            requestId,
            userId: maskIdentifier(user.id),
            customerId: maskIdentifier(customerId),
            planType,
        });

        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin;

        // fincodeカード登録セッション作成
        const fincodeSession = await fincode.cardRegistrationSessions.create({
            success_url: `${baseUrl}/premium/success`,
            cancel_url: `${baseUrl}/premium`,
            expire: formatFincodeDateTime(new Date(Date.now() + 24 * 60 * 60 * 1000)),
            customer_id: customerId,
            receiver_mail: user.email,
            shop_service_name: '株AI',
        });

        logBillingInfo('checkout.session.created', {
            requestId,
            userId: maskIdentifier(user.id),
            customerId: maskIdentifier(customerId),
            planType,
            hasLinkUrl: !!fincodeSession.link_url,
            baseUrl,
        });

        return NextResponse.json({ url: fincodeSession.link_url });
    } catch (error) {
        logBillingError('checkout.failed', error, { requestId });
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal Server Error' },
            { status: 500 }
        );
    }
}
