# YAML Template LP System

全自動LP制作テンプレートシステム - スクリーンショットからYAMLテンプレート化し、文章差し替えだけでLPを量産

## 概要

このシステムは、LPのスクリーンショットを自動的にYAMLテンプレートに変換し、テキストの差し替えだけで同じデザインのLPを大量生産できるプラットフォームです。

### 主な機能

- **画像→YAMLテンプレート自動変換**: OCR + レイアウト検出
- **手動補正UI**: 検出された要素の微調整
- **AI文案生成**: トーン・温度・煽り度を指定可能
- **Stripe決済統合**: サブスクリプション/単品購入
- **Vercel自動デプロイ**: プレビュー/本番環境への公開
- **S3ストレージ**: 画像・YAML・生成物の永続化

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
```

### 4. 開発サーバー起動

```bash
npm run dev
```

http://localhost:3000 でアクセス可能

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
    /billing          # 決済API
      /checkout       # Stripe Checkout
      /webhook        # Stripe Webhook
  /dashboard          # ダッシュボード
  /templates          # テンプレートカタログ
  /editor             # LPエディタ
  /wizard-from-image  # 画像→テンプレート作成ウィザード
/lib                  # ユーティリティ関数
/drizzle              # DBスキーマ・マイグレーション
/python               # Python処理（OCR, 画像生成）
```

## API仕様

### POST /api/v1/templates/from-image

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
- **ストレージ**: AWS S3
- **決済**: Stripe
- **認証**: Manus OAuth
- **デプロイ**: Vercel
- **OCR**: Tesseract / AWS Textract

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
