import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { Database } from '@/lib/database/Mysql';
import Stripe from 'stripe';

export async function POST(req: NextRequest) {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
        return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET!
        );
    } catch (err: any) {
        console.error('Webhook signature verification failed:', err.message);
        return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
    }

    const db = Database.getInstance();

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                const customerId = session.customer as string;
                const subscriptionId = session.subscription as string;
                const username = session.metadata?.username;

                if (username && customerId) {
                    // ユーザーにStripe顧客IDとサブスクリプションを紐付け
                    await db.update(
                        `UPDATE users
                         SET stripe_customer_id = ?,
                             subscription_id = ?,
                             subscription_status = 'active'
                         WHERE username = ?`,
                        [customerId, subscriptionId, username]
                    );
                }
                break;
            }

            case 'customer.subscription.updated': {
                const subscription = event.data.object as Stripe.Subscription;
                const customerId = subscription.customer as string;
                const status = subscription.status;

                // current_period_endを安全に取得
                const periodEndTimestamp = (subscription as any).current_period_end;
                const currentPeriodEnd = periodEndTimestamp
                    ? new Date(periodEndTimestamp * 1000)
                    : null;

                // サブスクリプションステータスをマッピング
                let dbStatus: 'active' | 'canceled' | 'past_due' | 'none' = 'none';
                if (status === 'active' || status === 'trialing') {
                    dbStatus = 'active';
                } else if (status === 'canceled' || status === 'unpaid') {
                    dbStatus = 'canceled';
                } else if (status === 'past_due') {
                    dbStatus = 'past_due';
                }

                const periodEndStr = currentPeriodEnd
                    ? currentPeriodEnd.toISOString().slice(0, 19).replace('T', ' ')
                    : null;

                await db.update(
                    `UPDATE users
                     SET subscription_status = ?,
                         subscription_current_period_end = ?
                     WHERE stripe_customer_id = ?`,
                    [dbStatus, periodEndStr, customerId]
                );
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;
                const customerId = subscription.customer as string;

                await db.update(
                    `UPDATE users
                     SET subscription_status = 'canceled',
                         subscription_id = NULL
                     WHERE stripe_customer_id = ?`,
                    [customerId]
                );
                break;
            }

            case 'invoice.payment_failed': {
                const invoice = event.data.object as Stripe.Invoice;
                const customerId = invoice.customer as string;

                await db.update(
                    `UPDATE users
                     SET subscription_status = 'past_due'
                     WHERE stripe_customer_id = ?`,
                    [customerId]
                );
                break;
            }

            case 'invoice.paid': {
                const invoice = event.data.object as Stripe.Invoice;
                const customerId = invoice.customer as string;

                // 支払い成功時、ステータスをactiveに戻す
                await db.update(
                    `UPDATE users
                     SET subscription_status = 'active'
                     WHERE stripe_customer_id = ?`,
                    [customerId]
                );
                break;
            }

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error('Webhook processing error:', error);
        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
    }
}
