import { NextRequest, NextResponse } from 'next/server'
import { tomyStyleAgent, scoreTOMYStyle } from '@/lib/tomy-style-agent'
import { db } from '@/lib/db'
import { logs } from '@/drizzle/schema'

/**
 * POST /api/v1/generate/tomy-style
 *
 * TOMYスタイル黄金律に基づいてLP文案を生成
 *
 * Body:
 * {
 *   "productName": "製品名",
 *   "targetAudience": "ターゲット層",
 *   "mainBenefit": "メインベネフィット",
 *   "beforeState": "Before状態",
 *   "afterState": "After状態",
 *   "credibility": "信頼性要素",
 *   "temperature": 0.8  // オプション
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productName, targetAudience, mainBenefit, beforeState, afterState, credibility, temperature } = body

    // バリデーション
    if (!productName || !targetAudience || !mainBenefit) {
      return NextResponse.json(
        { error: 'productName, targetAudience, mainBenefit are required' },
        { status: 400 }
      )
    }

    const startTime = Date.now()

    // TOMYスタイルエージェントで生成
    const result = await tomyStyleAgent({
      productName,
      targetAudience,
      mainBenefit,
      beforeState: beforeState || '現状の問題',
      afterState: afterState || '理想の未来',
      credibility: credibility || '実績あり',
      temperature: temperature || 0.8,
    })

    const executionTime = Date.now() - startTime

    // スコアリング
    const htmlContent = result.sections.map((s) => s.html).join('\n')
    const score = scoreTOMYStyle(htmlContent)

    // ログ記録
    await db.insert(logs).values({
      userId: 'system', // 本来は認証から取得
      type: 'tomy_style_generation',
      payloadJson: {
        input: { productName, targetAudience, mainBenefit },
        output: { tomy_score: result.metadata.tomy_score, score: score.score },
      } as any,
      costTokensIn: 1000, // 推定
      costTokensOut: 3000, // 推定
    })

    return NextResponse.json({
      status: 'success',
      result,
      score,
      executionTimeMs: executionTime,
    })
  } catch (error) {
    console.error('[TOMYStyleAPI] Error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/v1/generate/tomy-style/knowledge
 *
 * TOMYスタイルナレッジの概要を取得
 */
export async function GET() {
  return NextResponse.json({
    status: 'success',
    knowledge: {
      headline_patterns: [
        '数値×時間×結果の3点セット',
        'Before→Afterの劇的対比',
        '緊急性×希少性の同時訴求',
      ],
      best_practices: ['数値の端数化', '時間×倍率の明示', '感情の極限描写', '対比の極端化'],
      killer_words_categories: ['数値系', '感情系', '時間効率系', '自動化系'],
      structure_elements: 8,
      total_knowledge_count: 10,
      confidence_score_avg: 94.5,
    },
  })
}
