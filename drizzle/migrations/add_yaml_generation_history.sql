-- YAML Generation History テーブルを作成
CREATE TABLE IF NOT EXISTS "yaml_generation_history" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" TEXT NOT NULL,
  "source_image_url" TEXT NOT NULL,
  "generated_yaml" TEXT NOT NULL,
  "metadata" JSONB,
  "name" TEXT,
  "tags" TEXT[],
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- インデックスを作成
CREATE INDEX IF NOT EXISTS "idx_yaml_history_user_id" ON "yaml_generation_history" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_yaml_history_created_at" ON "yaml_generation_history" ("created_at" DESC);

-- コメントを追加
COMMENT ON TABLE "yaml_generation_history" IS '高度YAML生成の履歴を保存するテーブル';
COMMENT ON COLUMN "yaml_generation_history"."id" IS '履歴ID（UUID）';
COMMENT ON COLUMN "yaml_generation_history"."user_id" IS 'ユーザーID';
COMMENT ON COLUMN "yaml_generation_history"."source_image_url" IS 'アップロードした元画像のURL（Base64またはS3 URL）';
COMMENT ON COLUMN "yaml_generation_history"."generated_yaml" IS '生成されたYAMLテキスト';
COMMENT ON COLUMN "yaml_generation_history"."metadata" IS '分析メタデータ（セグメント数、テキストブロック数、信頼度など）';
COMMENT ON COLUMN "yaml_generation_history"."name" IS 'ユーザーが設定する名前（オプション）';
COMMENT ON COLUMN "yaml_generation_history"."tags" IS '検索用タグ配列';
COMMENT ON COLUMN "yaml_generation_history"."created_at" IS '作成日時';
COMMENT ON COLUMN "yaml_generation_history"."updated_at" IS '更新日時';
