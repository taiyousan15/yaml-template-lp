'use client';

import { useState } from 'react';
import Link from 'next/link';

interface LP {
  id: string;
  name: string;
  status: 'draft' | 'published';
  previewUrl?: string;
  prodUrl?: string;
  createdAt: string;
  thumbnail?: string;
}

interface UsageStats {
  ocrCount: number;
  tokensIn: number;
  tokensOut: number;
  templatesCreated: number;
  lpsPublished: number;
}

export default function DashboardPage() {
  const [recentLPs] = useState<LP[]>([
    {
      id: '1',
      name: '在宅ワーク訴求LP',
      status: 'published',
      prodUrl: 'https://example.com/lp-1',
      createdAt: '2025-10-20',
    },
    {
      id: '2',
      name: 'プログラミングスクールLP',
      status: 'draft',
      createdAt: '2025-10-21',
    },
  ]);

  const [stats] = useState<UsageStats>({
    ocrCount: 5,
    tokensIn: 15000,
    tokensOut: 8000,
    templatesCreated: 3,
    lpsPublished: 2,
  });

  const [subscription] = useState({
    plan: 'Pro',
    status: 'active',
    currentPeriodEnd: '2025-11-21',
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
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
                href="/generate"
                className="bg-indigo-600 text-white hover:bg-indigo-700 px-3 py-2 rounded-md text-sm font-medium"
              >
                🔥 統合LP生成
              </Link>
              <Link
                href="/templates"
                className="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                テンプレート
              </Link>
              <Link
                href="/wizard-from-image"
                className="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                新規作成
              </Link>
              <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-medium">
                U
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">ダッシュボード</h1>
          <p className="mt-2 text-gray-600">プロジェクトの概要と最近の活動</p>
        </div>

        {/* 課金状態カード */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg shadow-lg p-6 mb-8 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold mb-2">
                {subscription.plan} プラン
              </h2>
              <p className="text-indigo-100">
                ステータス: {subscription.status === 'active' ? '有効' : '無効'}
              </p>
              <p className="text-indigo-100 text-sm mt-1">
                次回更新: {subscription.currentPeriodEnd}
              </p>
            </div>
            <Link
              href="/billing"
              className="bg-white text-indigo-600 px-6 py-3 rounded-lg font-semibold hover:bg-indigo-50 transition"
            >
              プランを管理
            </Link>
          </div>
        </div>

        {/* 統計カード */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600">OCR実行回数</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">
              {stats.ocrCount}
            </div>
            <div className="mt-2 text-xs text-gray-500">月間上限: 100回</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600">LLMトークン使用</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">
              {((stats.tokensIn + stats.tokensOut) / 1000).toFixed(1)}k
            </div>
            <div className="mt-2 text-xs text-gray-500">
              入力: {(stats.tokensIn / 1000).toFixed(1)}k / 出力:{' '}
              {(stats.tokensOut / 1000).toFixed(1)}k
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600">作成テンプレ数</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">
              {stats.templatesCreated}
            </div>
            <div className="mt-2 text-xs text-gray-500">無制限</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600">公開LP数</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">
              {stats.lpsPublished}
            </div>
            <div className="mt-2 text-xs text-gray-500">無制限</div>
          </div>
        </div>

        {/* クイックアクション */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7 gap-6 mb-8">
          <Link
            href="/generate"
            className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-lg p-6 hover:shadow-xl transition group text-white"
          >
            <div className="flex items-center justify-center h-16 w-16 rounded-full bg-white/20 mb-4 group-hover:bg-white/30 transition">
              <svg
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">
              🔥 統合LP生成
            </h3>
            <p className="text-indigo-100 text-sm">
              MrTスタイル + ナレッジ統合で95点以上の最高品質LP生成
            </p>
          </Link>

          <Link
            href="/wizard-from-image"
            className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition group"
          >
            <div className="flex items-center justify-center h-16 w-16 rounded-full bg-indigo-100 text-indigo-600 mb-4 group-hover:bg-indigo-600 group-hover:text-white transition">
              <svg
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              画像からテンプレ作成
            </h3>
            <p className="text-gray-600 text-sm">
              スクリーンショットをアップロードしてテンプレートとして保存
            </p>
          </Link>

          <Link
            href="/advanced-yaml-generator"
            className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg shadow-lg p-6 hover:shadow-xl transition group text-white"
          >
            <div className="flex items-center justify-center h-16 w-16 rounded-full bg-white/20 mb-4 group-hover:bg-white/30 transition">
              <svg
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">
              🤖 高度YAML生成
            </h3>
            <p className="text-blue-100 text-sm">
              マルチエージェントAIで1行レベルの超高精度分析
            </p>
          </Link>

          <Link
            href="/templates"
            className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition group"
          >
            <div className="flex items-center justify-center h-16 w-16 rounded-full bg-green-100 text-green-600 mb-4 group-hover:bg-green-600 group-hover:text-white transition">
              <svg
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              テンプレートを選択
            </h3>
            <p className="text-gray-600 text-sm">
              既存のテンプレートから選んでLPを素早く生成
            </p>
          </Link>

          <Link
            href="/yaml-renderer"
            className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition group"
          >
            <div className="flex items-center justify-center h-16 w-16 rounded-full bg-purple-100 text-purple-600 mb-4 group-hover:bg-purple-600 group-hover:text-white transition">
              <svg
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              YAMLプレビュー
            </h3>
            <p className="text-gray-600 text-sm">
              完全なCSSスタイル反映・HTMLダウンロード
            </p>
          </Link>

          <Link
            href="/editor/new"
            className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition group"
          >
            <div className="flex items-center justify-center h-16 w-16 rounded-full bg-gray-100 text-gray-600 mb-4 group-hover:bg-gray-600 group-hover:text-white transition">
              <svg
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              エディタで編集
            </h3>
            <p className="text-gray-600 text-sm">
              AI文案生成とライブプレビューで効率的に作成
            </p>
          </Link>

          <Link
            href="/yaml-editor"
            className="bg-gradient-to-br from-orange-500 to-red-600 rounded-lg shadow-lg p-6 hover:shadow-xl transition group text-white"
          >
            <div className="flex items-center justify-center h-16 w-16 rounded-full bg-white/20 mb-4 group-hover:bg-white/30 transition">
              <svg
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">
              📝 YAMLエディタ
            </h3>
            <p className="text-orange-100 text-sm">
              YAMLをアップロードして文字を編集・ライブプレビュー
            </p>
          </Link>
        </div>

        {/* 最近のLP */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">最近のLP</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {recentLPs.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-gray-500">まだLPがありません</p>
                <Link
                  href="/wizard-from-image"
                  className="mt-4 inline-block text-indigo-600 hover:text-indigo-700"
                >
                  最初のLPを作成 →
                </Link>
              </div>
            ) : (
              recentLPs.map((lp) => (
                <div key={lp.id} className="p-6 hover:bg-gray-50 transition">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900">
                        {lp.name}
                      </h3>
                      <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                        <span>{lp.createdAt}</span>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            lp.status === 'published'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {lp.status === 'published' ? '公開中' : '下書き'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      {lp.previewUrl && (
                        <a
                          href={lp.previewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                        >
                          プレビュー
                        </a>
                      )}
                      {lp.prodUrl && (
                        <a
                          href={lp.prodUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-600 hover:text-green-700 text-sm font-medium"
                        >
                          本番URL
                        </a>
                      )}
                      <Link
                        href={`/editor/${lp.id}`}
                        className="text-gray-600 hover:text-gray-700 text-sm font-medium"
                      >
                        編集
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
