import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { yamlGenerationHistory } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';

/**
 * GET /api/v1/yaml-history/[id]
 * 特定の履歴を取得
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const [history] = await db
      .select()
      .from(yamlGenerationHistory)
      .where(eq(yamlGenerationHistory.id, id))
      .limit(1);

    if (!history) {
      return NextResponse.json(
        {
          success: false,
          error: '履歴が見つかりません',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: history,
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
 * PATCH /api/v1/yaml-history/[id]
 * 履歴を更新（名前やタグの変更）
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { name, tags } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (tags !== undefined) updateData.tags = tags;
    updateData.updatedAt = new Date();

    const [updatedHistory] = await db
      .update(yamlGenerationHistory)
      .set(updateData)
      .where(eq(yamlGenerationHistory.id, id))
      .returning();

    if (!updatedHistory) {
      return NextResponse.json(
        {
          success: false,
          error: '履歴が見つかりません',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedHistory,
      message: '履歴を更新しました',
    });
  } catch (error: any) {
    console.error('履歴更新エラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '履歴の更新に失敗しました',
      },
      { status: 500 }
    );
  }
}
