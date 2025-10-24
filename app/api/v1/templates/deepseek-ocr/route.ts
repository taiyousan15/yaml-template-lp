import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';

/**
 * DeepSeek-OCRを使用してLP画像をYAMLに変換するAPIエンドポイント
 *
 * GPU環境が必要（CUDA対応）
 */

interface DeepSeekOCRResponse {
  success: boolean;
  yaml?: string;
  markdown?: string;
  error?: string;
  processingTime?: number;
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'ファイルが必要です' },
        { status: 400 }
      );
    }

    // 一時ディレクトリの作成
    const sessionId = randomUUID();
    const tempDir = join(tmpdir(), 'deepseek-ocr', sessionId);
    await mkdir(tempDir, { recursive: true });

    // 画像ファイルを一時保存
    const buffer = Buffer.from(await file.arrayBuffer());
    const inputImagePath = join(tempDir, `input_${file.name}`);
    const outputYamlPath = join(tempDir, 'output.yaml');

    await writeFile(inputImagePath, buffer);

    console.log('DeepSeek-OCR processing started:', {
      sessionId,
      fileName: file.name,
      fileSize: file.size,
      inputPath: inputImagePath,
      outputPath: outputYamlPath,
    });

    // Pythonスクリプトのパス
    const pythonScriptPath = join(process.cwd(), 'python', 'deepseek_ocr_processor.py');

    // Pythonスクリプトを実行
    const yamlResult = await runDeepSeekOCR(
      pythonScriptPath,
      inputImagePath,
      outputYamlPath
    );

    // 処理時間計算
    const processingTime = Date.now() - startTime;

    // 一時ファイル削除
    try {
      await unlink(inputImagePath);
      // output.yamlは既にメモリに読み込まれているので削除
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError);
    }

    console.log('DeepSeek-OCR processing completed:', {
      sessionId,
      processingTime,
      yamlLength: yamlResult.yaml.length,
    });

    return NextResponse.json({
      success: true,
      yaml: yamlResult.yaml,
      markdown: yamlResult.markdown,
      processingTime,
      metadata: {
        sessionId,
        modelType: 'DeepSeek-OCR',
        imageSize: file.size,
        processingTime,
      },
    } as DeepSeekOCRResponse);

  } catch (error: any) {
    console.error('DeepSeek-OCR error:', error);

    // CUDA関連のエラーチェック
    if (error.message?.includes('CUDA') || error.message?.includes('GPU')) {
      return NextResponse.json(
        {
          success: false,
          error: 'GPU環境が利用できません。DeepSeek-OCRはCUDA対応GPUが必要です。',
        },
        { status: 503 }
      );
    }

    // Python実行エラー
    if (error.code === 'ENOENT') {
      return NextResponse.json(
        {
          success: false,
          error: 'Pythonまたは必要なパッケージがインストールされていません。',
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * DeepSeek-OCR Pythonスクリプトを実行
 */
function runDeepSeekOCR(
  scriptPath: string,
  inputImagePath: string,
  outputYamlPath: string
): Promise<{ yaml: string; markdown: string }> {
  return new Promise((resolve, reject) => {
    const args = [
      scriptPath,
      inputImagePath,
      '--output', outputYamlPath,
      '--base-size', '1024',
      '--image-size', '640',
      // '--device', '0',  // CUDA device ID
    ];

    console.log('Executing Python script:', {
      command: 'python3',
      args,
    });

    const pythonProcess = spawn('python3', args, {
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1',
      },
    });

    let stdoutData = '';
    let stderrData = '';
    let yamlOutput = '';

    pythonProcess.stdout.on('data', (data) => {
      const output = data.toString();
      stdoutData += output;
      console.log('[DeepSeek-OCR stdout]:', output);

      // YAML出力を抽出（"Generated YAML:" 以降）
      const yamlMarker = 'Generated YAML:';
      const yamlStartIndex = stdoutData.indexOf(yamlMarker);
      if (yamlStartIndex !== -1) {
        const yamlContent = stdoutData.substring(yamlStartIndex + yamlMarker.length);
        yamlOutput = yamlContent.replace(/=+/g, '').trim();
      }
    });

    pythonProcess.stderr.on('data', (data) => {
      const output = data.toString();
      stderrData += output;
      console.error('[DeepSeek-OCR stderr]:', output);
    });

    pythonProcess.on('close', async (code) => {
      if (code !== 0) {
        reject(new Error(`Python script exited with code ${code}\nStderr: ${stderrData}`));
        return;
      }

      try {
        // 出力YAMLファイルを読み込み
        const fs = require('fs').promises;
        const yamlContent = await fs.readFile(outputYamlPath, 'utf-8');

        resolve({
          yaml: yamlContent,
          markdown: '', // Markdownは中間生成物なので省略（必要なら保存して返す）
        });
      } catch (readError: any) {
        // ファイル読み込み失敗の場合、stdout からYAMLを取得
        if (yamlOutput) {
          resolve({
            yaml: yamlOutput,
            markdown: '',
          });
        } else {
          reject(new Error(`Failed to read YAML output: ${readError.message}`));
        }
      }
    });

    pythonProcess.on('error', (error) => {
      reject(new Error(`Failed to start Python process: ${error.message}`));
    });

    // タイムアウト設定（10分）
    setTimeout(() => {
      pythonProcess.kill();
      reject(new Error('DeepSeek-OCR processing timeout (10 minutes)'));
    }, 10 * 60 * 1000);
  });
}

/**
 * GET: ヘルスチェック
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'DeepSeek-OCR YAML Generator',
    requirements: {
      python: 'python3',
      cuda: 'CUDA 11.8+',
      gpu: 'NVIDIA GPU with 8GB+ VRAM',
      packages: [
        'torch==2.6.0',
        'transformers==4.46.3',
        'flash-attn==2.7.3',
      ],
    },
    note: 'This endpoint requires GPU environment with CUDA support',
  });
}
