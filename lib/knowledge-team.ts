import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import YAML from 'yaml'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// ========================================
// Schema Definitions
// ========================================

export const KnowledgeItemSchema = z.object({
  category: z.enum(['layout', 'copywriting', 'cta', 'color_scheme', 'conversion_pattern']),
  knowledgeType: z.enum(['pattern', 'rule', 'best_practice', 'anti_pattern']),
  title: z.string(),
  description: z.string(),
  examples: z.array(z.any()).optional(),
  metrics: z.object({
    estimatedCVR: z.number().optional(),
    confidence: z.number(),
  }).optional(),
  tags: z.array(z.string()),
  confidence: z.number().min(0).max(100),
})

export const AnalysisResultSchema = z.object({
  status: z.enum(['success', 'error']),
  yamlStructure: z.object({
    sections: z.array(z.string()),
    variables: z.array(z.string()),
    complexity: z.number(),
  }),
  insights: z.array(z.string()),
  recommendations: z.array(z.string()),
})

export const KnowledgeExtractionSchema = z.object({
  status: z.enum(['success', 'error']),
  knowledge: z.array(KnowledgeItemSchema),
  totalKnowledgeCount: z.number(),
  categories: z.array(z.string()),
})

export const PromptGenerationSchema = z.object({
  status: z.enum(['success', 'error']),
  prompts: z.array(
    z.object({
      name: z.string(),
      purpose: z.string(),
      promptText: z.string(),
      knowledgeIds: z.array(z.string()),
      variables: z.array(z.string()),
      temperature: z.number(),
      examples: z.array(z.string()).optional(),
    })
  ),
})

export type KnowledgeItem = z.infer<typeof KnowledgeItemSchema>
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>
export type KnowledgeExtraction = z.infer<typeof KnowledgeExtractionSchema>
export type PromptGeneration = z.infer<typeof PromptGenerationSchema>

// ========================================
// Agent 1: YAML分析エージェント
// ========================================

/**
 * YAMLテンプレートを深く分析し、構造とパターンを抽出する
 * 温度: 0.2 (低温で正確な分析)
 */
export async function analysisAgent(yamlContent: string): Promise<AnalysisResult> {
  const prompt = `あなたはLPテンプレート分析の専門家です。以下のYAMLテンプレートを詳細に分析してください。

YAMLコンテンツ:
\`\`\`yaml
${yamlContent}
\`\`\`

以下の観点で分析し、JSON形式で返してください:

1. **yamlStructure**: YAMLの構造分析
   - sections: 含まれるセクション名の配列
   - variables: 使用されている変数名の配列
   - complexity: 複雑度（1-10）

2. **insights**: このテンプレートから得られる洞察（配列）
   - レイアウトパターン
   - コピーライティングの特徴
   - CTAの配置戦略
   - 色彩設計の特徴
   - コンバージョン最適化のポイント

3. **recommendations**: 改善提案（配列）
   - より効果的にするための具体的な提案

JSON形式:
{
  "status": "success",
  "yamlStructure": {
    "sections": ["hero", "features", ...],
    "variables": ["headline", "subheadline", ...],
    "complexity": 7
  },
  "insights": ["洞察1", "洞察2", ...],
  "recommendations": ["提案1", "提案2", ...]
}`

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 2000,
    temperature: 0.2,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  })

  const content = response.content[0]
  if (content.type === 'text') {
    try {
      const parsed = JSON.parse(content.text)
      return AnalysisResultSchema.parse(parsed)
    } catch (error) {
      console.error('Analysis Agent JSON parse error:', error)
      throw new Error('Failed to parse analysis result')
    }
  }

  throw new Error('Analysis Agent failed')
}

// ========================================
// Agent 2: ナレッジ抽出エージェント
// ========================================

/**
 * 分析結果から再利用可能なナレッジを抽出する
 * 温度: 0.3 (やや低温でパターン抽出)
 */
export async function knowledgeExtractionAgent(
  yamlContent: string,
  analysisResult: AnalysisResult
): Promise<KnowledgeExtraction> {
  const prompt = `あなたはLP構築のナレッジエンジニアです。YAMLテンプレートと分析結果から、再利用可能なナレッジを抽出してください。

YAMLコンテンツ:
\`\`\`yaml
${yamlContent}
\`\`\`

分析結果:
${JSON.stringify(analysisResult, null, 2)}

以下の形式で、具体的で再利用可能なナレッジを抽出してください:

各ナレッジは以下の要素を含む:
- **category**: layout / copywriting / cta / color_scheme / conversion_pattern
- **knowledgeType**: pattern / rule / best_practice / anti_pattern
- **title**: ナレッジのタイトル（簡潔に）
- **description**: 詳細な説明（具体的に）
- **examples**: 具体例（配列、オプション）
- **metrics**: 効果指標（confidence必須、estimatedCVRオプション）
- **tags**: 関連タグ（配列）
- **confidence**: 信頼度 0-100

JSON形式:
{
  "status": "success",
  "knowledge": [
    {
      "category": "layout",
      "knowledgeType": "best_practice",
      "title": "Zパターンレイアウト",
      "description": "視線誘導をZパターンで設計することで、重要情報を効率的に伝達",
      "examples": ["ヒーローセクションで左上にロゴ、右上にCTA配置"],
      "metrics": {
        "estimatedCVR": 3.2,
        "confidence": 85
      },
      "tags": ["視線誘導", "レイアウト", "UX"],
      "confidence": 85
    }
  ],
  "totalKnowledgeCount": 5,
  "categories": ["layout", "copywriting", "cta"]
}

**重要**: 少なくとも5-10個の具体的なナレッジを抽出してください。`

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 3000,
    temperature: 0.3,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  })

  const content = response.content[0]
  if (content.type === 'text') {
    try {
      const parsed = JSON.parse(content.text)
      return KnowledgeExtractionSchema.parse(parsed)
    } catch (error) {
      console.error('Knowledge Extraction Agent JSON parse error:', error)
      throw new Error('Failed to extract knowledge')
    }
  }

  throw new Error('Knowledge Extraction Agent failed')
}

// ========================================
// Agent 3: プロンプト生成エージェント
// ========================================

/**
 * ナレッジからLPセクション別の最適化プロンプトを生成する
 * 温度: 0.4 (創造的なプロンプト設計)
 */
export async function promptGenerationAgent(
  knowledge: KnowledgeItem[]
): Promise<PromptGeneration> {
  const prompt = `あなたはプロンプトエンジニアリングの専門家です。抽出されたナレッジから、LPセクション別の最適化プロンプトテンプレートを生成してください。

ナレッジ:
${JSON.stringify(knowledge, null, 2)}

以下のセクション用のプロンプトを生成:
1. hero (ヒーローセクション)
2. features (特徴・メリット)
3. pricing (価格)
4. testimonials (お客様の声)
5. faq (よくある質問)
6. cta (行動喚起)

各プロンプトは:
- **name**: プロンプト名
- **purpose**: セクション名（hero, features, etc.）
- **promptText**: 実際のプロンプトテキスト（ナレッジを組み込んだ具体的な指示）
- **knowledgeIds**: 参照したナレッジのindex（配列）
- **variables**: プロンプト内の変数名（配列）
- **temperature**: 推奨温度 0-100
- **examples**: サンプル出力（配列、オプション）

JSON形式:
{
  "status": "success",
  "prompts": [
    {
      "name": "ヒーローセクション生成プロンプト",
      "purpose": "hero",
      "promptText": "あなたは...",
      "knowledgeIds": ["0", "1", "3"],
      "variables": ["product_name", "main_benefit", "cta_text"],
      "temperature": 70,
      "examples": ["例1", "例2"]
    }
  ]
}

**重要**: 各プロンプトには具体的なナレッジを組み込み、実用的な指示を含めてください。`

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4000,
    temperature: 0.4,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  })

  const content = response.content[0]
  if (content.type === 'text') {
    try {
      const parsed = JSON.parse(content.text)
      return PromptGenerationSchema.parse(parsed)
    } catch (error) {
      console.error('Prompt Generation Agent JSON parse error:', error)
      throw new Error('Failed to generate prompts')
    }
  }

  throw new Error('Prompt Generation Agent failed')
}

// ========================================
// Team Orchestrator: チーム統括
// ========================================

export interface TeamResult {
  status: 'success' | 'error'
  analysis: AnalysisResult | null
  knowledge: KnowledgeExtraction | null
  prompts: PromptGeneration | null
  totalTokensUsed: number
  executionTimeMs: number
  errorMessage?: string
}

/**
 * 3つのエージェントをチームとして協調動作させる
 *
 * 1. Analysis Agent: YAMLを分析
 * 2. Knowledge Extraction Agent: ナレッジを抽出
 * 3. Prompt Generation Agent: プロンプトを生成
 */
export async function runKnowledgeTeam(yamlContent: string): Promise<TeamResult> {
  const startTime = Date.now()
  let totalTokensUsed = 0

  try {
    console.log('[KnowledgeTeam] Step 1/3: Analyzing YAML template...')
    const analysis = await analysisAgent(yamlContent)
    totalTokensUsed += 2000 // 推定

    console.log('[KnowledgeTeam] Step 2/3: Extracting knowledge...')
    const knowledge = await knowledgeExtractionAgent(yamlContent, analysis)
    totalTokensUsed += 3000 // 推定

    console.log('[KnowledgeTeam] Step 3/3: Generating prompts...')
    const prompts = await promptGenerationAgent(knowledge.knowledge)
    totalTokensUsed += 4000 // 推定

    const executionTimeMs = Date.now() - startTime

    console.log('[KnowledgeTeam] ✅ Team execution completed successfully')
    console.log(`[KnowledgeTeam] Extracted ${knowledge.totalKnowledgeCount} knowledge items`)
    console.log(`[KnowledgeTeam] Generated ${prompts.prompts.length} prompt templates`)
    console.log(`[KnowledgeTeam] Execution time: ${executionTimeMs}ms`)

    return {
      status: 'success',
      analysis,
      knowledge,
      prompts,
      totalTokensUsed,
      executionTimeMs,
    }
  } catch (error) {
    const executionTimeMs = Date.now() - startTime
    console.error('[KnowledgeTeam] ❌ Team execution failed:', error)

    return {
      status: 'error',
      analysis: null,
      knowledge: null,
      prompts: null,
      totalTokensUsed,
      executionTimeMs,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// ========================================
// Helper: YAMLバリデーション
// ========================================

export function validateYAML(yamlContent: string): { valid: boolean; error?: string } {
  try {
    YAML.parse(yamlContent)
    return { valid: true }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid YAML',
    }
  }
}
