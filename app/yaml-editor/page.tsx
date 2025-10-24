'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import yaml from 'js-yaml';

interface YAMLVariable {
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean';
}

export default function YAMLEditorPage() {
  const [yamlText, setYamlText] = useState('');
  const [parsedData, setParsedData] = useState<any>(null);
  const [variables, setVariables] = useState<YAMLVariable[]>([]);
  const [editedValues, setEditedValues] = useState<Record<string, any>>({});
  const [previewHTML, setPreviewHTML] = useState('');
  const [parseError, setParseError] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // サンプルYAMLテンプレート
  const sampleYAML = `# LPテンプレート設定
meta:
  title: "今すぐ始める副業LP"
  description: "在宅でできる副業を紹介"

hero:
  headline: "なぜ、スキル、実績、経験に自信なし！"
  subheadline: "テキストここここここここ"
  cta_text: "今すぐ無料で始める"
  background_color: "#1a1a2e"

features:
  - title: "年間300万円も売上5%の成果報酬の契約"
    description: "平日は1日2時間副業、土日は副業で稼ぐ"
    icon: "⚡"

  - title: "単発、時間、お金をかけない"
    description: "専属の構築で非常識に質疑して対等なパートナーとして認めてもらう"
    icon: "💰"

cta:
  button_text: "今すぐ無料オンラインプログラムに参加する"
  button_color: "#ff6b6b"
  form_placeholder: "メールアドレス（Gメール以外のメール推奨）"

footer:
  company: "シャドーマーケッター®"
  subtitle: "無料オンラインプログラム"
  disclaimer: "iCloud, Outlook, docomo, au, softbankは届きません。それ以外のメールアドレスをご利用ください。"
`;

  // YAMLをパースして変数を抽出
  const parseYAML = (yamlString: string) => {
    try {
      const parsed = yaml.load(yamlString);
      setParsedData(parsed);
      setParseError('');

      // 全ての変数を抽出
      const vars = extractVariables(parsed);
      setVariables(vars);

      // 初期値を設定
      const initialValues: Record<string, any> = {};
      vars.forEach(v => {
        initialValues[v.key] = v.value;
      });
      setEditedValues(initialValues);

      return parsed;
    } catch (error: any) {
      setParseError(`YAMLパースエラー: ${error.message}`);
      return null;
    }
  };

  // オブジェクトから変数を再帰的に抽出
  const extractVariables = (obj: any, prefix = ''): YAMLVariable[] => {
    const vars: YAMLVariable[] = [];

    for (const key in obj) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      const value = obj[key];

      if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
        vars.push(...extractVariables(value, fullKey));
      } else if (Array.isArray(value)) {
        value.forEach((item, index) => {
          if (typeof item === 'object') {
            vars.push(...extractVariables(item, `${fullKey}[${index}]`));
          } else {
            vars.push({
              key: `${fullKey}[${index}]`,
              value: String(item),
              type: typeof item as 'string' | 'number' | 'boolean',
            });
          }
        });
      } else {
        vars.push({
          key: fullKey,
          value: String(value),
          type: typeof value as 'string' | 'number' | 'boolean',
        });
      }
    }

    return vars;
  };

  // 編集された値でYAMLデータを更新
  const updateYAMLData = (key: string, value: any) => {
    setEditedValues(prev => ({ ...prev, [key]: value }));
  };

  // 編集された値を反映したオブジェクトを作成
  const getUpdatedData = () => {
    if (!parsedData) return null;

    const updated = JSON.parse(JSON.stringify(parsedData));

    Object.entries(editedValues).forEach(([key, value]) => {
      const keys = key.replace(/\[(\d+)\]/g, '.$1').split('.');
      let current = updated;

      for (let i = 0; i < keys.length - 1; i++) {
        if (!(keys[i] in current)) return;
        current = current[keys[i]];
      }

      const lastKey = keys[keys.length - 1];
      if (current && lastKey in current) {
        current[lastKey] = value;
      }
    });

    return updated;
  };

  // HTMLプレビューを生成
  const generatePreview = () => {
    const data = getUpdatedData();
    if (!data) return;

    const html = `
      <!DOCTYPE html>
      <html lang="ja">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${data.meta?.title || 'LP'}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Helvetica Neue', Arial, sans-serif; }
          .hero {
            background: ${data.hero?.background_color || '#1a1a2e'};
            color: white;
            padding: 80px 20px;
            text-align: center;
          }
          .hero h1 { font-size: 2.5rem; margin-bottom: 20px; font-weight: bold; }
          .hero p { font-size: 1.2rem; margin-bottom: 30px; }
          .cta-button {
            background: ${data.cta?.button_color || '#ff6b6b'};
            color: white;
            padding: 15px 40px;
            border: none;
            border-radius: 8px;
            font-size: 1.1rem;
            cursor: pointer;
            font-weight: bold;
          }
          .features {
            padding: 60px 20px;
            background: #f8f9fa;
          }
          .features-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 30px;
            max-width: 1200px;
            margin: 0 auto;
          }
          .feature-card {
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
          .feature-card .icon { font-size: 3rem; margin-bottom: 15px; }
          .feature-card h3 { font-size: 1.5rem; margin-bottom: 10px; }
          .feature-card p { color: #666; line-height: 1.6; }
          .cta-section {
            background: #fff;
            padding: 80px 20px;
            text-align: center;
          }
          .form-input {
            padding: 15px;
            width: 100%;
            max-width: 400px;
            border: 2px solid #ddd;
            border-radius: 8px;
            font-size: 1rem;
            margin: 20px auto;
            display: block;
          }
          .footer {
            background: #1a1a2e;
            color: white;
            padding: 40px 20px;
            text-align: center;
          }
          .footer h2 { font-size: 2rem; margin-bottom: 10px; }
          .footer p { margin-bottom: 5px; color: #ccc; font-size: 0.9rem; }
        </style>
      </head>
      <body>
        <section class="hero">
          <h1>${data.hero?.headline || ''}</h1>
          <p>${data.hero?.subheadline || ''}</p>
          <button class="cta-button">${data.hero?.cta_text || 'クリック'}</button>
        </section>

        <section class="features">
          <div class="features-grid">
            ${(data.features || []).map((f: any) => `
              <div class="feature-card">
                <div class="icon">${f.icon || '⭐'}</div>
                <h3>${f.title || ''}</h3>
                <p>${f.description || ''}</p>
              </div>
            `).join('')}
          </div>
        </section>

        <section class="cta-section">
          <h2>${data.cta?.button_text || '今すぐ始める'}</h2>
          <input type="email" class="form-input" placeholder="${data.cta?.form_placeholder || 'メールアドレス'}" />
          <button class="cta-button">${data.cta?.button_text || '送信'}</button>
        </section>

        <footer class="footer">
          <h2>${data.footer?.company || ''}</h2>
          <p>${data.footer?.subtitle || ''}</p>
          <p style="font-size: 0.8rem; margin-top: 20px;">${data.footer?.disclaimer || ''}</p>
        </footer>
      </body>
      </html>
    `;

    setPreviewHTML(html);
  };

  // 初期化時にサンプルYAMLを読み込み
  useEffect(() => {
    setYamlText(sampleYAML);
    parseYAML(sampleYAML);
  }, []);

  // 値が変更されたらプレビューを更新
  useEffect(() => {
    if (parsedData) {
      generatePreview();
    }
  }, [editedValues, parsedData]);

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
              <h1 className="text-2xl font-bold text-gray-900">YAMLテンプレートエディタ</h1>
            </div>
            <button
              onClick={() => {
                const blob = new Blob([previewHTML], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'landing-page.html';
                a.click();
              }}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              HTMLダウンロード
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* YAML入力エリア */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">YAMLテンプレート</h2>
              <textarea
                value={yamlText}
                onChange={(e) => {
                  setYamlText(e.target.value);
                  parseYAML(e.target.value);
                }}
                className="w-full h-96 border border-gray-300 rounded-lg p-3 font-mono text-sm"
                placeholder="YAMLテンプレートを貼り付けてください..."
              />
              {parseError && (
                <div className="mt-2 text-red-600 text-sm">{parseError}</div>
              )}
              <button
                onClick={() => {
                  setYamlText(sampleYAML);
                  parseYAML(sampleYAML);
                }}
                className="mt-4 w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                サンプルYAMLを読み込む
              </button>
            </div>
          </div>

          {/* 変数編集エリア */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">変数編集</h2>
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {variables.map((variable) => (
                  <div key={variable.key}>
                    <label className="block text-sm font-medium mb-2">
                      {variable.key}
                    </label>
                    {variable.value.length > 50 ? (
                      <textarea
                        value={editedValues[variable.key] || variable.value}
                        onChange={(e) => updateYAMLData(variable.key, e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        rows={3}
                      />
                    ) : (
                      <input
                        type="text"
                        value={editedValues[variable.key] || variable.value}
                        onChange={(e) => updateYAMLData(variable.key, e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* プレビューエリア */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 sticky top-8">
              <h2 className="text-lg font-semibold mb-4">ライブプレビュー</h2>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <iframe
                  srcDoc={previewHTML}
                  className="w-full h-[600px]"
                  title="Preview"
                />
              </div>
              <div className="mt-4 text-xs text-gray-500 text-center">
                ⚡ リアルタイムプレビュー
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
