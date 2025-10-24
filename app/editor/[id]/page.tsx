'use client';

import { use, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import yaml from 'js-yaml';

// Prevent static generation for this page
export const dynamic = 'force-dynamic';

interface Variable {
  name: string;
  type: 'text' | 'textarea' | 'image' | 'color';
  label: string;
  defaultValue?: string;
  description?: string;
}

interface Block {
  id: string;
  type: 'Text' | 'Image' | 'Button' | 'Frame';
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  text?: string;
  color?: string;
}

export default function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [templateName, setTemplateName] = useState('テンプレート');
  const [templateImage, setTemplateImage] = useState<string>('');
  const [blocks, setBlocks] = useState<Block[]>([]);

  // YAMLテンプレート関連のステート
  const [yamlTemplate, setYamlTemplate] = useState<any>(null);
  const [yamlContent, setYamlContent] = useState<string>('');
  const [uploadedYamlFile, setUploadedYamlFile] = useState<File | null>(null);

  // デフォルトのテンプレート変数
  const defaultVariables: Variable[] = [
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
  ];

  const [variables, setVariables] = useState<Variable[]>(defaultVariables);

  const [formValues, setFormValues] = useState<Record<string, string>>(
    Object.fromEntries(
      defaultVariables.map((v) => [v.name, v.defaultValue || ''])
    )
  );

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const baseImageRef = useRef<HTMLImageElement | null>(null);

  // ローカルストレージからテンプレートデータを読み込む
  useEffect(() => {
    const savedTemplates = JSON.parse(localStorage.getItem('savedTemplates') || '[]');
    const template = savedTemplates.find((t: any) => t.id === id);

    if (template) {
      setTemplateName(template.name);
      setTemplateImage(template.thumbnail || '');

      // ブロック情報を保存
      if (template.blocks && Array.isArray(template.blocks)) {
        setBlocks(template.blocks);

        // ブロック情報から変数を生成
        const vars: Variable[] = template.blocks
          .filter((b: any) => b.type === 'Text' || b.type === 'Button')
          .map((b: any) => ({
            name: b.id,
            type: (b.type === 'Button' ? 'text' : 'textarea') as 'text' | 'textarea',
            label: b.text || b.id,
            defaultValue: b.text || '',
          }));
        setVariables(vars);
        setFormValues(
          Object.fromEntries(vars.map((v) => [v.name, v.defaultValue || '']))
        );
      }
    }
  }, [id]);

  // Canvas描画関数
  const renderPreview = () => {
    const canvas = canvasRef.current;
    const img = baseImageRef.current;

    if (!canvas || !img || !img.complete) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // キャンバスサイズを画像に合わせる
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    // 元画像を描画
    ctx.drawImage(img, 0, 0);

    // 各テキストブロックを処理
    blocks.forEach((block) => {
      if (block.type !== 'Text' && block.type !== 'Button') return;

      const value = formValues[block.id] || '';
      if (!value) return;

      // テキスト領域を白で塗りつぶし
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(block.bbox.x, block.bbox.y, block.bbox.width, block.bbox.height);

      // テキストスタイル設定
      const fontSize = Math.floor(block.bbox.height * 0.6); // 高さの60%のフォントサイズ
      ctx.font = `bold ${fontSize}px Arial, sans-serif`;
      ctx.fillStyle = block.color || '#000000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // テキストを折り返して描画
      const centerX = block.bbox.x + block.bbox.width / 2;
      const centerY = block.bbox.y + block.bbox.height / 2;

      // 簡易的な折り返し処理
      const maxWidth = block.bbox.width - 10;
      const lines = wrapText(ctx, value, maxWidth);
      const lineHeight = fontSize * 1.2;
      const totalHeight = lines.length * lineHeight;
      const startY = centerY - totalHeight / 2 + lineHeight / 2;

      lines.forEach((line, index) => {
        ctx.fillText(line, centerX, startY + index * lineHeight);
      });
    });
  };

  // テキスト折り返し関数
  const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
    const words = text.split('');
    const lines: string[] = [];
    let currentLine = '';

    words.forEach((char) => {
      const testLine = currentLine + char;
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = char;
      } else {
        currentLine = testLine;
      }
    });

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines.length > 0 ? lines : [text];
  };

  // 画像読み込み完了時とformValues変更時に再描画
  useEffect(() => {
    if (templateImage && baseImageRef.current) {
      renderPreview();
    }
  }, [templateImage, formValues, blocks]);

  // AI文案生成パラメータ
  const [aiParams, setAiParams] = useState({
    temperature: 0.7,
    intensity: 5,
    tone: 'カジュアル',
  });

  const toneOptions = ['カジュアル', '誠実', '権威', '緊急', '中立'];

  const handleGenerate = async () => {
    if (!yamlTemplate || !yamlContent) {
      alert('先にYAMLテンプレートをアップロードしてください');
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch('/api/v1/templates/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          yamlContent,
          variables: formValues,
          width: 1200,
          height: 630,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setTemplateImage(result.imageBase64);
        alert(`画像生成完了！（${(result.processingTime / 1000).toFixed(1)}秒）`);
      } else {
        alert(`エラー: ${result.error}`);
      }
    } catch (error) {
      console.error('Generation error:', error);
      alert('画像生成に失敗しました');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAIGenerate = async (fieldName: string) => {
    // TODO: Claude APIでAI文案生成
    setFormValues((prev) => ({
      ...prev,
      [fieldName]: `【AI生成】${fieldName}のサンプルテキスト`,
    }));
  };

  // YAML変数抽出関数
  const extractVariablesFromYaml = (yamlText: string): Variable[] => {
    const variableRegex = /\{\{([^}]+)\}\}/g;
    const foundVariables = new Set<string>();
    const variables: Variable[] = [];

    let match;
    while ((match = variableRegex.exec(yamlText)) !== null) {
      const varName = match[1].trim();
      if (!foundVariables.has(varName)) {
        foundVariables.add(varName);
        variables.push({
          name: varName,
          type: varName.includes('description') || varName.includes('説明') ? 'textarea' : 'text',
          label: varName.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim(),
          defaultValue: '',
        });
      }
    }

    return variables;
  };

  // YAMLファイルアップロード処理
  const handleYamlUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = yaml.load(text);

      setYamlContent(text);
      setYamlTemplate(parsed);
      setUploadedYamlFile(file);
      setTemplateName(file.name.replace('.yaml', '').replace('.yml', ''));

      // 変数を抽出
      const extractedVars = extractVariablesFromYaml(text);
      if (extractedVars.length > 0) {
        setVariables(extractedVars);
        setFormValues(
          Object.fromEntries(extractedVars.map((v) => [v.name, v.defaultValue || '']))
        );
      }

      alert('YAMLテンプレートを読み込みました！');
    } catch (error) {
      console.error('YAML parse error:', error);
      alert('YAMLファイルの解析に失敗しました。');
    }
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
                {templateName} - LPエディタ
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

            {/* YAMLアップロード */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">📄 YAMLテンプレート</h2>

              <div className="space-y-4">
                <div className="border-2 border-dashed border-indigo-300 rounded-lg p-6 text-center bg-indigo-50">
                  <input
                    type="file"
                    accept=".yaml,.yml"
                    onChange={handleYamlUpload}
                    className="hidden"
                    id="yaml-upload"
                  />
                  <label
                    htmlFor="yaml-upload"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <svg
                      className="w-12 h-12 text-indigo-400 mb-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    <span className="text-indigo-600 font-medium">
                      YAMLテンプレートをアップロード
                    </span>
                    <span className="text-xs text-gray-500 mt-1">
                      .yaml または .yml ファイル
                    </span>
                  </label>
                </div>

                {yamlTemplate && (
                  <div className="text-sm text-green-600 bg-green-50 p-3 rounded">
                    ✓ {templateName} を読み込みました
                    <div className="text-xs text-gray-600 mt-1">
                      {variables.length}個の変数を検出
                    </div>
                  </div>
                )}
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
                <div className="border border-gray-200 rounded-lg overflow-hidden relative bg-white">
                  {templateImage ? (
                    <>
                      {/* 非表示の元画像（Canvas描画用） */}
                      <img
                        ref={(el) => {
                          baseImageRef.current = el;
                          if (el && el.complete) {
                            renderPreview();
                          }
                        }}
                        src={templateImage}
                        alt="Template Base"
                        className="hidden"
                        onLoad={renderPreview}
                      />

                      {/* Canvas プレビュー */}
                      <canvas
                        ref={canvasRef}
                        className="w-full h-auto"
                      />
                    </>
                  ) : (
                    <div className="p-8 bg-gradient-to-br from-gray-50 to-white min-h-[600px]">
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
                  )}
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
