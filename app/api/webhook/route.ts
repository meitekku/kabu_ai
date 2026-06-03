import { NextResponse } from 'next/server';
import { fincode } from '@/lib/fincode';
import { Database } from '@/lib/database/Mysql';
import { RowDataPacket } from 'mysql2';
import crypto from 'crypto';
import {
    createBillingRequestId,
    logBillingError,
    logBillingInfo,
    logBillingWarn,
    maskIdentifier,
} from '@/lib/billing-log';

interface UserRow extends RowDataPacket {
    id: string;
    subscription_plan_pending: string | null;
    subscription_id: string | null;
}

function verifyFincodeSignature(_body: string, signature: string, secret: string): boolean {
    // fincodeはHMACではなくトークン直接比較方式:
    // ダッシュボードに登録したsignatureをそのままfincode-signatureヘッダーで送信してくる
    try {
        const sigBuf = Buffer.from(signature.trim());
        const secretBuf = Buffer.from(secret.trim());
        if (sigBuf.length !== secretBuf.length) return false;
        return crypto.timingSafeEqual(sigBuf, secretBuf);
    } catch {
        return false;
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function pickString(...values: unknown[]): string | null {
    for (const value of values) {
        if (typeof value === 'string' && value.trim()) {
            return value.trim();
        }
    }
    return null;
}

function normalizeDbDateTime(value: string | null): string | null {
    if (!value) {
        return null;
    }

    const [datePart, timePart] = value.trim().split(' ');
    if (!datePart) {
        return null;
    }

    const normalizedDate = datePart.replace(/\//g, '-');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
        return null;
    }

    if (!timePart) {
        return `${normalizedDate} 00:00:00`;
    }

    return `${normalizedDate} ${timePart.split('.')[0]}`;
}

function formatFincodeDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}/${month}/${day}`;
}

function getPlanIdByPendingPlan(plan: string | null): string | null {
    if (plan === 'agent') {
        return process.env.FINCODE_PLAN_ID_AGENT || null;
    }
    if (plan === 'standard') {
        return process.env.FINCODE_PLAN_ID_STANDARD || null;
    }
    return null;
}

function getRecurringResults(event: Record<string, unknown>): Array<Record<string, unknown>> {
    const data = isRecord(event.data) ? event.data : null;
    const sources = [
        event.body,
        event.results,
        data?.body,
        data?.results,
    ];

    const items = sources.flatMap((source) => (Array.isArray(source) ? source : []));
    if (items.length > 0) {
        return items.filter(isRecord);
    }

    return [data ?? event].filter(isRecord);
}

function toDbSubscriptionStatus(status: string | null): 'active' | 'past_due' {
    const normalizedStatus = status?.toUpperCase() || '';
    if (['FAILED', 'FAIL', 'ERROR', 'CANCELED', 'CANCELLED'].includes(normalizedStatus)) {
        return 'past_due';
    }
    return 'active';
}

export async function POST(req: Request) {
    const requestId = createBillingRequestId('webhook');
    const body = await req.text();
    const signature = req.headers.get('fincode-signature');

    if (!signature) {
        logBillingWarn('webhook.signature.missing', {
            requestId,
            bodyLength: body.length,
        });
        return NextResponse.json({ error: 'Missing fincode-signature header' }, { status: 400 });
    }

    const webhookSecret = process.env.FINCODE_WEBHOOK_SECRET;
    if (webhookSecret && !verifyFincodeSignature(body, signature, webhookSecret)) {
        logBillingWarn('webhook.signature.invalid', {
            requestId,
            bodyLength: body.length,
        });
        return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
    }

    let event: Record<string, unknown>;
    try {
        const parsed = JSON.parse(body);
        if (!isRecord(parsed)) {
            logBillingWarn('webhook.payload.invalid_record', {
                requestId,
                bodyLength: body.length,
            });
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
        }
        event = parsed;
    } catch {
        logBillingWarn('webhook.payload.invalid_json', {
            requestId,
            bodyLength: body.length,
        });
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const db = Database.getInstance();
    let eventType = '';
    let customerId = '';

    try {
        const data = isRecord(event.data) ? event.data : null;
        eventType = pickString(event.event, event.type, data?.event) || '';
        customerId = pickString(event.customer_id, data?.customer_id) || '';

        logBillingInfo('webhook.received', {
            requestId,
            eventType,
            customerId: maskIdentifier(customerId),
        });

        switch (eventType) {
            case 'card.regist': {
                // カード登録完了 → サブスクリプション作成
                const cardId = pickString(event.card_id, data?.card_id) || '';
                if (!customerId || !cardId) {
                    logBillingWarn('webhook.card_regist.missing_identifiers', {
                        requestId,
                        customerId: maskIdentifier(customerId),
                        cardId: maskIdentifier(cardId),
                    });
                    break;
                }

                const users = await db.select<UserRow>(
                    'SELECT id, subscription_plan_pending, subscription_id FROM user WHERE fincode_customer_id = ?',
                    [customerId]
                );
                if (users.length === 0) {
                    logBillingWarn('webhook.card_regist.user_not_found', {
                        requestId,
                        customerId: maskIdentifier(customerId),
                    });
                    break;
                }

                const user = users[0];
                const pendingPlan = user.subscription_plan_pending;
                if (!pendingPlan || pendingPlan === 'none') {
                    logBillingWarn('webhook.card_regist.pending_plan_missing', {
                        requestId,
                        userId: maskIdentifier(user.id),
                        customerId: maskIdentifier(customerId),
                    });
                    break;
                }

                const planId = getPlanIdByPendingPlan(pendingPlan);
                if (!planId) {
                    logBillingError('webhook.card_regist.plan_id_missing', new Error('FINCODE plan id is not configured'), {
                        requestId,
                        userId: maskIdentifier(user.id),
                        pendingPlan,
                    });
                    break;
                }
                const existingSubscriptionId = user.subscription_id;

                if (!existingSubscriptionId) {
                    logBillingInfo('webhook.card_regist.subscription_create_started', {
                        requestId,
                        userId: maskIdentifier(user.id),
                        customerId: maskIdentifier(customerId),
                        cardId: maskIdentifier(cardId),
                        pendingPlan,
                    });
                }

                const subscription = existingSubscriptionId
                    ? await (async () => {
                        logBillingInfo('webhook.card_regist.subscription_update_started', {
                            requestId,
                            userId: maskIdentifier(user.id),
                            customerId: maskIdentifier(customerId),
                            cardId: maskIdentifier(cardId),
                            subscriptionId: maskIdentifier(existingSubscriptionId),
                            pendingPlan,
                        });

                        await fincode.cards.update(customerId, cardId, {
                            default_flag: '1',
                        });

                        return fincode.subscriptions.update(existingSubscriptionId, {
                            pay_type: 'Card',
                            plan_id: planId,
                        });
                    })()
                    : await fincode.subscriptions.create({
                        pay_type: 'Card',
                        plan_id: planId,
                        customer_id: customerId,
                        card_id: cardId,
                        start_date: formatFincodeDate(new Date()),
                    });

                if (!existingSubscriptionId) {
                    logBillingInfo('webhook.card_regist.subscription_created', {
                        requestId,
                        userId: maskIdentifier(user.id),
                        customerId: maskIdentifier(customerId),
                        subscriptionId: maskIdentifier(subscription.id),
                        pendingPlan,
                    });
                } else {
                    logBillingInfo('webhook.card_regist.subscription_updated', {
                        requestId,
                        userId: maskIdentifier(user.id),
                        customerId: maskIdentifier(customerId),
                        subscriptionId: maskIdentifier(subscription.id),
                        pendingPlan,
                    });
                }

                await db.update(
                    `UPDATE user
                     SET subscription_id = ?,
                         subscription_status = 'active',
                         subscription_plan = ?,
                         subscription_plan_pending = NULL,
                         subscription_current_period_end = ?
                     WHERE fincode_customer_id = ?`,
                    [
                        subscription.id,
                        pendingPlan,
                        normalizeDbDateTime(subscription.next_charge_date),
                        customerId,
                    ]
                );

                logBillingInfo('webhook.card_regist.completed', {
                    requestId,
                    userId: maskIdentifier(user.id),
                    customerId: maskIdentifier(customerId),
                    subscriptionId: maskIdentifier(subscription.id),
                    pendingPlan,
                    nextChargeDate: normalizeDbDateTime(subscription.next_charge_date),
                });
                break;
            }

            case 'subscription.card.delete': {
                // サブスクリプション解約
                const subscriptionId = pickString(event.subscription_id, data?.subscription_id);
                if (!customerId && !subscriptionId) {
                    logBillingWarn('webhook.subscription_delete.missing_identifiers', {
                        requestId,
                    });
                    break;
                }

                const query = customerId
                    ? `UPDATE user
                       SET subscription_status = 'canceled',
                           subscription_id = NULL,
                           subscription_plan = 'none',
                           subscription_plan_pending = NULL,
                           subscription_current_period_end = NULL
                       WHERE fincode_customer_id = ?`
                    : `UPDATE user
                       SET subscription_status = 'canceled',
                           subscription_id = NULL,
                           subscription_plan = 'none',
                           subscription_plan_pending = NULL,
                           subscription_current_period_end = NULL
                       WHERE subscription_id = ?`;

                await db.update(query, [customerId || subscriptionId]);

                logBillingInfo('webhook.subscription_delete.completed', {
                    requestId,
                    customerId: maskIdentifier(customerId),
                    subscriptionId: maskIdentifier(subscriptionId),
                });
                break;
            }

            case 'recurring.card.batch': {
                // 定期課金バッチ結果
                const recurringResults = getRecurringResults(event);
                let processedCount = 0;
                let skippedCount = 0;

                for (const result of recurringResults) {
                    const subscriptionId = pickString(
                        result.subscription_id,
                        result.id,
                        event.subscription_id,
                        data?.subscription_id,
                    );
                    if (!subscriptionId) {
                        skippedCount += 1;
                        continue;
                    }

                    const status = pickString(result.status, event.status, data?.status);
                    const nextChargeDate = pickString(
                        result.next_charge_date,
                        event.next_charge_date,
                        data?.next_charge_date,
                    );

                    await db.update(
                        `UPDATE user
                         SET subscription_status = ?,
                             subscription_current_period_end = ?
                         WHERE subscription_id = ?`,
                        [
                            toDbSubscriptionStatus(status),
                            normalizeDbDateTime(nextChargeDate),
                            subscriptionId,
                        ]
                    );

                    processedCount += 1;
                }

                logBillingInfo('webhook.recurring_batch.completed', {
                    requestId,
                    processedCount,
                    skippedCount,
                    resultCount: recurringResults.length,
                });
                break;
            }

            default:
                logBillingInfo('webhook.unhandled_event', {
                    requestId,
                    eventType,
                    customerId: maskIdentifier(customerId),
                });
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        logBillingError('webhook.processing_failed', error, {
            requestId,
            eventType,
            customerId: maskIdentifier(customerId),
        });
        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
    }
}
