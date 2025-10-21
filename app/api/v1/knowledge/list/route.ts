import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { lpKnowledge } from '@/drizzle/schema'
import { eq, desc, and, sql } from 'drizzle-orm'

/**
 * GET /api/v1/knowledge/list
 *
 * ナレッジ一覧取得（フィルタ・ソート対応）
 *
 * Query params:
 * - category: layout | copywriting | cta | color_scheme | conversion_pattern
 * - knowledgeType: pattern | rule | best_practice | anti_pattern
 * - tags: カンマ区切り
 * - minConfidence: 最小信頼度（0-100）
 * - sortBy: confidence | usageCount | successRate | createdAt (default: confidence)
 * - limit: 件数制限（default: 50）
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const knowledgeType = searchParams.get('knowledgeType')
    const tagsParam = searchParams.get('tags')
    const minConfidence = searchParams.get('minConfidence')
    const sortBy = searchParams.get('sortBy') || 'confidence'
    const limit = parseInt(searchParams.get('limit') || '50')

    // クエリ構築
    let query = db.select().from(lpKnowledge)

    const conditions = []

    if (category) {
      conditions.push(eq(lpKnowledge.category, category as any))
    }

    if (knowledgeType) {
      conditions.push(eq(lpKnowledge.knowledgeType, knowledgeType as any))
    }

    if (minConfidence) {
      const minConf = parseInt(minConfidence)
      conditions.push(sql`${lpKnowledge.confidence} >= ${minConf}`)
    }

    if (tagsParam) {
      const tags = tagsParam.split(',')
      // タグ配列に含まれるかチェック（PostgreSQL配列演算）
      conditions.push(sql`${lpKnowledge.tags} && ARRAY[${tags.map((t) => `'${t}'`).join(',')}]::text[]`)
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any
    }

    // ソート
    if (sortBy === 'usageCount') {
      query = query.orderBy(desc(lpKnowledge.usageCount)) as any
    } else if (sortBy === 'successRate') {
      query = query.orderBy(desc(lpKnowledge.successRate)) as any
    } else if (sortBy === 'createdAt') {
      query = query.orderBy(desc(lpKnowledge.createdAt)) as any
    } else {
      query = query.orderBy(desc(lpKnowledge.confidence)) as any
    }

    query = query.limit(limit) as any

    const results = await query

    return NextResponse.json({
      status: 'success',
      knowledge: results,
      count: results.length,
    })
  } catch (error) {
    console.error('[KnowledgeAPI] Error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
