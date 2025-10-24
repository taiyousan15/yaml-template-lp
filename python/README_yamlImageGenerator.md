# yamlImageGenerator.py - YAMLテンプレート画像生成エンジン

## 概要

YAMLテンプレートファイルから高品質な画像を生成するPythonスクリプトです。

## 機能

### コア機能
- ✅ 背景色の正確な再現
- ✅ 枠線（stroke）の描画
- ✅ 角丸矩形（corner_radius）の描画
- ✅ テキストハイライト機能
- ✅ 日本語フォント対応（Noto Sans JP / AppleSDGothicNeo）
- ✅ 水平・垂直レイアウトの正確な配置
- ✅ パディングとスペーシングの処理
- ✅ 画像プレースホルダーの描画
- ✅ 画像サイズの自動計算
- ✅ 高品質PNG出力（quality=95, optimize=True）

### サポートする要素

#### Frame / AutoLayout
```yaml
type: "Frame" または "AutoLayout"
layout_mode: "VERTICAL" または "HORIZONTAL"
spacing: 数値（要素間のスペース）
padding: { top: 数値, right: 数値, bottom: 数値, left: 数値 }
background_color: "#RRGGBB"
corner_radius: 数値
stroke: { color: "#RRGGBB", weight: 数値 }
children: [子要素の配列]
```

#### Text
```yaml
type: "Text"
content: "テキスト内容（改行は\nを使用）"
font:
  family: "Noto Sans JP"
  weight: "Regular|Medium|Bold"
  size: 数値
fills:
  - type: "SOLID"
    color: "#RRGGBB"
background_color: "#RRGGBB"（オプション：テキスト背景色）
highlights:
  - text: "ハイライトするテキスト"
    color: "#RRGGBB"
```

#### Image
```yaml
type: "Image"
content: "画像ファイル名"
width: 数値
height: 数値
corner_radius: 数値
```

## 使用方法

### 基本的な使い方

```bash
python yamlImageGenerator.py <yaml_file> --output <output_path>
```

### オプション付き

```bash
python yamlImageGenerator.py template.yaml --output output.png --width 800 --height 600
```

### コマンドライン引数

- `yaml_file` (必須): YAMLテンプレートファイルのパス
- `--output`, `-o` (必須): 出力画像ファイルのパス
- `--width`, `-w` (オプション): 画像の幅（省略時は自動計算）
- `--height`, `-H` (オプション): 画像の高さ（省略時は自動計算）
- `--verbose`, `-v` (オプション): 詳細ログを表示

## テンプレート例

### シンプルなバナー

```yaml
type: "Frame"
layout_mode: "VERTICAL"
background_color: "#1a1a2e"
padding:
  top: 40
  right: 40
  bottom: 40
  left: 40
spacing: 20
corner_radius: 10

children:
  - type: "Text"
    content: "見出しテキスト"
    font:
      family: "Noto Sans JP"
      weight: "Bold"
      size: 32
    fills:
      - type: "SOLID"
        color: "#FFFFFF"

  - type: "Text"
    content: "説明文テキスト"
    font:
      family: "Noto Sans JP"
      weight: "Regular"
      size: 16
    fills:
      - type: "SOLID"
        color: "#CCCCCC"
```

### テキストハイライト付き

```yaml
type: "Text"
content: "重要なキーワードをハイライトします"
font:
  family: "Noto Sans JP"
  weight: "Regular"
  size: 20
fills:
  - type: "SOLID"
    color: "#FFFFFF"
highlights:
  - text: "重要"
    color: "#F59E0B"
  - text: "キーワード"
    color: "#F59E0B"
```

### 水平レイアウト

```yaml
type: "Frame"
layout_mode: "HORIZONTAL"
spacing: 30
padding:
  top: 20
  right: 20
  bottom: 20
  left: 20

children:
  - type: "Image"
    content: "image.jpg"
    width: 200
    height: 200

  - type: "Text"
    content: "画像の横にテキスト"
    font:
      family: "Noto Sans JP"
      weight: "Regular"
      size: 16
    fills:
      - type: "SOLID"
        color: "#000000"
```

## 技術詳細

### アーキテクチャ

スクリプトは以下の4つのクラスで構成されています：

1. **FontManager**: フォントの検索、読み込み、キャッシュ管理
2. **LayoutEngine**: 要素のサイズ計算とレイアウト処理
3. **ImageRenderer**: 画像への描画処理
4. **YAMLImageGenerator**: メインの制御クラス

### フォント対応

#### Linux
- Noto Sans CJK JP（Regular, Medium, Bold）
- パス: `/usr/share/fonts/opentype/noto/`, `/usr/share/fonts/truetype/noto/`

#### macOS
- AppleSDGothicNeo.ttc（フォールバック）
- Hiragino Sans GB.ttc（フォールバック）
- パス: `/System/Library/Fonts/`, `/Library/Fonts/`

#### Windows
- Noto Sans JP（インストールが必要）
- パス: `C:/Windows/Fonts`

### 依存関係

```bash
pip install Pillow PyYAML
```

- **Pillow**: 画像生成とテキスト描画
- **PyYAML**: YAMLファイルの読み込み

## トラブルシューティング

### フォントが見つからない場合

**エラー:**
```
WARNING - Font not found: Noto Sans JP Regular, using fallback
WARNING - No fonts available, using default font
```

**解決方法:**

#### Linux (Ubuntu/Debian)
```bash
sudo apt-get install fonts-noto-cjk
```

#### macOS
システムフォント（AppleSDGothicNeo）が自動的に使用されます。

#### Windows
1. [Google Fonts](https://fonts.google.com/noto/specimen/Noto+Sans+JP)からNoto Sans JPをダウンロード
2. フォントファイルを `C:/Windows/Fonts` にインストール

### 画像が生成されない場合

1. YAMLファイルの構文が正しいか確認
2. 出力ディレクトリへの書き込み権限を確認
3. `--verbose` オプションで詳細ログを確認

```bash
python yamlImageGenerator.py template.yaml --output output.png --verbose
```

## 実装例

### Node.jsから呼び出す

```typescript
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function generateImage(yamlPath: string, outputPath: string) {
  const command = `python3 python/yamlImageGenerator.py ${yamlPath} --output ${outputPath}`;

  try {
    const { stdout, stderr } = await execAsync(command);
    console.log('Image generated:', outputPath);
    return outputPath;
  } catch (error) {
    console.error('Failed to generate image:', error);
    throw error;
  }
}
```

### 変数置き換え

YAMLテンプレート内で `{{variable}}` 形式の変数を使用できます：

```python
import re
import yaml

def replace_variables(template, variables):
    """テンプレート内の変数を置き換える"""
    template_str = yaml.dump(template, allow_unicode=True)

    for key, value in variables.items():
        pattern = r'\{\{' + key + r'\}\}'
        template_str = re.sub(pattern, value, template_str)

    return yaml.safe_load(template_str)

# 使用例
with open('template.yaml', 'r') as f:
    template = yaml.safe_load(f)

variables = {
    'headline': 'サンプル見出し',
    'description': '説明文\n改行も可能'
}

processed = replace_variables(template, variables)

with open('processed.yaml', 'w') as f:
    yaml.dump(processed, f, allow_unicode=True)
```

## パフォーマンス

- **小規模テンプレート** (3-5要素): ~0.1秒
- **中規模テンプレート** (10-20要素): ~0.3秒
- **大規模テンプレート** (50+要素): ~1秒

フォントキャッシュにより、同じフォントの再利用時は高速化されます。

## 既知の制限

1. **画像の読み込み**: 現在は画像プレースホルダーのみ対応（実際の画像ファイルの読み込みは未実装）
2. **テキストの自動改行**: 固定幅でのテキスト折り返しは未対応
3. **グラデーション**: 単色の背景のみ対応
4. **シャドウ効果**: 未対応

## 今後の拡張予定

- [ ] 実際の画像ファイルの読み込みと配置
- [ ] グラデーション背景
- [ ] シャドウ・エフェクト
- [ ] テキストの自動サイズ調整
- [ ] SVG出力対応
- [ ] カスタムフォントのアップロード対応

## ライセンス

このスクリプトはMITライセンスの下で公開されています。

## サポート

問題が発生した場合は、以下を確認してください：

1. Python 3.11以上がインストールされているか
2. 必要なパッケージがインストールされているか（`pip install -r requirements.txt`）
3. YAMLファイルの構文が正しいか
4. 日本語フォントがインストールされているか

---

**最終更新**: 2025年10月24日
**バージョン**: 1.0.0
