'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';

interface AnalysisStep {
  step: number;
  name: string;
  status: 'pending' | 'processing' | 'completed';
  result?: any;
}

export default function AdvancedYAMLGeneratorPage() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<AnalysisStep[]>([]);
  const [generatedYAML, setGeneratedYAML] = useState('');
  const [metadata, setMetadata] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ファイルサイズチェック（20MB制限）
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
      setError(`ファイルサイズが大きすぎます。\n最大20MBまでアップロード可能です。\n現在のサイズ: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      return;
    }

    // 大きな画像の警告（5MB以上）
    const warningSize = 5 * 1024 * 1024; // 5MB
    if (file.size > warningSize) {
      console.warn(`大きな画像 (${(file.size / 1024 / 1024).toFixed(2)}MB) - サーバー側で自動圧縮されます`);
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedImage(event.target?.result as string);
      setError(null); // エラーをクリア
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!uploadedImage) {
      alert('画像をアップロードしてください');
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setCurrentStep(0);
    setError(null);

    try {
      // 画像をBlobに変換
      const response = await fetch(uploadedImage);
      const blob = await response.blob();

      const formData = new FormData();
      formData.append('file', blob, 'image.png');

      // 進捗シミュレーション
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev < 90) return prev + 2;
          return prev;
        });
      }, 200);

      const apiResponse = await fetch('/api/v1/templates/advanced-analysis', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json().catch(() => ({ error: 'Unknown error' }));
        const errorMessage = errorData.error || `サーバーエラー (${apiResponse.status})`;

        // APIキーが設定されていない場合の詳細メッセージ
        if (errorMessage.includes('ANTHROPIC_API_KEY') || errorMessage.includes('placeholder')) {
          throw new Error(
            '⚠️ Claude APIキーが設定されていません。\n\n' +
            '以下の手順でAPIキーを設定してください：\n' +
            '1. https://console.anthropic.com/ でAPIキーを取得\n' +
            '2. .envファイルのANTHROPIC_API_KEYを実際のキーに置き換え\n' +
            '3. 開発サーバーを再起動'
          );
        }

        // 画像サイズエラーの詳細メッセージ
        if (errorMessage.includes('5 MB') || errorMessage.includes('exceeds') || apiResponse.status === 413) {
          throw new Error(
            '⚠️ 画像サイズが大きすぎます。\n\n' +
            '画像は自動圧縮されますが、元のファイルサイズが大きすぎる可能性があります。\n' +
            '以下をお試しください：\n' +
            '1. より小さい画像を使用\n' +
            '2. 画像編集ソフトで事前にリサイズ（推奨: 幅2000px以下）\n' +
            '3. JPEG形式で保存し直す'
          );
        }

        throw new Error(errorMessage);
      }

      const result = await apiResponse.json();

      setProgress(100);
      setSteps(result.steps || []);
      setGeneratedYAML(result.yaml || '');
      setMetadata(result.metadata || {});
    } catch (error: any) {
      console.error('Analysis error:', error);

      // エラーメッセージを状態に保存
      const errorMsg = error.message || 'エラーが発生しました';
      setError(errorMsg);

      setProgress(0);
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedYAML);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      alert('コピーに失敗しました');
    }
  };

  const openInYAMLEditor = () => {
    localStorage.setItem('importedYAML', generatedYAML);
    window.location.href = '/yaml-renderer';
  };

  const saveToHistory = async () => {
    if (!uploadedImage || !generatedYAML) {
      alert('保存するデータがありません');
      return;
    }

    try {
      const response = await fetch('/api/v1/yaml-history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: 'anonymous',
          sourceImageUrl: uploadedImage,
          generatedYaml: generatedYAML,
          metadata: metadata,
          name: `LP生成 ${new Date().toLocaleDateString('ja-JP')}`,
          tags: ['自動生成'],
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        alert('履歴の保存に失敗しました: ' + result.error);
      }
    } catch (error) {
      console.error('履歴保存エラー:', error);
      alert('履歴の保存に失敗しました');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
                ← 戻る
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">
                高度YAML生成（マルチエージェント分析）
              </h1>
            </div>
            <Link
              href="/yaml-history"
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              📚 履歴を見る
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 説明 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-bold text-blue-900 mb-2">
            🤖 AI マルチエージェントシステム
          </h2>
          <p className="text-blue-800 text-sm">
            6つの専門AIエージェントが協力して、LP画像を1行レベルで詳細に分析し、
            高精度なYAMLテンプレートを生成します。
          </p>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            <div className="bg-white p-3 rounded border border-blue-200">
              <div className="font-bold text-blue-900">Agent 1</div>
              <div className="text-blue-700">画像細分化</div>
            </div>
            <div className="bg-white p-3 rounded border border-blue-200">
              <div className="font-bold text-blue-900">Agent 2</div>
              <div className="text-blue-700">文字認識（1行レベル）</div>
            </div>
            <div className="bg-white p-3 rounded border border-blue-200">
              <div className="font-bold text-blue-900">Agent 3</div>
              <div className="text-blue-700">構成認識</div>
            </div>
            <div className="bg-white p-3 rounded border border-blue-200">
              <div className="font-bold text-blue-900">Agent 4</div>
              <div className="text-blue-700">デザイン認識</div>
            </div>
            <div className="bg-white p-3 rounded border border-blue-200">
              <div className="font-bold text-blue-900">Agent 5</div>
              <div className="text-blue-700">統合処理</div>
            </div>
            <div className="bg-white p-3 rounded border border-blue-200">
              <div className="font-bold text-blue-900">Agent 6</div>
              <div className="text-blue-700">YAML生成</div>
            </div>
          </div>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-lg font-bold text-red-900 mb-2">エラーが発生しました</h3>
                <div className="text-red-800 whitespace-pre-wrap">{error}</div>
                <button
                  onClick={() => setError(null)}
                  className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 左側: アップロード & 進捗 */}
          <div className="space-y-6">
            {/* アップロード */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">LP画像をアップロード</h2>

              {!uploadedImage ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-indigo-500 transition">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="advanced-upload"
                  />
                  <label htmlFor="advanced-upload" className="cursor-pointer">
                    <div className="text-gray-400 mb-4">
                      <svg
                        className="mx-auto h-16 w-16"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                      </svg>
                    </div>
                    <p className="text-lg font-medium text-gray-700 mb-2">
                      画像をクリックして選択
                    </p>
                    <p className="text-sm text-gray-500">
                      PNG, JPG, GIF (最大10MB)
                    </p>
                  </label>
                </div>
              ) : (
                <div>
                  <img
                    src={uploadedImage}
                    alt="Uploaded"
                    className="w-full rounded-lg shadow-lg mb-4"
                  />
                  <button
                    onClick={() => setUploadedImage(null)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    別の画像を選択
                  </button>
                </div>
              )}

              {uploadedImage && !isProcessing && !generatedYAML && (
                <button
                  onClick={handleAnalyze}
                  className="w-full mt-6 px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700"
                >
                  🤖 マルチエージェント分析開始
                </button>
              )}
            </div>

            {/* 進捗表示 */}
            {isProcessing && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold mb-4">分析進行中...</h3>

                <div className="w-full bg-gray-200 rounded-full h-4 mb-6">
                  <div
                    className="bg-indigo-600 h-4 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <div className="space-y-3">
                  {steps.map((step) => (
                    <div
                      key={step.step}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        step.status === 'completed'
                          ? 'bg-green-50 border border-green-200'
                          : step.status === 'processing'
                          ? 'bg-blue-50 border border-blue-200'
                          : 'bg-gray-50 border border-gray-200'
                      }`}
                    >
                      <div className="flex items-center">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm mr-3 ${
                            step.status === 'completed'
                              ? 'bg-green-500 text-white'
                              : step.status === 'processing'
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-300 text-gray-600'
                          }`}
                        >
                          {step.status === 'completed' ? '✓' : step.step}
                        </div>
                        <span className="font-medium text-sm">{step.name}</span>
                      </div>
                      {step.status === 'processing' && (
                        <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* メタデータ */}
            {metadata && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold mb-4">分析結果サマリー</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-blue-900">
                      {metadata.totalSegments}
                    </div>
                    <div className="text-xs text-blue-700 mt-1">セグメント数</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-900">
                      {metadata.totalTextBlocks}
                    </div>
                    <div className="text-xs text-green-700 mt-1">テキストブロック数</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-purple-900">
                      {Math.round(metadata.confidence * 100)}%
                    </div>
                    <div className="text-xs text-purple-700 mt-1">信頼度</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 右側: YAML結果 */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">生成されたYAML</h2>
              {generatedYAML && (
                <div className="flex gap-2">
                  <button
                    onClick={saveToHistory}
                    className={`px-4 py-2 rounded-lg font-medium transition ${
                      saved
                        ? 'bg-green-500 text-white'
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    }`}
                  >
                    {saved ? '✓ 保存完了' : '💾 履歴に保存'}
                  </button>
                  <button
                    onClick={copyToClipboard}
                    className={`px-4 py-2 rounded-lg font-medium transition ${
                      copied
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {copied ? '✓ コピー完了' : '📋 コピー'}
                  </button>
                  <button
                    onClick={openInYAMLEditor}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
                  >
                    エディタで開く →
                  </button>
                </div>
              )}
            </div>

            {generatedYAML ? (
              <textarea
                value={generatedYAML}
                onChange={(e) => setGeneratedYAML(e.target.value)}
                className="w-full h-[600px] border border-gray-300 rounded-lg p-4 font-mono text-sm"
                spellCheck={false}
              />
            ) : (
              <div className="flex items-center justify-center h-[600px] border-2 border-dashed border-gray-300 rounded-lg">
                <div className="text-center">
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
                  <p className="text-gray-500">
                    画像をアップロードして分析を開始してください
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
