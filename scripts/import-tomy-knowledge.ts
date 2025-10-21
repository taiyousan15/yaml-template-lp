import { db } from '../lib/db'
import { lpKnowledge, promptTemplates } from '../drizzle/schema'
import { TOMY_STYLE_KNOWLEDGE } from '../lib/tomy-style-agent'

/**
 * TOMYスタイル分析結果をナレッジベースにインポート
 *
 * 実行方法:
 * npx tsx scripts/import-tomy-knowledge.ts
 */

async function importTOMYKnowledge() {
  console.log('🚀 TOMYスタイルナレッジのインポート開始...')

  try {
    // 1. ヘッドラインパターンをインポート
    console.log('📝 ヘッドラインパターンをインポート中...')

    const headlinePatterns = [
      {
        category: 'copywriting' as const,
        knowledgeType: 'best_practice' as const,
        title: '数値×時間×結果の3点セット（ヘッドライン黄金律）',
        description: `ヘッドラインは「[期間]で[端数付き数値]を達成した[具体的な人物属性]の[感情ワード]」の形式で構成する。
例: 「1ヶ月で89.4万円を稼いだ34歳元ニートの奇跡」

ルール:
- 数値は必ず端数まで記載（信憑性UP）
- 期間を明示（即効性の証明）
- 人物属性を具体化（自分事化）`,
        examples: TOMY_STYLE_KNOWLEDGE.HEADLINE_PATTERNS.NUMERICAL_IMPACT.examples,
        metrics: {
          estimatedCVR: 4.5,
          confidence: TOMY_STYLE_KNOWLEDGE.HEADLINE_PATTERNS.NUMERICAL_IMPACT.confidenceScore,
        },
        tags: ['headline', 'numerical', 'urgency', 'specificity'],
        confidence: TOMY_STYLE_KNOWLEDGE.HEADLINE_PATTERNS.NUMERICAL_IMPACT.confidenceScore,
      },
      {
        category: 'copywriting' as const,
        knowledgeType: 'best_practice' as const,
        title: 'Before→Afterの劇的対比',
        description: `「[Before状態]が[After状態]に（[倍率]の[変化内容]）」の形式で劇的な変化を示す。
例: 「10時間かかっていた作業が5分に（120倍の効率化）」

ルール:
- BeforeとAfterは具体的な数値で
- 倍率を明示して衝撃を増幅
- 極端な対比ほど効果的（10倍以上推奨）`,
        examples: TOMY_STYLE_KNOWLEDGE.HEADLINE_PATTERNS.DRAMATIC_CONTRAST.examples,
        metrics: {
          estimatedCVR: 4.2,
          confidence: TOMY_STYLE_KNOWLEDGE.HEADLINE_PATTERNS.DRAMATIC_CONTRAST.confidenceScore,
        },
        tags: ['contrast', 'before-after', 'transformation'],
        confidence: TOMY_STYLE_KNOWLEDGE.HEADLINE_PATTERNS.DRAMATIC_CONTRAST.confidenceScore,
      },
      {
        category: 'cta' as const,
        knowledgeType: 'best_practice' as const,
        title: '緊急性×希少性の同時訴求（TOMYスタイル出現率100%）',
        description: `「[時間的制限]×[数量的制限]＋[失うものの明示]」で即断を促す。
例: 「48時間限定・先着30名のみ（逃すと6ヶ月待ち）」

ルール:
- 時間と数量の両方を制限
- 失うもの（機会損失）を明示
- TOMYスタイルでは100%出現（一般LPは62%）`,
        examples: TOMY_STYLE_KNOWLEDGE.HEADLINE_PATTERNS.URGENCY_SCARCITY.examples,
        metrics: {
          estimatedCVR: 5.1,
          confidence: TOMY_STYLE_KNOWLEDGE.HEADLINE_PATTERNS.URGENCY_SCARCITY.confidenceScore,
        },
        tags: ['urgency', 'scarcity', 'cta', 'fomo'],
        confidence: TOMY_STYLE_KNOWLEDGE.HEADLINE_PATTERNS.URGENCY_SCARCITY.confidenceScore,
      },
    ]

    for (const pattern of headlinePatterns) {
      await db.insert(lpKnowledge).values(pattern)
    }

    console.log(`✅ ヘッドラインパターン ${headlinePatterns.length}件をインポート`)

    // 2. ベストプラクティスをインポート
    console.log('📝 ベストプラクティスをインポート中...')

    const bestPractices = [
      {
        category: 'copywriting' as const,
        knowledgeType: 'best_practice' as const,
        title: '数値の端数化（信憑性の黄金律）',
        description: `数値は必ず端数まで記載することで信憑性が劇的に向上する。

Bad: 「100万円達成」「約50%の成約率」「売上が5倍に」
Good: 「89.4万円達成」「成約率46%」「売上419.8%成長（4.2倍）」

端数があると「作り話でない」と感じられる心理効果。`,
        examples: TOMY_STYLE_KNOWLEDGE.BEST_PRACTICES.DECIMAL_PRECISION.good,
        metrics: {
          estimatedCVR: 4.8,
          confidence: TOMY_STYLE_KNOWLEDGE.BEST_PRACTICES.DECIMAL_PRECISION.confidenceScore,
        },
        tags: ['numerical', 'credibility', 'specificity'],
        confidence: TOMY_STYLE_KNOWLEDGE.BEST_PRACTICES.DECIMAL_PRECISION.confidenceScore,
      },
      {
        category: 'copywriting' as const,
        knowledgeType: 'best_practice' as const,
        title: '時間×倍率の明示',
        description: `時間短縮はBefore→After＋倍率計算で衝撃を数値化する。

Bad: 「効率化しました」「時短できます」
Good: 「10時間→5分（120倍の効率化）」「2年→60分（17,520倍）」

倍率を計算して明示することで変化の大きさを可視化。`,
        examples: TOMY_STYLE_KNOWLEDGE.BEST_PRACTICES.TIME_MULTIPLIER.good,
        metrics: {
          estimatedCVR: 4.6,
          confidence: TOMY_STYLE_KNOWLEDGE.BEST_PRACTICES.TIME_MULTIPLIER.confidenceScore,
        },
        tags: ['time-efficiency', 'contrast', 'quantification'],
        confidence: TOMY_STYLE_KNOWLEDGE.BEST_PRACTICES.TIME_MULTIPLIER.confidenceScore,
      },
      {
        category: 'copywriting' as const,
        knowledgeType: 'best_practice' as const,
        title: '感情の極限描写',
        description: `感情表現は生死レベルの恐怖＋具体的な数値で描写する。

Bad: 「売上が伸びない」「もう限界です」
Good: 「首吊って死んでいたかもしれません」「水道が止まる極限状態」「借金120万円」

抽象的な表現ではなく、具体的な状況・数値で感情を揺さぶる。`,
        examples: TOMY_STYLE_KNOWLEDGE.BEST_PRACTICES.EXTREME_EMOTION.good,
        metrics: {
          estimatedCVR: 4.7,
          confidence: TOMY_STYLE_KNOWLEDGE.BEST_PRACTICES.EXTREME_EMOTION.confidenceScore,
        },
        tags: ['emotion', 'storytelling', 'problem'],
        confidence: TOMY_STYLE_KNOWLEDGE.BEST_PRACTICES.EXTREME_EMOTION.confidenceScore,
      },
      {
        category: 'layout' as const,
        knowledgeType: 'pattern' as const,
        title: 'LP構成8要素パターン（全LP共通）',
        description: `全13LP分析で発見された共通構成パターン。

1. キャッチコピー（0-10%）: 注目獲得、問題提起
2. 問題提起（5-20%）: 共感形成、痛みの認識
3. 実績・権威（20-60%）: 信頼構築
4. 解決策提示（30-70%）: 希望の提示
5. ベネフィット列挙（40-70%）: 価値の可視化
6. 社会証明（50-80%）: 信頼性の強化
7. CTA（複数箇所）: 行動喚起
8. 緊急性・希少性（80-100%）: 即断促進

注: 緊急性・希少性はTOMYスタイル100%、一般LP62%`,
        examples: TOMY_STYLE_KNOWLEDGE.STRUCTURE_ELEMENTS.elements.map((e) => e.name),
        metrics: {
          estimatedCVR: 4.3,
          confidence: 92,
        },
        tags: ['structure', 'layout', 'framework'],
        confidence: 92,
      },
    ]

    for (const practice of bestPractices) {
      await db.insert(lpKnowledge).values(practice)
    }

    console.log(`✅ ベストプラクティス ${bestPractices.length}件をインポート`)

    // 3. キラーワードをインポート
    console.log('📝 キラーワードをインポート中...')

    const killerWordKnowledge = {
      category: 'copywriting' as const,
      knowledgeType: 'pattern' as const,
      title: 'キラーワードTOP30（出現頻度×心理効果）',
      description: `13LP横断分析で発見された頻出キラーワードと心理効果。

【数値系】
- 自動化（12/13 LP）: 労働からの解放
- 〇〇万円/〇億円（13/13 LP）: 経済的成功の可視化
- AI（9/13 LP）: 最新性、効率化
- 〜倍（9/13 LP）: 劇的変化
- 売上（12/13 LP）: 経済的成果

【感情系】
恐怖: 首吊って死んでいた、借金120万円、水道が止まる
希望: 日給5000万円、セールス0秒、労働ゼロで70億円

【時間効率系】
10時間→5分（120倍）、2年→60分（17,520倍）

【自動化系】
自動化、仕組み化、AI、ファネル、テンプレート`,
      examples: [
        ...TOMY_STYLE_KNOWLEDGE.KILLER_WORDS.NUMERICAL.top,
        ...TOMY_STYLE_KNOWLEDGE.KILLER_WORDS.AUTOMATION.keywords,
      ],
      metrics: {
        estimatedCVR: 4.4,
        confidence: 94,
      },
      tags: ['keywords', 'emotional-trigger', 'conversion'],
      confidence: 94,
    }

    await db.insert(lpKnowledge).values(killerWordKnowledge)

    console.log('✅ キラーワード辞典をインポート')

    // 4. プロンプトテンプレートを生成
    console.log('📝 プロンプトテンプレートを生成中...')

    const promptTemplatesSeed = [
      {
        name: 'TOMYスタイル ヒーローセクション生成',
        purpose: 'hero' as const,
        promptText: `TOMYスタイル黄金律に従ってヒーローセクションを生成してください。

必須要素:
1. 数値×時間×結果の3点セット
2. Before→Afterの劇的対比（10倍以上）
3. 端数付き数値（89.4万円、成約率53%など）
4. 感情の極限描写

テンプレート: "[期間]で[端数付き数値]を達成した[具体的な人物属性]の[感情ワード]"

例:
- 「1ヶ月で89.4万円を稼いだ34歳元ニートの奇跡」
- 「45分のプレゼンで成約率53%を叩き出したコンサルタントの秘密」

変数: {{product_name}}, {{main_benefit}}, {{target_audience}}`,
        knowledgeIds: [],
        variables: { vars: ['product_name', 'main_benefit', 'target_audience'] },
        temperature: 80,
        examples: {
          items: TOMY_STYLE_KNOWLEDGE.HEADLINE_PATTERNS.NUMERICAL_IMPACT.examples,
        },
        version: 1,
        isActive: true,
      },
      {
        name: 'TOMYスタイル CTA生成（緊急性×希少性）',
        purpose: 'cta' as const,
        promptText: `TOMYスタイル黄金律に従ってCTAを生成してください。

必須要素:
1. 時間的制限（48時間、本日23:59まで）
2. 数量的制限（先着30名、残り3席）
3. 失うものの明示（逃すと6ヶ月待ち）

テンプレート: "[時間的制限]×[数量的制限]＋[失うものの明示]"

例:
- 「48時間限定・先着30名のみ（逃すと6ヶ月待ち）」
- 「本日23:59まで・残り3席」

変数: {{cta_text}}, {{time_limit}}, {{quantity_limit}}`,
        knowledgeIds: [],
        variables: { vars: ['cta_text', 'time_limit', 'quantity_limit'] },
        temperature: 70,
        examples: { items: TOMY_STYLE_KNOWLEDGE.HEADLINE_PATTERNS.URGENCY_SCARCITY.examples },
        version: 1,
        isActive: true,
      },
    ]

    for (const template of promptTemplatesSeed) {
      await db.insert(promptTemplates).values(template)
    }

    console.log(`✅ プロンプトテンプレート ${promptTemplatesSeed.length}件をインポート`)

    console.log('\n🎉 TOMYスタイルナレッジのインポート完了！')
    console.log(`
📊 インポート結果:
- ヘッドラインパターン: ${headlinePatterns.length}件
- ベストプラクティス: ${bestPractices.length}件
- キラーワード辞典: 1件
- プロンプトテンプレート: ${promptTemplatesSeed.length}件
---
合計: ${headlinePatterns.length + bestPractices.length + 1 + promptTemplatesSeed.length}件
`)
  } catch (error) {
    console.error('❌ インポートエラー:', error)
    throw error
  }
}

// 実行
importTOMYKnowledge()
  .then(() => {
    console.log('✅ 処理完了')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ 処理失敗:', error)
    process.exit(1)
  })
