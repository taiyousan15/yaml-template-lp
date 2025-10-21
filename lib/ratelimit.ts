import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// 通常のAPI: 1分間に10リクエスト
export const apiRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  analytics: true,
  prefix: '@upstash/ratelimit/api',
});

// OCR API: 1分間に2リクエスト（重い処理）
export const ocrRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(2, '1 m'),
  analytics: true,
  prefix: '@upstash/ratelimit/ocr',
});

export async function checkRateLimit(identifier: string, type: 'api' | 'ocr' = 'api') {
  const limiter = type === 'ocr' ? ocrRateLimit : apiRateLimit;
  const { success, limit, reset, remaining } = await limiter.limit(identifier);

  if (!success) {
    throw new Error(`Rate limit exceeded. Retry after ${new Date(reset).toISOString()}`);
  }

  return { limit, reset, remaining };
}
