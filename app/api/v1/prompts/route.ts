import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { promptTemplates } from '@/drizzle/schema'
import { eq, desc, and } from 'drizzle-orm'

/**
 * GET /api/v1/prompts
 *
 * プロンプトテンプレート一覧取得
 *
 * Query params:
 * - purpose: hero | features | pricing | testimonials | faq | cta
 * - isActive: true | false
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const purpose = searchParams.get('purpose')
    const isActive = searchParams.get('isActive')

    let query = db.select().from(promptTemplates)

    const conditions = []

    if (purpose) {
      conditions.push(eq(promptTemplates.purpose, purpose as any))
    }

    if (isActive !== null) {
      const active = isActive === 'true'
      conditions.push(eq(promptTemplates.isActive, active))
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any
    }

    query = query.orderBy(desc(promptTemplates.createdAt)) as any

    const results = await query

    return NextResponse.json({
      status: 'success',
      prompts: results,
      count: results.length,
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

