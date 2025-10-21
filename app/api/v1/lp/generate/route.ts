import { NextRequest, NextResponse } from 'next/server';
import { getSession, requireAuth } from '@/lib/auth';
import { checkRateLimit } from '@/lib/ratelimit';
import { db } from '@/lib/db';
import { lps, templates } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const user = await getSession(req);
    requireAuth(user);
    await checkRateLimit(user!.id, 'api');

    const body = await req.json();
    const { templateId, variables, llm } = body;

    // テンプレート取得
    const [template] = await db.select().from(templates).where(eq(templates.id, templateId));

    if (!template) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Template not found' } }, { status: 404 });
    }

    // TODO: AI文案生成（Agent1 + Agent2）
    // TODO: 画像レンダリング（Python Pillow）
    // TODO: HTML/CSS生成
    // 現在はモック実装

    const [lp] = await db.insert(lps).values({
      userId: user!.id,
      templateId,
      paramsJson: { variables, llm },
      html: '<html><body><h1>Generated LP</h1></body></html>',
      css: 'body { font-family: sans-serif; }',
      status: 'draft',
      previewUrl: `https://preview.example.com/lp/${Date.now()}`,
    }).returning();

    return NextResponse.json({
      lpId: lp.id,
      html: lp.html,
      css: lp.css,
      sections: [],
      images: [],
      previewUrl: lp.previewUrl,
      cost: {
        tokens_in: 1000,
        tokens_out: 500,
      },
    });

  } catch (error: any) {
    console.error('Error in lp/generate:', error);
    return NextResponse.json({ error: { code: 'INTERNAL', message: error.message } }, { status: 500 });
  }
}
