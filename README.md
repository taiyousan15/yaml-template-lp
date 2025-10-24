# YAML Template LP System

全自動LP制作テンプレートシステム - スクリーンショットからYAMLテンプレート化し、MrTスタイル黄金律とナレッジ統合でLP自動生成

## 概要

このシステムは、LPのスクリーンショットを自動的にYAMLテンプレートに変換し、MrTスタイル黄金律（13LP分析、信頼度95-98%）とYAML分析ナレッジを統合して最高品質のLPを自動生成するプラットフォームです。

### 主な機能

#### 基本機能
- **画像→YAMLテンプレート自動変換**: OCR + レイアウト検出
- **手動補正UI**: 検出された要素の微調整
- **Stripe決済統合**: サブスクリプション/単品購入
- **Vercel自動デプロイ**: プレビュー/本番環境への公開
- **S3ストレージ**: 画像・YAML・生成物の永続化

#### 🔥 統合LP生成システム
- **MrTスタイル黄金律**: 13LP徹底分析から抽出した実証済みパターン（信頼度95-98%）
- **3エージェント知識抽出チーム**: YAML自動分析→パターン抽出→プロンプト最適化
- **自動統合モード**: MrTスタイル + ナレッジベースの完全統合（目標95点以上）
- **品質スコアリング**: MrTスコア + 5項目詳細評価
- **自己改善システム**: YAML分析結果をDBに蓄積して品質向上

#### 🤖 高度YAML生成システム（マルチエージェントAI）
- **5ステップ自動分析**: 画像細分化 → セグメント切り取り → 個別分析 → YAML生成 → 統合
- **1行レベルの高精度抽出**: 全テキストを完全一致で抽出（デザインも完全再現）
- **完全なデザイン情報**: レイアウト/背景/フォント/ボタン/色/グラデーション
- **Tailwind CSS対応**: そのまま使えるスタイル定義をYAMLに変換
- **文字だけ編集可能**: デザインは固定、テキストのみ変更できるテンプレート生成

#### 🚀 DeepSeek-OCR統合（GPU高速処理）
- **高精度OCR**: DeepSeek-OCRモデルによる高速・高精度な文書認識
- **Markdown経由変換**: LP画像 → Markdown → YAML の2ステップ変換
- **GPU加速**: CUDA対応で10-30秒の高速処理
- **コスト削減**: API料金不要（GPU利用料のみ）
- **オフライン対応**: ローカル環境で完結する処理
- 📖 詳細: [DEEPSEEK_OCR_SETUP.md](./DEEPSEEK_OCR_SETUP.md)

## セットアップ

### 1. 依存関係のインストール

```bash
# Node.js dependencies
npm install

# Python dependencies
cd python && pip install -r requirements.txt
```

### 2. 環境変数の設定

`.env.sample` を `.env` にコピーして、必要な値を設定:

```bash
cp .env.sample .env
```

必須の環境変数:
- `DATABASE_URL`: PostgreSQL接続文字列
- `STRIPE_SECRET_KEY`: Stripe秘密鍵
- `S3_*`: AWS S3認証情報
- `MANUS_*`: Manus OAuth認証情報

### 3. データベースのセットアップ

```bash
# マイグレーション生成
npm run db:generate

# マイグレーション実行
npm run db:migrate

# MrTスタイルナレッジのインポート（統合LP生成に必須）
npx tsx scripts/import-mrt-knowledge.ts
```

### 4. 開発サーバー起動

```bash
npm run dev
```

http://localhost:3000 でアクセス可能

## 🚀 使い方

### 🤖 高度YAML生成（マルチエージェントAI分析）

#### クイックスタート

1. ブラウザで http://localhost:3000/advanced-yaml-generator にアクセス
2. LP画像（PNG/JPG）をアップロード（20MB以下推奨）
3. 「分析開始」をクリック
4. 5ステップの自動分析が実行されます:
   - ステップ1: 画像細分化エージェント（セクション分割）
   - ステップ2: セグメント切り取り（物理的に分割）
   - ステップ3: セグメント別分析（デザイン+コンテンツ抽出）
   - ステップ4: セグメント別YAML生成（Tailwind CSS対応）
   - ステップ5: LP全体統合（完全テンプレート生成）
5. 生成されたYAMLをコピーまたはYAMLエディターで編集

#### 生成されるYAML構造

```yaml
# LP完全再現テンプレート
meta:
  template_version: "1.0"
  generated_at: "2025-10-21T00:00:00.000Z"
  total_sections: 5

sections:
  # セクション 1: hero
  hero:
    type: "hero"

    layout:
      type: "flex"
      alignment: "center"
      padding: "80px 20px"
      maxWidth: "1200px"

    background:
      type: "gradient"
      gradient:
        from: "#667eea"
        to: "#764ba2"
        direction: "to-bottom"

    texts:
      - content: "実際のヘッドラインテキスト"
        role: "headline"
        fontSize: "text-5xl"
        fontWeight: "bold"
        color: "#ffffff"
        alignment: "center"

    buttons:
      - text: "今すぐ始める"
        bgColor: "#ffffff"
        textColor: "#667eea"
        size: "large"
        borderRadius: "rounded-full"
        shadow: true

# 編集ガイド
# このテンプレートでは以下の項目を編集できます:
# [heroセクション]
#   - テキスト1: "実際のヘッドラインテキスト"
```

#### YAMLエディターで編集

1. 生成されたYAMLを http://localhost:3000/yaml-editor で開く
2. 変数が自動抽出され、編集フォームが表示されます
3. テキストのみを変更可能（デザインは固定）
4. リアルタイムプレビューで確認
5. HTMLエクスポート可能

### 🔥 統合LP生成の使い方

#### クイックスタート

1. ブラウザで http://localhost:3000/generate にアクセス
2. 必須項目を入力:
   - 製品名
   - ターゲット層
   - メインベネフィット
3. 生成モードを選択（推奨: 🔥 自動統合モード）
4. 「LP生成開始」をクリック
5. MrTスコア95点以上の高品質LPが生成されます

### 生成モード

#### 🔥 自動統合モード（推奨）- 目標95点
MrTスタイル黄金律 + ナレッジベース + YAML分析を自動統合
- 数値×時間×結果の3点セット 100%適用
- Before→After劇的対比
- 緊急性×希少性の同時訴求
- DBナレッジ自動取得・活用
- YAML分析結果統合（提供時）

#### MrTスタイル専用 - 目標90点
MrTスタイル黄金律のみを適用
- キラーワードTOP30活用
- ベストプラクティス適用
- ナレッジベース不使用

#### ナレッジベース専用 - 目標85点
DBナレッジとYAML分析のみ
- MrTスタイル不使用
- カスタムパターン適用

### MrTスタイル黄金パターン

**1. ヘッドライン3点セット（信頼度95%）**
```
テンプレート: [期間]で[端数付き数値]を達成した[人物属性]の[感情]
例: 1ヶ月で89.4万円を稼いだ34歳元ニートの奇跡
```

**2. Before→After劇的対比（信頼度92%）**
```
テンプレート: [Before]が[After]に（[倍率]の[変化]）
例: 10時間→5分（120倍の効率化）
```

**3. 緊急性×希少性（信頼度98%、出現率100%）**
```
テンプレート: [時間制限]×[数量制限]＋[失うもの]
例: 48時間限定・先着30名のみ（逃すと6ヶ月待ち）
```

**4. キラーワードTOP30**
- 数値系: 自動化、〇〇万円、AI、〜倍、売上
- 感情系: 首吊って死んでいた、借金120万円、日給5000万円
- 時間効率系: 10時間→5分、2年→60分
- 自動化系: 自動化、仕組み化、ファネル

**5. ベストプラクティス**
- 端数の法則: 100万円 → 89.4万円（信憑性UP）
- 時間×倍率明示: 効率化 → 10時間→5分（120倍）
- 感情の極限描写: 限界 → 借金120万円、水道が止まる

## プロジェクト構造

```
/app
  /api/v1
    /templates        # テンプレート管理API
      /from-image     # 画像→YAML変換
      /fix            # 手動補正
      /render-diff    # 差分評価
    /lp               # LP生成・公開API
      /generate       # LP生成
      /publish        # Vercel公開
    /generate         # 統合LP生成API（新機能）
      /unified        # MrTスタイル + ナレッジ統合
      /mrt-style     # MrTスタイル専用
    /knowledge        # ナレッジ管理API
      /analyze        # YAML分析（3エージェント）
      /list           # ナレッジ一覧
    /prompts          # プロンプトテンプレート
    /billing          # 決済API
      /checkout       # Stripe Checkout
      /webhook        # Stripe Webhook
  /dashboard          # ダッシュボード
  /templates          # テンプレートカタログ
  /editor             # LPエディタ
  /wizard-from-image  # 画像→テンプレート作成ウィザード
  /generate           # 統合LP生成UI
  /advanced-yaml-generator  # 🤖 高度YAML生成UI（マルチエージェントAI）
  /yaml-editor        # YAMLエディター（変数抽出・プレビュー）
/lib
  agents.ts           # 旧LP生成エージェント
  knowledge-team.ts   # 3エージェント分析チーム
  mrt-style-agent.ts # MrTスタイルエージェント
  unified-lp-generator.ts # 統合生成マスター
  db.ts               # DB接続
/drizzle
  schema.ts           # DBスキーマ（lp_knowledge, prompt_templates追加）
  migrations/         # マイグレーション
/scripts
  import-mrt-knowledge.ts # MrTナレッジインポート（新機能）
/python               # Python処理（OCR, 画像生成）
```

## API仕様

### 統合LP生成API（新機能）

#### POST /api/v1/generate/unified

MrTスタイル + ナレッジベースを自動統合してLP生成

**Request:**
```json
{
  "productName": "AI自動化ツール",
  "targetAudience": "年商1億円未満の経営者",
  "mainBenefit": "売上を3ヶ月で4.2倍にする",
  "beforeState": "広告費100万円で赤字",
  "afterState": "広告費37.2万円で黒字転換",
  "credibility": "導入企業127社、平均成約率53%",
  "yamlTemplate": "--- (オプション)",
  "mode": "auto",
  "temperature": 0.8,
  "useKnowledgeBase": true
}
```

**Response:**
```json
{
  "status": "success",
  "lpId": "uuid",
  "result": {
    "lp": {
      "headline": "1ヶ月で89.4万円を稼いだ34歳元ニートの奇跡",
      "subheadline": "広告費100万円→37.2万円（62.8%削減）で利益4.2倍",
      "sections": [
        {
          "section": "hero",
          "html": "<div>...</div>",
          "keywords_used": ["自動化", "〜倍"],
          "patterns_applied": ["MrTパターン: 3点セット", "劇的対比"]
        }
      ]
    },
    "metadata": {
      "mrt_score": 95,
      "knowledge_items_used": 10,
      "generation_method": "unified_mrt_knowledge",
      "execution_time_ms": 3500,
      "tokens_used": 4000
    },
    "quality_score": {
      "overall": 95,
      "breakdown": {
        "numerical_precision": 19,
        "time_contrast": 18,
        "urgency_scarcity": 20,
        "killer_words": 19,
        "extreme_emotion": 19
      },
      "recommendations": []
    }
  }
}
```

#### GET /api/v1/generate/unified/modes

利用可能な生成モードの説明を取得

#### POST /api/v1/generate/mrt-style

MrTスタイル専用でLP生成

#### POST /api/v1/knowledge/analyze

YAMLテンプレートを3エージェントで分析

**Request:**
```json
{
  "yamlContent": "---\nheadline: ...",
  "templateId": "uuid (optional)"
}
```

**Response:**
```json
{
  "status": "success",
  "jobId": "uuid"
}
```

#### GET /api/v1/knowledge/analyze/:jobId

分析ジョブのステータス確認

#### GET /api/v1/knowledge/list

ナレッジ一覧取得（フィルタリング可）

```
/api/v1/knowledge/list?category=copywriting&limit=20
```

### 従来のAPI

#### POST /api/v1/templates/from-image

画像をアップロードしてYAMLテンプレートを生成

**Request:**
```bash
curl -X POST https://your-domain/api/v1/templates/from-image \
  -H "Authorization: Bearer <token>" \
  -F "file=@screenshot.png"
```

**Response:**
```json
{
  "templateId": "tpl_xxx",
  "yamlUrl": "https://...",
  "mappingReportUrl": "https://...",
  "diffMetrics": {
    "ssim": 0.92,
    "colorDelta": 0.05,
    "layoutDelta": 0.03
  }
}
```

### POST /api/v1/lp/generate

テンプレートからLPを生成

**Request:**
```json
{
  "templateId": "tpl_xxx",
  "variables": {
    "headline": "新しい見出し",
    "cta_label": "今すぐ申し込む"
  },
  "llm": {
    "temperature": 0.7,
    "intensity": 5
  }
}
```

### POST /api/v1/lp/publish

LPを公開

**Request:**
```json
{
  "lpId": "lp_xxx",
  "target": "production"
}
```

## 技術スタック

- **フロントエンド**: Next.js 15 (App Router), React 19, Tailwind CSS
- **バックエンド**: Next.js API Routes, Python (OCR/画像処理)
- **データベース**: PostgreSQL + Drizzle ORM
- **AI/LLM**: Anthropic Claude 3.5 Sonnet（マルチエージェントシステム）
- **ストレージ**: AWS S3
- **決済**: Stripe
- **認証**: Manus OAuth
- **デプロイ**: Vercel
- **OCR**: Tesseract / AWS Textract

### AIアーキテクチャ

#### 統合LP生成マルチエージェント
1. **Analysis Agent** (temperature: 0.2) - YAML構造分析
2. **Knowledge Extraction Agent** (temperature: 0.3) - パターン抽出
3. **Prompt Generation Agent** (temperature: 0.4) - プロンプト最適化
4. **MrT Style Agent** (temperature: 0.8) - MrTスタイルLP生成
5. **Unified Generator** (temperature: 0.8) - 統合生成マスター

#### 🤖 高度YAML生成マルチエージェント（5ステップ）
1. **Segmentation Agent** (Claude 3 Haiku) - LP画像を5-10セクションに自動分割
   - セクションタイプ分類（hero/features/benefits/testimonial/cta/footer）
   - 位置情報抽出（top%, height%）
2. **Image Cropping** (Sharp) - 各セクションを物理的に切り出し
   - 自動リサイズ（1568px制限）
   - JPEG圧縮（品質90）
3. **Segment Analysis Agent** (Claude 3 Haiku) - セクションごとのデザイン完全抽出
   - レイアウト構造（type, alignment, padding, maxWidth）
   - 背景（solid/gradient, 色コード）
   - 全テキスト（内容, role, fontSize, fontWeight, color, alignment）
   - ボタン（text, bgColor, textColor, size, borderRadius, shadow）
   - 画像・アイテム情報
4. **YAML Conversion** - Tailwind CSS対応YAMLに変換
   - デザイン情報を完全保持
   - 編集可能なテキストフィールド明示
5. **Integration Agent** - 全セグメントYAMLを統合
   - メタデータ追加
   - 編集ガイド生成

#### ナレッジベース
- **lp_knowledge**: 抽出されたパターン・ベストプラクティス保存
- **prompt_templates**: 最適化されたプロンプトテンプレート
- **knowledge_analysis_jobs**: 分析ジョブ管理
- 自己改善: YAML分析結果を蓄積して品質向上

#### MrTスタイル黄金律
13LP徹底分析から抽出（信頼度85-98%）
- ヘッドライン3点セット
- Before→After劇的対比
- 緊急性×希少性
- キラーワードTOP30
- ベストプラクティス集

## Miyabi自律開発

このプロジェクトはMiyabiによる自律開発に対応しています。

```bash
# GitHubトークンの設定
export GITHUB_TOKEN=ghp_xxx

# ステータス確認
miyabi status

# Coordinatorエージェント実行
miyabi agent coordinator --issue <issue_number>
```

## ライセンス

MIT
