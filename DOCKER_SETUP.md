# Docker セットアップガイド

YAML Template LP SystemをDockerで構築・実行するための完全ガイドです。

## 📋 目次

1. [前提条件](#前提条件)
2. [CPU版 セットアップ](#cpu版-セットアップ-claude-apiのみ)
3. [GPU版 セットアップ](#gpu版-セットアップ-deepseek-ocr対応)
4. [環境変数設定](#環境変数設定)
5. [運用コマンド](#運用コマンド)
6. [トラブルシューティング](#トラブルシューティング)
7. [本番環境デプロイ](#本番環境デプロイ)

---

## 前提条件

### 共通要件

- **Docker**: 20.10以上
- **Docker Compose**: 2.0以上
- **ディスク空き容量**:
  - CPU版: 5GB以上
  - GPU版: 20GB以上（モデルキャッシュ含む）

### GPU版 追加要件

- **NVIDIA GPU**: CUDA対応（VRAM 8GB以上推奨）
- **NVIDIA Driver**: 最新版
- **NVIDIA Docker Runtime**: インストール済み

#### NVIDIA Docker Runtime インストール

```bash
# Ubuntu/Debianの場合
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | sudo tee /etc/apt/sources.list.d/nvidia-docker.list

sudo apt-get update
sudo apt-get install -y nvidia-docker2
sudo systemctl restart docker

# 動作確認
docker run --rm --gpus all nvidia/cuda:11.8.0-base-ubuntu22.04 nvidia-smi
```

---

## CPU版 セットアップ (Claude APIのみ)

### 1. 環境変数設定

`.env.sample` を `.env` にコピーして編集:

```bash
cp .env.sample .env
nano .env
```

**必須設定**:
```env
# Claude API
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx

# その他はオプション
DATABASE_URL=postgresql://user:pass@database:5432/yaml_lp_db
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
```

### 2. Dockerイメージのビルド

```bash
# イメージビルド
docker-compose build

# ビルド時間: 約5-10分
```

### 3. コンテナ起動

```bash
# バックグラウンド起動
docker-compose up -d

# ログ確認
docker-compose logs -f app

# 起動確認（http://localhost:3000）
curl http://localhost:3000
```

### 4. 停止・再起動

```bash
# 停止
docker-compose down

# 再起動
docker-compose restart

# 完全削除（データも削除）
docker-compose down -v
```

---

## GPU版 セットアップ (DeepSeek-OCR対応)

### 1. 環境変数設定

CPU版と同じく `.env` を設定。

### 2. Dockerイメージのビルド（GPU版）

```bash
# GPU版イメージビルド
docker-compose -f docker-compose.gpu.yml build

# ビルド時間: 約20-40分（PyTorch + Flash Attention）
```

**注意**: Flash Attentionのビルドに時間がかかります。失敗しても続行します。

### 3. コンテナ起動（GPU版）

```bash
# バックグラウンド起動
docker-compose -f docker-compose.gpu.yml up -d

# ログ確認（初回はモデルダウンロードで10-30分かかる）
docker-compose -f docker-compose.gpu.yml logs -f app-gpu

# GPU使用状況確認
docker exec yaml-lp-app-gpu nvidia-smi
```

### 4. 初回起動時の注意

初回起動時、DeepSeek-OCRモデル（約10GB）が自動ダウンロードされます:

```bash
# モデルダウンロード進行確認
docker-compose -f docker-compose.gpu.yml logs -f app-gpu | grep "Downloading"

# ダウンロード完了確認
docker exec yaml-lp-app-gpu ls -lh /app/.cache/huggingface/hub/
```

---

## 環境変数設定

### 必須環境変数

| 変数名 | 説明 | 例 |
|--------|------|-----|
| `ANTHROPIC_API_KEY` | Claude API キー | `sk-ant-api03-xxxxx` |

### オプション環境変数

| 変数名 | 説明 | デフォルト |
|--------|------|-----------|
| `NODE_ENV` | 実行環境 | `production` |
| `PORT` | ポート番号 | `3000` |
| `DATABASE_URL` | PostgreSQL接続URL | なし |
| `AWS_ACCESS_KEY_ID` | AWS アクセスキー | なし |
| `AWS_SECRET_ACCESS_KEY` | AWS シークレットキー | なし |
| `AWS_REGION` | AWS リージョン | `us-east-1` |
| `S3_BUCKET_NAME` | S3バケット名 | なし |
| `STRIPE_SECRET_KEY` | Stripe秘密鍵 | なし |

### GPU版 追加環境変数

| 変数名 | 説明 | デフォルト |
|--------|------|-----------|
| `CUDA_VISIBLE_DEVICES` | 使用するGPU ID | `0` |
| `HF_HOME` | Hugging Faceキャッシュ | `/app/.cache/huggingface` |

---

## 運用コマンド

### CPU版

```bash
# 起動
docker-compose up -d

# 停止
docker-compose down

# 再起動
docker-compose restart

# ログ確認
docker-compose logs -f

# コンテナ内シェル
docker-compose exec app bash

# イメージ再ビルド
docker-compose build --no-cache

# ボリューム削除を含む完全削除
docker-compose down -v
```

### GPU版

```bash
# 起動
docker-compose -f docker-compose.gpu.yml up -d

# 停止
docker-compose -f docker-compose.gpu.yml down

# 再起動
docker-compose -f docker-compose.gpu.yml restart

# ログ確認
docker-compose -f docker-compose.gpu.yml logs -f

# コンテナ内シェル
docker-compose -f docker-compose.gpu.yml exec app-gpu bash

# GPU使用状況
docker-compose -f docker-compose.gpu.yml exec app-gpu nvidia-smi

# モデルキャッシュ確認
docker-compose -f docker-compose.gpu.yml exec app-gpu du -sh /app/.cache
```

### データベース（PostgreSQL）を使用する場合

`docker-compose.yml` のコメントアウトを解除:

```yaml
# docker-compose.yml
services:
  database:  # ← コメント解除
    image: postgres:15-alpine
    # ...
```

```bash
# データベース込みで起動
docker-compose up -d

# データベース接続確認
docker-compose exec database psql -U postgres -d yaml_lp_db -c "SELECT version();"

# マイグレーション実行
docker-compose exec app npm run db:migrate
```

---

## トラブルシューティング

### 1. ポート3000が既に使用されている

```bash
# ポート確認
lsof -i :3000

# docker-compose.ymlでポート変更
ports:
  - "8080:3000"  # ホスト側を8080に変更
```

### 2. ビルドエラー: `npm ci` 失敗

```bash
# package-lock.jsonを削除して再生成
rm package-lock.json
npm install
docker-compose build
```

### 3. GPU版: `nvidia-smi` が見つからない

```bash
# NVIDIA Dockerランタイム確認
docker run --rm --gpus all nvidia/cuda:11.8.0-base-ubuntu22.04 nvidia-smi

# 失敗する場合、NVIDIAランタイム再インストール
sudo apt-get install --reinstall nvidia-docker2
sudo systemctl restart docker
```

### 4. GPU版: メモリ不足エラー

```bash
# GPU版のモデルサイズを小さくする
# deepseek_ocr_processor.py内の設定変更
base_size=512  # 1024 → 512
image_size=512  # 640 → 512
```

### 5. コンテナが起動しない

```bash
# ログ確認
docker-compose logs app

# 詳細ログ
docker-compose logs -f --tail=100 app

# コンテナ状態確認
docker ps -a
docker inspect yaml-lp-app
```

### 6. 環境変数が反映されない

```bash
# .envファイル確認
cat .env

# 環境変数確認（コンテナ内）
docker-compose exec app env | grep ANTHROPIC

# コンテナ再作成
docker-compose down
docker-compose up -d
```

---

## 本番環境デプロイ

### AWS ECS (CPU版) でのデプロイ

#### 1. ECR にプッシュ

```bash
# AWSログイン
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# イメージビルド&プッシュ
docker build -t yaml-lp:latest .
docker tag yaml-lp:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/yaml-lp:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/yaml-lp:latest
```

#### 2. ECS タスク定義

```json
{
  "family": "yaml-lp-task",
  "networkMode": "awsvpc",
  "containerDefinitions": [
    {
      "name": "yaml-lp-app",
      "image": "<account-id>.dkr.ecr.us-east-1.amazonaws.com/yaml-lp:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "ANTHROPIC_API_KEY",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:<account-id>:secret:anthropic-api-key"
        }
      ]
    }
  ]
}
```

### AWS EC2 GPU インスタンス (GPU版) でのデプロイ

#### 1. GPU インスタンス起動

- **インスタンスタイプ**: `g4dn.xlarge` 以上
- **AMI**: Deep Learning AMI (Ubuntu)
- **ストレージ**: 50GB以上

#### 2. セットアップ

```bash
# インスタンスにSSH接続
ssh -i your-key.pem ubuntu@<instance-ip>

# プロジェクトをクローン
git clone https://github.com/your-repo/yaml-template-lp.git
cd yaml-template-lp

# 環境変数設定
cp .env.sample .env
nano .env

# GPU版起動
docker-compose -f docker-compose.gpu.yml up -d

# 起動確認
docker-compose -f docker-compose.gpu.yml logs -f
```

#### 3. 自動起動設定

```bash
# systemd サービス作成
sudo nano /etc/systemd/system/yaml-lp.service
```

```ini
[Unit]
Description=YAML LP Docker Compose
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/ubuntu/yaml-template-lp
ExecStart=/usr/local/bin/docker-compose -f docker-compose.gpu.yml up -d
ExecStop=/usr/local/bin/docker-compose -f docker-compose.gpu.yml down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

```bash
# サービス有効化
sudo systemctl enable yaml-lp.service
sudo systemctl start yaml-lp.service
```

### Google Cloud Run (CPU版)

```bash
# Cloud Buildでビルド&デプロイ
gcloud builds submit --tag gcr.io/<project-id>/yaml-lp

# Cloud Runデプロイ
gcloud run deploy yaml-lp \
  --image gcr.io/<project-id>/yaml-lp \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="NODE_ENV=production" \
  --set-secrets="ANTHROPIC_API_KEY=anthropic-key:latest"
```

---

## パフォーマンス最適化

### イメージサイズ削減

```dockerfile
# マルチステージビルド使用済み（Dockerfile参照）
# さらに削減したい場合: Alpine Linuxベースに変更

FROM node:20-alpine AS base
# ...
```

### ビルドキャッシュ活用

```bash
# BuildKitを有効化
export DOCKER_BUILDKIT=1

# キャッシュ付きビルド
docker-compose build --build-arg BUILDKIT_INLINE_CACHE=1
```

### ボリュームマウント最適化

```yaml
# docker-compose.yml
volumes:
  - type: bind
    source: ./logs
    target: /app/logs
    consistency: delegated  # macOS/Windowsで高速化
```

---

## セキュリティベストプラクティス

1. **非rootユーザー実行**: Dockerfile内で実装済み
2. **シークレット管理**: `.env`ファイルをGit管理外に
3. **定期的な更新**: イメージを定期的にリビルド
4. **最小権限の原則**: 必要な環境変数のみ設定

```bash
# セキュリティスキャン
docker scan yaml-template-lp:latest

# 脆弱性チェック
docker-compose exec app npm audit
```

---

## まとめ

- **CPU版**: Claude APIのみ使用、軽量で簡単にデプロイ可能
- **GPU版**: DeepSeek-OCR対応、高速・高精度だがGPU必須

どちらを選ぶかは環境と要件次第です！

**推奨**:
- 開発環境: CPU版
- 本番環境（GPUあり）: GPU版
- 本番環境（GPUなし）: CPU版

ご不明点は [GitHub Issues](https://github.com/your-repo/issues) へ!
