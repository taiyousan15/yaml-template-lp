# Google Colab でDeepSeek OCRを使う方法

MacBook ProでDeepSeek OCRを使うために、Google ColabのGPUを活用する方法です。

## 📋 2つのバージョン

| ファイル | トンネル方法 | 認証 | おすすめ度 |
|---------|------------|------|-----------|
| **`deepseek_ocr_api_server_cloudflared.ipynb`** | Cloudflare Tunnel | **不要** | ⭐⭐⭐⭐⭐ **推奨** |
| `deepseek_ocr_api_server.ipynb` | ngrok | 必要 | ⭐⭐⭐ |

**Cloudflare版が圧倒的に簡単です！** 認証トークン不要でセットアップできます。

## 💰 コスト

| プラン | 月額 | GPU | セッション時間 |
|--------|------|-----|--------------|
| **無料** | $0 | T4 | 12時間 |
| **Colab Pro** | $9.99 | T4/V100 | 24時間 |
| **Colab Pro+** | $49.99 | A100/V100 | より長い |

## 🚀 セットアップ手順（Cloudflare版 - 推奨）

### 1. Google Colabでノートブックを開く

1. Google Driveにログイン
2. **`colab/deepseek_ocr_api_server_cloudflared.ipynb`** をGoogle Driveにアップロード
3. Google Colabで開く
4. **ランタイム → ランタイムのタイプを変更 → GPU** を選択

### 2. すべてのセルを実行

1. **メニュー → ランタイム → すべてのセルを実行** をクリック
2. 5-10分待つとモデルのダウンロードとロードが完了
3. Cloudflare URLが自動的に表示されます:
   ```
   📡 公開URL: https://xxxx.trycloudflare.com
   ```

**これだけです！** 認証トークンの登録は不要です。

---

## 🚀 セットアップ手順（ngrok版）

ngrokを使いたい場合は`deepseek_ocr_api_server.ipynb`を使用してください。

### 1. Google Colabでノートブックを開く

1. Google Driveにログイン
2. `colab/deepseek_ocr_api_server.ipynb` をGoogle Driveにアップロード
3. Google Colabで開く
4. **ランタイム → ランタイムのタイプを変更 → GPU** を選択

### 2. ngrokアカウントを作成

1. https://ngrok.com/ にアクセス
2. 無料アカウントを作成
3. ダッシュボードから**認証トークン**をコピー

### 3. Colabノートブックを実行

1. **セル1～4**を順番に実行
2. **セル5**の`NGROK_AUTH_TOKEN`を自分のトークンに置き換え
3. セル5を実行すると、ngrok URLが表示されます:
   ```
   📡 公開URL: https://xxxx-xx-xx-xx-xx.ngrok.io
   ```

---

### 4. MacBook Proの.envファイルに設定

```bash
cd /Users/matsumototoshihiko/div/YAMLテンプレートLP/my-project

# .envファイルに追加
echo "DEEPSEEK_COLAB_URL=https://xxxx-xx-xx-xx-xx.ngrok.io" >> .env
```

**重要:** `https://xxxx-xx-xx-xx-xx.ngrok.io` を実際の公開URLに置き換えてください。

### 5. アプリケーションから使用

MacBook Proでアプリケーションを起動すると、自動的にColab APIが使用されます:

```bash
# 開発モード
npm run dev

# または Docker
./start-cpu-version.sh
```

ブラウザで`http://localhost:3000`にアクセスし、「画像からYAML生成」を試してください。

## 📝 使い方

### APIエンドポイント

Colab APIは以下のエンドポイントを提供します:

#### ヘルスチェック
```bash
curl https://your-ngrok-url.ngrok.io/health
```

#### 画像からYAML生成
```bash
curl -X POST https://your-ngrok-url.ngrok.io/ocr \
  -F "file=@/path/to/image.png"
```

### TypeScriptから使用

```typescript
import { getDeepSeekColabClient } from '@/lib/deepseek-colab-client';

const client = getDeepSeekColabClient();

// ヘルスチェック
const health = await client.healthCheck();
console.log('GPU:', health.gpu, health.gpu_name);

// 画像からYAML生成
const result = await client.generateYamlFromImage(imageFile);
console.log('YAML:', result.yaml);
```

## ⚠️ 注意事項

### セッション時間制限

- **無料版**: 最大12時間でセッションが切れます
- **切れた場合**: Colabノートブックを再実行してください
- **ngrok URLは毎回変わります**: 新しいURLを`.env`に設定し直してください

### 自動再接続スクリプト

セッションが切れたことを検知して通知するスクリプト:

```typescript
// lib/deepseek-colab-monitor.ts
import { getDeepSeekColabClient } from './deepseek-colab-client';

export async function monitorColabConnection() {
  const client = getDeepSeekColabClient();

  setInterval(async () => {
    const isAvailable = await client.isAvailable();
    if (!isAvailable) {
      console.error('⚠️ Colab APIが利用できません。再起動してください。');
      // 通知を送る、フォールバックAPIに切り替える、など
    }
  }, 60000); // 1分ごとにチェック
}
```

## 🔄 フォールバック設定

Colab APIが利用できない場合、自動的にClaude APIにフォールバックする設定:

```typescript
// app/api/v1/templates/from-image/route.ts
import { getDeepSeekColabClient } from '@/lib/deepseek-colab-client';

export async function POST(req: NextRequest) {
  try {
    // Colab URLが設定されていて、利用可能な場合
    if (process.env.DEEPSEEK_COLAB_URL) {
      const colabClient = getDeepSeekColabClient();
      const isAvailable = await colabClient.isAvailable();

      if (isAvailable) {
        // Colab APIを使用
        const result = await colabClient.generateYamlFromImage(file);
        return NextResponse.json(result);
      }
    }

    // フォールバック: Claude APIを使用
    // ...既存のClaude API処理

  } catch (error) {
    // エラーハンドリング
  }
}
```

## 💡 ヒント

### 初回起動が遅い

- DeepSeek-OCRモデルのダウンロードに5-10分かかります
- 2回目以降は高速です（モデルがキャッシュされる）

### GPU メモリ不足エラー

- 無料版のT4 GPU（16GB VRAM）で動作します
- メモリ不足の場合は、ノートブックを再起動してください

### ngrok URL の固定

- 無料版では毎回URLが変わります
- **ngrok Pro**（$8/月）で固定ドメインが使えます

## 📊 パフォーマンス

| 項目 | 無料版 | Pro版 |
|------|--------|-------|
| GPU | T4 (16GB) | T4/V100 (16-32GB) |
| 処理速度 | 10-30秒/画像 | 10-30秒/画像 |
| セッション | 12時間 | 24時間 |
| 同時接続 | 1セッション | 複数可能 |

## 🆚 Claude API vs Colab DeepSeek OCR

| 項目 | Claude API | Colab DeepSeek |
|------|-----------|----------------|
| **コスト/100回** | $2.90 | $0（無料版）<br>$9.99（Pro） |
| **精度** | 非常に高い | 非常に高い |
| **速度** | 5-10秒 | 10-30秒 |
| **安定性** | 非常に高い | セッション制限あり |
| **セットアップ** | 簡単 | やや複雑 |

## 🎓 トラブルシューティング

### エラー: "DEEPSEEK_COLAB_URL is not set"

→ `.env`ファイルに`DEEPSEEK_COLAB_URL`を追加してください

### エラー: "Colab API health check failed"

→ Colabセッションが切れている可能性があります。ノートブックを再実行してください

### エラー: "request timeout"

→ モデルのロード中です。数分待ってから再試行してください

---

## 📞 サポート

問題が発生した場合は、GitHubのIssueで報告してください。
