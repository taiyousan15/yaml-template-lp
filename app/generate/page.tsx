'use client'

import { useState } from 'react'
import Link from 'next/link'

type GenerationMode = 'auto' | 'tomy_only' | 'knowledge_only'

export default function GeneratePage() {
  const [formData, setFormData] = useState({
    productName: '',
    targetAudience: '',
    mainBenefit: '',
    beforeState: '',
    afterState: '',
    credibility: '',
    yamlTemplate: '',
    mode: 'auto' as GenerationMode,
    temperature: 0.8,
    useKnowledgeBase: true,
  })

  const [isGenerating, setIsGenerating] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsGenerating(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/v1/generate/unified', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'LP生成に失敗しました')
      }

      const data = await response.json()
      setResult(data.result)
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ナビゲーション */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="text-2xl font-bold text-indigo-600">
                YAML LP System
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                ダッシュボード
              </Link>
              <Link
                href="/templates"
                className="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                テンプレート
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">統合LP生成</h1>
          <p className="mt-2 text-gray-600">
            TOMYスタイル黄金律とナレッジベースを自動統合して最高品質のLPを生成
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* フォーム */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 基本情報 */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold mb-4">基本情報（必須）</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      製品名 *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.productName}
                      onChange={(e) =>
                        setFormData({ ...formData, productName: e.target.value })
                      }
                      className="w-full border rounded-lg px-4 py-2"
                      placeholder="例: AI自動化ツール"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ターゲット層 *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.targetAudience}
                      onChange={(e) =>
                        setFormData({ ...formData, targetAudience: e.target.value })
                      }
                      className="w-full border rounded-lg px-4 py-2"
                      placeholder="例: 年商1億円未満の経営者"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      メインベネフィット *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.mainBenefit}
                      onChange={(e) =>
                        setFormData({ ...formData, mainBenefit: e.target.value })
                      }
                      className="w-full border rounded-lg px-4 py-2"
                      placeholder="例: 売上を3ヶ月で4.2倍にする"
                    />
                  </div>
                </div>
              </div>

              {/* オプション情報 */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold mb-4">詳細情報（オプション）</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Before状態
                    </label>
                    <textarea
                      value={formData.beforeState}
                      onChange={(e) =>
                        setFormData({ ...formData, beforeState: e.target.value })
                      }
                      className="w-full border rounded-lg px-4 py-2"
                      rows={2}
                      placeholder="例: 広告費100万円で赤字"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      After状態
                    </label>
                    <textarea
                      value={formData.afterState}
                      onChange={(e) =>
                        setFormData({ ...formData, afterState: e.target.value })
                      }
                      className="w-full border rounded-lg px-4 py-2"
                      rows={2}
                      placeholder="例: 広告費37.2万円で黒字転換"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      信頼性要素
                    </label>
                    <input
                      type="text"
                      value={formData.credibility}
                      onChange={(e) =>
                        setFormData({ ...formData, credibility: e.target.value })
                      }
                      className="w-full border rounded-lg px-4 py-2"
                      placeholder="例: 導入企業127社、平均成約率53%"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      YAMLテンプレート（オプション）
                    </label>
                    <textarea
                      value={formData.yamlTemplate}
                      onChange={(e) =>
                        setFormData({ ...formData, yamlTemplate: e.target.value })
                      }
                      className="w-full border rounded-lg px-4 py-2 font-mono text-sm"
                      rows={6}
                      placeholder="YAMLテンプレートを貼り付けると自動分析します"
                    />
                  </div>
                </div>
              </div>

              {/* 生成モード */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold mb-4">生成モード</h2>

                <div className="space-y-3">
                  <label className="flex items-start p-4 border-2 border-indigo-600 rounded-lg cursor-pointer bg-indigo-50">
                    <input
                      type="radio"
                      name="mode"
                      value="auto"
                      checked={formData.mode === 'auto'}
                      onChange={(e) =>
                        setFormData({ ...formData, mode: e.target.value as GenerationMode })
                      }
                      className="mt-1 mr-3"
                    />
                    <div>
                      <div className="font-semibold text-indigo-900">
                        🔥 自動統合モード（推奨）
                      </div>
                      <div className="text-sm text-gray-700 mt-1">
                        TOMYスタイル + ナレッジベース + YAML分析を自動統合
                      </div>
                      <div className="text-xs text-indigo-600 mt-1">
                        推定品質スコア: 95点
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="mode"
                      value="tomy_only"
                      checked={formData.mode === 'tomy_only'}
                      onChange={(e) =>
                        setFormData({ ...formData, mode: e.target.value as GenerationMode })
                      }
                      className="mt-1 mr-3"
                    />
                    <div>
                      <div className="font-semibold">TOMYスタイル専用</div>
                      <div className="text-sm text-gray-600 mt-1">
                        TOMYスタイル黄金律のみを適用
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        推定品質スコア: 90点
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="mode"
                      value="knowledge_only"
                      checked={formData.mode === 'knowledge_only'}
                      onChange={(e) =>
                        setFormData({ ...formData, mode: e.target.value as GenerationMode })
                      }
                      className="mt-1 mr-3"
                    />
                    <div>
                      <div className="font-semibold">ナレッジベース専用</div>
                      <div className="text-sm text-gray-600 mt-1">
                        DBナレッジとYAML分析のみ
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        推定品質スコア: 85点
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* 送信ボタン */}
              <button
                type="submit"
                disabled={isGenerating}
                className="w-full bg-indigo-600 text-white rounded-lg px-6 py-4 font-semibold hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isGenerating ? '生成中...' : 'LP生成開始'}
              </button>
            </form>
          </div>

          {/* サイドバー */}
          <div className="space-y-6">
            {/* 生成状況 */}
            {isGenerating && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold mb-4">生成中...</h3>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600 mr-3"></div>
                    <span className="text-sm">YAMLテンプレート分析</span>
                  </div>
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600 mr-3"></div>
                    <span className="text-sm">ナレッジベース取得</span>
                  </div>
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600 mr-3"></div>
                    <span className="text-sm">TOMYスタイル適用</span>
                  </div>
                </div>
              </div>
            )}

            {/* エラー表示 */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <h3 className="text-lg font-bold text-red-900 mb-2">エラー</h3>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* 結果表示 */}
            {result && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold mb-4">生成結果</h3>

                <div className="space-y-4">
                  {/* スコア */}
                  <div>
                    <div className="text-sm text-gray-600">TOMYスコア</div>
                    <div className="text-3xl font-bold text-indigo-600">
                      {result.metadata.tomy_score}点
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-gray-600">品質スコア</div>
                    <div className="text-3xl font-bold text-green-600">
                      {result.quality_score.overall}点
                    </div>
                  </div>

                  {/* メタデータ */}
                  <div className="pt-4 border-t space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">生成方法</span>
                      <span className="font-medium">{result.metadata.generation_method}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">ナレッジ活用数</span>
                      <span className="font-medium">{result.metadata.knowledge_items_used}件</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">実行時間</span>
                      <span className="font-medium">{result.metadata.execution_time_ms}ms</span>
                    </div>
                  </div>

                  {/* プレビューボタン */}
                  <button className="w-full mt-4 bg-indigo-600 text-white rounded-lg px-4 py-2 hover:bg-indigo-700">
                    プレビューを見る
                  </button>
                </div>
              </div>
            )}

            {/* ヘルプ */}
            <div className="bg-blue-50 rounded-lg p-6">
              <h3 className="text-lg font-bold text-blue-900 mb-2">💡 ヒント</h3>
              <ul className="text-sm text-blue-800 space-y-2">
                <li>• Before/After状態は具体的な数値で</li>
                <li>• YAMLテンプレートを追加すると品質UP</li>
                <li>• 自動統合モードが最高品質（95点目標）</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
