import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { runKnowledgeTeam } from './knowledge-team'
import { tomyStyleAgent, scoreTOMYStyle, TOMY_STYLE_KNOWLEDGE } from './tomy-style-agent'
import { db } from './db'
import { lpKnowledge } from '@/drizzle/schema'
import { desc } from 'drizzle-orm'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

/**
 * 統合LP生成システム
 *
 * 方法1（手動指定）と方法2（YAML分析）を自動的に組み合わせて
 * 最高品質のLPを生成する完全自動化システム
 */

export const UnifiedLPInputSchema = z.object({
  // 基本情報（必須）
  productName: z.string(),
  targetAudience: z.string(),
  mainBenefit: z.string(),

  // オプション情報
  beforeState: z.string().optional(),
  afterState: z.string().optional(),
  credibility: z.string().optional(),

  // YAML情報（オプション - ある場合は分析して統合）
  yamlTemplate: z.string().optional(),
  templateId: z.string().optional(),

  // 生成設定
  mode: z.enum(['auto', 'tomy_only', 'knowledge_only']).default('auto'),
  temperature: z.number().min(0).max(1).default(0.8),
  useKnowledgeBase: z.boolean().default(true),
})

export type UnifiedLPInput = z.infer<typeof UnifiedLPInputSchema>

export const UnifiedLPOutputSchema = z.object({
  status: z.enum(['success', 'error']),
  lp: z.object({
    headline: z.string(),
    subheadline: z.string().optional(),
    sections: z.array(
      z.object({
        section: z.string(),
        html: z.string(),
        keywords_used: z.array(z.string()),
        patterns_applied: z.array(z.string()),
      })
    ),
  }),
  metadata: z.object({
    tomy_score: z.number(),
    knowledge_items_used: z.number(),
    generation_method: z.string(),
    execution_time_ms: z.number(),
    tokens_used: z.number(),
  }),
  quality_score: z.object({
    overall: z.number(),
    breakdown: z.object({
      numerical_precision: z.number(),
      time_contrast: z.number(),
      urgency_scarcity: z.number(),
      killer_words: z.number(),
      extreme_emotion: z.number(),
    }),
    recommendations: z.array(z.string()),
  }),
  knowledge_extracted: z.array(z.any()).optional(), // YAML分析時のみ
})

export type UnifiedLPOutput = z.infer<typeof UnifiedLPOutputSchema>

/**
 * 統合LP生成マスターエージェント
 *
 * 自動的に最適な生成方法を選択・組み合わせる
 */
export async function generateUnifiedLP(input: UnifiedLPInput): Promise<UnifiedLPOutput> {
  const startTime = Date.now()
  let totalTokens = 0

  console.log('[UnifiedLPGenerator] 🚀 統合LP生成開始...')
  console.log(`[UnifiedLPGenerator] モード: ${input.mode}`)
  console.log(`[UnifiedLPGenerator] ナレッジベース使用: ${input.useKnowledgeBase}`)

  try {
    // ========================================
    // Phase 1: ナレッジ収集
    // ========================================
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let extractedKnowledge: any[] = []

    // YAML分析（ある場合）
    if (input.yamlTemplate && input.mode !== 'tomy_only') {
      console.log('[UnifiedLPGenerator] 📝 YAMLテンプレート分析中...')

      const knowledgeTeamResult = await runKnowledgeTeam(input.yamlTemplate)
      totalTokens += knowledgeTeamResult.totalTokensUsed

      if (knowledgeTeamResult.status === 'success' && knowledgeTeamResult.knowledge) {
        extractedKnowledge = knowledgeTeamResult.knowledge.knowledge
        const yamlAnalysisResult = knowledgeTeamResult.analysis
        console.log(
          `[UnifiedLPGenerator] ✅ YAML分析完了: ${extractedKnowledge.length}件のナレッジ抽出 (分析結果: ${yamlAnalysisResult ? 'あり' : 'なし'})`
        )
      }
    }

    // DBからナレッジ取得（useKnowledgeBase: true の場合）
    let dbKnowledge: any[] = []
    if (input.useKnowledgeBase && input.mode !== 'tomy_only') {
      console.log('[UnifiedLPGenerator] 💾 ナレッジベースから取得中...')

      const knowledge = await db
        .select()
        .from(lpKnowledge)
        .orderBy(desc(lpKnowledge.confidence))
        .limit(10)

      dbKnowledge = knowledge.map((k) => ({
        title: k.title,
        description: k.description,
        category: k.category,
        examples: k.examples,
        confidence: k.confidence,
      }))

      console.log(`[UnifiedLPGenerator] ✅ DB から${dbKnowledge.length}件のナレッジ取得`)
    }

    // ナレッジ統合
    const combinedKnowledge = [...extractedKnowledge, ...dbKnowledge]

    // ========================================
    // Phase 2: 生成方法の自動選択
    // ========================================
    let generationMethod = ''
    let lpResult: any

    if (input.mode === 'tomy_only') {
      // TOMYスタイルのみ
      console.log('[UnifiedLPGenerator] 🎯 TOMYスタイルで生成...')
      generationMethod = 'tomy_style_only'

      lpResult = await tomyStyleAgent({
        productName: input.productName,
        targetAudience: input.targetAudience,
        mainBenefit: input.mainBenefit,
        beforeState: input.beforeState || '現状の課題',
        afterState: input.afterState || '理想の未来',
        credibility: input.credibility || '実績多数',
        temperature: input.temperature,
      })

      totalTokens += 3000 // 推定
    } else if (input.mode === 'knowledge_only') {
      // ナレッジベースのみ
      console.log('[UnifiedLPGenerator] 📚 ナレッジベースで生成...')
      generationMethod = 'knowledge_base_only'

      lpResult = await generateWithKnowledge(input, combinedKnowledge)
      totalTokens += 3500 // 推定
    } else {
      // auto: TOMYスタイル + ナレッジベースの統合（最強モード）
      console.log('[UnifiedLPGenerator] 🔥 統合モード（TOMY + ナレッジ）で生成...')
      generationMethod = 'unified_tomy_knowledge'

      lpResult = await generateUnifiedTOMYKnowledge(input, combinedKnowledge)
      totalTokens += 4000 // 推定
    }

    // ========================================
    // Phase 3: 品質スコアリング
    // ========================================
    console.log('[UnifiedLPGenerator] 📊 品質スコアリング中...')

    const htmlContent = lpResult.sections.map((s: any) => s.html).join('\n')
    const qualityScore = scoreTOMYStyle(htmlContent)

    // ========================================
    // Phase 4: 結果の整形
    // ========================================
    const executionTime = Date.now() - startTime

    const output: UnifiedLPOutput = {
      status: 'success',
      lp: {
        headline: lpResult.headline,
        subheadline: lpResult.subheadline,
        sections: lpResult.sections,
      },
      metadata: {
        tomy_score: lpResult.metadata?.tomy_score || qualityScore.score,
        knowledge_items_used: combinedKnowledge.length,
        generation_method: generationMethod,
        execution_time_ms: executionTime,
        tokens_used: totalTokens,
      },
      quality_score: {
        overall: qualityScore.score,
        breakdown: qualityScore.breakdown,
        recommendations: qualityScore.recommendations,
      },
      knowledge_extracted: extractedKnowledge.length > 0 ? extractedKnowledge : undefined,
    }

    console.log('[UnifiedLPGenerator] ✅ 生成完了！')
    console.log(`[UnifiedLPGenerator] TOMYスコア: ${output.metadata.tomy_score}点`)
    console.log(`[UnifiedLPGenerator] 品質スコア: ${output.quality_score.overall}点`)
    console.log(`[UnifiedLPGenerator] 実行時間: ${executionTime}ms`)

    return output
  } catch (error) {
    console.error('[UnifiedLPGenerator] ❌ エラー:', error)
    throw error
  }
}

/**
 * ナレッジベースを使ったLP生成
 */
async function generateWithKnowledge(
  input: UnifiedLPInput,
  knowledge: any[]
): Promise<any> {
  const knowledgeContext = knowledge
    .map(
      (k, i) => `
### ナレッジ ${i + 1}: ${k.title}
カテゴリ: ${k.category}
説明: ${k.description}
例: ${k.examples ? JSON.stringify(k.examples).substring(0, 200) : 'なし'}
`
    )
    .join('\n')

  const prompt = `あなたは蓄積されたナレッジベースを活用するLP生成の専門家です。

# 製品情報
- 製品名: ${input.productName}
- ターゲット: ${input.targetAudience}
- メインベネフィット: ${input.mainBenefit}
- Before状態: ${input.beforeState || '課題がある'}
- After状態: ${input.afterState || '課題が解決'}
- 信頼性: ${input.credibility || '実績あり'}

# 活用するナレッジ（${knowledge.length}件）
${knowledgeContext}

# 指示
上記のナレッジを最大限活用してLP文案を生成してください。

JSON形式で返してください:
{
  "headline": "ヘッドライン",
  "subheadline": "サブヘッドライン",
  "sections": [
    {
      "section": "hero",
      "html": "<div>HTMLコンテンツ</div>",
      "keywords_used": ["キラーワード"],
      "patterns_applied": ["適用パターン"]
    }
  ],
  "metadata": {
    "tomy_score": 85,
    "killer_words_count": 10
  }
}`

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4000,
    temperature: input.temperature,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = response.content[0]
  if (content.type !== 'text') {
    throw new Error('Failed to generate with knowledge')
  }

  return JSON.parse(content.text)
}

/**
 * TOMYスタイル + ナレッジベース統合生成（最強モード）
 */
async function generateUnifiedTOMYKnowledge(
  input: UnifiedLPInput,
  knowledge: any[]
): Promise<any> {
  // TOMYスタイルのコアナレッジ
  const tomyKnowledge = `
# TOMYスタイル 黄金パターン（必須適用）

## 1. ヘッドライン3点セット
- 数値×時間×結果: "[期間]で[端数付き数値]を達成した[人物属性]の[感情]"
- 例: "1ヶ月で89.4万円を稼いだ34歳元ニートの奇跡"

## 2. Before→After劇的対比
- "[Before]が[After]に（[倍率]の[変化]）"
- 例: "10時間→5分（120倍の効率化）"

## 3. 緊急性×希少性（100%必須）
- "[時間制限]×[数量制限]＋[失うもの]"
- 例: "48時間限定・先着30名（逃すと6ヶ月待ち）"

## 4. キラーワードTOP30
${JSON.stringify(TOMY_STYLE_KNOWLEDGE.KILLER_WORDS, null, 2)}

## 5. 8要素構成
1. キャッチコピー（0-10%）
2. 問題提起（5-20%）
3. 実績・権威（20-60%）
4. 解決策提示（30-70%）
5. ベネフィット列挙（40-70%）
6. 社会証明（50-80%）
7. CTA（複数箇所）
8. 緊急性・希少性（80-100%）
`

  const customKnowledge = knowledge
    .map(
      (k, i) => `
## カスタムナレッジ ${i + 1}: ${k.title}
- カテゴリ: ${k.category}
- 説明: ${k.description}
- 信頼度: ${k.confidence || 'N/A'}%
`
    )
    .join('\n')

  const prompt = `あなたは「TOMYスタイル黄金律」と「蓄積されたカスタムナレッジ」の両方を統合する最強のLP生成エージェントです。

# 製品情報
- 製品名: ${input.productName}
- ターゲット: ${input.targetAudience}
- メインベネフィット: ${input.mainBenefit}
- Before状態: ${input.beforeState || '課題がある'}
- After状態: ${input.afterState || '課題が解決'}
- 信頼性: ${input.credibility || '実績あり'}

${tomyKnowledge}

${customKnowledge}

# 指示
**必ずTOMYスタイル黄金律を100%適用**した上で、カスタムナレッジも組み込んでください。

目標TOMYスコア: **95点以上**

JSON形式で返してください:
{
  "headline": "ヘッドライン（3点セット適用）",
  "subheadline": "サブヘッドライン（Before→After対比）",
  "sections": [
    {
      "section": "hero",
      "html": "<div>HTMLコンテンツ</div>",
      "keywords_used": ["使用したキラーワード"],
      "patterns_applied": ["TOMYパターン", "カスタムナレッジ"]
    },
    {
      "section": "problem",
      "html": "<div>問題提起</div>",
      "keywords_used": [],
      "patterns_applied": []
    },
    {
      "section": "solution",
      "html": "<div>解決策</div>",
      "keywords_used": [],
      "patterns_applied": []
    },
    {
      "section": "benefits",
      "html": "<div>ベネフィット</div>",
      "keywords_used": [],
      "patterns_applied": []
    },
    {
      "section": "proof",
      "html": "<div>社会的証明</div>",
      "keywords_used": [],
      "patterns_applied": []
    },
    {
      "section": "cta",
      "html": "<div>CTA</div>",
      "keywords_used": [],
      "patterns_applied": []
    },
    {
      "section": "urgency",
      "html": "<div>緊急性×希少性</div>",
      "keywords_used": [],
      "patterns_applied": []
    }
  ],
  "metadata": {
    "tomy_score": 95,
    "killer_words_count": 12,
    "contrast_multiplier": 120
  }
}`

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 5000,
    temperature: input.temperature,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = response.content[0]
  if (content.type !== 'text') {
    throw new Error('Failed to generate unified LP')
  }

  return JSON.parse(content.text)
}
