import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { yamlGenerationHistory } from '@/drizzle/schema';
import { desc, eq } from 'drizzle-orm';

/**
 * GET /api/v1/yaml-history
 * 履歴一覧を取得
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'anonymous';
    const limit = parseInt(searchParams.get('limit') || '50');

    const histories = await db
      .select()
      .from(yamlGenerationHistory)
      .where(eq(yamlGenerationHistory.userId, userId))
      .orderBy(desc(yamlGenerationHistory.createdAt))
      .limit(limit);

    return NextResponse.json({
      success: true,
      data: histories,
      count: histories.length,
    });
  } catch (error: any) {
    console.error('履歴取得エラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '履歴の取得に失敗しました',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/yaml-history
 * 新しい履歴を保存
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId = 'anonymous',
      sourceImageUrl,
      generatedYaml,
      metadata,
      name,
      tags,
    } = body;

    // バリデーション
    if (!sourceImageUrl || !generatedYaml) {
      return NextResponse.json(
        {
          success: false,
          error: 'sourceImageUrl と generatedYaml は必須です',
        },
        { status: 400 }
      );
    }

    // データベースに保存
    const [newHistory] = await db
      .insert(yamlGenerationHistory)
      .values({
        userId,
        sourceImageUrl,
        generatedYaml,
        metadata: metadata || null,
        name: name || null,
        tags: tags || [],
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: newHistory,
      message: '履歴を保存しました',
    });
  } catch (error: any) {
    console.error('履歴保存エラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '履歴の保存に失敗しました',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/yaml-history?id=xxx
 * 履歴を削除
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'id パラメータは必須です',
        },
        { status: 400 }
      );
    }

    await db
      .delete(yamlGenerationHistory)
      .where(eq(yamlGenerationHistory.id, id));

    return NextResponse.json({
      success: true,
      message: '履歴を削除しました',
    });
  } catch (error: any) {
    console.error('履歴削除エラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '履歴の削除に失敗しました',
      },
      { status: 500 }
    );
  }
}
