'use client';

import { use, useState } from 'react';
import Link from 'next/link';

// Prevent static generation for this page
export const dynamic = 'force-dynamic';

interface Variable {
  name: string;
  type: 'text' | 'textarea' | 'image' | 'color';
  label: string;
  defaultValue?: string;
  description?: string;
}

export default function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id } = use(params);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  // テンプレート変数（実際にはAPIから取得）
  const [variables] = useState<Variable[]>([
    {
      name: 'headline',
      type: 'text',
      label: '見出し',
      description: 'メインの見出しテキスト',
    },
    {
      name: 'subheadline',
      type: 'text',
      label: 'サブ見出し',
    },
    {
      name: 'description',
      type: 'textarea',
      label: '説明文',
      description: '商品・サービスの詳細説明',
    },
    {
      name: 'cta_label',
      type: 'text',
      label: 'CTAボタンテキスト',
      defaultValue: '今すぐ申し込む',
    },
    {
      name: 'hero_image',
      type: 'image',
      label: 'ヒーロー画像',
    },
  ]);

  const [formValues, setFormValues] = useState<Record<string, string>>(
    Object.fromEntries(
      variables.map((v) => [v.name, v.defaultValue || ''])
    )
  );

  // AI文案生成パラメータ
  const [aiParams, setAiParams] = useState({
    temperature: 0.7,
    intensity: 5,
    tone: 'カジュアル',
  });

  const toneOptions = ['カジュアル', '誠実', '権威', '緊急', '中立'];

  const handleGenerate = async () => {
    setIsGenerating(true);
    // TODO: API呼び出し
    setTimeout(() => {
      setIsGenerating(false);
      alert('LP生成完了！');
    }, 2000);
  };

  const handleAIGenerate = async (fieldName: string) => {
    // TODO: Claude APIでAI文案生成
    setFormValues((prev) => ({
      ...prev,
      [fieldName]: `【AI生成】${fieldName}のサンプルテキスト`,
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="text-gray-600 hover:text-gray-900"
              >
                ← 戻る
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">
                LPエディタ
              </h1>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {showPreview ? 'プレビュー非表示' : 'プレビュー表示'}
              </button>
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {isGenerating ? '生成中...' : 'LP生成'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* エディタパネル */}
          <div className="space-y-6">
            {/* AI設定 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">AI文案生成設定</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    温度: {aiParams.temperature.toFixed(1)}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={aiParams.temperature}
                    onChange={(e) =>
                      setAiParams((prev) => ({
                        ...prev,
                        temperature: parseFloat(e.target.value),
                      }))
                    }
                    className="w-full"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    0.0: 保守的 / 2.0: 創造的
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    煽り度: {aiParams.intensity}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={aiParams.intensity}
                    onChange={(e) =>
                      setAiParams((prev) => ({
                        ...prev,
                        intensity: parseInt(e.target.value),
                      }))
                    }
                    className="w-full"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    1: 控えめ / 10: 強め
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    トーン
                  </label>
                  <select
                    value={aiParams.tone}
                    onChange={(e) =>
                      setAiParams((prev) => ({ ...prev, tone: e.target.value }))
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    {toneOptions.map((tone) => (
                      <option key={tone} value={tone}>
                        {tone}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 変数フォーム */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">コンテンツ編集</h2>

              <div className="space-y-4">
                {variables.map((variable) => (
                  <div key={variable.name}>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium">
                        {variable.label}
                        {variable.description && (
                          <span className="text-gray-500 text-xs ml-2">
                            ({variable.description})
                          </span>
                        )}
                      </label>
                      {(variable.type === 'text' || variable.type === 'textarea') && (
                        <button
                          onClick={() => handleAIGenerate(variable.name)}
                          className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                        >
                          ✨ AI生成
                        </button>
                      )}
                    </div>

                    {variable.type === 'text' && (
                      <input
                        type="text"
                        value={formValues[variable.name]}
                        onChange={(e) =>
                          setFormValues((prev) => ({
                            ...prev,
                            [variable.name]: e.target.value,
                          }))
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        placeholder={`${variable.label}を入力...`}
                      />
                    )}

                    {variable.type === 'textarea' && (
                      <textarea
                        value={formValues[variable.name]}
                        onChange={(e) =>
                          setFormValues((prev) => ({
                            ...prev,
                            [variable.name]: e.target.value,
                          }))
                        }
                        rows={4}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        placeholder={`${variable.label}を入力...`}
                      />
                    )}

                    {variable.type === 'image' && (
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          id={`image-${variable.name}`}
                        />
                        <label
                          htmlFor={`image-${variable.name}`}
                          className="cursor-pointer text-indigo-600 hover:text-indigo-700"
                        >
                          画像をアップロード
                        </label>
                      </div>
                    )}

                    {variable.type === 'color' && (
                      <input
                        type="color"
                        value={formValues[variable.name] || '#000000'}
                        onChange={(e) =>
                          setFormValues((prev) => ({
                            ...prev,
                            [variable.name]: e.target.value,
                          }))
                        }
                        className="w-20 h-10 border border-gray-300 rounded cursor-pointer"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* プレビューパネル */}
          {showPreview && (
            <div className="lg:sticky lg:top-8 h-fit">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">ライブプレビュー</h2>
                  <div className="flex gap-2">
                    <button className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">
                      📱 モバイル
                    </button>
                    <button className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 bg-gray-100">
                      💻 デスクトップ
                    </button>
                  </div>
                </div>

                {/* プレビューコンテンツ */}
                <div className="border border-gray-200 rounded-lg p-8 bg-gradient-to-br from-gray-50 to-white min-h-[600px]">
                  <div className="text-center">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">
                      {formValues.headline || '見出しがここに表示されます'}
                    </h1>
                    {formValues.subheadline && (
                      <p className="text-xl text-gray-600 mb-6">
                        {formValues.subheadline}
                      </p>
                    )}
                    {formValues.description && (
                      <p className="text-gray-700 mb-8 max-w-2xl mx-auto">
                        {formValues.description}
                      </p>
                    )}
                    <button className="px-8 py-4 bg-indigo-600 text-white rounded-lg text-lg font-semibold hover:bg-indigo-700">
                      {formValues.cta_label || 'CTAボタン'}
                    </button>
                  </div>
                </div>

                <div className="mt-4 text-xs text-gray-500 text-center">
                  ⚡ リアルタイムプレビュー
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
