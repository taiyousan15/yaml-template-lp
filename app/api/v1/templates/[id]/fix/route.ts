import { NextRequest, NextResponse } from 'next/server';
import { getSession, requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { templates, templateMappings } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';

interface FixOperation {
  type: 'move' | 'resize' | 'retype' | 'recolor' | 'retext' | 'update';
  targetId: string;
  value: any;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSession(req);
    requireAuth(user);

    const body = await req.json();
    const { ops } = body as { ops: FixOperation[] };

    if (!ops || !Array.isArray(ops)) {
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: 'ops array is required' } },
        { status: 400 }
      );
    }

    // テンプレート取得
    const [template] = await db
      .select()
      .from(templates)
      .where(eq(templates.id, params.id));

    if (!template) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Template not found' } },
        { status: 404 }
      );
    }

    // 権限チェック
    if (template.ownerId !== user!.id) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Not authorized' } },
        { status: 403 }
      );
    }

    // TODO: YAMLパース
    // TODO: 各操作を適用
    // TODO: YAMLを再構築
    // TODO: 差分再評価（Python呼び出し）
    // 現在はモック実装

    const updatedYaml = template.yaml; // TODO: 実際に更新

    // テンプレート更新
    await db
      .update(templates)
      .set({
        yaml: updatedYaml,
        updatedAt: new Date(),
      })
      .where(eq(templates.id, params.id));

    // マッピング更新（差分メトリクス改善）
    const [mapping] = await db
      .select()
      .from(templateMappings)
      .where(eq(templateMappings.templateId, params.id));

    if (mapping) {
      const newDiffMetrics = {
        ssim: 0.94, // TODO: 実際の再評価結果
        colorDelta: 0.03,
        layoutDelta: 0.02,
      };

      await db
        .update(templateMappings)
        .set({
          diffMetricsJson: newDiffMetrics,
          confidence: 90, // TODO: 実際の計算
        })
        .where(eq(templateMappings.id, mapping.id));
    }

    return NextResponse.json({
      templateId: params.id,
      yamlUrl: `https://example.com/templates/${params.id}.yaml`,
      diffMetrics: {
        ssim: 0.94,
        colorDelta: 0.03,
        layoutDelta: 0.02,
      },
    });
  } catch (error: any) {
    console.error('Error in fix:', error);

    if (error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    if (error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: error.message } },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: { code: 'INTERNAL', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
