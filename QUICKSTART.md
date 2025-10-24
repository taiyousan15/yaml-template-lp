# 🚀 クイックスタート：画像からYAML生成

このガイドでは、LP画像から100%再現可能なYAMLテンプレートを生成する方法を説明します。

## 📋 必要なもの

- Node.js 18以上
- Claude API キー（Anthropic）
- LP画像ファイル（PNG/JPG/WebP）

## 🎯 3ステップで生成

### ステップ1: 環境セットアップ

```bash
# プロジェクトディレクトリに移動
cd /Users/matsumototoshihiko/div/YAMLテンプレートLP/my-project

# 依存関係インストール（初回のみ）
npm install

# .envファイルにAPIキーを設定
echo "ANTHROPIC_API_KEY=sk-ant-api03-xxxxx" >> .env
```

### ステップ2: サーバー起動

```bash
# 開発サーバーを起動
npm run dev

# サーバーが起動したら以下のURLで確認
# → http://localhost:3005
```

### ステップ3: 画像からYAML生成

**方法A: コマンドラインで生成**

```bash
# 別のターミナルで実行
node test-advanced-analysis.js

# 生成されたYAMLを確認
cat generated-yamls/design-*.yaml
```

**方法B: cURLで生成**

```bash
curl -X POST http://localhost:3005/api/v1/templates/advanced-analysis \
  -F "file=@/path/to/your/design.png" \
  -o result.json

# YAMLを抽出
cat result.json | jq -r '.yaml' > design.yaml
```

**方法C: ブラウザで生成**

1. http://localhost:3005 にアクセス
2. 「画像から生成」をクリック
3. LP画像をアップロード
4. 30-40秒待つ
5. 生成されたYAMLをダウンロード

---

## 🎨 生成例

### 入力
![LP画像](https://example.com/lp-design.png)

### 出力（YAML）
```yaml
meta:
  template_version: "1.0"
  total_sections: 5

sections:
  hero:
    type: "hero"
    background:
      type: "gradient"
      gradient:
        from: "#2d1b4e"
        to: "#1a0f2e"
        direction: "to-bottom"
    texts:
      - content: "AI時代だからこそ輝く"
        fontSize: "text-4xl"
        fontWeight: "bold"
        color: "#ffffff"
    buttons:
      - text: "今すぐ申し込む"
        bgGradient:
          from: "#FFD700"
          to: "#FFA500"
```

---

## ⚡ 高度な使い方

### カスタム画像パスを指定

```bash
# test-advanced-analysis.js を編集
const IMAGE_PATH = '/path/to/your/custom-design.png';

# 実行
node test-advanced-analysis.js
```

### 複数画像を一括処理

```bash
# バッチスクリプト作成
for img in designs/*.png; do
  echo "Processing: $img"
  curl -X POST http://localhost:3005/api/v1/templates/advanced-analysis \
    -F "file=@$img" \
    -o "yamls/$(basename $img .png).json"
done
```

### API経由でプログラムから使用

```typescript
import fs from 'fs';

async function generateYAML(imagePath: string) {
  const formData = new FormData();
  const blob = new Blob([fs.readFileSync(imagePath)], { type: 'image/png' });
  formData.append('file', blob, 'design.png');

  const response = await fetch('http://localhost:3005/api/v1/templates/advanced-analysis', {
    method: 'POST',
    body: formData,
  });

  const result = await response.json();
  return result.yaml;
}

// 使用例
const yaml = await generateYAML('/path/to/design.png');
console.log(yaml);
```

---

## 🔧 トラブルシューティング

### Q1: サーバーが起動しない

```bash
# ポート3000が使用中の場合
npm run dev
# → 自動的に別のポート（例: 3005）で起動

# または手動でポート指定
PORT=3001 npm run dev
```

### Q2: APIキーエラー

```bash
# APIキーが設定されているか確認
cat .env | grep ANTHROPIC_API_KEY

# 設定されていない場合
echo "ANTHROPIC_API_KEY=sk-ant-api03-xxxxx" >> .env
```

### Q3: 画像が大きすぎる

```bash
# Sharpで圧縮（別途インストール必要）
npm install sharp

node -e "
const sharp = require('sharp');
sharp('large.png')
  .resize(1200, null, { withoutEnlargement: true })
  .jpeg({ quality: 80 })
  .toFile('compressed.jpg');
"
```

### Q4: 生成が遅い

**原因**: Claude APIの処理時間（通常30-60秒）

**対策**:
- 画像サイズを1200px以下に縮小
- セグメント数を減らす（プロンプト調整）

---

## 📊 処理時間目安

| 画像サイズ | セグメント数 | 処理時間 |
|-----------|------------|---------|
| 800x1200px | 3-5 | 30-40秒 |
| 1200x1800px | 6-8 | 50-70秒 |
| 1500x2500px | 9-12 | 80-120秒 |

---

## 💡 Tips

### Tip 1: 生成されたYAMLをすぐに表示

```bash
# YAML生成後、ブラウザで確認
node test-advanced-analysis.js && \
  open "http://localhost:3005/yaml-renderer?yaml=$(cat generated-yamls/design-*.yaml | base64)"
```

### Tip 2: JSONからYAMLだけ抽出

```bash
# jqを使用
cat result.json | jq -r '.yaml' > design.yaml

# Pythonを使用
python3 -c "import json; print(json.load(open('result.json'))['yaml'])" > design.yaml
```

### Tip 3: 生成ログを保存

```bash
node test-advanced-analysis.js 2>&1 | tee generation.log
```

---

## 🎓 次のステップ

1. **YAMLをカスタマイズ**: 生成されたYAMLを編集してテキストを変更
2. **レンダラーで確認**: `/yaml-renderer` でプレビュー
3. **デプロイ**: Vercelにデプロイして公開

詳細は [ADVANCED_YAML_GENERATION.md](./ADVANCED_YAML_GENERATION.md) を参照してください。

---

**Happy Generating! 🎉**
