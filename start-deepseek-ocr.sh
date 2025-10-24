#!/bin/bash
# DeepSeek OCR GPU版起動スクリプト

set -e

echo "========================================="
echo "DeepSeek OCR GPU版起動スクリプト"
echo "========================================="
echo ""

# ステップ1: NVIDIA GPUの確認
echo "ステップ1: NVIDIA GPUの確認..."
if ! command -v nvidia-smi &> /dev/null; then
    echo "エラー: nvidia-smiが見つかりません。NVIDIA GPUドライバーをインストールしてください。"
    exit 1
fi

nvidia-smi
echo "✅ NVIDIA GPU確認完了"
echo ""

# ステップ2: Docker NVIDIA Runtimeの確認
echo "ステップ2: Docker NVIDIA Runtimeの確認..."
if ! docker run --rm --gpus all nvidia/cuda:11.8.0-base-ubuntu22.04 nvidia-smi &> /dev/null; then
    echo "エラー: Docker NVIDIA Runtimeが利用できません。"
    echo "NVIDIA Container Toolkitをインストールしてください。"
    exit 1
fi
echo "✅ Docker NVIDIA Runtime確認完了"
echo ""

# ステップ3: .envファイルの確認
echo "ステップ3: .envファイルの確認..."
if [ ! -f .env ]; then
    echo "エラー: .envファイルが見つかりません。"
    exit 1
fi

if ! grep -q "ANTHROPIC_API_KEY" .env; then
    echo "エラー: .envファイルにANTHROPIC_API_KEYが設定されていません。"
    exit 1
fi
echo "✅ .env確認完了"
echo ""

# ステップ4: 既存コンテナの停止
echo "ステップ4: 既存コンテナの停止..."
docker-compose -f docker-compose.gpu.yml down 2>/dev/null || true
echo "✅ 既存コンテナ停止完了"
echo ""

# ステップ5: GPU版の起動
echo "ステップ5: GPU版Docker Composeの起動..."
echo "（初回は10-15分かかります）"
docker-compose -f docker-compose.gpu.yml up -d --build

echo ""
echo "✅ コンテナ起動完了"
echo ""

# ステップ6: 起動待機
echo "ステップ6: コンテナの起動を待機中..."
sleep 10

# ステップ7: ヘルスチェック
echo "ステップ7: ヘルスチェック..."
for i in {1..30}; do
    if curl -f http://localhost:3002/api/v1/templates/deepseek-ocr &> /dev/null; then
        echo "✅ APIが正常に起動しました！"
        echo ""
        echo "========================================="
        echo "🎉 DeepSeek OCR起動完了！"
        echo "========================================="
        echo ""
        echo "アクセス先: http://localhost:3002"
        echo "API: http://localhost:3002/api/v1/templates/deepseek-ocr"
        echo ""
        echo "ログ確認: docker logs -f yaml-lp-app-gpu"
        echo "停止: docker-compose -f docker-compose.gpu.yml down"
        echo ""
        exit 0
    fi
    echo "待機中... ($i/30)"
    sleep 5
done

echo "⚠️ ヘルスチェックがタイムアウトしました。"
echo "ログを確認してください: docker logs yaml-lp-app-gpu"
exit 1
