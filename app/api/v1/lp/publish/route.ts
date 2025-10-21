import { NextRequest, NextResponse } from 'next/server';
import { getSession, requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { lps, billingSubscriptions } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { triggerVercelDeploy } from '@/lib/vercel';

export async function POST(req: NextRequest) {
  try {
    const user = await getSession(req);
    requireAuth(user);

    const body = await req.json();
    const { lpId, target } = body;

    // LP取得
    const [lp] = await db.select().from(lps).where(eq(lps.id, lpId));

    if (!lp || lp.userId !== user!.id) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'LP not found' } }, { status: 404 });
    }

    // 課金ゲート: サブスクリプション確認
    const [subscription] = await db.select().from(billingSubscriptions).where(eq(billingSubscriptions.userId, user!.id));

    if (!subscription || subscription.status !== 'active') {
      return NextResponse.json({
        error: { code: 'PAYMENT_REQUIRED', message: 'Subscription or purchase required' }
      }, { status: 402 });
    }

    // Vercelデプロイ
    const deployment = await triggerVercelDeploy(target);

    // LP更新
    await db.update(lps).set({
      status: 'published',
      prodUrl: target === 'production' ? deployment.url : lp.prodUrl,
    }).where(eq(lps.id, lpId));

    return NextResponse.json({
      deploymentId: deployment.deploymentId,
      url: deployment.url,
    });

  } catch (error: any) {
    console.error('Error in lp/publish:', error);
    return NextResponse.json({ error: { code: 'INTERNAL', message: error.message } }, { status: 500 });
  }
}
