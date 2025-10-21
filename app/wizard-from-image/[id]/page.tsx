'use client';

import { useState, useEffect } from 'react';
import { Stage, Layer, Rect, Text as KonvaText, Transformer } from 'react-konva';
import { ChromePicker } from 'react-color';

interface DetectedBlock {
  id: string;
  type: 'Text' | 'Image' | 'Button' | 'Frame';
  bbox: { x: number; y: number; width: number; height: number };
  text?: string;
  color?: string;
  confidence?: number;
}

export default function WizardPage({ params }: { params: { id: string } }) {
  const [blocks, setBlocks] = useState<DetectedBlock[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [diffMetrics, setDiffMetrics] = useState({ ssim: 0, colorDelta: 0, layoutDelta: 0 });

  useEffect(() => {
    // TODO: APIから検出結果を取得
    // モックデータ
    setBlocks([
      {
        id: 'block_1',
        type: 'Text',
        bbox: { x: 50, y: 50, width: 300, height: 60 },
        text: 'サンプル見出し',
        color: '#333333',
        confidence: 95,
      },
      {
        id: 'block_2',
        type: 'Image',
        bbox: { x: 400, y: 50, width: 200, height: 200 },
        confidence: 88,
      },
      {
        id: 'block_3',
        type: 'Button',
        bbox: { x: 150, y: 300, width: 200, height: 50 },
        text: 'CTA Button',
        color: '#FF6600',
        confidence: 92,
      },
    ]);
    setDiffMetrics({ ssim: 0.92, colorDelta: 0.05, layoutDelta: 0.03 });
  }, [params.id]);

  const selectedBlock = blocks.find((b) => b.id === selectedId);

  const handleBlockUpdate = (id: string, updates: Partial<DetectedBlock>) => {
    setBlocks(blocks.map((b) => (b.id === id ? { ...b, ...updates } : b)));
  };

  const handleTypeChange = (newType: DetectedBlock['type']) => {
    if (selectedId) {
      handleBlockUpdate(selectedId, { type: newType });
    }
  };

  const handleColorChange = (color: any) => {
    if (selectedId) {
      handleBlockUpdate(selectedId, { color: color.hex });
    }
  };

  const handleSave = async () => {
    // TODO: APIに送信
    const response = await fetch(`/api/v1/templates/${params.id}/fix`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ops: blocks.map((b) => ({
          type: 'update',
          targetId: b.id,
          value: b,
        })),
      }),
    });

    if (response.ok) {
      alert('保存しました！');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-6">手動補正ウィザード</h1>

        {/* 差分メーター */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <h2 className="font-semibold mb-3">品質メトリクス</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-gray-600">SSIM（類似度）</div>
              <div className="text-2xl font-bold text-green-600">
                {(diffMetrics.ssim * 100).toFixed(1)}%
              </div>
              {diffMetrics.ssim >= 0.9 ? (
                <div className="text-sm text-green-600">✓ 基準達成</div>
              ) : (
                <div className="text-sm text-red-600">⚠ 要改善</div>
              )}
            </div>
            <div>
              <div className="text-sm text-gray-600">色差分</div>
              <div className="text-2xl font-bold">
                {(diffMetrics.colorDelta * 100).toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">レイアウト差分</div>
              <div className="text-2xl font-bold">
                {(diffMetrics.layoutDelta * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* キャンバス */}
          <div className="col-span-2 bg-white p-4 rounded-lg shadow">
            <h2 className="font-semibold mb-3">検出プレビュー</h2>
            <div className="border-2 border-gray-300 rounded overflow-hidden">
              <Stage width={800} height={600}>
                <Layer>
                  {blocks.map((block) => (
                    <Rect
                      key={block.id}
                      x={block.bbox.x}
                      y={block.bbox.y}
                      width={block.bbox.width}
                      height={block.bbox.height}
                      stroke={
                        selectedId === block.id
                          ? '#3B82F6'
                          : block.confidence && block.confidence < 80
                          ? '#EF4444'
                          : '#10B981'
                      }
                      strokeWidth={selectedId === block.id ? 3 : 2}
                      dash={block.confidence && block.confidence < 80 ? [5, 5] : undefined}
                      draggable
                      onClick={() => setSelectedId(block.id)}
                      onDragEnd={(e) => {
                        handleBlockUpdate(block.id, {
                          bbox: {
                            ...block.bbox,
                            x: e.target.x(),
                            y: e.target.y(),
                          },
                        });
                      }}
                    />
                  ))}
                </Layer>
              </Stage>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              <p>💡 ヒント: 枠をドラッグして位置調整、クリックで選択</p>
              <p className="mt-1">
                <span className="text-green-600">■ 緑: 高信頼度</span>
                <span className="text-red-600 ml-4">■ 赤点線: 低信頼度（要確認）</span>
              </p>
            </div>
          </div>

          {/* プロパティパネル */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="font-semibold mb-3">プロパティ</h2>
            {selectedBlock ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">ID</label>
                  <div className="text-sm text-gray-600">{selectedBlock.id}</div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">要素タイプ</label>
                  <select
                    value={selectedBlock.type}
                    onChange={(e) => handleTypeChange(e.target.value as DetectedBlock['type'])}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="Text">Text</option>
                    <option value="Image">Image</option>
                    <option value="Button">Button</option>
                    <option value="Frame">Frame</option>
                  </select>
                </div>

                {selectedBlock.text && (
                  <div>
                    <label className="block text-sm font-medium mb-1">テキスト</label>
                    <input
                      type="text"
                      value={selectedBlock.text}
                      onChange={(e) => handleBlockUpdate(selectedId!, { text: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                )}

                {selectedBlock.color && (
                  <div>
                    <label className="block text-sm font-medium mb-1">色</label>
                    <div
                      className="w-full h-10 border rounded cursor-pointer"
                      style={{ backgroundColor: selectedBlock.color }}
                      onClick={() => setShowColorPicker(!showColorPicker)}
                    />
                    {showColorPicker && (
                      <div className="mt-2">
                        <ChromePicker
                          color={selectedBlock.color}
                          onChange={handleColorChange}
                        />
                      </div>
                    )}
                  </div>
                )}

                {selectedBlock.confidence && (
                  <div>
                    <label className="block text-sm font-medium mb-1">信頼度</label>
                    <div className="text-2xl font-bold">
                      {selectedBlock.confidence}%
                      {selectedBlock.confidence < 80 && (
                        <span className="text-sm text-red-600 ml-2">⚠ 要確認</span>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-1">位置・サイズ</label>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>X: {Math.round(selectedBlock.bbox.x)}px</div>
                    <div>Y: {Math.round(selectedBlock.bbox.y)}px</div>
                    <div>W: {Math.round(selectedBlock.bbox.width)}px</div>
                    <div>H: {Math.round(selectedBlock.bbox.height)}px</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-gray-500 text-center py-8">
                要素を選択してください
              </div>
            )}
          </div>
        </div>

        {/* アクションボタン */}
        <div className="mt-6 flex justify-end gap-4">
          <button
            onClick={() => window.history.back()}
            className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            保存して次へ
          </button>
        </div>
      </div>
    </div>
  );
}
