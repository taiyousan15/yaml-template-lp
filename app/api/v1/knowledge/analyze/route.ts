import { NextRequest, NextResponse } from 'next/server'
import { runKnowledgeTeam, validateYAML } from '@/lib/knowledge-team'
import { db } from '@/lib/db'
import { templates, lpKnowledge, promptTemplates, knowledgeAnalysisJobs } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'

/**
 * POST /api/v1/knowledge/analyze
 *
 * YAMLテンプレートをアップロードして、ナレッジチームで分析・抽出・プロンプト生成
 *
 * Body:
 * {
 *   "templateId": "uuid", // 既存テンプレートID
 *   "yamlContent": "string" // または直接YAML文字列
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { templateId, yamlContent: directYaml } = body

    let yamlContent: string

    // テンプレートIDから取得 or 直接YAML
    if (templateId) {
      const template = await db
        .select()
        .from(templates)
        .where(eq(templates.id, templateId))
        .limit(1)

      if (!template || template.length === 0) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 })
      }

      yamlContent = template[0].yaml
    } else if (directYaml) {
      yamlContent = directYaml
    } else {
      return NextResponse.json(
        { error: 'Either templateId or yamlContent is required' },
        { status: 400 }
      )
    }

    // YAMLバリデーション
    const validation = validateYAML(yamlContent)
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Invalid YAML', details: validation.error },
        { status: 400 }
      )
    }

    // ジョブ作成
    const [job] = await db
      .insert(knowledgeAnalysisJobs)
      .values({
        templateId: templateId || null,
        status: 'pending',
        stage: 'yaml_analysis',
        progressPercent: 0,
      })
      .returning()

    // バックグラウンドで非同期実行（本来はQueue/Worker推奨）
    processKnowledgeAnalysis(job.id, templateId, yamlContent).catch((error) => {
      console.error('[KnowledgeAPI] Background processing error:', error)
    })

    return NextResponse.json({
      status: 'success',
      message: 'Knowledge analysis started',
      jobId: job.id,
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

/**
 * バックグラウンド処理: ナレッジチーム実行 & DB保存
 */
async function processKnowledgeAnalysis(
  jobId: string,
  templateId: string | undefined,
  yamlContent: string
) {
  try {
    // ステータス更新: analyzing
    await db
      .update(knowledgeAnalysisJobs)
      .set({ status: 'analyzing', stage: 'yaml_analysis', progressPercent: 10 })
      .where(eq(knowledgeAnalysisJobs.id, jobId))

    // ナレッジチーム実行
    const result = await runKnowledgeTeam(yamlContent)

    if (result.status === 'error') {
      // エラー記録
      await db
        .update(knowledgeAnalysisJobs)
        .set({
          status: 'failed',
          errorMessage: result.errorMessage,
          progressPercent: 0,
        })
        .where(eq(knowledgeAnalysisJobs.id, jobId))
      return
    }

    // ステータス更新: extracting
    await db
      .update(knowledgeAnalysisJobs)
      .set({ status: 'extracting', stage: 'knowledge_extraction', progressPercent: 50 })
      .where(eq(knowledgeAnalysisJobs.id, jobId))

    // ナレッジをDBに保存
    if (result.knowledge && result.knowledge.knowledge.length > 0) {
      for (const k of result.knowledge.knowledge) {
        await db.insert(lpKnowledge).values({
          templateId: templateId || null,
          category: k.category,
          knowledgeType: k.knowledgeType,
          title: k.title,
          description: k.description,
          examples: k.examples as any,
          metrics: k.metrics as any,
          tags: k.tags,
          confidence: k.confidence,
          usageCount: 0,
          successRate: null,
        })
      }
    }

    // ステータス更新: prompt generation
    await db
      .update(knowledgeAnalysisJobs)
      .set({ status: 'extracting', stage: 'prompt_generation', progressPercent: 75 })
      .where(eq(knowledgeAnalysisJobs.id, jobId))

    // プロンプトテンプレートをDBに保存
    if (result.prompts && result.prompts.prompts.length > 0) {
      for (const p of result.prompts.prompts) {
        await db.insert(promptTemplates).values({
          name: p.name,
          purpose: p.purpose,
          promptText: p.promptText,
          knowledgeIds: p.knowledgeIds,
          variables: { vars: p.variables } as any,
          temperature: p.temperature,
          examples: { items: p.examples || [] } as any,
          version: 1,
          isActive: true,
        })
      }
    }

    // ジョブ完了
    await db
      .update(knowledgeAnalysisJobs)
      .set({
        status: 'completed',
        stage: 'prompt_generation',
        progressPercent: 100,
        resultJson: {
          analysis: result.analysis,
          knowledgeCount: result.knowledge?.totalKnowledgeCount || 0,
          promptCount: result.prompts?.prompts.length || 0,
        } as any,
        tokensUsed: result.totalTokensUsed,
      })
      .where(eq(knowledgeAnalysisJobs.id, jobId))

    console.log(`[KnowledgeAPI] ✅ Job ${jobId} completed successfully`)
  } catch (error) {
    console.error(`[KnowledgeAPI] ❌ Job ${jobId} failed:`, error)
    await db
      .update(knowledgeAnalysisJobs)
      .set({
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      })
      .where(eq(knowledgeAnalysisJobs.id, jobId))
  }
}

/**
 * GET /api/v1/knowledge/analyze?jobId=xxx
 *
 * ジョブの状態確認
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')

    if (!jobId) {
      return NextResponse.json({ error: 'jobId is required' }, { status: 400 })
    }

    const job = await db
      .select()
      .from(knowledgeAnalysisJobs)
      .where(eq(knowledgeAnalysisJobs.id, jobId))
      .limit(1)

    if (!job || job.length === 0) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    return NextResponse.json({
      status: 'success',
      job: job[0],
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
