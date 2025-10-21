import { pgTable, text, integer, timestamp, jsonb, boolean, varchar, uuid } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

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
