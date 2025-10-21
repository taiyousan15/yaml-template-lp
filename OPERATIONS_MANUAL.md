# YAML Template LP System - 運用マニュアル

**バージョン**: 1.0.0
**対象者**: 運用担当者、システム管理者
**最終更新**: 2025年10月21日

---

## 📋 目次

1. [日常運用](#日常運用)
2. [監視とアラート](#監視とアラート)
3. [バックアップとリストア](#バックアップとリストア)
4. [スケーリング](#スケーリング)
5. [障害対応](#障害対応)
6. [セキュリティ運用](#セキュリティ運用)
7. [コスト管理](#コスト管理)

---

## 日常運用

### 朝の運用チェック（毎日9:00）

```bash
# 1. システムヘルスチェック
curl https://your-domain.vercel.app/api/health

# 2. エラーログ確認（過去24時間）
vercel logs --since 24h --filter error

# 3. Stripeダッシュボード確認
# - 決済失敗の有無
# - 新規サブスクリプション

# 4. S3使用量確認
aws s3 ls s3://yaml-template-lp-production --recursive --summarize

# 5. データベース接続数確認
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"
```

### 週次メンテナンス（毎週月曜10:00）

```bash
# 1. 依存関係の脆弱性チェック
npm audit

# 2. 未使用リソースのクリーンアップ
# - 古いS3オブジェクト削除（30日以上）
aws s3 ls s3://yaml-template-lp-production/raw/ --recursive | \
  awk '$1 < "$(date -d '30 days ago' +%Y-%m-%d)" {print $4}' | \
  xargs -I {} aws s3 rm s3://yaml-template-lp-production/{}

# 3. データベース統計更新
psql $DATABASE_URL -c "VACUUM ANALYZE;"

# 4. レート制限統計確認
# Upstash Consoleで確認
```

### 月次レポート作成（毎月1日）

**レポート項目**:
- 総ユーザー数、アクティブユーザー数
- LP生成数、テンプレート作成数
- 収益サマリー（Stripe）
- システムコスト（AWS, Vercel, Upstash）
- エラー率、レスポンスタイム
- ストレージ使用量

---

## 監視とアラート

### Vercel監視

**ダッシュボード**: https://vercel.com/dashboard

#### 監視項目
1. **デプロイステータス**: 失敗時は即座に通知
2. **関数実行時間**: 平均 < 1秒
3. **関数エラー率**: < 1%
4. **帯域幅使用量**: 月間上限の80%で警告

#### アラート設定
```bash
# Vercel Integrations → Slack/Email
# 設定:
# - デプロイ失敗
# - 関数エラー率 > 5%
# - レスポンスタイム > 3秒
```

### データベース監視

**ツール**: AWS RDS CloudWatch

#### 監視メトリクス
- CPU使用率: < 70%
- メモリ使用率: < 80%
- ストレージ使用率: < 85%
- 接続数: < 80% of max_connections
- レプリケーション遅延: < 1秒（Multi-AZ時）

#### アラート設定
```bash
# CloudWatch Alarm作成
aws cloudwatch put-metric-alarm \
  --alarm-name rds-cpu-high \
  --alarm-description "RDS CPU > 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/RDS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2
```

### アプリケーションログ監視

```bash
# エラーログの集計
vercel logs --since 1h --filter error | wc -l

# 特定エラーの検索
vercel logs --filter "PAYMENT_REQUIRED"

# レート制限違反の監視
vercel logs --filter "Rate limit exceeded"
```

### Stripe監視

**ダッシュボード**: https://dashboard.stripe.com

#### 監視項目
- 決済成功率: > 95%
- Webhook成功率: > 99%
- チャージバック率: < 0.5%
- 不正検出アラート

---

## バックアップとリストア

### データベースバックアップ

#### 自動バックアップ（推奨）
```bash
# RDS自動バックアップ設定
aws rds modify-db-instance \
  --db-instance-identifier yaml-template-lp-prod \
  --backup-retention-period 7 \
  --preferred-backup-window "03:00-04:00"
```

#### 手動バックアップ
```bash
# スナップショット作成
aws rds create-db-snapshot \
  --db-instance-identifier yaml-template-lp-prod \
  --db-snapshot-identifier manual-backup-$(date +%Y%m%d-%H%M%S)

# バックアップ確認
aws rds describe-db-snapshots \
  --db-instance-identifier yaml-template-lp-prod
```

#### リストア手順
```bash
# 1. 現在のDBをリネーム（安全のため）
aws rds modify-db-instance \
  --db-instance-identifier yaml-template-lp-prod \
  --new-db-instance-identifier yaml-template-lp-prod-old

# 2. スナップショットから復元
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier yaml-template-lp-prod \
  --db-snapshot-identifier <snapshot-id>

# 3. 接続確認
psql $DATABASE_URL -c "SELECT NOW();"

# 4. 旧DBの削除（問題なければ）
aws rds delete-db-instance \
  --db-instance-identifier yaml-template-lp-prod-old \
  --skip-final-snapshot
```

### S3バックアップ

#### バージョニング有効化（推奨）
```bash
# バージョニング有効化
aws s3api put-bucket-versioning \
  --bucket yaml-template-lp-production \
  --versioning-configuration Status=Enabled

# ライフサイクルポリシー設定
aws s3api put-bucket-lifecycle-configuration \
  --bucket yaml-template-lp-production \
  --lifecycle-configuration file://s3-lifecycle.json
```

**s3-lifecycle.json**:
```json
{
  "Rules": [
    {
      "Id": "archive-old-versions",
      "Status": "Enabled",
      "NoncurrentVersionTransitions": [
        {
          "NoncurrentDays": 30,
          "StorageClass": "GLACIER"
        }
      ],
      "NoncurrentVersionExpiration": {
        "NoncurrentDays": 90
      }
    }
  ]
}
```

---

## スケーリング

### 垂直スケーリング（性能向上）

#### データベース
```bash
# インスタンスタイプ変更
aws rds modify-db-instance \
  --db-instance-identifier yaml-template-lp-prod \
  --db-instance-class db.t4g.medium \
  --apply-immediately
```

#### Vercel関数
```json
// vercel.json
{
  "functions": {
    "app/api/v1/templates/from-image/route.ts": {
      "memory": 3008,
      "maxDuration": 60
    }
  }
}
```

### 水平スケーリング（負荷分散）

#### Vercel（自動）
- Vercelは自動的にリージョン間でスケーリング
- Edge Functionsで低レイテンシ

#### データベース（Read Replica）
```bash
# Read Replica作成
aws rds create-db-instance-read-replica \
  --db-instance-identifier yaml-template-lp-prod-read \
  --source-db-instance-identifier yaml-template-lp-prod
```

### キャッシュ最適化

#### Redis（Upstash）
```typescript
// lib/cache.ts
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// テンプレートキャッシュ（1時間）
export async function getCachedTemplate(id: string) {
  const cached = await redis.get(`template:${id}`);
  if (cached) return cached;

  const template = await db.select()...;
  await redis.set(`template:${id}`, template, { ex: 3600 });
  return template;
}
```

---

## 障害対応

### インシデント対応フロー

#### Level 1: サービス完全停止
**対応時間**: 15分以内

1. **検知**: アラート受信
2. **初動対応**:
   ```bash
   # ヘルスチェック
   curl https://your-domain.vercel.app/api/health

   # 直近のデプロイ確認
   vercel ls --limit 5

   # エラーログ確認
   vercel logs --since 1h --filter error
   ```
3. **切り分け**:
   - Vercel障害 → https://vercel-status.com
   - DB障害 → AWS RDSコンソール確認
   - S3障害 → AWS S3コンソール確認
4. **復旧**:
   - 直近デプロイが原因 → ロールバック
   - 外部サービス障害 → 復旧待ち（ステータスページ更新）

#### Level 2: 部分的な機能停止
**対応時間**: 1時間以内

1. 影響範囲の特定
2. ワークアラウンド検討
3. 修正デプロイ準備
4. ステークホルダーへの報告

#### Level 3: パフォーマンス劣化
**対応時間**: 4時間以内

1. メトリクス確認
2. ボトルネック特定
3. スケーリング or 最適化実施

### 一般的な障害とその対処

#### 問題: OOM (Out of Memory)
**症状**: 関数実行時メモリ不足

**対処**:
```json
// vercel.json
{
  "functions": {
    "app/api/**/*.ts": {
      "memory": 1024  // 512 → 1024に増加
    }
  }
}
```

#### 問題: タイムアウト
**症状**: 関数実行時間超過

**対処**:
1. 非同期処理に変更
2. maxDuration延長
3. バッチ処理に分割

#### 問題: レート制限超過
**症状**: 429 Too Many Requests

**対処**:
```typescript
// レート制限緩和（一時的）
export const apiRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, '1 m'), // 10 → 20
});
```

---

## セキュリティ運用

### 定期セキュリティチェック

#### 週次
```bash
# 1. 依存関係の脆弱性スキャン
npm audit

# 2. 修正可能な脆弱性の自動修正
npm audit fix

# 3. Snyk スキャン（推奨）
npx snyk test
```

#### 月次
- [ ] アクセスログレビュー
- [ ] 不正アクセス試行の検出
- [ ] APIキーのローテーション検討
- [ ] SSL証明書の有効期限確認

### インシデントレスポンス

#### セキュリティインシデント発生時

1. **即座に実施**:
   - 影響範囲の特定
   - 侵害されたキーの無効化
   - アクセスログの保全

2. **24時間以内**:
   - 全APIキー・シークレットのローテーション
   - 脆弱性の修正
   - 影響を受けたユーザーへの通知

3. **1週間以内**:
   - ポストモーテム作成
   - 再発防止策の実装
   - セキュリティ監査

---

## コスト管理

### 月次コスト予測

**想定月額** (1,000アクティブユーザー):
- Vercel Pro: $20
- AWS RDS (db.t4g.small): $30
- AWS S3: $10
- Upstash Redis: $10
- Stripe手数料: 3.6% + ¥40/トランザクション

**合計**: 約$70 + Stripe手数料

### コスト最適化

#### S3コスト削減
```bash
# Intelligent-Tieringに移行
aws s3api put-bucket-intelligent-tiering-configuration \
  --bucket yaml-template-lp-production \
  --id auto-archiving \
  --intelligent-tiering-configuration file://s3-tiering.json
```

#### データベースコスト削減
- 開発環境: db.t4g.micro（$15/月）
- ステージング: db.t4g.small（$30/月）
- 本番: 必要に応じてスケール

#### Vercel最適化
- 画像最適化機能の活用
- エッジキャッシュの活用
- 不要なビルドの削減

---

## 付録

### 便利なコマンド集

```bash
# Vercel
vercel --version                     # バージョン確認
vercel ls                           # デプロイ一覧
vercel logs --follow               # リアルタイムログ
vercel env ls                      # 環境変数一覧
vercel domains ls                  # ドメイン一覧

# Database
psql $DATABASE_URL -c "\dt"        # テーブル一覧
psql $DATABASE_URL -c "\d+ users"  # テーブル詳細

# AWS
aws s3 ls                          # バケット一覧
aws rds describe-db-instances      # RDSインスタンス一覧

# Stripe
stripe listen                      # Webhook受信
stripe trigger checkout.session.completed  # テストイベント
```

### 連絡先

- **技術サポート**: tech@example.com
- **緊急対応**: oncall@example.com
- **セキュリティ**: security@example.com

---

**次回レビュー**: 2025年11月21日
