'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function YamlFromImagePage() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [yamlContent, setYamlContent] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setYamlContent('');
      setError('');

      // プレビュー用のURLを生成
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
    }
  };

  const handleGenerate = async () => {
    if (!file) {
      setError('画像ファイルを選択してください');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/v1/templates/from-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('YAML生成に失敗しました');
      }

      const data = await response.json();

      // YAMLコンテンツを取得
      if (data.yamlUrl) {
        const yamlResponse = await fetch(data.yamlUrl);
        const yamlText = await yamlResponse.text();
        setYamlContent(yamlText);
      } else if (data.yaml) {
        setYamlContent(data.yaml);
      } else {
        throw new Error('YAMLコンテンツが見つかりませんでした');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = async () => {
    if (!yamlContent) return;

    try {
      await navigator.clipboard.writeText(yamlContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError('コピーに失敗しました');
    }
  };

  const handleDownload = () => {
    if (!yamlContent) return;

    const blob = new Blob([yamlContent], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `template-${Date.now()}.yaml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="text-indigo-600 hover:text-indigo-700 font-medium"
          >
            ← ダッシュボードに戻る
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">
            画像からYAMLテンプレート生成
          </h1>
          <p className="mt-2 text-gray-600">
            LPのスクリーンショットをアップロードしてYAMLテンプレートを生成し、コピーまたはダウンロードできます
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 左側: アップロードエリア */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">画像アップロード</h2>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-indigo-500 transition">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer"
                >
                  <div className="flex flex-col items-center">
                    <svg
                      className="h-12 w-12 text-gray-400 mb-4"
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
                    <span className="text-indigo-600 font-medium">
                      クリックして画像を選択
                    </span>
                    <span className="text-gray-500 text-sm mt-2">
                      または画像をドラッグ&ドロップ
                    </span>
                  </div>
                </label>
              </div>

              {file && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">
                    選択されたファイル: <span className="font-medium">{file.name}</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    サイズ: {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              )}

              <button
                onClick={handleGenerate}
                disabled={!file || isProcessing}
                className="w-full mt-6 px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {isProcessing ? 'YAML生成中...' : 'YAMLテンプレート生成'}
              </button>

              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}
            </div>

            {/* プレビュー */}
            {previewUrl && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">画像プレビュー</h2>
                <img
                  src={previewUrl}
                  alt="アップロードされた画像"
                  className="w-full rounded-lg border border-gray-200"
                />
              </div>
            )}
          </div>

          {/* 右側: YAMLコンテンツ */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">生成されたYAML</h2>
              {yamlContent && (
                <div className="flex gap-2">
                  <button
                    onClick={handleCopy}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium"
                  >
                    {copied ? 'コピー済み!' : 'コピー'}
                  </button>
                  <button
                    onClick={handleDownload}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
                  >
                    ダウンロード
                  </button>
                </div>
              )}
            </div>

            {yamlContent ? (
              <div className="relative">
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm font-mono max-h-[600px] overflow-y-auto">
                  {yamlContent}
                </pre>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 border-2 border-dashed border-gray-300 rounded-lg">
                <div className="text-center">
                  <svg
                    className="h-12 w-12 text-gray-400 mx-auto mb-4"
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
                  <p className="text-gray-500">
                    画像をアップロードしてYAMLを生成してください
                  </p>
                </div>
              </div>
            )}

            {yamlContent && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-800 text-sm">
                  このYAMLテンプレートをコピーして、他のシステムで使用できます。
                  ダウンロードボタンでYAMLファイルとして保存することもできます。
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 使い方ガイド */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">使い方</h2>
          <ol className="space-y-3 text-gray-700">
            <li className="flex items-start">
              <span className="flex-shrink-0 h-6 w-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-semibold mr-3">
                1
              </span>
              <span>LPのスクリーンショット画像をアップロードします</span>
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 h-6 w-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-semibold mr-3">
                2
              </span>
              <span>「YAMLテンプレート生成」ボタンをクリックして画像を解析します</span>
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 h-6 w-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-semibold mr-3">
                3
              </span>
              <span>生成されたYAMLをコピーまたはダウンロードして使用します</span>
            </li>
          </ol>

          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm">
              <strong>ヒント:</strong> テンプレートとして保存してLP生成に使用したい場合は、
              <Link href="/wizard-from-image" className="text-indigo-600 hover:text-indigo-700 font-medium ml-1">
                画像からテンプレ作成
              </Link>
              をご利用ください。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
