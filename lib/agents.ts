import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { createMessageWithRetry } from './anthropic-retry'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// AgentOutputSchema (Zod)
export const AgentOutputSchema = z.object({
  status: z.enum(['success', 'error']),
  title: z.string().optional(),
  lp_sections: z.array(
    z.object({
      section: z.string(),
      goal: z.string(),
      tone: z.string(),
      cta_text: z.string().optional(),
      html: z.string(),
    })
  ),
  generation_metadata: z.object({
    temperature_used: z.number(),
    intensity_level: z.number(),
    tokens_in: z.number(),
    tokens_out: z.number(),
  }),
})

export type AgentOutput = z.infer<typeof AgentOutputSchema>

export type Tone = 'casual' | 'sincere' | 'authoritative' | 'urgent' | 'neutral'

export interface GenerateOptions {
  templateVariables: Record<string, string>
  temperature?: number // 0.0 - 2.0
  intensity?: number // 1 - 10 (煽り度)
  tone?: Tone
  useKnowledgeBase?: boolean // ナレッジベースを活用するか
  knowledgeContext?: string[] // 特定のナレッジIDを指定
}

/**
 * VisionAgent: レイアウト役割推定（低温0.2）
 */
export async function visionAgent(imageBlocks: any[]): Promise<any> {
  const prompt = `以下の画像ブロックを分析し、各ブロックの役割（headline, subhead, cta, body等）を推定してください。

ブロック情報:
${JSON.stringify(imageBlocks, null, 2)}

JSON形式で返してください。`

  const response = await createMessageWithRetry(anthropic, {
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 800,
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
      return JSON.parse(content.text)
    } catch {
      return { blocks: imageBlocks }
    }
  }

  return { blocks: imageBlocks }
}

/**
 * Agent1: ドラフト台本作成
 */
export async function agent1Draft(
  variables: Record<string, string>,
  temperature: number,
  intensity: number,
  tone: Tone
): Promise<string> {
  const toneDescriptions: Record<Tone, string> = {
    casual: 'カジュアルで親しみやすいトーンで書いてください。',
    sincere: '誠実で信頼できるトーンで書いてください。',
    authoritative: '権威的で専門的なトーンで書いてください。',
    urgent: '緊急性を感じさせるトーンで書いてください。',
    neutral: '中立的で客観的なトーンで書いてください。',
  }

  const intensityGuide =
    intensity >= 8
      ? '非常に強い煽り表現を使用してください。'
      : intensity >= 5
      ? '適度な煽り表現を使用してください。'
      : '控えめな表現を使用してください。'

  const prompt = `あなたはLPのコピーライターです。以下の変数を使用して、魅力的なLPの文案を作成してください。

変数:
${JSON.stringify(variables, null, 2)}

要件:
- ${toneDescriptions[tone]}
- ${intensityGuide}
- 各セクション（ヒーロー、特徴、FAQ、CTA）を含めてください
- 読者の興味を引く構成にしてください

JSON形式で以下のように返してください:
{
  "sections": [
    {
      "section": "hero",
      "goal": "目標",
      "tone": "トーン",
      "cta_text": "CTAテキスト",
      "html": "HTMLコンテンツ"
    }
  ]
}`

  const response = await createMessageWithRetry(anthropic, {
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1200,
    temperature: temperature,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  })

  const content = response.content[0]
  if (content.type === 'text') {
    return content.text
  }

  throw new Error('Agent1 failed to generate draft')
}

/**
 * Agent2: 体裁整形・禁則チェック
 */
export async function agent2Refine(draftText: string): Promise<AgentOutput> {
  const prompt = `以下のLPドラフトを整形し、禁則チェックを行い、JSON形式で返してください。

ドラフト:
${draftText}

要件:
- HTMLタグの正確性を確認
- 不適切な表現や誤字脱字を修正
- 法的に問題のある表現を修正
- JSONスキーマに準拠させる

JSON形式:
{
  "status": "success",
  "title": "LPタイトル",
  "lp_sections": [
    {
      "section": "セクション名",
      "goal": "目標",
      "tone": "トーン",
      "cta_text": "CTAテキスト",
      "html": "HTMLコンテンツ"
    }
  ],
  "generation_metadata": {
    "temperature_used": 0.7,
    "intensity_level": 5,
    "tokens_in": 100,
    "tokens_out": 200
  }
}`

  const response = await createMessageWithRetry(anthropic, {
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 800,
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

      // トークン数を追加
      parsed.generation_metadata = {
        ...parsed.generation_metadata,
        tokens_in: response.usage.input_tokens,
        tokens_out: response.usage.output_tokens,
      }

      // バリデーション
      return AgentOutputSchema.parse(parsed)
    } catch (error) {
      console.error('Agent2 JSON parse error:', error)
      throw new Error('Agent2 failed to refine draft')
    }
  }

  throw new Error('Agent2 failed to refine draft')
}

/**
 * LP文案生成の完全パイプライン
 */
export async function generateLPCopy(options: GenerateOptions): Promise<AgentOutput> {
  const { templateVariables, temperature = 0.7, intensity = 5, tone = 'neutral' } = options

  try {
    // Agent1: ドラフト作成
    const draft = await agent1Draft(templateVariables, temperature, intensity, tone)

    // Agent2: 整形
    const refined = await agent2Refine(draft)

    return refined
  } catch (error) {
    console.error('LP copy generation error:', error)
    throw error
  }
}

/**
 * A/Bバリアント生成（温度+0.2、煽り度+2）
 */
export async function generateABVariant(
  originalOptions: GenerateOptions
): Promise<AgentOutput> {
  const variantOptions: GenerateOptions = {
    ...originalOptions,
    temperature: Math.min((originalOptions.temperature || 0.7) + 0.2, 2.0),
    intensity: Math.min((originalOptions.intensity || 5) + 2, 10),
  }

  return await generateLPCopy(variantOptions)
}

/**
 * ナレッジベース強化版: 蓄積されたナレッジを活用してLPを生成
 *
 * ナレッジベースから取得した「売れるパターン」を組み込んでプロンプトを強化
 */
export async function generateLPWithKnowledge(
  options: GenerateOptions,
  knowledgeItems?: Array<{
    title: string
    description: string
    category: string
    examples?: any
  }>
): Promise<AgentOutput> {
  const { templateVariables, temperature = 0.7, intensity = 5, tone = 'neutral' } = options

  // ナレッジを統合したプロンプト強化
  const knowledgeContext = knowledgeItems
    ? `

## 🎯 適用するベストプラクティス（ナレッジベースより）

以下の実績あるパターンを参考にLPを作成してください:

${knowledgeItems
  .map(
    (k, i) => `
### ${i + 1}. ${k.title} (${k.category})
${k.description}
${k.examples ? `例: ${JSON.stringify(k.examples)}` : ''}
`
  )
  .join('\n')}

**重要**: これらのナレッジは実際に効果が実証されたパターンです。可能な限り組み込んでください。
`
    : ''

  const toneDescriptions: Record<Tone, string> = {
    casual: 'カジュアルで親しみやすいトーンで書いてください。',
    sincere: '誠実で信頼できるトーンで書いてください。',
    authoritative: '権威的で専門的なトーンで書いてください。',
    urgent: '緊急性を感じさせるトーンで書いてください。',
    neutral: '中立的で客観的なトーンで書いてください。',
  }

  const intensityGuide =
    intensity >= 8
      ? '非常に強い煽り表現を使用してください。'
      : intensity >= 5
      ? '適度な煽り表現を使用してください。'
      : '控えめな表現を使用してください。'

  const prompt = `あなたは売れるLPのコピーライティング専門家です。蓄積されたナレッジベースを活用して、高コンバージョンのLP文案を作成してください。

変数:
${JSON.stringify(templateVariables, null, 2)}

要件:
- ${toneDescriptions[tone]}
- ${intensityGuide}
- 各セクション（ヒーロー、特徴、FAQ、CTA）を含めてください
- 読者の興味を引く構成にしてください

${knowledgeContext}

JSON形式で以下のように返してください:
{
  "sections": [
    {
      "section": "hero",
      "goal": "目標",
      "tone": "トーン",
      "cta_text": "CTAテキスト",
      "html": "HTMLコンテンツ"
    }
  ]
}`

  const response = await createMessageWithRetry(anthropic, {
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1500,
    temperature: temperature,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  })

  const content = response.content[0]
  if (content.type !== 'text') {
    throw new Error('Agent1 failed to generate draft with knowledge')
  }

  const draftText = content.text

  // Agent2で整形
  const refined = await agent2Refine(draftText)

  return refined
}
