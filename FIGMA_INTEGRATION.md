# Figma統合ガイド

VS Code Figma拡張機能を使ったデザイン→開発ワークフロー

---

## 🎨 VS Code Figma拡張機能とは

**Figma for VS Code** を使うと、VS Code内でFigmaデザインを直接表示・操作できます。

### **機能:**
- ✅ VS Code内でFigmaファイルを開く
- ✅ デザインスペックの確認
- ✅ CSSコードの自動生成
- ✅ カラー、タイポグラフィの確認
- ✅ コンポーネントの検証

---

## 📦 インストール

### **方法1: VS Codeから直接インストール**

1. VS Codeを開く
2. 拡張機能タブ（Cmd+Shift+X）を開く
3. 「Figma」で検索
4. **「Figma for VS Code」** をインストール

### **方法2: コマンドラインからインストール**

```bash
code --install-extension figma.figma-vscode-extension
```

### **方法3: 推奨拡張機能から自動インストール**

このプロジェクトを開くと、VS Codeが推奨拡張機能のインストールを提案します。

---

## 🚀 セットアップ

### **1. Figmaにログイン**

1. VS Codeで **Cmd+Shift+P** を押す
2. 「Figma: Sign In」を選択
3. ブラウザでFigmaにログイン
4. VS Codeに戻る

### **2. Figmaファイルを開く**

#### **方法A: URLから開く**
1. **Cmd+Shift+P** → 「Figma: Open Figma File」
2. Figma ファイルのURLを入力
   ```
   https://www.figma.com/file/xxxxxxxxx/LP-Design
   ```

#### **方法B: ファイルブラウザから**
1. VS Codeのエクスプローラーで `.fig` ファイルをクリック
2. 自動的にFigmaビューアーで開く

---

## 💡 このプロジェクトでの活用方法

### **ワークフロー1: Figmaデザイン → YAML生成**

```
Figmaデザイン
    ↓
スクリーンショットを撮る
    ↓
DeepSeek OCRで解析（Google Colab）
    ↓
YAMLテンプレート生成
    ↓
エディターで微調整
    ↓
LPレンダリング
```

### **ワークフロー2: Figma → CSS → カスタマイズ**

1. **Figmaでデザインを開く**
   - VS Code内でFigmaファイルを表示

2. **CSSコードを取得**
   - デザイン要素を選択
   - 「Copy CSS」でスタイルをコピー

3. **YAMLテンプレートに適用**
   ```yaml
   hero:
     headline: "見出し"
     styles:
       fontSize: "48px"  # Figmaから取得
       fontWeight: "700"
       color: "#1a1a2e"
   ```

---

## 🔧 プロジェクトでの実装例

### **Figma APIを使った自動化**

FigmaデザインファイルからYAMLテンプレートを自動生成するスクリプト:

```typescript
// lib/figma-to-yaml.ts (新規作成案)
import { getFigmaFileData } from './figma-api';
import { generateYamlFromDesign } from './yaml-generator';

export async function convertFigmaToYaml(figmaFileUrl: string) {
  // Figma APIでデザインデータ取得
  const figmaData = await getFigmaFileData(figmaFileUrl);

  // YAMLテンプレート生成
  const yamlTemplate = generateYamlFromDesign(figmaData);

  return yamlTemplate;
}
```

**必要な設定:**
```bash
# .env に追加
FIGMA_ACCESS_TOKEN=your-figma-token
```

---

## 📋 Figmaトークンの取得方法

1. **Figma設定を開く**
   - https://www.figma.com/settings にアクセス

2. **Personal Access Tokensを作成**
   - 「Generate new token」をクリック
   - トークン名: 「YAML Template LP」
   - スコープ: 「File content」を選択

3. **.envファイルに設定**
   ```bash
   echo "FIGMA_ACCESS_TOKEN=figd_xxxxxxxxxxxx" >> .env
   ```

---

## 🎯 統合機能の実装（オプション）

### **機能1: Figmaインポート画面**

新しいページを追加:
```
app/figma-import/page.tsx
```

**UI:**
```
┌─────────────────────────────────────┐
│  Figma URL を入力:                  │
│  [input field]                      │
│  [Import & Generate YAML] ボタン   │
└─────────────────────────────────────┘
```

**フロー:**
1. Figma URLを入力
2. Figma APIでデザインデータ取得
3. 自動的にYAMLテンプレート生成
4. エディターで編集可能

### **機能2: リアルタイム同期**

Figmaファイルが更新されたら自動的にYAMLを更新:
```typescript
// Figma Webhookを使った同期
export async function setupFigmaWebhook(fileId: string) {
  // Figmaファイルの変更を監視
  // 変更があったらYAMLを再生成
}
```

---

## 🔄 現在のワークフロー vs Figma統合後

### **現在:**
```
1. LPのスクリーンショットを撮る
2. 画像をアップロード
3. DeepSeek OCR/Claude APIで解析
4. YAMLテンプレート生成
```

### **Figma統合後:**
```
1. Figma URLを入力するだけ
2. 自動的にYAMLテンプレート生成
3. デザインの変更も自動反映
```

**メリット:**
- ✅ スクリーンショット不要
- ✅ より高精度なレイアウト抽出
- ✅ カラー・タイポグラフィが正確
- ✅ デザイン変更の追従が簡単

---

## 📊 コスト

| 項目 | コスト |
|------|--------|
| **Figma VS Code拡張機能** | 無料 |
| **Figma API** | 無料（Figmaアカウント必要） |
| **Figma Professional** | $12/月（任意） |

**Figma無料プラン**でも利用可能です。

---

## 🎓 次のステップ

### **今すぐできること:**

1. **Figma拡張機能をインストール**
   ```bash
   code --install-extension figma.figma-vscode-extension
   ```

2. **Figmaにログイン**
   - VS Code内でサインイン

3. **デザインファイルを開く**
   - 既存のFigmaデザインがあれば表示

### **将来の実装:**

1. **Figma API統合**
   - 自動YAML生成機能
   - リアルタイム同期

2. **デザインシステム統合**
   - Figmaコンポーネント → Reactコンポーネント
   - デザイントークンの自動同期

---

## 💡 よくある質問

### **Q: Figma無料プランでも使える？**
A: はい、無料プランで十分使えます。

### **Q: Figma API は難しい？**
A: 公式ドキュメントが充実しており、比較的簡単です。

### **Q: DeepSeek OCRと併用できる？**
A: はい！Figmaで取得できない詳細な情報をOCRで補完できます。

---

## 📞 サポート

- Figma公式ドキュメント: https://www.figma.com/developers
- VS Code拡張機能: https://marketplace.visualstudio.com/items?itemName=figma.figma-vscode-extension

---

## 🚀 まとめ

**Figma統合により:**
- ✅ デザイン→開発の時間短縮
- ✅ より正確なYAML生成
- ✅ デザイン変更への追従が容易
- ✅ チーム全体の生産性向上

まずはFigma拡張機能をインストールして、デザインファイルを開いてみましょう！
