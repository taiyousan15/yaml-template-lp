'use client'

import { useState, useRef } from 'react'
import { ChromePicker } from 'react-color'

interface Block {
  id: string
  type: 'Text' | 'Image' | 'Button' | 'Frame'
  bbox: {
    x: number
    y: number
    width: number
    height: number
  }
  text?: string
  confidence?: number
  color?: string
}

interface DiffMetrics {
  ssim: number
  colorDelta: number
  layoutDelta: number
}

export default function WizardFromImagePage() {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [blocks, setBlocks] = useState<Block[]>([])
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [diffMetrics, setDiffMetrics] = useState<DiffMetrics | null>(null)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [templateId, setTemplateId] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // ステップ1: 画像アップロード
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // ファイルサイズチェック (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('ファイルサイズは10MB以下にしてください')
      return
    }

    // プレビュー表示
    const reader = new FileReader()
    reader.onload = (event) => {
      setUploadedImage(event.target?.result as string)
      setStep(2)
      processImage(file)
    }
    reader.readAsDataURL(file)
  }

  // ステップ2: 自動解析
  const processImage = async (file: File) => {
    setIsProcessing(true)
    setProgress(0)

    try {
      // FormData作成
      const formData = new FormData()
      formData.append('file', file)

      // 進捗シミュレーション
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90))
      }, 500)

      // API呼び出し
      const response = await fetch('/api/v1/templates/from-image', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)

      if (!response.ok) {
        throw new Error('画像解析に失敗しました')
      }

      const result = await response.json()

      setProgress(100)
      setBlocks(result.blocks || [])
      setDiffMetrics(result.diffMetrics)
      setTemplateId(result.templateId)
      setStep(3)
    } catch (error) {
      console.error('画像解析エラー:', error)
      alert('画像解析に失敗しました')
    } finally {
      setIsProcessing(false)
    }
  }

  // ステップ3: 検出枠プレビュー & ステップ4: 手動補正
  const handleBlockSelect = (blockId: string) => {
    setSelectedBlockId(blockId)
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleBlockDragEnd = (blockId: string, newPos: { x: number; y: number }) => {
    setBlocks((prev) =>
      prev.map((block) =>
        block.id === blockId
          ? { ...block, bbox: { ...block.bbox, x: newPos.x, y: newPos.y } }
          : block
      )
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleBlockTransform = (blockId: string, newAttrs: { x: number; y: number; width: number; height: number; scaleX: number; scaleY: number }) => {
    setBlocks((prev) =>
      prev.map((block) =>
        block.id === blockId
          ? {
              ...block,
              bbox: {
                x: newAttrs.x,
                y: newAttrs.y,
                width: newAttrs.width * newAttrs.scaleX,
                height: newAttrs.height * newAttrs.scaleY,
              },
            }
          : block
      )
    )
  }

  const handleBlockTypeChange = (blockId: string, newType: Block['type']) => {
    setBlocks((prev) =>
      prev.map((block) => (block.id === blockId ? { ...block, type: newType } : block))
    )
  }

  const handleColorChange = (color: { hex: string }) => {
    if (!selectedBlockId) return

    setBlocks((prev) =>
      prev.map((block) => (block.id === selectedBlockId ? { ...block, color: color.hex } : block))
    )
  }

  // ステップ5: YAML保存
  const handleSaveTemplate = async () => {
    if (!templateId) return

    try {
      const response = await fetch(`/api/v1/templates/${templateId}/fix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocks }),
      })

      if (!response.ok) {
        throw new Error('テンプレート保存に失敗しました')
      }

      const result = await response.json()

      // テストモード: ローカルストレージに保存
      const savedTemplates = JSON.parse(localStorage.getItem('savedTemplates') || '[]')
      const newTemplate = {
        id: templateId,
        name: `画像から作成 ${new Date().toLocaleDateString('ja-JP')}`,
        description: `${blocks.length}個のブロックを含むテンプレート`,
        tags: ['自動生成', '画像から作成'],
        priceCents: 0,
        thumbnail: uploadedImage || '',
        requiredVars: blocks.map(b => b.id),
        author: 'あなた',
        usageCount: 0,
        blocks: blocks,
        diffMetrics: result.diffMetrics,
        createdAt: new Date().toISOString(),
      }
      savedTemplates.push(newTemplate)
      localStorage.setItem('savedTemplates', JSON.stringify(savedTemplates))

      alert('テンプレートを保存しました！')
      // テンプレートカタログへ遷移
      window.location.href = '/templates'
    } catch (error) {
      console.error('保存エラー:', error)
      alert('保存に失敗しました')
    }
  }

  const selectedBlock = blocks.find((b) => b.id === selectedBlockId)

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">画像からテンプレート作成</h1>

        {/* ステップインジケーター */}
        <div className="mb-8 flex items-center justify-center space-x-4">
          {[1, 2, 3, 4, 5].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  step >= s ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
                }`}
              >
                {s}
              </div>
              {s < 5 && <div className="w-16 h-1 bg-gray-300 mx-2" />}
            </div>
          ))}
        </div>

        {/* ステップ1: 画像アップロード */}
        {step === 1 && (
          <div className="bg-white rounded-lg shadow p-8">
            <h2 className="text-2xl font-bold mb-4">画像をアップロード</h2>
            <p className="text-gray-600 mb-4">LPのスクリーンショットをアップロードしてください（最大10MB）</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
        )}

        {/* ステップ2: 自動解析進捗 */}
        {step === 2 && (
          <div className="bg-white rounded-lg shadow p-8">
            <h2 className="text-2xl font-bold mb-4">自動解析中...</h2>
            <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
              <div
                className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-gray-600">{progress}% 完了</p>
          </div>
        )}

        {/* ステップ3 & 4: 検出枠プレビュー & 手動補正 */}
        {(step === 3 || step === 4) && uploadedImage && (
          <div className="grid grid-cols-3 gap-8">
            {/* キャンバス */}
            <div className="col-span-2 bg-white rounded-lg shadow p-4">
              <h2 className="text-xl font-bold mb-4">検出結果</h2>
              <div className="relative bg-gray-100 rounded-lg overflow-hidden" style={{ width: 800, height: 600 }}>
                {/* 背景画像 */}
                <img
                  src={uploadedImage}
                  alt="Uploaded"
                  className="absolute inset-0 w-full h-full object-contain"
                />

                {/* 検出ブロック */}
                {blocks.map((block) => (
                  <div
                    key={block.id}
                    className={`absolute cursor-move border-2 transition-all ${
                      block.id === selectedBlockId ? 'border-blue-500 border-4' : 'border-green-500'
                    }`}
                    style={{
                      left: block.bbox.x,
                      top: block.bbox.y,
                      width: block.bbox.width,
                      height: block.bbox.height,
                      borderColor: block.color || '#10B981',
                    }}
                    onClick={() => handleBlockSelect(block.id)}
                  >
                    {/* ブロックラベル */}
                    <div className="absolute -top-6 left-0 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                      {block.type} {block.confidence ? `(${block.confidence}%)` : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* サイドバー */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-lg font-bold mb-4">プロパティ</h3>

              {selectedBlock ? (
                <div className="space-y-4">
                  {/* 種別変更 */}
                  <div>
                    <label className="block text-sm font-medium mb-2">種別</label>
                    <select
                      value={selectedBlock.type}
                      onChange={(e) =>
                        handleBlockTypeChange(selectedBlock.id, e.target.value as Block['type'])
                      }
                      className="w-full border rounded px-3 py-2"
                    >
                      <option value="Text">テキスト</option>
                      <option value="Image">画像</option>
                      <option value="Button">ボタン</option>
                      <option value="Frame">フレーム</option>
                    </select>
                  </div>

                  {/* テキスト編集 */}
                  {selectedBlock.type === 'Text' && (
                    <div>
                      <label className="block text-sm font-medium mb-2">テキスト</label>
                      <textarea
                        value={selectedBlock.text || ''}
                        onChange={(e) => {
                          setBlocks((prev) =>
                            prev.map((b) =>
                              b.id === selectedBlock.id ? { ...b, text: e.target.value } : b
                            )
                          )
                        }}
                        className="w-full border rounded px-3 py-2"
                        rows={3}
                      />
                    </div>
                  )}

                  {/* 色吸い取り */}
                  <div>
                    <label className="block text-sm font-medium mb-2">色</label>
                    <button
                      onClick={() => setShowColorPicker(!showColorPicker)}
                      className="w-full bg-gray-100 border rounded px-3 py-2 flex items-center justify-between"
                    >
                      <span>色を選択</span>
                      <div
                        className="w-6 h-6 rounded"
                        style={{ backgroundColor: selectedBlock.color || '#10B981' }}
                      />
                    </button>
                    {showColorPicker && (
                      <div className="mt-2">
                        <ChromePicker
                          color={selectedBlock.color || '#10B981'}
                          onChange={handleColorChange}
                        />
                      </div>
                    )}
                  </div>

                  {/* 信頼度 */}
                  {selectedBlock.confidence !== undefined && (
                    <div>
                      <label className="block text-sm font-medium mb-2">信頼度</label>
                      <div className="flex items-center">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              selectedBlock.confidence >= 80
                                ? 'bg-green-500'
                                : selectedBlock.confidence >= 60
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${selectedBlock.confidence}%` }}
                          />
                        </div>
                        <span className="ml-2 text-sm">{selectedBlock.confidence}%</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">ブロックを選択してください</p>
              )}

              {/* 差分メトリクス */}
              {diffMetrics && (
                <div className="mt-6 pt-6 border-t">
                  <h4 className="font-bold mb-2">品質メトリクス</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>SSIM:</span>
                      <span className="font-medium">{diffMetrics.ssim.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>色差:</span>
                      <span className="font-medium">{diffMetrics.colorDelta.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>レイアウト差:</span>
                      <span className="font-medium">{diffMetrics.layoutDelta.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 次へボタン */}
              <button
                onClick={() => setStep(5)}
                className="w-full mt-6 bg-blue-600 text-white rounded px-4 py-2 hover:bg-blue-700"
              >
                次へ
              </button>
            </div>
          </div>
        )}

        {/* ステップ5: YAML保存 */}
        {step === 5 && (
          <div className="bg-white rounded-lg shadow p-8">
            <h2 className="text-2xl font-bold mb-4">テンプレートを保存</h2>
            <p className="text-gray-600 mb-6">補正が完了しました。テンプレートを保存しますか？</p>
            <div className="flex space-x-4">
              <button
                onClick={() => setStep(4)}
                className="px-6 py-2 border rounded hover:bg-gray-50"
              >
                戻る
              </button>
              <button
                onClick={handleSaveTemplate}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                保存
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
