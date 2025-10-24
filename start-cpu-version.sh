#!/bin/bash
# CPU版起動スクリプト（MacBook Pro対応）

set -e

echo "========================================="
echo "YAML Template LP - CPU版起動スクリプト"
echo "（MacBook Pro / GPU非搭載環境向け）"
echo "========================================="
echo ""

# ステップ1: .envファイルの確認
echo "ステップ1: .envファイルの確認..."
if [ ! -f .env ]; then
    echo "エラー: .envファイルが見つかりません。"
    echo ".env.sampleをコピーして.envを作成してください。"
    exit 1
fi

if ! grep -q "ANTHROPIC_API_KEY" .env; then
    echo "エラー: .envファイルにANTHROPIC_API_KEYが設定されていません。"
    exit 1
fi
echo "✅ .env確認完了"
echo ""

# ステップ2: 既存コンテナの停止
echo "ステップ2: 既存コンテナの停止..."
docker-compose down 2>/dev/null || true
echo "✅ 既存コンテナ停止完了"
echo ""

# ステップ3: CPU版の起動
echo "ステップ3: CPU版Docker Composeの起動..."
echo "（初回は5-10分かかります）"
docker-compose up -d --build

echo ""
echo "✅ コンテナ起動完了"
echo ""

# ステップ4: 起動待機
echo "ステップ4: コンテナの起動を待機中..."
sleep 10

# ステップ5: ヘルスチェック
echo "ステップ5: ヘルスチェック..."
for i in {1..30}; do
    if curl -f http://localhost:3001 &> /dev/null; then
        echo "✅ アプリケーションが正常に起動しました！"
        echo ""
        echo "========================================="
        echo "🎉 CPU版起動完了！"
        echo "========================================="
        echo ""
        echo "アクセス先: http://localhost:3001"
        echo ""
        echo "利用可能な機能:"
        echo "  ✅ Claude APIによる画像→YAML変換"
        echo "  ✅ 統合LP生成"
        echo "  ✅ MRTスタイル生成"
        echo "  ✅ YAMLエディター・レンダラー"
        echo ""
        echo "利用できない機能:"
        echo "  ❌ DeepSeek OCR (GPU必須)"
        echo ""
        echo "ログ確認: docker logs -f yaml-lp-app"
        echo "停止: docker-compose down"
        echo ""
        exit 0
    fi
    echo "待機中... ($i/30)"
    sleep 5
done

echo "⚠️ ヘルスチェックがタイムアウトしました。"
echo "ログを確認してください: docker logs yaml-lp-app"
exit 1
