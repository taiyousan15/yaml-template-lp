import { NextRequest, NextResponse } from 'next/server'
import { generateUnifiedLP, UnifiedLPInputSchema } from '@/lib/unified-lp-generator'
import { db } from '@/lib/db'
import { logs, lps } from '@/drizzle/schema'

/**
 * POST /api/v1/generate/unified
 *
 * 統合LP生成API
 * MrTスタイル + YAML分析ナレッジ + DBナレッジを自動統合
 *
 * Body:
 * {
 *   "productName": "製品名",
 *   "targetAudience": "ターゲット",
 *   "mainBenefit": "メインベネフィット",
 *   "beforeState": "Before状態（オプション）",
 *   "afterState": "After状態（オプション）",
 *   "credibility": "信頼性要素（オプション）",
 *   "yamlTemplate": "YAML文字列（オプション - ある場合は分析）",
 *   "templateId": "テンプレートID（オプション）",
 *   "mode": "auto | mrt_only | knowledge_only (default: auto)",
 *   "temperature": 0.8,
 *   "useKnowledgeBase": true
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // バリデーション
    const validatedInput = UnifiedLPInputSchema.parse(body)

    console.log('[UnifiedAPI] リクエスト受付:', {
      productName: validatedInput.productName,
      mode: validatedInput.mode,
      hasYAML: !!validatedInput.yamlTemplate,
      useKnowledgeBase: validatedInput.useKnowledgeBase,
    })

    // 統合LP生成
    const result = await generateUnifiedLP(validatedInput)

    // LP保存（オプション）
    const [savedLP] = await db
      .insert(lps)
      .values({
        userId: 'system', // 本来は認証から取得
        templateId: validatedInput.templateId || null,
        paramsJson: {
          productName: validatedInput.productName,
          targetAudience: validatedInput.targetAudience,
          mainBenefit: validatedInput.mainBenefit,
        } as any,
        html: result.lp.sections.map((s) => s.html).join('\n'),
        status: 'draft',
      })
      .returning()

    // ログ記録
    await db.insert(logs).values({
      userId: 'system',
      type: 'unified_lp_generation',
      payloadJson: {
        input: {
          productName: validatedInput.productName,
          mode: validatedInput.mode,
        },
        output: {
          lpId: savedLP.id,
          mrt_score: result.metadata.mrt_score,
          quality_score: result.quality_score.overall,
          generation_method: result.metadata.generation_method,
        },
      } as any,
      costTokensIn: Math.floor(result.metadata.tokens_used * 0.3),
      costTokensOut: Math.floor(result.metadata.tokens_used * 0.7),
    })

    console.log('[UnifiedAPI] ✅ 生成完了:', {
      lpId: savedLP.id,
      mrt_score: result.metadata.mrt_score,
      quality_score: result.quality_score.overall,
      execution_time: result.metadata.execution_time_ms,
    })

    return NextResponse.json({
      status: 'success',
      lpId: savedLP.id,
      result,
    })
  } catch (error) {
    console.error('[UnifiedAPI] ❌ エラー:', error)

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.message,
        },
        { status: 400 }
      )
    }

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
 * GET /api/v1/generate/unified/modes
 *
 * 利用可能な生成モードの説明を取得
 */
export async function GET() {
  return NextResponse.json({
    status: 'success',
    modes: {
      auto: {
        name: '自動統合モード（推奨）',
        description: 'MrTスタイル黄金律 + ナレッジベース + YAML分析を自動統合',
        features: [
          'MrTスタイル黄金パターン100%適用',
          'DBナレッジ自動取得・活用',
          'YAML分析（提供時）',
          '品質スコア95点以上を目標',
        ],
        estimated_quality: 95,
        recommended: true,
      },
      mrt_only: {
        name: 'MrTスタイル専用モード',
        description: 'MrTスタイル黄金律のみを適用（ナレッジベース不使用）',
        features: [
          '数値×時間×結果の3点セット',
          'Before→After劇的対比',
          '緊急性×希少性100%適用',
          'キラーワードTOP30活用',
        ],
        estimated_quality: 90,
        recommended: false,
      },
      knowledge_only: {
        name: 'ナレッジベース専用モード',
        description: 'DBナレッジとYAML分析のみ（MrTスタイル不使用）',
        features: [
          'DBナレッジ取得・活用',
          'YAML分析（提供時）',
          'カスタムパターン適用',
        ],
        estimated_quality: 85,
        recommended: false,
      },
    },
    usage_examples: [
      {
        mode: 'auto',
        useCase: '最高品質のLPを生成したい',
        request: {
          productName: 'AI自動化ツール',
          targetAudience: '年商1億円未満の経営者',
          mainBenefit: '売上を3ヶ月で4.2倍にする',
          beforeState: '広告費100万円で赤字',
          afterState: '広告費37.2万円で黒字転換',
          credibility: '導入企業127社、平均成約率53%',
          yamlTemplate: '--- (オプション)',
          mode: 'auto',
        },
      },
      {
        mode: 'mrt_only',
        useCase: 'MrTスタイルのみで生成',
        request: {
          productName: 'コンサルティングサービス',
          targetAudience: '起業家',
          mainBenefit: '月収50万円達成',
          mode: 'mrt_only',
        },
      },
    ],
  })
}
