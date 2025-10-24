# Dockerfile (CPU版 - Claude APIのみ使用)
# DeepSeek-OCRは含まれません（GPUが不要な軽量版）

FROM node:20-slim AS base

# Python 3.11をインストール
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Node.js依存関係のインストール
COPY package*.json ./
RUN npm ci

# Python依存関係のインストール（DeepSeek-OCR除外）
COPY python/requirements.txt ./python/
RUN pip3 install --no-cache-dir --break-system-packages \
    Pillow==10.4.0 \
    PyYAML==6.0.2 \
    opencv-python-headless==4.10.0.84 \
    pytesseract==0.3.13 \
    scikit-image==0.24.0 \
    numpy==2.0.2 \
    boto3==1.35.32

# アプリケーションコードをコピー
COPY . .

# Next.jsビルド
ENV NODE_ENV=production
# ビルド時の環境変数設定（エラー回避）
ENV STRIPE_SECRET_KEY=sk_test_dummy_key_for_build
ENV STRIPE_PUBLISHABLE_KEY=pk_test_dummy_key_for_build
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_dummy_key_for_build
ENV UPSTASH_REDIS_REST_URL=http://localhost:6379
ENV UPSTASH_REDIS_REST_TOKEN=dummy_token_for_build
RUN npm run build

# 実行ユーザーを非rootに設定
RUN useradd -m -u 1001 appuser && \
    chown -R appuser:appuser /app
USER appuser

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["npm", "start"]
