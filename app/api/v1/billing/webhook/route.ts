import { NextRequest, NextResponse } from 'next/server';
import { constructWebhookEvent } from '@/lib/stripe';
import { db } from '@/lib/db';
import { billingSubscriptions, billingPayments } from '@/drizzle/schema';

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature')!;

    // Webhook署名検証
    const event = constructWebhookEvent(body, signature);

    // イベント処理
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        const userId = session.client_reference_id || session.metadata.userId;

        if (session.mode === 'subscription') {
          // サブスクリプション作成
          await db.insert(billingSubscriptions).values({
            userId,
            stripeSubId: session.subscription,
            plan: 'pro',
            status: 'active',
            currentPeriodEnd: new Date(session.subscription.current_period_end * 1000),
          });
        } else {
          // 単発購入
          await db.insert(billingPayments).values({
            userId,
            stripePiId: session.payment_intent,
            amountCents: session.amount_total,
            status: 'succeeded',
          });
        }
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        // サブスクリプション更新処理
        // TODO: 実装
        break;
      }
    }

    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: { code: 'BAD_REQUEST', message: error.message } }, { status: 400 });
  }
}
