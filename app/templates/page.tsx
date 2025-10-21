'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface Template {
  id: string;
  name: string;
  description: string;
  tags: string[];
  priceCents?: number;
  thumbnail: string;
  requiredVars: string[];
  author: string;
  usageCount: number;
}

export default function TemplatesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const [templates] = useState<Template[]>([
    {
      id: '1',
      name: '在宅ワーク訴求バナー',
      description: '事務職向けの在宅ワーク訴求に最適なテンプレート',
      tags: ['バナー', '在宅ワーク', '女性向け'],
      priceCents: 0, // 無料
      thumbnail: '/templates/template-1.png',
      requiredVars: ['question', 'headline', 'subheadline', 'offer'],
      author: 'System',
      usageCount: 125,
    },
    {
      id: '2',
      name: 'プログラミングスクールLP',
      description: 'プログラミングスクールのランディングページテンプレート',
      tags: ['LP', '教育', 'IT'],
      priceCents: 2980,
      thumbnail: '/templates/template-2.png',
      requiredVars: ['hero_title', 'features', 'pricing', 'testimonials'],
      author: 'Pro User',
      usageCount: 89,
    },
    {
      id: '3',
      name: 'ECサイト商品ページ',
      description: 'ECサイトの商品詳細ページテンプレート',
      tags: ['EC', '商品', 'セールス'],
      priceCents: 1980,
      thumbnail: '/templates/template-3.png',
      requiredVars: ['product_name', 'price', 'description', 'reviews'],
      author: 'Pro User',
      usageCount: 203,
    },
  ]);

  const allTags = Array.from(new Set(templates.flatMap((t) => t.tags)));

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      searchQuery === '' ||
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTags =
      selectedTags.length === 0 ||
      selectedTags.some((tag) => template.tags.includes(tag));

    return matchesSearch && matchesTags;
  });

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
                className="text-indigo-600 border-b-2 border-indigo-600 px-3 py-2 text-sm font-medium"
              >
                テンプレート
              </Link>
              <Link
                href="/wizard-from-image"
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
              >
                新規作成
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">テンプレートカタログ</h1>
          <p className="mt-2 text-gray-600">
            {filteredTemplates.length}個のテンプレート
          </p>
        </div>

        {/* 検索・フィルター */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          {/* 検索バー */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="テンプレートを検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* タグフィルター */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">タグで絞り込み</h3>
            <div className="flex flex-wrap gap-2">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                    selectedTags.includes(tag)
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tag}
                </button>
              ))}
              {selectedTags.length > 0 && (
                <button
                  onClick={() => setSelectedTags([])}
                  className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200"
                >
                  クリア
                </button>
              )}
            </div>
          </div>
        </div>

        {/* テンプレート一覧 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition group"
            >
              {/* サムネイル */}
              <div className="relative h-48 bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                <div className="text-gray-400 text-sm">
                  {template.name}のプレビュー
                </div>
                {template.priceCents === 0 && (
                  <div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 rounded text-xs font-bold">
                    無料
                  </div>
                )}
                {template.priceCents && template.priceCents > 0 && (
                  <div className="absolute top-2 left-2 bg-indigo-600 text-white px-2 py-1 rounded text-xs font-bold">
                    ¥{template.priceCents}
                  </div>
                )}
              </div>

              {/* コンテンツ */}
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {template.name}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {template.description}
                </p>

                {/* タグ */}
                <div className="flex flex-wrap gap-1 mb-4">
                  {template.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* メタ情報 */}
                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <span>作成者: {template.author}</span>
                  <span>{template.usageCount}回使用</span>
                </div>

                {/* 必要な変数 */}
                <div className="mb-4">
                  <div className="text-xs font-medium text-gray-700 mb-1">
                    必要な変数:
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {template.requiredVars.slice(0, 3).map((varName) => (
                      <span
                        key={varName}
                        className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs rounded"
                      >
                        {varName}
                      </span>
                    ))}
                    {template.requiredVars.length > 3 && (
                      <span className="px-2 py-0.5 text-indigo-700 text-xs">
                        +{template.requiredVars.length - 3}
                      </span>
                    )}
                  </div>
                </div>

                {/* アクション */}
                <div className="flex gap-2">
                  <Link
                    href={`/templates/${template.id}`}
                    className="flex-1 text-center px-4 py-2 border border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-50 transition text-sm font-medium"
                  >
                    詳細
                  </Link>
                  <Link
                    href={`/editor/new?templateId=${template.id}`}
                    className="flex-1 text-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium"
                  >
                    使用する
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">
              条件に一致するテンプレートが見つかりません
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedTags([]);
              }}
              className="text-indigo-600 hover:text-indigo-700 font-medium"
            >
              フィルターをクリア
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
