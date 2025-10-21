import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { promptTemplates } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'

/**
 * GET /api/v1/prompts/:id
 *
 * 特定プロンプトテンプレート取得
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const result = await db
      .select()
      .from(promptTemplates)
      .where(eq(promptTemplates.id, id))
      .limit(1)

    if (!result || result.length === 0) {
      return NextResponse.json({ error: 'Prompt template not found' }, { status: 404 })
    }

    return NextResponse.json({
      status: 'success',
      prompt: result[0],
    })
  } catch (error) {
    console.error('[PromptsAPI] Error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
