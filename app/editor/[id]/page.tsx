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

interface YamlError {
  message: string;
  line?: number;
  column?: number;
  snippet?: string;
  type: 'parse' | 'validation';
  suggestion?: string;
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
  const [yamlError, setYamlError] = useState<YamlError | null>(null);
  const [showYamlEditor, setShowYamlEditor] = useState(false);
  const [editingYaml, setEditingYaml] = useState<string>('');
  const [liveValidationError, setLiveValidationError] = useState<YamlError | null>(null);

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

  // YAML詳細エラー解析
  const parseYamlError = (error: any, yamlText: string): YamlError => {
    const errorMessage = error.message || String(error);
    let line: number | undefined;
    let column: number | undefined;
    let snippet: string | undefined;
    let suggestion: string | undefined;

    // エラー行番号を抽出
    const lineMatch = errorMessage.match(/at line (\d+)/i) || errorMessage.match(/line (\d+)/i);
    if (lineMatch) {
      line = parseInt(lineMatch[1], 10);
    }

    // カラム番号を抽出
    const columnMatch = errorMessage.match(/column (\d+)/i);
    if (columnMatch) {
      column = parseInt(columnMatch[1], 10);
    }

    // エラー箇所のスニペットを生成
    if (line && yamlText) {
      const lines = yamlText.split('\n');
      const startLine = Math.max(0, line - 2);
      const endLine = Math.min(lines.length, line + 1);
      const snippetLines = lines.slice(startLine, endLine);

      snippet = snippetLines
        .map((l, i) => {
          const lineNum = startLine + i + 1;
          const marker = lineNum === line ? '→ ' : '  ';
          return `${marker}${lineNum}: ${l}`;
        })
        .join('\n');
    }

    // エラーの種類に応じた修復提案
    if (errorMessage.includes('unexpected end')) {
      suggestion = '引用符やブラケットが閉じられていない可能性があります。YAML構文を確認してください。';
    } else if (errorMessage.includes('duplicat')) {
      suggestion = '重複したキーがあります。同じキーは同じレベルに1つだけ定義してください。';
    } else if (errorMessage.includes('indent')) {
      suggestion = 'インデントが不正です。YAMLではスペース2つまたは4つでインデントしてください（タブは使用できません）。';
    } else if (errorMessage.includes('unquot') || errorMessage.includes('quot')) {
      suggestion = '特殊文字を含む値は引用符で囲む必要があります。例: "値: 特殊文字"';
    } else if (errorMessage.includes('mapping')) {
      suggestion = 'キーと値のマッピングが正しくありません。「キー: 値」の形式で記述してください。';
    } else {
      suggestion = 'YAML構文エラーです。インデント、引用符、特殊文字の使用を確認してください。';
    }

    return {
      message: errorMessage,
      line,
      column,
      snippet,
      type: 'parse',
      suggestion,
    };
  };

  // YAML自動修復
  const autoFixYaml = (yamlText: string, error: YamlError): string => {
    let fixed = yamlText;

    // 一般的な修復パターン
    if (error.message.includes('indent')) {
      // タブをスペースに変換
      fixed = fixed.replace(/\t/g, '  ');
    }

    if (error.message.includes('unquot') || error.message.includes('special')) {
      // 特殊文字を含む値に引用符を追加
      const lines = fixed.split('\n');
      const fixedLines = lines.map((line) => {
        // コロンの後ろの値に特殊文字が含まれている場合
        const match = line.match(/^(\s*[^:]+:\s*)([^"'][^#\n]*[:#@&*!|>%{}\[\]])(.*)$/);
        if (match) {
          return `${match[1]}"${match[2].trim()}"${match[3]}`;
        }
        return line;
      });
      fixed = fixedLines.join('\n');
    }

    return fixed;
  };

  // YAMLバリデーション（リアルタイム用）
  const validateYaml = (yamlText: string): YamlError | null => {
    try {
      yaml.load(yamlText);
      return null;
    } catch (error) {
      return parseYamlError(error, yamlText);
    }
  };

  // YAMLファイルアップロード処理
  const handleYamlUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const validationError = validateYaml(text);

      if (validationError) {
        setYamlError(validationError);
        setEditingYaml(text);
        setShowYamlEditor(true);
        return;
      }

      const parsed = yaml.load(text);

      setYamlContent(text);
      setYamlTemplate(parsed);
      setUploadedYamlFile(file);
      setTemplateName(file.name.replace('.yaml', '').replace('.yml', ''));
      setYamlError(null);

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
      const parsedError = parseYamlError(error, '');
      setYamlError(parsedError);
    }
  };

  // YAML編集を開く
  const openYamlEditor = () => {
    setEditingYaml(yamlContent);
    setShowYamlEditor(true);
    setLiveValidationError(null);
  };

  // YAML編集中のリアルタイムバリデーション
  const handleYamlEdit = (newYaml: string) => {
    setEditingYaml(newYaml);
    const error = validateYaml(newYaml);
    setLiveValidationError(error);
  };

  // YAML編集を保存
  const saveYamlEdit = () => {
    const error = validateYaml(editingYaml);

    if (error) {
      setYamlError(error);
      return;
    }

    try {
      const parsed = yaml.load(editingYaml);
      setYamlContent(editingYaml);
      setYamlTemplate(parsed);
      setYamlError(null);
      setShowYamlEditor(false);

      // 変数を抽出
      const extractedVars = extractVariablesFromYaml(editingYaml);
      if (extractedVars.length > 0) {
        setVariables(extractedVars);
        setFormValues(
          Object.fromEntries(extractedVars.map((v) => [v.name, v.defaultValue || '']))
        );
      }

      alert('YAMLを更新しました！');
    } catch (error) {
      const parsedError = parseYamlError(error, editingYaml);
      setYamlError(parsedError);
    }
  };

  // YAML自動修復を適用
  const applyAutoFix = () => {
    if (!yamlError) return;

    const fixed = autoFixYaml(editingYaml, yamlError);
    setEditingYaml(fixed);

    // 修復後に再バリデーション
    const error = validateYaml(fixed);
    setLiveValidationError(error);

    if (!error) {
      alert('自動修復を適用しました！YAMLが正常になりました。');
    } else {
      alert('自動修復を試みましたが、まだエラーがあります。手動で修正してください。');
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
                  <div className="space-y-2">
                    <div className="text-sm text-green-600 bg-green-50 p-3 rounded flex items-center justify-between">
                      <div>
                        <div>✓ {templateName} を読み込みました</div>
                        <div className="text-xs text-gray-600 mt-1">
                          {variables.length}個の変数を検出
                        </div>
                      </div>
                      <button
                        onClick={openYamlEditor}
                        className="px-3 py-1 text-xs bg-white text-indigo-600 border border-indigo-300 rounded hover:bg-indigo-50"
                      >
                        編集
                      </button>
                    </div>
                  </div>
                )}

                {/* YAMLエラー表示 */}
                {yamlError && !showYamlEditor && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <svg
                        className="w-5 h-5 text-red-500 mt-0.5 mr-2 flex-shrink-0"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-red-800 mb-2">
                          YAMLパースエラー
                        </h3>
                        <p className="text-sm text-red-700 mb-2">{yamlError.message}</p>

                        {yamlError.line && (
                          <div className="text-xs text-red-600 mb-2">
                            エラー位置: 行 {yamlError.line}
                            {yamlError.column && `, 列 ${yamlError.column}`}
                          </div>
                        )}

                        {yamlError.snippet && (
                          <div className="bg-white rounded border border-red-200 p-2 mb-2">
                            <pre className="text-xs font-mono text-gray-800 whitespace-pre-wrap">
                              {yamlError.snippet}
                            </pre>
                          </div>
                        )}

                        {yamlError.suggestion && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-3">
                            <div className="text-xs font-semibold text-yellow-800 mb-1">
                              💡 修復提案:
                            </div>
                            <div className="text-xs text-yellow-700">
                              {yamlError.suggestion}
                            </div>
                          </div>
                        )}

                        <button
                          onClick={() => {
                            setShowYamlEditor(true);
                            setEditingYaml(yamlContent || '');
                          }}
                          className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          YAMLを編集して修正
                        </button>
                      </div>
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

      {/* YAML編集モーダル */}
      {showYamlEditor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            {/* モーダルヘッダー */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold">YAML編集</h2>
                <p className="text-sm text-gray-500 mt-1">
                  編集中にリアルタイムでバリデーションを実行します
                </p>
              </div>
              <button
                onClick={() => setShowYamlEditor(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* エラー表示エリア */}
            {(liveValidationError || yamlError) && (
              <div className="px-6 pt-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <svg
                      className="w-5 h-5 text-red-500 mt-0.5 mr-2 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-red-800 mb-1">
                        エラーが見つかりました
                      </h3>
                      <p className="text-sm text-red-700 mb-2">
                        {(liveValidationError || yamlError)?.message}
                      </p>

                      {(liveValidationError || yamlError)?.line && (
                        <div className="text-xs text-red-600 mb-2">
                          エラー位置: 行 {(liveValidationError || yamlError)?.line}
                          {(liveValidationError || yamlError)?.column &&
                            `, 列 ${(liveValidationError || yamlError)?.column}`}
                        </div>
                      )}

                      {(liveValidationError || yamlError)?.snippet && (
                        <div className="bg-white rounded border border-red-200 p-2 mb-2">
                          <pre className="text-xs font-mono text-gray-800 whitespace-pre-wrap">
                            {(liveValidationError || yamlError)?.snippet}
                          </pre>
                        </div>
                      )}

                      {(liveValidationError || yamlError)?.suggestion && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-3">
                          <div className="text-xs font-semibold text-yellow-800 mb-1">
                            💡 修復提案:
                          </div>
                          <div className="text-xs text-yellow-700">
                            {(liveValidationError || yamlError)?.suggestion}
                          </div>
                        </div>
                      )}

                      <button
                        onClick={applyAutoFix}
                        className="px-3 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700"
                      >
                        自動修復を試す
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!liveValidationError && !yamlError && (
              <div className="px-6 pt-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center">
                  <svg
                    className="w-5 h-5 text-green-500 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-sm text-green-700 font-medium">
                    YAMLは正常です
                  </span>
                </div>
              </div>
            )}

            {/* エディタエリア */}
            <div className="flex-1 overflow-auto p-6">
              <div className="border border-gray-300 rounded-lg overflow-hidden">
                <textarea
                  value={editingYaml}
                  onChange={(e) => handleYamlEdit(e.target.value)}
                  className="w-full h-96 p-4 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="YAMLコンテンツを入力..."
                  spellCheck={false}
                />
              </div>
              <div className="text-xs text-gray-500 mt-2">
                {editingYaml.split('\n').length} 行 | {editingYaml.length} 文字
              </div>
            </div>

            {/* モーダルフッター */}
            <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowYamlEditor(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
              >
                キャンセル
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const blob = new Blob([editingYaml], { type: 'text/yaml' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${templateName || 'template'}.yaml`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                >
                  ダウンロード
                </button>
                <button
                  onClick={saveYamlEdit}
                  disabled={!!liveValidationError}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
