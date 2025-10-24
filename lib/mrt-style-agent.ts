import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { createMessageWithRetry } from './anthropic-retry'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

/**
 * MrTスタイル分析結果から抽出した「売れるLP」の黄金パターン
 *
 * 分析ソース: 13個のLP横断分析
 * - 01_全LP共通パターン分析.md
 * - 04_キラーワード・表現総合辞典.md
 * - 05_ベストプラクティス集.md
 */

// ========================================
// MrTスタイル コアナレッジ
// ========================================

export const MrT_STYLE_KNOWLEDGE = {
  // ヘッドライン構築の黄金律
  HEADLINE_PATTERNS: {
    // パターン1: 数値×時間×結果の3点セット
    NUMERICAL_IMPACT: {
      template: '[期間]で[端数付き数値]を達成した[具体的な人物属性]の[感情ワード]',
      examples: [
        '1ヶ月で89.4万円を稼いだ34歳元ニートの奇跡',
        '45分のプレゼンで成約率53%を叩き出したコンサルタントの秘密',
        '3ヶ月で売上419.8%UP（4.2倍）を実現した元会社員の逆転劇',
      ],
      rules: [
        '数値は必ず端数まで記載（信憑性UP）',
        '期間を明示（即効性の証明）',
        '人物属性を具体化（自分事化）',
      ],
      confidenceScore: 95,
    },

    // パターン2: Before→Afterの劇的対比
    DRAMATIC_CONTRAST: {
      template: '[Before状態]が[After状態]に（[倍率]の[変化内容]）',
      examples: [
        '10時間かかっていた作業が5分に（120倍の効率化）',
        '週60時間の労働が週18時間に（3.3倍の時短）',
        '広告費月100万円が月37.2万円に（62.8%削減）',
      ],
      rules: [
        'BeforeとAfterは具体的な数値で',
        '倍率を明示して衝撃を増幅',
        '極端な対比ほど効果的（10倍以上推奨）',
      ],
      confidenceScore: 92,
    },

    // パターン3: 緊急性×希少性の同時訴求
    URGENCY_SCARCITY: {
      template: '[時間的制限]×[数量的制限]＋[失うものの明示]',
      examples: [
        '48時間限定・先着30名のみ',
        '本日23:59まで・残り3席',
        '今月末まで・限定20社のみ（逃すと6ヶ月待ち）',
      ],
      rules: [
        '時間と数量の両方を制限',
        '失うもの（機会損失）を明示',
        'MrTスタイルの出現率: 100%（一般LP: 62%）',
      ],
      confidenceScore: 98,
    },
  },

  // キラーワードTOP30（出現頻度×心理効果スコア）
  KILLER_WORDS: {
    NUMERICAL: {
      top: ['自動化', '〇〇万円/〇億円', 'AI', '〜倍', '売上'],
      rules: [
        '端数記載の原則: 「100万円」→「89.4万円」',
        '巨額実績: 日給5000万円、年商70億円レベル',
        '成約率は必ず端数: 「50%」→「46%」「53%」',
      ],
      confidenceScore: 96,
    },

    EMOTION: {
      fear: [
        '首吊って死んでいたかもしれません',
        '借金120万円',
        '水道が止まる極限状態',
        '血反吐を吐きながら',
      ],
      hope: [
        '日給5000万円',
        'セールス0秒',
        '1ヶ月で89.4万円の奇跡',
        '労働ゼロで70億円',
      ],
      confidenceScore: 94,
    },

    TIME_EFFICIENCY: {
      patterns: [
        '10時間→5分（120倍）',
        '2年→60分（17,520倍）',
        '3ヶ月→1日（90倍）',
      ],
      rules: ['Before→After形式', '倍率を計算して明示', '極端な対比ほど強力'],
      confidenceScore: 93,
    },

    AUTOMATION: {
      keywords: ['自動化', '仕組み化', 'AI', 'ファネル', 'テンプレート', 'システム'],
      contextPatterns: [
        '〜が自動で〜してくれる',
        '仕組み化して〜から解放',
        'AI活用で〜が不要に',
      ],
      confidenceScore: 91,
    },
  },

  // 8要素構成パターン（全LP共通）
  STRUCTURE_ELEMENTS: {
    elements: [
      {
        name: 'キャッチコピー',
        position: 'ヘッダー（0-10%）',
        occurrence: '100%',
        purpose: '注目獲得、問題提起',
      },
      {
        name: '問題提起',
        position: 'オープニング（5-20%）',
        occurrence: '92%',
        purpose: '共感形成、痛みの認識',
      },
      {
        name: '実績・権威',
        position: 'ボディ（20-60%）',
        occurrence: '100%',
        purpose: '信頼構築',
      },
      {
        name: '解決策提示',
        position: 'ボディ（30-70%）',
        occurrence: '100%',
        purpose: '希望の提示',
      },
      {
        name: 'ベネフィット列挙',
        position: 'ボディ（40-70%）',
        occurrence: '100%',
        purpose: '価値の可視化',
      },
      {
        name: '社会証明',
        position: 'ボディ（50-80%）',
        occurrence: '85%',
        purpose: '信頼性の強化',
      },
      {
        name: 'CTA',
        position: '複数箇所',
        occurrence: '100%',
        purpose: '行動喚起',
      },
      {
        name: '緊急性・希少性',
        position: 'クロージング（80-100%）',
        occurrence: 'MrT: 100%, 一般LP: 62%',
        purpose: '即断促進',
      },
    ],
  },

  // ベストプラクティス
  BEST_PRACTICES: {
    // #1: 数値の端数化
    DECIMAL_PRECISION: {
      bad: ['100万円達成', '約50%の成約率', '売上が5倍に'],
      good: ['89.4万円達成', '成約率46%', '売上419.8%成長（4.2倍）'],
      rule: '端数があると信憑性が劇的に向上（作り話でないと感じる）',
      confidenceScore: 97,
    },

    // #2: 時間×倍率の明示
    TIME_MULTIPLIER: {
      bad: ['効率化しました', '時短できます'],
      good: ['10時間→5分（120倍の効率化）', '2年→60分（17,520倍）'],
      rule: 'Before→After＋倍率計算で衝撃を数値化',
      confidenceScore: 95,
    },

    // #3: 感情の極限描写
    EXTREME_EMOTION: {
      bad: ['売上が伸びない', 'もう限界です'],
      good: [
        '首吊って死んでいたかもしれません',
        '水道が止まる極限状態',
        '借金120万円',
      ],
      rule: '生死レベルの恐怖＋具体的な数値で感情を揺さぶる',
      confidenceScore: 94,
    },

    // #4: 対比の極端化
    EXTREME_CONTRAST: {
      bad: ['売上向上', '時間が減りました'],
      good: ['地獄の2年→天国の60分', '労働ゼロで70億円', '日給5000万円'],
      rule: '最悪のBeforeと最高のAfterを対比させ、倍率は10倍以上',
      confidenceScore: 93,
    },
  },
}

// ========================================
// MrTスタイル強化エージェント
// ========================================

export const MrTStylePromptSchema = z.object({
  headline: z.string(),
  subheadline: z.string().optional(),
  sections: z.array(
    z.object({
      section: z.enum(['hero', 'problem', 'solution', 'benefits', 'proof', 'cta', 'urgency']),
      html: z.string(),
      keywords_used: z.array(z.string()),
      patterns_applied: z.array(z.string()),
    })
  ),
  metadata: z.object({
    mrt_score: z.number().min(0).max(100), // MrTスタイル適用度
    killer_words_count: z.number(),
    contrast_multiplier: z.number().optional(),
  }),
})

export type MrTStylePrompt = z.infer<typeof MrTStylePromptSchema>

/**
 * MrTスタイル エージェント
 *
 * 13LP分析から抽出した黄金パターンを適用してLP文案を生成
 * 温度: 0.7-0.9（創造性と再現性のバランス）
 */
export async function mrtStyleAgent(options: {
  productName: string
  targetAudience: string
  mainBenefit: string
  beforeState: string
  afterState: string
  credibility: string
  temperature?: number
}): Promise<MrTStylePrompt> {
  const { productName, targetAudience, mainBenefit, beforeState, afterState, credibility, temperature = 0.8 } = options

  const prompt = `あなたは13個のトップ成約率LPを分析した「MrTスタイル」の専門家です。以下のナレッジを100%活用してLP文案を生成してください。

# 製品情報
- 製品名: ${productName}
- ターゲット: ${targetAudience}
- メインベネフィット: ${mainBenefit}
- Before状態: ${beforeState}
- After状態: ${afterState}
- 信頼性要素: ${credibility}

# 必須適用パターン（MrTスタイル黄金律）

## 1. ヘッドライン構築の3点セット
テンプレート: "[期間]で[端数付き数値]を達成した[具体的な人物属性]の[感情ワード]"
例: "1ヶ月で89.4万円を稼いだ34歳元ニートの奇跡"

**ルール**:
- 数値は必ず端数まで記載（89.4万円、成約率53%、など）
- 期間を明示（1ヶ月、45分、3ヶ月）
- 人物属性を具体化（34歳元ニート、元会社員）

## 2. Before→Afterの劇的対比
テンプレート: "[Before状態]が[After状態]に（[倍率]の[変化内容]）"
例: "10時間かかっていた作業が5分に（120倍の効率化）"

**ルール**:
- BeforeとAfterは具体的な数値で
- 倍率を明示（10倍以上推奨）
- 極端な対比ほど効果的

## 3. 緊急性×希少性の同時訴求（MrTスタイル出現率100%）
テンプレート: "[時間的制限]×[数量的制限]＋[失うものの明示]"
例: "48時間限定・先着30名のみ（逃すと6ヶ月待ち）"

## 4. キラーワードTOP30の活用
感情系:
- 恐怖: "首吊って死んでいたかもしれません", "借金120万円", "水道が止まる極限状態"
- 希望: "日給5000万円", "労働ゼロで70億円", "1ヶ月で89.4万円の奇跡"

時間効率:
- "10時間→5分（120倍）", "2年→60分（17,520倍）"

自動化:
- "自動化", "仕組み化", "AI", "ファネル", "セールス0秒"

## 5. 8要素構成（必須）
1. キャッチコピー（0-10%）
2. 問題提起（5-20%）
3. 実績・権威（20-60%）
4. 解決策提示（30-70%）
5. ベネフィット列挙（40-70%）
6. 社会証明（50-80%）
7. CTA（複数箇所）
8. 緊急性・希少性（80-100%）

# 出力形式（JSON）

{
  "headline": "ヘッドライン（3点セット適用）",
  "subheadline": "サブヘッドライン（Before→After対比）",
  "sections": [
    {
      "section": "hero",
      "html": "<div>HTMLコンテンツ</div>",
      "keywords_used": ["使用したキラーワード"],
      "patterns_applied": ["適用したパターン名"]
    },
    ... （8セクション全て）
  ],
  "metadata": {
    "mrt_score": 95,
    "killer_words_count": 12,
    "contrast_multiplier": 120
  }
}

**重要**: 全てのベストプラクティスを適用し、mrt_scoreが90点以上になるように作成してください。`

  const response = await createMessageWithRetry(anthropic, {
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4000,
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
    throw new Error('MrTStyleAgent failed to generate')
  }

  try {
    const parsed = JSON.parse(content.text)
    return MrTStylePromptSchema.parse(parsed)
  } catch (error) {
    console.error('MrTStyleAgent JSON parse error:', error)
    throw new Error('Failed to parse MrTStyle output')
  }
}

/**
 * MrTスタイル スコアリング
 *
 * 生成されたLP文案がどれだけMrTスタイルに準拠しているかを評価
 */
export function scoreMrTStyle(lpContent: string): {
  score: number
  breakdown: {
    numerical_precision: number // 端数の使用
    time_contrast: number // Before→After対比
    urgency_scarcity: number // 緊急性×希少性
    killer_words: number // キラーワード使用数
    extreme_emotion: number // 感情の極限描写
  }
  recommendations: string[]
} {
  const breakdown = {
    numerical_precision: 0,
    time_contrast: 0,
    urgency_scarcity: 0,
    killer_words: 0,
    extreme_emotion: 0,
  }

  const recommendations: string[] = []

  // 端数チェック（89.4万円、53%など）
  const decimalNumbers = lpContent.match(/\d+\.\d+/g)
  if (decimalNumbers && decimalNumbers.length >= 3) {
    breakdown.numerical_precision = 20
  } else {
    recommendations.push('数値に端数を追加（例: 100万円→89.4万円）')
  }

  // Before→After対比チェック
  const hasTimeContrast = /→/.test(lpContent) || /から.*に/.test(lpContent)
  if (hasTimeContrast) {
    breakdown.time_contrast = 20
  } else {
    recommendations.push('Before→After対比を追加（例: 10時間→5分）')
  }

  // 緊急性×希少性チェック
  const hasUrgency = /(限定|先着|本日|今だけ|残り\d+)/.test(lpContent)
  if (hasUrgency) {
    breakdown.urgency_scarcity = 20
  } else {
    recommendations.push('緊急性×希少性を追加（例: 48時間限定・先着30名）')
  }

  // キラーワード使用数
  const killerWords = [
    '自動化',
    '仕組み化',
    'AI',
    '売上',
    '不要',
    '秘密',
    '倍',
    '限定',
    '無料',
    'テンプレート',
  ]
  let killerWordCount = 0
  killerWords.forEach((word) => {
    if (lpContent.includes(word)) killerWordCount++
  })
  breakdown.killer_words = Math.min((killerWordCount / 10) * 20, 20)

  if (killerWordCount < 5) {
    recommendations.push(`キラーワードを追加（現在: ${killerWordCount}/10）`)
  }

  // 感情の極限描写
  const extremeEmotions = ['極限', '地獄', '天国', '奇跡', '絶望', '逆転']
  let emotionCount = 0
  extremeEmotions.forEach((word) => {
    if (lpContent.includes(word)) emotionCount++
  })
  breakdown.extreme_emotion = Math.min((emotionCount / 3) * 20, 20)

  if (emotionCount < 2) {
    recommendations.push('感情の極限描写を追加（例: 地獄の2年→天国の60分）')
  }

  const score =
    breakdown.numerical_precision +
    breakdown.time_contrast +
    breakdown.urgency_scarcity +
    breakdown.killer_words +
    breakdown.extreme_emotion

  return {
    score,
    breakdown,
    recommendations,
  }
}
