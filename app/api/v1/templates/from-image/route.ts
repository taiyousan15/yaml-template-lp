import { NextRequest, NextResponse } from 'next/server';
import { getSession, requireAuth } from '@/lib/auth';
import { checkRateLimit } from '@/lib/ratelimit';
import { uploadToS3 } from '@/lib/s3';
import { db } from '@/lib/db';
import { templateSources, templates, templateMappings } from '@/drizzle/schema';

export async function POST(req: NextRequest) {
  try {
    // テストモード: 認証をバイパス
    const testMode = process.env.NODE_ENV === 'development';

    let userId = 'test-user-id';

    if (!testMode) {
      // 認証チェック
      const user = await getSession(req);
      requireAuth(user);
      userId = user!.id;

      // レート制限チェック（OCR用）
      await checkRateLimit(userId, 'ocr');
    }

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

    // テストモードではS3アップロードとDB保存をスキップ
    let s3Url = '';
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let source: unknown = null;

    if (!testMode) {
      // S3にアップロード
      const buffer = Buffer.from(await file.arrayBuffer());
      const key = `raw/${userId}/${Date.now()}-${file.name}`;
      s3Url = await uploadToS3(key, buffer, file.type);

      // DB保存
      [source] = await db.insert(templateSources).values({
        userId,
        sourceType: 'image',
        s3Url,
      }).returning();
    }

    // TODO: Python OCR/レイアウト検出処理を呼び出し
    // テストモードではモックデータを返す
    if (testMode) {
      const mockYaml = `# LPテンプレート設定
meta:
  title: "サンプルLP"
  description: "画像から自動生成されたLPテンプレート"

hero:
  headline: "サンプル見出し"
  subheadline: "サンプル説明文です。ここに詳細な説明が入ります。"
  cta_text: "今すぐ申し込む"
  background_color: "#1a1a2e"

features:
  - title: "特徴1"
    description: "特徴の詳細説明"
    icon: "⭐"
  - title: "特徴2"
    description: "特徴の詳細説明"
    icon: "💎"

cta:
  button_text: "今すぐ申し込む"
  button_color: "#F59E0B"
  form_placeholder: "メールアドレスを入力"

footer:
  company: "会社名"
  subtitle: "サービス名"
  disclaimer: "注意事項やディスクレーマーをここに記載"
`;

      return NextResponse.json({
        templateId: 'test-template-id',
        yaml: mockYaml,
        blocks: [
          {
            id: 'block-1',
            type: 'Text',
            bbox: { x: 100, y: 50, width: 200, height: 40 },
            text: 'サンプル見出し',
            confidence: 95,
            color: '#3B82F6',
          },
          {
            id: 'block-2',
            type: 'Text',
            bbox: { x: 100, y: 120, width: 300, height: 60 },
            text: 'サンプル説明文です。ここに詳細な説明が入ります。',
            confidence: 88,
            color: '#10B981',
          },
          {
            id: 'block-3',
            type: 'Button',
            bbox: { x: 150, y: 220, width: 120, height: 50 },
            text: '今すぐ申し込む',
            confidence: 92,
            color: '#F59E0B',
          },
          {
            id: 'block-4',
            type: 'Image',
            bbox: { x: 350, y: 80, width: 200, height: 150 },
            confidence: 85,
            color: '#8B5CF6',
          },
        ],
        diffMetrics: {
          ssim: 0.92,
          colorDelta: 0.05,
          layoutDelta: 0.03,
        },
        mappingReportUrl: 'https://example.com/test-mapping.json',
      });
    }

    // 本番モード: DB保存
    const mockYaml = `# Generated from image
name: "Auto-generated Template"
version: 1
blocks: []
`;

    const [template] = await db.insert(templates).values({
      ownerId: userId,
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
      yamlUrl: `https://example.com/templates/${template.id}.yaml`,
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
