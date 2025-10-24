/**
 * Google Colab DeepSeek OCR API クライアント
 *
 * 使い方:
 * 1. Google ColabでdeepseekOCRApiServer.ipynbを実行
 * 2. 取得したngrok URLを.envに設定:
 *    DEEPSEEK_COLAB_URL=https://xxxx.ngrok.io
 * 3. このクライアントを使用してColab APIに接続
 */

interface DeepSeekColabResponse {
  success: boolean;
  yaml?: string;
  markdown?: string;
  processingTime?: number;
  metadata?: {
    modelType: string;
    processingTime: number;
  };
  error?: string;
}

export class DeepSeekColabClient {
  private baseUrl: string;
  private timeout: number;

  constructor(baseUrl?: string, timeout: number = 300000) { // 5分タイムアウト
    this.baseUrl = baseUrl || process.env.DEEPSEEK_COLAB_URL || '';
    this.timeout = timeout;

    if (!this.baseUrl) {
      throw new Error(
        'DEEPSEEK_COLAB_URL is not set. Please set it in .env file with your ngrok URL from Google Colab.'
      );
    }
  }

  /**
   * ヘルスチェック
   */
  async healthCheck(): Promise<{ status: string; gpu: boolean; gpu_name?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(10000), // 10秒タイムアウト
      });

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error: any) {
      throw new Error(`Colab API health check failed: ${error.message}`);
    }
  }

  /**
   * 画像からYAMLを生成
   */
  async generateYamlFromImage(imageFile: File | Buffer): Promise<DeepSeekColabResponse> {
    try {
      const formData = new FormData();

      if (imageFile instanceof File) {
        formData.append('file', imageFile);
      } else {
        // Buffer の場合
        const blob = new Blob([imageFile], { type: 'image/png' });
        formData.append('file', blob, 'image.png');
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/ocr`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `API request failed: ${response.statusText}`);
      }

      const result: DeepSeekColabResponse = await response.json();
      return result;

    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('Colab API request timeout. The model might still be loading.');
      }
      throw new Error(`Colab API request failed: ${error.message}`);
    }
  }

  /**
   * Base64画像からYAMLを生成
   */
  async generateYamlFromBase64(base64Image: string): Promise<DeepSeekColabResponse> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/ocr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: base64Image }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `API request failed: ${response.statusText}`);
      }

      const result: DeepSeekColabResponse = await response.json();
      return result;

    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('Colab API request timeout. The model might still be loading.');
      }
      throw new Error(`Colab API request failed: ${error.message}`);
    }
  }

  /**
   * Colab APIが利用可能かチェック
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.healthCheck();
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * シングルトンインスタンス
 */
let colabClient: DeepSeekColabClient | null = null;

export function getDeepSeekColabClient(): DeepSeekColabClient {
  if (!colabClient) {
    colabClient = new DeepSeekColabClient();
  }
  return colabClient;
}
