import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';

/**
 * YAML ImageGenerator API
 *
 * YAMLテンプレートと変数値から高品質な画像を生成
 * yamlImageGenerator.py を使用
 */

interface GenerateImageRequest {
  yamlContent: string;
  variables: Record<string, string>;
  width?: number;
  height?: number;
}

interface GenerateImageResponse {
  success: boolean;
  imageUrl?: string;
  imageBase64?: string;
  error?: string;
  processingTime?: number;
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const body: GenerateImageRequest = await req.json();
    const { yamlContent, variables, width = 1200, height = 630 } = body;

    if (!yamlContent) {
      return NextResponse.json(
        { success: false, error: 'YAMLコンテンツが必要です' },
        { status: 400 }
      );
    }

    // 一時ディレクトリの作成
    const sessionId = randomUUID();
    const tempDir = join(tmpdir(), 'yaml-generator', sessionId);
    await mkdir(tempDir, { recursive: true });

    // 変数を置き換えたYAMLを生成
    let processedYaml = yamlContent;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      processedYaml = processedYaml.replace(regex, value);
    });

    // YAMLファイルを一時保存
    const yamlPath = join(tempDir, 'template.yaml');
    const outputPath = join(tempDir, 'output.png');

    await writeFile(yamlPath, processedYaml, 'utf-8');

    console.log('YAML Image Generation started:', {
      sessionId,
      variables: Object.keys(variables),
      yamlPath,
      outputPath,
    });

    // yamlImageGenerator.pyのパス
    const pythonScriptPath = join(process.cwd(), 'python', 'yamlImageGenerator.py');

    // Python script を実行
    const imageResult = await runYamlImageGenerator(
      pythonScriptPath,
      yamlPath,
      outputPath,
      width,
      height
    );

    // 処理時間計算
    const processingTime = Date.now() - startTime;

    // 一時ファイル削除
    try {
      await unlink(yamlPath);
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError);
    }

    console.log('YAML Image Generation completed:', {
      sessionId,
      processingTime,
      imageSize: imageResult.imageBase64.length,
    });

    return NextResponse.json({
      success: true,
      imageBase64: imageResult.imageBase64,
      processingTime,
      metadata: {
        sessionId,
        generator: 'yamlImageGenerator.py',
        width,
        height,
        processingTime,
      },
    } as GenerateImageResponse);

  } catch (error: any) {
    console.error('YAML Image Generation error:', error);

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
 * yamlImageGenerator.py を実行
 */
function runYamlImageGenerator(
  scriptPath: string,
  yamlPath: string,
  outputPath: string,
  width: number,
  height: number
): Promise<{ imageBase64: string }> {
  return new Promise((resolve, reject) => {
    const args = [
      scriptPath,
      yamlPath,
      '--output', outputPath,
      '--width', width.toString(),
      '--height', height.toString(),
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

    pythonProcess.stdout.on('data', (data) => {
      const output = data.toString();
      stdoutData += output;
      console.log('[yamlImageGenerator stdout]:', output);
    });

    pythonProcess.stderr.on('data', (data) => {
      const output = data.toString();
      stderrData += output;
      console.error('[yamlImageGenerator stderr]:', output);
    });

    pythonProcess.on('close', async (code) => {
      if (code !== 0) {
        reject(new Error(`Python script exited with code ${code}\nStderr: ${stderrData}`));
        return;
      }

      try {
        // 出力画像を読み込み
        const fs = require('fs').promises;
        const imageBuffer = await fs.readFile(outputPath);
        const imageBase64 = imageBuffer.toString('base64');

        // 一時ファイルを削除
        await fs.unlink(outputPath);

        resolve({
          imageBase64: `data:image/png;base64,${imageBase64}`,
        });
      } catch (readError: any) {
        reject(new Error(`Failed to read output image: ${readError.message}`));
      }
    });

    pythonProcess.on('error', (error) => {
      reject(new Error(`Failed to start Python process: ${error.message}`));
    });

    // タイムアウト設定（5分）
    setTimeout(() => {
      pythonProcess.kill();
      reject(new Error('YAML Image Generation timeout (5 minutes)'));
    }, 5 * 60 * 1000);
  });
}

/**
 * GET: ヘルスチェック
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'YAML Image Generator API',
    requirements: {
      python: 'python3',
      script: 'yamlImageGenerator.py',
      packages: [
        'Pillow',
        'PyYAML',
      ],
    },
    note: 'Generate high-quality images from YAML templates',
  });
}
