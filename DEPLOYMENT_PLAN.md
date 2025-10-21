# YAML Template LP System - デプロイ実行計画書

**バージョン**: 1.0.0
**作成日**: 2025年10月21日
**対象環境**: Production (Vercel)

---

## 📋 目次

1. [前提条件](#前提条件)
2. [デプロイ前チェックリスト](#デプロイ前チェックリスト)
3. [環境変数設定](#環境変数設定)
4. [データベースセットアップ](#データベースセットアップ)
5. [外部サービス設定](#外部サービス設定)
6. [デプロイ手順](#デプロイ手順)
7. [デプロイ後検証](#デプロイ後検証)
8. [ロールバック手順](#ロールバック手順)
9. [トラブルシューティング](#トラブルシューティング)

---

## 前提条件

### 必要なアカウント
- [x] Vercel アカウント
- [x] GitHub リポジトリアクセス
- [x] AWS アカウント (S3, RDS)
- [x] Stripe アカウント
- [x] Upstash Redis アカウント
- [ ] Manus アカウント (OAuth)

### 必要なCLIツール
```bash
# Node.js 20.x以上
node --version

# npm 10.x以上
npm --version

# Vercel CLI
npm install -g vercel

# GitHub CLI
brew install gh

# PostgreSQL Client
brew install postgresql@16
```

---

## デプロイ前チェックリスト

### コードベース
- [x] すべてのコードがmainブランチにマージ済み
- [ ] ビルドエラーがないことを確認 (`npm run build`)
- [ ] TypeScript型エラーがないことを確認 (`tsc --noEmit`)
- [ ] Lintエラーがないことを確認 (`npm run lint`)
- [ ] 依存関係の脆弱性チェック (`npm audit`)

### データベース
- [ ] マイグレーションファイルが最新
- [ ] 本番DBバックアップ取得済み
- [ ] テスト環境でマイグレーション実行済み

### テスト
- [ ] 単体テスト全てパス
- [ ] 統合テスト全てパス
- [ ] E2Eテスト全てパス (手動)
- [ ] セキュリティテスト完了

### ドキュメント
- [x] README.md 更新済み
- [x] API仕様書作成済み
- [ ] 運用マニュアル作成済み

---

## 環境変数設定

### 1. Vercelプロジェクト作成

```bash
# Vercelにログイン
vercel login

# プロジェクト作成
vercel

# 本番環境の設定
vercel --prod
```

### 2. 環境変数の設定

**必須環境変数一覧**:

#### データベース
```bash
vercel env add DATABASE_URL production
# 値: postgresql://user:password@host:5432/dbname?sslmode=require
```

#### AWS S3
```bash
vercel env add S3_REGION production
# 値: ap-northeast-1

vercel env add S3_BUCKET production
# 値: yaml-template-lp-production

vercel env add S3_ACCESS_KEY_ID production
# 値: AKIA...

vercel env add S3_SECRET_ACCESS_KEY production
# 値: ********
```

#### Stripe
```bash
vercel env add STRIPE_SECRET_KEY production
# 値: sk_live_...

vercel env add STRIPE_PUBLISHABLE_KEY production
# 値: pk_live_...

vercel env add STRIPE_PRICE_PRO production
# 値: price_...

vercel env add STRIPE_WEBHOOK_SECRET production
# 値: whsec_...
```

#### Upstash Redis
```bash
vercel env add UPSTASH_REDIS_REST_URL production
# 値: https://xxxxx.upstash.io

vercel env add UPSTASH_REDIS_REST_TOKEN production
# 値: ********
```

#### Manus OAuth
```bash
vercel env add MANUS_CLIENT_ID production
# 値: ...

vercel env add MANUS_CLIENT_SECRET production
# 値: ********

vercel env add MANUS_REDIRECT_URI production
# 値: https://your-domain.vercel.app/api/auth/callback
```

#### OCR
```bash
vercel env add OCR_PROVIDER production
# 値: tesseract または textract

# AWS Textractを使う場合
vercel env add AWS_REGION production
vercel env add AWS_ACCESS_KEY_ID production
vercel env add AWS_SECRET_ACCESS_KEY production
```

#### アプリケーション
```bash
vercel env add NEXT_PUBLIC_APP_URL production
# 値: https://your-domain.vercel.app

vercel env add VERCEL_DEPLOY_HOOK_URL production
# 値: https://api.vercel.com/v1/integrations/deploy/...
```

### 3. 環境変数の確認

```bash
# 設定された環境変数を確認
vercel env ls
```

---

## データベースセットアップ

### 1. PostgreSQLインスタンス作成

**推奨**: AWS RDS PostgreSQL 16

```bash
# RDS設定例
Instance Type: db.t4g.micro (開発) / db.t4g.small (本番)
Storage: 20GB SSD
Multi-AZ: Yes (本番)
Backup: 7日間保持
```

### 2. データベース作成

```sql
-- PostgreSQLに接続
psql -h <rds-endpoint> -U postgres

-- データベース作成
CREATE DATABASE yaml_template_lp;

-- ユーザー作成
CREATE USER yaml_user WITH PASSWORD 'secure_password';

-- 権限付与
GRANT ALL PRIVILEGES ON DATABASE yaml_template_lp TO yaml_user;
```

### 3. マイグレーション実行

```bash
# ローカルでマイグレーション生成
npm run db:generate

# 本番DBに接続してマイグレーション実行
DATABASE_URL="postgresql://yaml_user:password@rds-endpoint:5432/yaml_template_lp" \
npm run db:migrate

# マイグレーション確認
psql -h <rds-endpoint> -U yaml_user -d yaml_template_lp -c "\dt"
```

### 4. 初期データ投入

```sql
-- 管理者ユーザー作成
INSERT INTO users (id, email, name, role, created_at)
VALUES ('admin_001', 'admin@example.com', 'Admin User', 'admin', NOW());

-- サンプルテンプレート作成（オプション）
-- ...
```

---

## 外部サービス設定

### 1. AWS S3バケット作成

```bash
# S3バケット作成
aws s3 mb s3://yaml-template-lp-production --region ap-northeast-1

# CORS設定
aws s3api put-bucket-cors --bucket yaml-template-lp-production --cors-configuration file://s3-cors.json
```

**s3-cors.json**:
```json
{
  "CORSRules": [
    {
      "AllowedOrigins": ["https://your-domain.vercel.app"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3000
    }
  ]
}
```

### 2. Stripeプロダクト作成

```bash
# Stripe CLIログイン
stripe login

# プロダクト作成
stripe products create \
  --name "YAML Template LP Pro" \
  --description "プロフェッショナルプラン"

# 価格設定
stripe prices create \
  --product <product_id> \
  --unit-amount 2980 \
  --currency jpy \
  --recurring interval=month
```

### 3. Stripe Webhook設定

```bash
# Webhook エンドポイント作成
stripe listen --forward-to https://your-domain.vercel.app/api/v1/billing/webhook

# または Stripe Dashboardから設定:
# URL: https://your-domain.vercel.app/api/v1/billing/webhook
# Events: checkout.session.completed, customer.subscription.*
```

### 4. Upstash Redis作成

1. https://console.upstash.com にアクセス
2. "Create Database" をクリック
3. Region: Asia Pacific (Tokyo) を選択
4. REST APIのURLとTokenをコピー

---

## デプロイ手順

### Phase 1: ステージング環境デプロイ

```bash
# 1. Vercelプロジェクトリンク
vercel link

# 2. ステージング環境にデプロイ
vercel

# 3. デプロイ確認
vercel inspect <deployment-url>
```

### Phase 2: 動作確認

```bash
# APIヘルスチェック
curl https://<staging-url>/api/health

# データベース接続確認
curl -X POST https://<staging-url>/api/v1/templates \
  -H "Authorization: Bearer <test-token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Template", "yaml": "test"}'

# Stripe Webhook確認
stripe trigger checkout.session.completed
```

### Phase 3: 本番環境デプロイ

```bash
# 1. 最終確認
npm run build
npm run lint

# 2. 本番デプロイ
vercel --prod

# 3. カスタムドメイン設定（オプション）
vercel domains add your-domain.com
```

---

## デプロイ後検証

### 1. ヘルスチェック

```bash
# アプリケーション起動確認
curl https://your-domain.vercel.app

# API確認
curl https://your-domain.vercel.app/api/v1/templates

# データベース接続確認
# （管理画面でログ確認）
```

### 2. 主要機能テスト

#### 画像アップロード→YAML変換
```bash
curl -X POST https://your-domain.vercel.app/api/v1/templates/from-image \
  -H "Authorization: Bearer <token>" \
  -F "file=@test-image.png"
```

#### LP生成
```bash
curl -X POST https://your-domain.vercel.app/api/v1/lp/generate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "templateId": "xxx",
    "variables": {"headline": "テスト"},
    "llm": {"temperature": 0.7, "intensity": 5}
  }'
```

#### Stripe決済フロー
1. Checkout Session作成
2. テスト決済実行
3. Webhook受信確認
4. DB反映確認

### 3. パフォーマンステスト

```bash
# レスポンス時間確認
curl -w "@curl-format.txt" -o /dev/null -s https://your-domain.vercel.app

# 負荷テスト（Apache Bench）
ab -n 100 -c 10 https://your-domain.vercel.app/
```

### 4. セキュリティチェック

- [ ] HTTPS有効化確認
- [ ] セキュリティヘッダー確認
- [ ] CORS設定確認
- [ ] 認証フロー確認
- [ ] レート制限動作確認

---

## ロールバック手順

### Vercelでのロールバック

```bash
# 1. デプロイ履歴確認
vercel ls

# 2. 前のバージョンに戻す
vercel rollback <deployment-url>

# または Vercel Dashboardから:
# Deployments → 該当デプロイ → "Promote to Production"
```

### データベースロールバック

```bash
# 1. バックアップから復元
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier yaml-template-lp-prod \
  --db-snapshot-identifier <snapshot-id>

# 2. マイグレーションを戻す
DATABASE_URL="..." npm run db:migrate -- --down
```

---

## トラブルシューティング

### 問題1: ビルドエラー

**症状**: Vercelビルドが失敗する

**解決策**:
```bash
# ローカルでビルド確認
npm run build

# 依存関係の再インストール
rm -rf node_modules package-lock.json
npm install

# キャッシュクリア
vercel --force
```

### 問題2: データベース接続エラー

**症状**: `ECONNREFUSED` または `timeout`

**解決策**:
1. RDSセキュリティグループ確認
2. DATABASE_URL形式確認
3. SSL/TLS設定確認 (`?sslmode=require`)

### 問題3: S3アップロードエラー

**症状**: `Access Denied`

**解決策**:
```bash
# IAMポリシー確認
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::yaml-template-lp-production/*"
    }
  ]
}
```

### 問題4: Stripe Webhook失敗

**症状**: Webhookイベントが処理されない

**解決策**:
1. Webhook署名シークレット確認
2. エンドポイントURL確認
3. Stripeログで詳細確認

### 問題5: メモリ不足エラー

**症状**: `JavaScript heap out of memory`

**解決策**:
```json
// vercel.json
{
  "functions": {
    "app/api/**/*.ts": {
      "memory": 1024
    }
  }
}
```

---

## モニタリング設定

### 1. Vercel Analytics有効化

```bash
# Vercel Dashboardで有効化
Settings → Analytics → Enable
```

### 2. ログ監視

```bash
# リアルタイムログ
vercel logs --follow

# エラーログのみ
vercel logs --filter error
```

### 3. アラート設定

- Vercelアラート: デプロイ失敗時
- Stripeアラート: Webhook失敗時
- Upstashアラート: Redis接続失敗時

---

## メンテナンス計画

### 定期メンテナンス
- **毎週**: 依存関係更新チェック
- **毎月**: セキュリティパッチ適用
- **四半期**: パフォーマンスレビュー

### バックアップ
- **データベース**: 日次自動バックアップ (7日間保持)
- **S3**: バージョニング有効化
- **設定**: GitHub リポジトリで管理

---

## サポート連絡先

- **技術サポート**: tech-support@example.com
- **緊急連絡**: on-call@example.com
- **Vercel サポート**: https://vercel.com/support
- **Stripe サポート**: https://support.stripe.com

---

**最終更新**: 2025年10月21日
**承認者**: システム管理者
**次回レビュー**: 2025年11月21日
