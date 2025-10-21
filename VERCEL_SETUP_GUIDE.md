# Vercel デプロイセットアップガイド

このガイドでは、YAML Template LP SystemをVercelにデプロイする手順を説明します。

## 📋 前提条件

- [x] GitHubリポジトリが作成されている
- [x] コードがGitHubにプッシュされている
- [x] Vercelアカウントを持っている
- [x] 各種外部サービスのアカウントを持っている（後述）

---

## Step 1: Vercelプロジェクトの作成

### 1.1 Vercelにログイン

https://vercel.com にアクセスし、GitHubアカウントでログインします。

### 1.2 新規プロジェクトのインポート

1. ダッシュボードで「Add New...」→「Project」をクリック
2. GitHubリポジトリ一覧から `yaml-template-lp` を選択
3. 「Import」をクリック

### 1.3 プロジェクト設定

- **Framework Preset**: Next.js を選択
- **Root Directory**: `./` (デフォルト)
- **Build Command**: `npm run build` (デフォルト)
- **Output Directory**: `.next` (デフォルト)
- **Install Command**: `npm install` (デフォルト)
- **Node.js Version**: 20.x

---

## Step 2: 外部サービスのセットアップ

デプロイ前に、以下の外部サービスを準備する必要があります。

### 2.1 PostgreSQLデータベース

**推奨サービス（いずれか1つ）:**

#### オプション A: Vercel Postgres（推奨）
1. Vercelダッシュボード → プロジェクト → Storage タブ
2. 「Create Database」→ 「Postgres」を選択
3. データベース名: `yaml-template-lp-prod`
4. リージョン: アプリケーションと同じリージョン
5. 作成後、環境変数が自動的に設定される

#### オプション B: Supabase
1. https://supabase.com でプロジェクト作成
2. Settings → Database → Connection string をコピー
3. `DATABASE_URL` として使用

#### オプション C: Neon
1. https://neon.tech でプロジェクト作成
2. Connection string をコピー
3. `DATABASE_URL` として使用

### 2.2 Upstash Redis

1. https://upstash.com でアカウント作成
2. 「Create Database」をクリック
3. Database Type: Redis
4. Name: `yaml-template-lp-ratelimit`
5. Region: アプリケーションと同じリージョン
6. REST API タブから以下をコピー:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

### 2.3 AWS S3

1. AWS Console → S3 → バケット作成
2. バケット名: `yaml-template-lp-prod`
3. リージョン: `us-east-1` (または任意)
4. パブリックアクセスブロック: すべてブロック（署名付きURL使用）
5. IAM → ユーザー作成 → S3へのアクセス権限を付与
6. アクセスキーID/シークレットアクセスキーを取得

### 2.4 Stripe

1. https://stripe.com → Dashboard
2. 開発者 → APIキー → 本番環境キーを表示
3. 以下をコピー:
   - `STRIPE_SECRET_KEY` (sk_live_xxx)
   - `STRIPE_PUBLISHABLE_KEY` (pk_live_xxx)
4. 商品 → 新規作成 → Proプラン作成 → 価格ID (`price_xxx`) をコピー
5. Webhook:
   - エンドポイント: `https://your-domain.vercel.app/api/v1/billing/webhook`
   - イベント: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Webhook署名シークレットをコピー

### 2.5 Anthropic Claude API

1. https://console.anthropic.com
2. API Keys → Create Key
3. `ANTHROPIC_API_KEY` をコピー

### 2.6 Manus OAuth（オプション）

認証システムをManusで実装する場合:
1. Manusでアプリケーション登録
2. Client ID / Client Secret を取得
3. Redirect URI: `https://your-domain.vercel.app/api/auth/callback`

---

## Step 3: Vercel環境変数の設定

Vercelダッシュボード → プロジェクト → Settings → Environment Variables

以下の環境変数を **Production** 環境に設定:

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname

# AWS S3
S3_REGION=us-east-1
S3_BUCKET=yaml-template-lp-prod
S3_ACCESS_KEY_ID=AKIAxxxxxxxxxx
S3_SECRET_ACCESS_KEY=xxxxxxxxxxxx

# Stripe
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxx
STRIPE_PRICE_PRO=price_xxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx

# Manus OAuth
MANUS_CLIENT_ID=your_client_id
MANUS_CLIENT_SECRET=your_client_secret
MANUS_REDIRECT_URI=https://your-domain.vercel.app/api/auth/callback

# OCR
OCR_PROVIDER=textract
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAxxxxxxxxxx
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxx

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://xxxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXXXxxxxxxxxxxxx

# Anthropic
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxx

# App URL
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

---

## Step 4: データベースマイグレーション

### 4.1 ローカルからマイグレーション実行

```bash
# 本番DBのURLを一時的に設定
export DATABASE_URL="postgresql://user:password@host:5432/dbname"

# マイグレーション実行
npm run db:push
```

### 4.2 マイグレーション確認

```bash
# テーブルが作成されたか確認
npm run db:studio
```

---

## Step 5: デプロイ実行

### 5.1 自動デプロイ

GitHubの `main` ブランチにプッシュすると自動的にデプロイされます:

```bash
git add .
git commit -m "feat: Initial production deployment"
git push origin main
```

### 5.2 手動デプロイ（Vercel CLI）

```bash
# Vercel CLIインストール
npm install -g vercel

# ログイン
vercel login

# 本番デプロイ
vercel --prod
```

---

## Step 6: デプロイ後の検証

### 6.1 ヘルスチェック

デプロイが完了したら、以下をチェック:

1. アプリケーションURL: https://your-domain.vercel.app
2. ビルドログ: エラーがないか確認
3. 関数ログ: API実行時のエラーがないか確認

### 6.2 機能テスト

- [ ] トップページが表示される
- [ ] ログイン/ログアウトが動作する
- [ ] 画像アップロードが動作する
- [ ] テンプレート作成が動作する
- [ ] LP生成が動作する
- [ ] Stripe決済テスト（テストカード: 4242 4242 4242 4242）

### 6.3 パフォーマンステスト

```bash
# Lighthouse CI
npm install -g @lhci/cli
lhci autorun --collect.url=https://your-domain.vercel.app
```

---

## Step 7: カスタムドメイン設定（オプション）

### 7.1 ドメイン追加

1. Vercelダッシュボード → プロジェクト → Settings → Domains
2. 「Add」をクリック
3. カスタムドメインを入力（例: `lp-builder.example.com`）
4. DNSレコードを設定（Vercelの指示に従う）

### 7.2 環境変数の更新

カスタムドメイン設定後:
- `NEXT_PUBLIC_APP_URL` を更新
- `MANUS_REDIRECT_URI` を更新
- Stripe Webhookエンドポイントを更新

---

## トラブルシューティング

### ビルドエラー

**症状**: デプロイ時にビルドが失敗する

**解決策**:
1. ローカルで `npm run build` を実行して同じエラーが出るか確認
2. `package.json` の依存関係が正しいか確認
3. 環境変数が正しく設定されているか確認

### データベース接続エラー

**症状**: `ECONNREFUSED` または `Connection timeout`

**解決策**:
1. `DATABASE_URL` が正しいか確認
2. データベースがパブリックアクセス許可されているか確認
3. Vercelの IPアドレス範囲がファイアウォールで許可されているか確認

### Stripe Webhookエラー

**症状**: 決済後にサブスクリプションが反映されない

**解決策**:
1. Webhook URL が正しいか確認
2. Webhook署名シークレットが正しいか確認
3. Stripeダッシュボードでイベントログを確認

---

## 次のステップ

- [ ] モニタリング設定（Sentry, Datadog など）
- [ ] バックアップスケジュール設定
- [ ] CI/CDパイプライン改善
- [ ] E2Eテスト自動化

---

**🎉 デプロイ完了！**

問題が発生した場合は、DEPLOYMENT_PLAN.md と OPERATIONS_MANUAL.md を参照してください。
