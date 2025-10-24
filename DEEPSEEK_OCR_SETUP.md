# DeepSeek-OCR セットアップガイド

このドキュメントでは、DeepSeek-OCRモデルを使用してLP画像をYAMLに変換する方法を説明します。

## 📋 必要要件

### ハードウェア要件
- **NVIDIA GPU**: CUDA対応GPU (VRAM 8GB以上推奨)
- **CUDA**: バージョン 11.8以上
- **メモリ**: 16GB以上推奨

### ソフトウェア要件
- **Python**: 3.8以上
- **CUDA Toolkit**: 11.8以上

## 🚀 インストール手順

### 1. Python環境のセットアップ

```bash
# プロジェクトディレクトリに移動
cd /path/to/my-project

# 仮想環境作成（推奨）
python3 -m venv venv
source venv/bin/activate  # Windowsの場合: venv\Scripts\activate

# 依存関係のインストール
pip install -r python/requirements.txt

# Flash Attention をインストール（別途実行が必要）
pip install flash-attn==2.7.3 --no-build-isolation
```

### 2. DeepSeek-OCRモデルのダウンロード

初回実行時に自動でダウンロードされます（約10GB）。

```bash
# テスト実行（モデルダウンロード確認）
python3 python/deepseek_ocr_processor.py --help
```

## 💻 使用方法

### コマンドライン使用

```bash
# 基本的な使い方
python3 python/deepseek_ocr_processor.py path/to/landing_page.jpg --output output.yaml

# オプション指定
python3 python/deepseek_ocr_processor.py \
  path/to/image.jpg \
  --output output.yaml \
  --base-size 1024 \
  --image-size 640 \
  --output-dir ./output

# ヘルプ表示
python3 python/deepseek_ocr_processor.py --help
```

### Next.js API経由の使用

#### 1. API エンドポイント

```typescript
POST /api/v1/templates/deepseek-ocr

// リクエスト
FormData {
  file: File (LP画像)
}

// レスポンス
{
  success: boolean,
  yaml: string,  // 生成されたYAML
  markdown: string,  // 中間Markdown（デバッグ用）
  processingTime: number,  // 処理時間（ミリ秒）
  metadata: {
    sessionId: string,
    modelType: 'DeepSeek-OCR',
    imageSize: number,
    processingTime: number
  }
}
```

#### 2. フロントエンドからの呼び出し例

```typescript
async function generateYAMLWithDeepSeek(imageFile: File) {
  const formData = new FormData();
  formData.append('file', imageFile);

  const response = await fetch('/api/v1/templates/deepseek-ocr', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  const data = await response.json();
  return data.yaml;  // YAMLテキスト
}
```

## 🔧 パラメータ設定

### DeepSeek-OCR パラメータ

| パラメータ | デフォルト値 | 説明 |
|-----------|-------------|------|
| `base_size` | 1024 | ベースサイズ（推奨: 1024） |
| `image_size` | 640 | 画像サイズ（推奨: 640） |
| `crop_mode` | True | クロップモード（Gundam設定） |
| `save_results` | True | 中間結果の保存 |
| `test_compress` | True | 圧縮テスト |

### 推奨設定（Gundam Configuration）

```python
processor.process_image_to_yaml(
    image_path='path/to/image.jpg',
    base_size=1024,    # Gundam設定
    image_size=640,    # Gundam設定
    crop_mode=True,    # Gundam設定
    save_results=True,
)
```

## 📊 処理フロー

```
LP画像入力
    ↓
DeepSeek-OCR モデル実行
    ↓
Markdown形式で抽出
    ├─ 見出し検出
    ├─ テキスト抽出
    ├─ ボタン検出
    └─ リスト項目検出
    ↓
YAML構造化変換
    ├─ セクション分割
    ├─ デザイン情報付与
    └─ Tailwind CSSクラス割り当て
    ↓
YAML出力
```

## 🆚 Claude API vs DeepSeek-OCR

| 項目 | Claude API (マルチエージェント) | DeepSeek-OCR |
|-----|--------------------------------|--------------|
| **精度** | ⭐⭐⭐⭐⭐ 非常に高い | ⭐⭐⭐⭐ 高い |
| **速度** | ⭐⭐⭐ 中速 (30-60秒) | ⭐⭐⭐⭐ 高速 (10-30秒) |
| **コスト** | 💰💰💰 API料金発生 | 💰 GPU利用料のみ |
| **GPU要件** | ❌ 不要 | ✅ 必須 (CUDA対応) |
| **デザイン再現** | ⭐⭐⭐⭐⭐ 完璧 | ⭐⭐⭐ 良好 |
| **セグメント分析** | ✅ 5段階分析 | ❌ シンプル変換 |

### 使い分けの推奨

- **Claude API**: 本番環境、高精度が必要な場合
- **DeepSeek-OCR**: 開発環境、GPUサーバー利用可能な場合、コスト削減

## 🐛 トラブルシューティング

### CUDA が見つからないエラー

```
Error: CUDA not available
```

**解決方法:**
1. NVIDIA GPUドライバーをインストール
2. CUDA Toolkit をインストール (https://developer.nvidia.com/cuda-downloads)
3. `nvidia-smi` コマンドで GPU認識を確認

### メモリ不足エラー

```
RuntimeError: CUDA out of memory
```

**解決方法:**
- `--image-size` を小さくする（例: 512）
- `--base-size` を小さくする（例: 512）
- より大きなVRAMを持つGPUを使用

### モデルダウンロードエラー

```
Error downloading model
```

**解決方法:**
1. インターネット接続を確認
2. Hugging Face Hubへのアクセスを確認
3. 手動ダウンロード:
   ```bash
   huggingface-cli download deepseek-ai/DeepSeek-OCR
   ```

### Python パッケージエラー

```
ModuleNotFoundError: No module named 'transformers'
```

**解決方法:**
```bash
pip install --upgrade -r python/requirements.txt
```

## 📝 実装例

### 例1: 基本的なCLI使用

```bash
# シンプルな実行
python3 python/deepseek_ocr_processor.py sample_lp.jpg --output lp_output.yaml

# 出力内容確認
cat lp_output.yaml
```

### 例2: Next.js統合

```typescript
// pages/api/custom-deepseek.ts
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File;

  const response = await fetch('http://localhost:3000/api/v1/templates/deepseek-ocr', {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();
  res.status(200).json(data);
}
```

## 🔗 関連ファイル

- **Pythonスクリプト**: `python/deepseek_ocr_processor.py`
- **APIエンドポイント**: `app/api/v1/templates/deepseek-ocr/route.ts`
- **依存関係**: `python/requirements.txt`

## 📚 参考資料

- [DeepSeek-OCR GitHub](https://github.com/deepseek-ai/DeepSeek-OCR)
- [Hugging Face Model Card](https://huggingface.co/deepseek-ai/DeepSeek-OCR)
- [Flash Attention](https://github.com/Dao-AILab/flash-attention)
- [PyTorch CUDA Setup](https://pytorch.org/get-started/locally/)

## 💡 Tips

### パフォーマンス最適化

1. **バッチ処理**: 複数画像を一度に処理
   ```python
   images = ['img1.jpg', 'img2.jpg', 'img3.jpg']
   for img in images:
       processor.process_image_to_yaml(img, output_yaml_path=f'{img}.yaml')
   ```

2. **GPU メモリ管理**:
   ```python
   import torch
   torch.cuda.empty_cache()  # 処理後にキャッシュクリア
   ```

3. **並列処理**: 複数GPUがある場合
   ```bash
   CUDA_VISIBLE_DEVICES=0 python script.py image1.jpg &
   CUDA_VISIBLE_DEVICES=1 python script.py image2.jpg &
   ```

## ⚠️ 注意事項

1. **初回実行時間**: モデルダウンロードに10-30分かかります
2. **VRAM使用量**: 推奨8GB以上（最小4GB）
3. **ライセンス**: DeepSeek-OCRのライセンスを確認してください
4. **本番環境**: GPU環境が必要なため、クラウドGPUインスタンス推奨

## 🎯 次のステップ

1. 環境セットアップ完了後、サンプル画像でテスト
2. 生成されたYAMLを`/yaml-renderer`で確認
3. 必要に応じてパラメータ調整
4. 本番環境へのデプロイ検討（GPU Cloud環境）

---

**質問やバグレポート**: GitHubのIssuesページへお願いします
