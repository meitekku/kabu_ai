import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { Database } from '@/lib/database/Mysql';
import { RowDataPacket } from 'mysql2';
import { auth } from '@/lib/auth/auth';
import { headers } from 'next/headers';

interface UserRow extends RowDataPacket {
    id: string;
    email: string;
    stripe_customer_id: string | null;
}

export async function POST(req: NextRequest) {
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

        const { priceId } = await req.json();
        const price = priceId || process.env.STRIPE_PRICE_ID;

        if (!price) {
            return NextResponse.json(
                { error: 'Price ID is required' },
                { status: 400 }
            );
        }

        const db = Database.getInstance();

        // ユーザー情報を取得
        const users = await db.select<UserRow>(
            'SELECT id, email, stripe_customer_id FROM user WHERE id = ?',
            [session.user.id]
        );

        if (users.length === 0) {
            return NextResponse.json(
                { error: 'ユーザーが見つかりません' },
                { status: 404 }
            );
        }

        const user = users[0];
        let customerId = user.stripe_customer_id;

        // Stripe顧客がまだなければ作成
        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                metadata: {
                    userId: user.id,
                },
            });
            customerId = customer.id;

            // DBに保存
            await db.update(
                'UPDATE user SET stripe_customer_id = ? WHERE id = ?',
                [customerId, user.id]
            );
        }

        const checkoutSession = await stripe.checkout.sessions.create({
            customer: customerId,
            line_items: [
                {
                    price: price,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/premium/success`,
            cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/premium`,
            metadata: {
                userId: user.id,
            },
        });

        return NextResponse.json({ url: checkoutSession.url });
    } catch (err: any) {
        console.error('Stripe Checkout Error:', err);
        return NextResponse.json(
            { error: err.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
