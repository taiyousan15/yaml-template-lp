import { pgTable, text, integer, timestamp, jsonb, boolean, varchar, uuid } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
// import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

// Users (Manus OAuth認証ユーザー)
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  role: varchar('role', { length: 20 }).default('user').notNull(), // 'admin' or 'user'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Template Sources (画像アップロード元)
export const templateSources = pgTable('template_sources', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),
  sourceType: varchar('source_type', { length: 20 }).notNull(), // 'image' or 'yaml'
  s3Url: text('s3_url').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Template Mappings (YAML化結果)
export const templateMappings = pgTable('template_mappings', {
  id: uuid('id').defaultRandom().primaryKey(),
  templateId: uuid('template_id').references(() => templates.id, { onDelete: 'cascade' }),
  styleTokensJson: jsonb('style_tokens_json'),
  mappingReportJson: jsonb('mapping_report_json'),
  diffMetricsJson: jsonb('diff_metrics_json'),
  confidence: integer('confidence'), // 0-100
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Templates (YAMLテンプレート)
export const templates = pgTable('templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  ownerId: text('owner_id').notNull(),
  name: text('name').notNull(),
  tags: text('tags').array(),
  priceCents: integer('price_cents'), // null = free
  yaml: text('yaml').notNull(),
  version: integer('version').default(1).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// LPs (生成されたLP)
export const lps = pgTable('lps', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),
  templateId: uuid('template_id').references(() => templates.id),
  paramsJson: jsonb('params_json').notNull(),
  html: text('html'),
  css: text('css'),
  status: varchar('status', { length: 20 }).default('draft').notNull(), // draft/published
  previewUrl: text('preview_url'),
  prodUrl: text('prod_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Images (生成された画像)
export const images = pgTable('images', {
  id: uuid('id').defaultRandom().primaryKey(),
  lpId: uuid('lp_id').references(() => lps.id, { onDelete: 'cascade' }),
  key: text('key').notNull(), // 例: 'hero_image', 'cta_button'
  s3Url: text('s3_url').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Billing Subscriptions (サブスクリプション)
export const billingSubscriptions = pgTable('billing_subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull().unique(),
  stripeSubId: text('stripe_sub_id').notNull().unique(),
  plan: varchar('plan', { length: 50 }).notNull(), // 'pro', 'enterprise'
  status: varchar('status', { length: 20 }).notNull(), // 'active', 'canceled', 'past_due'
  currentPeriodEnd: timestamp('current_period_end').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Billing Payments (単発購入)
export const billingPayments = pgTable('billing_payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),
  templateId: uuid('template_id').references(() => templates.id),
  stripePiId: text('stripe_pi_id').notNull().unique(),
  amountCents: integer('amount_cents').notNull(),
  status: varchar('status', { length: 20 }).notNull(), // 'succeeded', 'pending', 'failed'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Logs (操作ログ・コスト追跡)
export const logs = pgTable('logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id'),
  type: varchar('type', { length: 50 }).notNull(), // 'upload', 'ocr', 'layout', 'yaml', 'diff', 'publish'
  payloadJson: jsonb('payload_json'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  costTokensIn: integer('cost_tokens_in'),
  costTokensOut: integer('cost_tokens_out'),
});

// LP Knowledge Base (YAMLテンプレート分析から抽出されたナレッジ)
export const lpKnowledge = pgTable('lp_knowledge', {
  id: uuid('id').defaultRandom().primaryKey(),
  templateId: uuid('template_id').references(() => templates.id, { onDelete: 'cascade' }),
  category: varchar('category', { length: 50 }).notNull(), // 'layout', 'copywriting', 'cta', 'color_scheme', 'conversion_pattern'
  knowledgeType: varchar('knowledge_type', { length: 50 }).notNull(), // 'pattern', 'rule', 'best_practice', 'anti_pattern'
  title: text('title').notNull(),
  description: text('description').notNull(),
  examples: jsonb('examples'), // 具体例
  metrics: jsonb('metrics'), // 効果測定データ（CVR、滞在時間など）
  tags: text('tags').array(),
  confidence: integer('confidence').default(0), // 0-100: ナレッジの信頼度
  usageCount: integer('usage_count').default(0), // このナレッジが使用された回数
  successRate: integer('success_rate'), // 成功率（%）
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Prompt Templates (ナレッジから生成されたプロンプトテンプレート)
export const promptTemplates = pgTable('prompt_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  purpose: varchar('purpose', { length: 50 }).notNull(), // 'hero', 'features', 'pricing', 'testimonials', 'faq', 'cta'
  promptText: text('prompt_text').notNull(),
  knowledgeIds: text('knowledge_ids').array(), // 参照しているナレッジID
  variables: jsonb('variables'), // プロンプト内の変数定義
  temperature: integer('temperature').default(70), // 0-100 (0.0-1.0に変換)
  examples: jsonb('examples'), // サンプル出力
  version: integer('version').default(1).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Knowledge Analysis Jobs (分析ジョブの追跡)
export const knowledgeAnalysisJobs = pgTable('knowledge_analysis_jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  templateId: uuid('template_id').references(() => templates.id),
  status: varchar('status', { length: 20 }).notNull(), // 'pending', 'analyzing', 'extracting', 'completed', 'failed'
  stage: varchar('stage', { length: 50 }), // 'yaml_analysis', 'knowledge_extraction', 'prompt_generation'
  progressPercent: integer('progress_percent').default(0),
  resultJson: jsonb('result_json'),
  errorMessage: text('error_message'),
  tokensUsed: integer('tokens_used'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const templateSourcesRelations = relations(templateSources, ({ one }) => ({
  // No direct relations defined yet
}));

export const templatesRelations = relations(templates, ({ many, one }) => ({
  lps: many(lps),
  mappings: many(templateMappings),
}));

export const lpsRelations = relations(lps, ({ one, many }) => ({
  template: one(templates, {
    fields: [lps.templateId],
    references: [templates.id],
  }),
  images: many(images),
}));

export const imagesRelations = relations(images, ({ one }) => ({
  lp: one(lps, {
    fields: [images.lpId],
    references: [lps.id],
  }),
}));

// Zod schemas for validation (要drizzle-zod)
// TODO: drizzle-ormを0.36+にアップグレード後に有効化
// export const insertUserSchema = createInsertSchema(users);
// export const selectUserSchema = createSelectSchema(users);
// export const insertTemplateSourceSchema = createInsertSchema(templateSources);
// export const selectTemplateSourceSchema = createSelectSchema(templateSources);
// export const insertTemplateMappingSchema = createInsertSchema(templateMappings);
// export const selectTemplateMappingSchema = createSelectSchema(templateMappings);
// export const insertTemplateSchema = createInsertSchema(templates);
// export const selectTemplateSchema = createSelectSchema(templates);
// export const insertLpSchema = createInsertSchema(lps);
// export const selectLpSchema = createSelectSchema(lps);
// export const insertImageSchema = createInsertSchema(images);
// export const selectImageSchema = createSelectSchema(images);

// export const insertBillingSubscriptionSchema = createInsertSchema(billingSubscriptions);
// export const selectBillingSubscriptionSchema = createSelectSchema(billingSubscriptions);
// export const insertBillingPaymentSchema = createInsertSchema(billingPayments);
// export const selectBillingPaymentSchema = createSelectSchema(billingPayments);
// export const insertLogSchema = createInsertSchema(logs);
// export const selectLogSchema = createSelectSchema(logs);
