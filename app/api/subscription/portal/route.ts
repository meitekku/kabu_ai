import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { Database } from '@/lib/database/Mysql';
import { RowDataPacket } from 'mysql2';

interface UserRow extends RowDataPacket {
    stripe_customer_id: string | null;
}

export async function POST(req: NextRequest) {
    try {
        const username = req.cookies.get('username')?.value;

        if (!username) {
            return NextResponse.json(
                { error: 'ログインが必要です' },
                { status: 401 }
            );
        }

        const db = Database.getInstance();
        const users = await db.select<UserRow>(
            'SELECT stripe_customer_id FROM users WHERE username = ?',
            [username]
        );

        if (users.length === 0) {
            return NextResponse.json(
                { error: 'ユーザーが見つかりません' },
                { status: 404 }
            );
        }

        const user = users[0];

        if (!user.stripe_customer_id) {
            return NextResponse.json(
                { error: 'サブスクリプションが見つかりません' },
                { status: 404 }
            );
        }

        // Stripeカスタマーポータルセッションを作成
        const portalSession = await stripe.billingPortal.sessions.create({
            customer: user.stripe_customer_id,
            return_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/settings/billing`,
        });

        return NextResponse.json({ url: portalSession.url });
    } catch (error: any) {
        console.error('Portal session error:', error);
        return NextResponse.json(
            { error: error.message || 'ポータルセッションの作成に失敗しました' },
            { status: 500 }
        );
    }
}
