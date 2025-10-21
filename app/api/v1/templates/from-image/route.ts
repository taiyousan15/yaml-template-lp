import { NextRequest, NextResponse } from 'next/server';
import { getSession, requireAuth } from '@/lib/auth';
import { checkRateLimit } from '@/lib/ratelimit';
import { uploadToS3 } from '@/lib/s3';
import { db } from '@/lib/db';
import { templateSources, templates, templateMappings } from '@/drizzle/schema';

export async function POST(req: NextRequest) {
  try {
    // 認証チェック
    const user = await getSession(req);
    requireAuth(user);

    // レート制限チェック（OCR用）
    await checkRateLimit(user!.id, 'ocr');

    // ファイル検証
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'File is required' } }, { status: 400 });
    }

    // ファイルサイズチェック (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'File too large (max 10MB)' } }, { status: 413 });
    }

    // ファイル形式チェック
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'Unsupported file type' } }, { status: 415 });
    }

    // S3にアップロード
    const buffer = Buffer.from(await file.arrayBuffer());
    const key = `raw/${user!.id}/${Date.now()}-${file.name}`;
    const s3Url = await uploadToS3(key, buffer, file.type);

    // DB保存
    const [source] = await db.insert(templateSources).values({
      userId: user!.id,
      sourceType: 'image',
      s3Url,
    }).returning();

    // TODO: Python OCR/レイアウト検出処理を呼び出し
    // 現在はモック実装
    const mockYaml = `# Generated from image
name: "Auto-generated Template"
version: 1
blocks: []
`;

    const [template] = await db.insert(templates).values({
      ownerId: user!.id,
      name: `Template from ${file.name}`,
      yaml: mockYaml,
      tags: ['auto-generated'],
    }).returning();

    const [mapping] = await db.insert(templateMappings).values({
      templateId: template.id,
      confidence: 85,
      diffMetricsJson: {
        ssim: 0.92,
        colorDelta: 0.05,
        layoutDelta: 0.03,
      },
    }).returning();

    return NextResponse.json({
      templateId: template.id,
      yamlUrl: `https://example.com/templates/${template.id}.yaml`, // TODO: 実際のS3 URL
      mappingReportUrl: `https://example.com/mappings/${mapping.id}.json`,
      diffMetrics: mapping.diffMetricsJson,
    });

  } catch (error: any) {
    console.error('Error in from-image:', error);

    if (error.message.includes('Rate limit')) {
      return NextResponse.json({ error: { code: 'RATE_LIMITED', message: error.message } }, { status: 429 });
    }

    if (error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, { status: 401 });
    }

    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Internal server error' } }, { status: 500 });
  }
}
