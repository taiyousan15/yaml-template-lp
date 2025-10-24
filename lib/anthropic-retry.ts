import Anthropic from '@anthropic-ai/sdk'

/**
 * Anthropic API リトライヘルパー
 *
 * 529エラー（overloaded_error）に対して指数バックオフでリトライを実行
 */

interface RetryConfig {
  maxRetries?: number
  initialDelayMs?: number
  maxDelayMs?: number
  backoffMultiplier?: number
}

const DEFAULT_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
}

/**
 * 指数バックオフで待機
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Anthropic API呼び出しをリトライラップ
 */
export async function withRetry<T>(
  apiCall: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const cfg = { ...DEFAULT_CONFIG, ...config }
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
    try {
      return await apiCall()
    } catch (error: any) {
      lastError = error

      // 529エラー（overloaded）の場合のみリトライ
      const isOverloadedError =
        error?.status === 529 ||
        error?.error?.type === 'overloaded_error' ||
        error?.message?.includes('overloaded') ||
        error?.message?.includes('529')

      if (!isOverloadedError) {
        // 529以外のエラーは即座にスロー
        throw error
      }

      // 最大リトライ回数に達した場合
      if (attempt >= cfg.maxRetries) {
        console.error(`[AnthropicRetry] ❌ リトライ上限に達しました (${cfg.maxRetries}回)`)
        throw error
      }

      // 指数バックオフ計算
      const delay = Math.min(
        cfg.initialDelayMs * Math.pow(cfg.backoffMultiplier, attempt),
        cfg.maxDelayMs
      )

      console.warn(
        `[AnthropicRetry] ⚠️ 529エラー検出 - ${delay}ms後にリトライします (${attempt + 1}/${cfg.maxRetries})`
      )

      await sleep(delay)
    }
  }

  // 理論上ここには到達しないが、TypeScriptのため
  throw lastError || new Error('Unknown retry error')
}

/**
 * Anthropic Messages API用の型安全なラッパー
 */
export async function createMessageWithRetry(
  anthropic: Anthropic,
  params: Anthropic.MessageCreateParams,
  config?: RetryConfig
): Promise<Anthropic.Message> {
  return withRetry(() => anthropic.messages.create(params), config)
}
