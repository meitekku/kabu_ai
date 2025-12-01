import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { Database } from '@/lib/database/Mysql';
import { RowDataPacket } from 'mysql2';

interface UserRow extends RowDataPacket {
    id: number;
    username: string;
    stripe_customer_id: string | null;
}

export async function POST(req: NextRequest) {
    try {
        // ログインユーザーを取得
        const username = req.cookies.get('username')?.value;

        if (!username) {
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
            'SELECT id, username, stripe_customer_id FROM users WHERE username = ?',
            [username]
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
                metadata: {
                    username: username,
                },
            });
            customerId = customer.id;

            // DBに保存
            await db.update(
                'UPDATE users SET stripe_customer_id = ? WHERE username = ?',
                [customerId, username]
            );
        }

        const session = await stripe.checkout.sessions.create({
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
                username: username,
            },
        });

        return NextResponse.json({ url: session.url });
    } catch (err: any) {
        console.error('Stripe Checkout Error:', err);
        return NextResponse.json(
            { error: err.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
