'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface YAMLHistory {
  id: string;
  userId: string;
  sourceImageUrl: string;
  generatedYaml: string;
  metadata: {
    totalSegments?: number;
    totalTextBlocks?: number;
    confidence?: number;
    steps?: any[];
  } | null;
  name: string | null;
  tags: string[] | null;
  createdAt: string;
  updatedAt: string;
}

export default function YAMLHistoryPage() {
  const [histories, setHistories] = useState<YAMLHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedHistory, setSelectedHistory] = useState<YAMLHistory | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchHistories();
  }, []);

  const fetchHistories = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/yaml-history?userId=anonymous&limit=100');
      const result = await response.json();

      if (result.success) {
        setHistories(result.data);
      } else {
        console.error('履歴取得失敗:', result.error);
      }
    } catch (error) {
      console.error('履歴取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteHistory = async (id: string) => {
    if (!confirm('この履歴を削除してもよろしいですか？')) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/yaml-history?id=${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        setHistories(histories.filter((h) => h.id !== id));
      } else {
        alert('削除に失敗しました: ' + result.error);
      }
    } catch (error) {
      console.error('削除エラー:', error);
      alert('削除に失敗しました');
    }
  };

  const copyYAML = async (yaml: string, id: string) => {
    try {
      await navigator.clipboard.writeText(yaml);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      alert('コピーに失敗しました');
    }
  };

  const openModal = (history: YAMLHistory) => {
    setSelectedHistory(history);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedHistory(null);
  };

  const filteredHistories = histories.filter((history) => {
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    return (
      history.name?.toLowerCase().includes(query) ||
      history.tags?.some((tag) => tag.toLowerCase().includes(query)) ||
      new Date(history.createdAt).toLocaleDateString('ja-JP').includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
                ← ダッシュボード
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">YAML生成履歴</h1>
            </div>
            <Link
              href="/advanced-yaml-generator"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              + 新規生成
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 検索バー */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="名前、タグ、日付で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        {/* 履歴一覧 */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin h-12 w-12 border-4 border-indigo-600 border-t-transparent rounded-full" />
          </div>
        ) : filteredHistories.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <svg
              className="h-16 w-16 text-gray-400 mx-auto mb-4"
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              履歴がありません
            </h3>
            <p className="text-gray-600 mb-6">
              高度YAML生成で画像を解析すると、ここに履歴が保存されます。
            </p>
            <Link
              href="/advanced-yaml-generator"
              className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              今すぐ生成する
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredHistories.map((history) => (
              <div
                key={history.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer"
              >
                {/* 画像サムネイル */}
                <div
                  className="relative h-48 bg-gray-100 rounded-t-lg overflow-hidden"
                  onClick={() => openModal(history)}
                >
                  <img
                    src={history.sourceImageUrl}
                    alt="LP画像"
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* カード内容 */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {history.name || '名称未設定'}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {new Date(history.createdAt).toLocaleDateString('ja-JP', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>

                  {/* メタデータ */}
                  {history.metadata && (
                    <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                      <div className="bg-blue-50 p-2 rounded">
                        <div className="text-lg font-bold text-blue-900">
                          {history.metadata.totalSegments || 0}
                        </div>
                        <div className="text-xs text-blue-700">セグメント</div>
                      </div>
                      <div className="bg-green-50 p-2 rounded">
                        <div className="text-lg font-bold text-green-900">
                          {history.metadata.totalTextBlocks || 0}
                        </div>
                        <div className="text-xs text-green-700">テキスト</div>
                      </div>
                      <div className="bg-purple-50 p-2 rounded">
                        <div className="text-lg font-bold text-purple-900">
                          {history.metadata.confidence
                            ? Math.round(history.metadata.confidence * 100)
                            : 0}
                          %
                        </div>
                        <div className="text-xs text-purple-700">信頼度</div>
                      </div>
                    </div>
                  )}

                  {/* タグ */}
                  {history.tags && history.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {history.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* アクションボタン */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyYAML(history.generatedYaml, history.id)}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
                        copiedId === history.id
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {copiedId === history.id ? '✓ コピー完了' : '📋 コピー'}
                    </button>
                    <button
                      onClick={() => openModal(history)}
                      className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                    >
                      詳細
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteHistory(history.id);
                      }}
                      className="px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 詳細モーダル */}
      {showModal && selectedHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* モーダルヘッダー */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                {selectedHistory.name || '名称未設定'}
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            {/* モーダル内容 */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 左側: 画像 */}
                <div>
                  <h3 className="text-lg font-bold mb-3">元画像</h3>
                  <img
                    src={selectedHistory.sourceImageUrl}
                    alt="LP画像"
                    className="w-full rounded-lg shadow-lg"
                  />

                  {/* メタデータ */}
                  {selectedHistory.metadata && (
                    <div className="mt-4 bg-gray-50 rounded-lg p-4">
                      <h4 className="font-bold mb-2">分析結果</h4>
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="bg-blue-100 p-3 rounded">
                          <div className="text-xl font-bold text-blue-900">
                            {selectedHistory.metadata.totalSegments || 0}
                          </div>
                          <div className="text-xs text-blue-700">セグメント数</div>
                        </div>
                        <div className="bg-green-100 p-3 rounded">
                          <div className="text-xl font-bold text-green-900">
                            {selectedHistory.metadata.totalTextBlocks || 0}
                          </div>
                          <div className="text-xs text-green-700">
                            テキストブロック数
                          </div>
                        </div>
                        <div className="bg-purple-100 p-3 rounded">
                          <div className="text-xl font-bold text-purple-900">
                            {selectedHistory.metadata.confidence
                              ? Math.round(selectedHistory.metadata.confidence * 100)
                              : 0}
                            %
                          </div>
                          <div className="text-xs text-purple-700">信頼度</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 右側: YAML */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold">生成されたYAML</h3>
                    <button
                      onClick={() =>
                        copyYAML(selectedHistory.generatedYaml, selectedHistory.id)
                      }
                      className={`px-4 py-2 rounded-lg font-medium transition ${
                        copiedId === selectedHistory.id
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {copiedId === selectedHistory.id ? '✓ コピー完了' : '📋 コピー'}
                    </button>
                  </div>
                  <textarea
                    value={selectedHistory.generatedYaml}
                    readOnly
                    className="w-full h-[500px] border border-gray-300 rounded-lg p-4 font-mono text-sm"
                    spellCheck={false}
                  />
                </div>
              </div>
            </div>

            {/* モーダルフッター */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={closeModal}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                閉じる
              </button>
              <button
                onClick={() => {
                  localStorage.setItem('importedYAML', selectedHistory.generatedYaml);
                  window.location.href = '/yaml-renderer';
                }}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                エディタで開く →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
