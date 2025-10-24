# 🚀 Google Colab + Cloudflare でDeepSeek OCRを使う - 最速ガイド

MacBook ProでDeepSeek OCR（GPU版）を**完全無料**で使う方法です。

## ✨ 特徴

- ✅ **完全無料**（Google Colab無料版を使用）
- ✅ **認証トークン不要**（Cloudflare Tunnel使用）
- ✅ **セットアップ10分**
- ✅ **MacBook Proで動作**
- ✅ **高精度OCR**（DeepSeek-OCR）

## 📋 必要なもの

- Googleアカウント（無料）
- MacBook Pro
- インターネット接続

## 🎯 3ステップで完了

### Step 1: Colabノートブックを開く (2分)

1. 以下のリンクをクリック（Google Colabで直接開きます）:

   👉 **[DeepSeek OCR API Server (Cloudflare版) を開く](#)**

   または:

   1. `colab/deepseek_ocr_api_server_cloudflared.ipynb` をGoogle Driveにアップロード
   2. 右クリック → **アプリで開く → Google Colaboratory**

2. **ランタイム → ランタイムのタイプを変更 → GPU** を選択

   ![GPU選択](https://via.placeholder.com/600x200?text=Runtime+%E2%86%92+Change+runtime+type+%E2%86%92+GPU)

### Step 2: すべてのセルを実行 (5-10分)

1. **ランタイム → すべてのセルを実行** をクリック

   ![すべてのセルを実行](https://via.placeholder.com/600x200?text=Runtime+%E2%86%92+Run+all)

2. 初回は以下が自動実行されます:
   - ✅ Cloudflaredのインストール
   - ✅ 依存関係のインストール
   - ✅ DeepSeek-OCRモデルのダウンロード（約10GB、5-10分）
   - ✅ APIサーバーの起動
   - ✅ Cloudflare Tunnelの作成

3. 完了すると以下のように表示されます:
   ```
   =========================================================
   🎉 DeepSeek OCR APIサーバー起動完了！
   =========================================================

   📡 公開URL: https://xxxx-yyyy-zzzz.trycloudflare.com

   ✅ ヘルスチェック: https://xxxx-yyyy-zzzz.trycloudflare.com/health
   ✅ OCRエンドポイント: https://xxxx-yyyy-zzzz.trycloudflare.com/ocr
   ```

4. **公開URLをコピー**してください

### Step 3: MacBook Proで設定 (1分)

ターミナルを開いて以下を実行:

```bash
cd /Users/matsumototoshihiko/div/YAMLテンプレートLP/my-project

# .envファイルに公開URLを追加
echo "DEEPSEEK_COLAB_URL=https://xxxx-yyyy-zzzz.trycloudflare.com" >> .env

# アプリケーションを起動
npm run dev
```

**重要:** `https://xxxx-yyyy-zzzz.trycloudflare.com` を実際のURLに置き換えてください。

### 完了！

ブラウザで `http://localhost:3000` にアクセスして、「画像からYAML生成」を試してください。

---

## 💰 コスト

| 項目 | 月額 |
|------|------|
| Google Colab（無料版） | **$0** |
| Cloudflare Tunnel | **$0** |
| **合計** | **$0** |

**完全無料です！**

（ただし、無料版は12時間のセッション制限があります）

---

## ⚠️ 重要な注意点

### セッション時間制限

- **無料版**: 最大12時間でセッションが切れます
- **対処法**: Colabノートブックを再実行（2分で再起動可能）

### URLが毎回変わる

- セッションごとにCloudflare URLが変わります
- 再起動後、新しいURLを`.env`に設定し直してください

### 解決策: 自動化スクリプト

URLが変わったときに自動検知する方法（オプション）:

```bash
# watch-colab-url.sh
#!/bin/bash

while true; do
  if ! curl -f $DEEPSEEK_COLAB_URL/health &> /dev/null; then
    echo "⚠️ Colab APIが応答しません。URLを確認してください。"
    # 通知を送る（macOSの場合）
    osascript -e 'display notification "Colab API接続エラー" with title "DeepSeek OCR"'
  fi
  sleep 60
done
```

---

## 🆚 コスト比較

### 月100回の画像→YAML生成の場合

| 方法 | 月額 | セットアップ | 安定性 |
|------|------|------------|--------|
| **Google Colab（無料）** | **$0** | 10分 | ⭐⭐ |
| Claude API | $2.90 | 5分 | ⭐⭐⭐⭐⭐ |
| Google Colab Pro | $9.99 | 10分 | ⭐⭐⭐⭐ |
| AWS EC2 GPU | $114+ | 1時間+ | ⭐⭐⭐⭐⭐ |

### おすすめの使い分け

| 用途 | おすすめ |
|------|---------|
| **無料で試したい** | Google Colab無料版 |
| **安定性重視** | Claude API |
| **本格利用（コスト削減）** | Google Colab Pro |
| **本番環境・24時間稼働** | AWS EC2 |

---

## 🎓 トラブルシューティング

### GPU が割り当てられない

**症状:** "GPU が利用できません" というエラー

**解決策:**
1. ランタイム → ランタイムのタイプを変更 → GPU を選択
2. それでもダメな場合は時間をおいて再試行（無料版はリソース制限あり）

### モデルのダウンロードが遅い

**症状:** 10分以上経ってもモデルロードが完了しない

**解決策:**
- Colabのネットワークが遅い場合があります
- 一度セッションをリセットして再実行してください

### エラー: "Cloudflare URL が取得できません"

**解決策:**
- セル6を再実行してください
- それでもダメな場合は、ノートブック全体を再実行

### MacBook Proから接続できない

**確認事項:**
1. `.env`ファイルに正しいURLが設定されているか
2. Colabのセルがまだ実行中か（止めると接続が切れます）
3. ヘルスチェックが成功するか:
   ```bash
   curl https://your-url.trycloudflare.com/health
   ```

---

## 💡 ヒント

### 2回目以降の起動は超高速

- モデルがキャッシュされるため、2回目以降は**2-3分**で起動します

### バックグラウンドで動かす

- Colabのタブを開いたまま他の作業をしてOKです
- ただし、12時間経つと自動停止します

### Colab Proにアップグレードすべき？

以下の場合はProを検討:
- ✅ 毎日使う
- ✅ 24時間セッションが必要
- ✅ より高性能なGPUが必要

月10ドルで、Claude APIより安くなるケースも:
- **月350回以上**使う場合は Colab Pro の方が安い

---

## 📞 サポート

問題が発生した場合:
1. `colab/README.md` の詳細ガイドを確認
2. GitHubのIssueで質問
3. ログを確認（Colabの出力セル）

---

## 🎉 成功例

セットアップ完了後、以下のようなLP画像から自動的にYAMLテンプレートが生成されます:

**入力:** LP画像（スクリーンショット）
↓
**DeepSeek OCR処理**（10-30秒）
↓
**出力:** 構造化されたYAMLテンプレート

```yaml
meta:
  generator: DeepSeek-OCR
  template_version: '2.0'
sections:
  section1:
    type: hero
    texts:
      - content: あなたのビジネスを次のレベルへ
        role: headline
      - content: 革新的なソリューションで成長を加速
        role: body
    buttons:
      - text: 今すぐ始める
        bgColor: '#667eea'
    ...
```

---

## まとめ

**Google Colab + Cloudflare = 無料でDeepSeek OCRが使える！**

1. ✅ 認証トークン不要
2. ✅ 10分でセットアップ完了
3. ✅ 完全無料
4. ✅ MacBook Proで動作

今すぐ試してみましょう！
