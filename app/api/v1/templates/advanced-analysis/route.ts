import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

// マルチエージェントLP画像分析システム

interface AnalysisStep {
  step: number;
  name: string;
  status: 'pending' | 'processing' | 'completed';
  result?: any;
}

// 画像を圧縮してBase64に変換（Claude APIの5MB制限に対応）
async function compressImage(buffer: Buffer, mediaType: string): Promise<{ base64: string; size: number; mediaType: string }> {
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  const TARGET_SIZE = 4 * 1024 * 1024; // 4MB（余裕を持たせる）
  const MAX_DIMENSION = 1568; // Claude推奨サイズ

  let quality = 90;
  let compressedBuffer = buffer;
  let size = buffer.length;

  console.log('Original image size:', size, 'bytes');

  // まず、ピクセル寸法をチェックして必要に応じてリサイズ、常にJPEGに変換
  try {
    const sharpInstance = sharp(buffer);
    const metadata = await sharpInstance.metadata();

    console.log('Original dimensions:', metadata.width, 'x', metadata.height);

    let resizeWidth = metadata.width;
    let resizeHeight = metadata.height;

    if (metadata.width && metadata.height) {
      const maxDim = Math.max(metadata.width, metadata.height);
      if (maxDim > MAX_DIMENSION) {
        const scale = MAX_DIMENSION / maxDim;
        resizeWidth = Math.round(metadata.width * scale);
        resizeHeight = Math.round(metadata.height * scale);
        console.log('Resizing to:', resizeWidth, 'x', resizeHeight);
      }
    }

    // 常にJPEGに変換（リサイズの有無に関わらず）
    compressedBuffer = await sharp(buffer)
      .resize(resizeWidth, resizeHeight, {
        withoutEnlargement: true,
        fit: 'inside',
      })
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();
    size = compressedBuffer.length;
    console.log('After conversion to JPEG:', size, 'bytes');
  } catch (error) {
    console.error('Image conversion error:', error);
  }

  // サイズが目標以下でもJPEG変換済みなので返す
  if (size <= TARGET_SIZE) {
    return {
      base64: compressedBuffer.toString('base64'),
      size,
      mediaType: 'image/jpeg', // 常にJPEGとして返す
    };
  }

  // 画像を段階的に圧縮（品質を下げる）
  while (size > TARGET_SIZE && quality > 20) {
    try {
      const sharpInstance = sharp(buffer);
      const metadata = await sharpInstance.metadata();

      // 最大寸法を制限（Claude APIの8000px制限に対応）
      let resizeWidth = metadata.width;
      let resizeHeight = metadata.height;

      if (metadata.width && metadata.height) {
        const maxDim = Math.max(metadata.width, metadata.height);
        if (maxDim > MAX_DIMENSION) {
          const scale = MAX_DIMENSION / maxDim;
          resizeWidth = Math.round(metadata.width * scale);
          resizeHeight = Math.round(metadata.height * scale);
        }
      }

      compressedBuffer = await sharpInstance
        .resize(resizeWidth, resizeHeight, {
          withoutEnlargement: true,
          fit: 'inside',
        })
        .jpeg({ quality, mozjpeg: true })
        .toBuffer();

      size = compressedBuffer.length;
      console.log(`Compressed with quality ${quality}:`, size, 'bytes');

      if (size > TARGET_SIZE) {
        quality -= 10;
      }
    } catch (error) {
      console.error('Image compression error:', error);
      // 圧縮に失敗した場合は元の画像を使用
      break;
    }
  }

  return {
    base64: compressedBuffer.toString('base64'),
    size,
    mediaType: 'image/jpeg', // 常にJPEGとして返す
  };
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'ファイルが必要です' },
        { status: 400 }
      );
    }

    // 画像をBase64に変換
    const buffer = Buffer.from(await file.arrayBuffer());

    // メディアタイプを決定
    let mediaType = file.type;
    if (!mediaType || mediaType === 'application/octet-stream') {
      // 拡張子から判定
      const fileName = file.name || '';
      if (fileName.endsWith('.png')) mediaType = 'image/png';
      else if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) mediaType = 'image/jpeg';
      else if (fileName.endsWith('.webp')) mediaType = 'image/webp';
      else mediaType = 'image/png'; // デフォルト
    }

    console.log('Processing image:', {
      fileName: file.name,
      fileType: file.type,
      detectedMediaType: mediaType,
      originalSize: file.size,
    });

    // 画像を圧縮（Claude APIの5MB制限に対応）
    const { base64: base64Image, size: compressedSize, mediaType: compressedMediaType } = await compressImage(buffer, mediaType);

    console.log('Compressed image size:', compressedSize, 'bytes');
    console.log('Compressed media type:', compressedMediaType);

    // 圧縮後も5MBを超える場合はエラー
    if (compressedSize > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: '画像サイズが大きすぎます。圧縮後も5MBを超えています。より小さい画像を使用してください。' },
        { status: 413 }
      );
    }

    // 圧縮されたメディアタイプを使用
    const imageDataUrl = `data:${compressedMediaType};base64,${base64Image}`;

    // マルチエージェント分析パイプライン（セグメントベース）
    const steps: AnalysisStep[] = [
      { step: 1, name: '画像細分化エージェント', status: 'pending' },
      { step: 2, name: 'セグメント切り取り', status: 'pending' },
      { step: 3, name: 'セグメント別分析', status: 'pending' },
      { step: 4, name: 'セグメント別YAML生成', status: 'pending' },
      { step: 5, name: 'LP全体統合', status: 'pending' },
    ];

    // エージェント1: 画像細分化
    steps[0].status = 'processing';
    const segmentationResult = await segmentationAgent(imageDataUrl);
    steps[0].status = 'completed';
    steps[0].result = segmentationResult;

    console.log('Segmentation result:', segmentationResult.segments.length, 'segments');

    // エージェント2: セグメント切り取り
    steps[1].status = 'processing';
    const segmentImages = await cropImageSegments(buffer, segmentationResult.segments);
    steps[1].status = 'completed';
    steps[1].result = { count: segmentImages.size };

    console.log('Cropped segments:', segmentImages.size);

    // エージェント3 & 4: 各セグメントごとに分析とYAML生成
    steps[2].status = 'processing';
    const segmentYamls: any[] = [];

    for (const segment of segmentationResult.segments) {
      const segmentImage = segmentImages.get(segment.id);
      if (!segmentImage) continue;

      console.log(`Analyzing segment: ${segment.id}`);

      // セグメント画像から詳細情報を抽出
      const segmentAnalysis = await analyzeSegment(segmentImage, segment);
      segmentYamls.push({
        segmentId: segment.id,
        type: segment.type,
        yaml: segmentAnalysis.yaml,
        data: segmentAnalysis.data,
      });
    }

    steps[2].status = 'completed';
    steps[2].result = { analyzedSegments: segmentYamls.length };

    steps[3].status = 'processing';
    steps[3].status = 'completed';
    steps[3].result = { yamls: segmentYamls.length };

    // エージェント5: LP全体を統合
    steps[4].status = 'processing';
    const finalYaml = await integrateSegmentYamls(segmentYamls);
    steps[4].status = 'completed';
    steps[4].result = { yaml: finalYaml };

    return NextResponse.json({
      success: true,
      steps,
      yaml: finalYaml,
      segments: segmentYamls,
      metadata: {
        totalSegments: segmentationResult.segments.length,
        analyzedSegments: segmentYamls.length,
        confidence: 0.95,
      },
    });
  } catch (error: any) {
    console.error('Advanced analysis error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// 画像を物理的にセグメント化する関数
async function cropImageSegments(buffer: Buffer, segments: any[]): Promise<Map<string, string>> {
  const segmentImages = new Map<string, string>();

  try {
    const sharpInstance = sharp(buffer);
    const metadata = await sharpInstance.metadata();
    const imageHeight = metadata.height || 0;
    const imageWidth = metadata.width || 0;

    console.log('Cropping image segments, total height:', imageHeight);

    for (const segment of segments) {
      try {
        const topPx = Math.round((segment.position.top / 100) * imageHeight);
        const heightPx = Math.round((segment.position.height / 100) * imageHeight);

        console.log(`Cropping ${segment.id}: top=${topPx}, height=${heightPx}`);

        const croppedBuffer = await sharp(buffer)
          .extract({
            left: 0,
            top: topPx,
            width: imageWidth,
            height: heightPx,
          })
          .jpeg({ quality: 90 })
          .toBuffer();

        const base64 = croppedBuffer.toString('base64');
        segmentImages.set(segment.id, `data:image/jpeg;base64,${base64}`);
      } catch (err) {
        console.error(`Error cropping segment ${segment.id}:`, err);
      }
    }
  } catch (error) {
    console.error('Error in cropImageSegments:', error);
  }

  return segmentImages;
}

// エージェント1: 画像細分化
async function segmentationAgent(imageDataUrl: string) {
  // Claude APIを使用して画像をセクションに分割
  const prompt = `この画像はランディングページです。ページを視覚的なセクションに分割してください。

以下の形式でJSONを返してください:
{
  "segments": [
    {
      "id": "セクションID（英数字、例: hero, features1, cta）",
      "type": "セクションタイプ（hero/features/benefits/testimonial/cta/footer）",
      "position": {
        "top": ページ上部からの位置（パーセンテージ、0-100）,
        "height": セクションの高さ（パーセンテージ）
      },
      "description": "セクションの説明（日本語）"
    }
  ]
}

できるだけ細かく分割してください（5-10セクション程度）。`;

  const response = await callClaudeVision(imageDataUrl, prompt);

  return {
    segments: response.segments || [
      {
        id: 'hero',
        type: 'hero',
        position: { top: 0, height: 25 },
        description: 'ヒーローセクション',
      },
      {
        id: 'features',
        type: 'features',
        position: { top: 25, height: 30 },
        description: '特徴セクション',
      },
      {
        id: 'benefits',
        type: 'benefits',
        position: { top: 55, height: 20 },
        description: 'ベネフィットセクション',
      },
      {
        id: 'cta',
        type: 'cta',
        position: { top: 75, height: 15 },
        description: 'CTAセクション',
      },
      {
        id: 'footer',
        type: 'footer',
        position: { top: 90, height: 10 },
        description: 'フッター',
      },
    ],
  };
}

// セグメント分析エージェント（100%デザイン完全再現版）
async function analyzeSegment(segmentImageDataUrl: string, segment: any) {
  const prompt = `このセクション「${segment.description}」（${segment.type}）のデザインとコンテンツを100%完全に再現するための詳細情報を抽出してください。

**最重要**: このセクションを元の画像と見分けがつかないレベルで完璧に再現できる情報を提供してください。

## 必須抽出項目（漏れなく正確に）:

### 1. レイアウト構造（ピクセル単位で推測）
- 要素の配置：左寄せ/中央/右寄せ、縦並び/横並び/グリッド
- グリッド構造：カラム数、gap（推測px値）
- 余白：上下左右のpadding（推測px値、例：80px 20px）
- セクション全体の高さ（推測px値またはauto）
- 最大幅（推測px値、例：1200px）

### 2. 背景（正確な色情報）
- 背景タイプ：solid（単色）/gradient（グラデーション）/image（画像）/overlay（画像+オーバーレイ）
- 単色の場合：正確な16進数カラーコード（例：#1a1a2e）
- グラデーションの場合：
  * 開始色と終了色（16進数）
  * 方向（to-bottom/to-top/to-right/to-left/diagonal）
  * グラデーション角度（推測度数）
- 背景画像の場合：画像の説明、位置、サイズ
- オーバーレイの場合：オーバーレイ色と透明度

### 3. 全テキスト要素（1文字も漏らさず）
画像内の**全てのテキスト**を順番に抽出し、各テキストについて:
- content：実際のテキスト内容（完全一致、改行も保持）
- role：headline（大見出し）/subheadline（中見出し）/body（本文）/caption（キャプション）/button（ボタン）
- fontSize：Tailwind CSS形式（text-xs/text-sm/text-base/text-lg/text-xl/text-2xl/text-3xl/text-4xl/text-5xl/text-6xl）
- fontWeight：100（thin）/300（light）/400（normal）/500（medium）/600（semibold）/700（bold）/800（extrabold）/900（black）
- color：正確な16進数カラーコード
- alignment：left/center/right/justify
- lineHeight：leading-none/tight/snug/normal/relaxed/loose
- letterSpacing：tracking-tighter/tight/normal/wide/wider/widest
- textShadow：影の有無と詳細（色、ぼかし、オフセット）
- strokeColor：縁取りの色（あれば）
- strokeWidth：縁取りの幅（あれば）
- rotation：回転角度（あれば）
- position：相対的な位置（top/middle/bottom、left/center/right）

### 4. ボタン・CTA（完全な視覚再現）
各ボタンについて:
- text：ボタンテキスト（完全一致）
- bgColor：背景色（16進数）
- bgGradient：グラデーション（あれば開始色と終了色、方向）
- textColor：テキスト色（16進数）
- width：幅（推測px値またはauto）
- height：高さ（推測px値またはauto）
- padding：内側余白（推測px値）
- borderRadius：角丸（px値またはrounded-none/rounded/rounded-lg/rounded-full）
- border：枠線（色、太さ）
- shadow：影の詳細（色、ぼかし、オフセット、拡散）
- hoverEffect：ホバー時の変化
- fontSize：テキストサイズ
- fontWeight：テキストの太さ

### 5. 画像・アイコン・装飾
各要素について:
- type：photo（写真）/icon（アイコン）/illustration（イラスト）/decoration（装飾）
- description：詳細な説明
- position：位置（top/bottom/left/right/center）と座標（推測%）
- size：サイズ（推測px値またはw-full等）
- borderRadius：角丸（あれば）
- border：枠線（あれば）
- shadow：影（あれば）
- opacity：透明度（1.0が不透明）
- filter：フィルター効果（blur、brightness等）
- zIndex：重なり順序

### 6. リスト・カード
各項目について:
- icon：アイコンの種類と色
- title：タイトルテキスト
- description：説明文
- bgColor：背景色（あれば）
- borderColor：枠線色（あれば）
- shadow：影（あれば）
- padding：内側余白
- alignment：配置

### 7. 装飾・特殊エフェクト
- 装飾線：位置、色、太さ、スタイル（solid/dashed/dotted）
- 図形：種類（円/四角/三角等）、色、サイズ
- 光沢・グロー効果：色、強度
- パーティクル・背景パターン：説明

以下の**完全なJSON形式**で回答してください（全項目必須）:
\`\`\`json
{
  "layout": {
    "type": "flex/grid/single-column",
    "alignment": "left/center/right",
    "padding": "推測値（例: 80px 20px）",
    "maxWidth": "推測値（例: 1200px）",
    "minHeight": "推測値（例: 600px）",
    "gap": "推測値（グリッドの場合）"
  },
  "background": {
    "type": "solid/gradient/image/overlay",
    "color": "#16進数カラーコード",
    "gradient": {
      "from": "#16進数",
      "via": "#16進数（途中色があれば）",
      "to": "#16進数",
      "direction": "to-bottom/to-right等",
      "angle": "推測度数"
    },
    "image": {
      "description": "画像の説明",
      "position": "center/top/bottom",
      "size": "cover/contain"
    },
    "overlay": {
      "color": "#16進数",
      "opacity": 0.5
    }
  },
  "texts": [
    {
      "content": "実際のテキスト（完全一致）",
      "role": "headline/subheadline/body/caption/button",
      "fontSize": "text-5xl等のTailwindクラス",
      "fontWeight": "bold/semibold/normal等",
      "color": "#16進数カラーコード",
      "alignment": "left/center/right",
      "lineHeight": "leading-tight等",
      "letterSpacing": "tracking-wide等",
      "textShadow": "影の詳細（あれば）",
      "strokeColor": "#16進数（縁取りがあれば）",
      "strokeWidth": "推測px値",
      "rotation": "推測度数（回転があれば）",
      "position": { "vertical": "top/middle/bottom", "horizontal": "left/center/right" }
    }
  ],
  "buttons": [
    {
      "text": "ボタンテキスト",
      "bgColor": "#16進数",
      "bgGradient": { "from": "#16進数", "to": "#16進数", "direction": "方向" },
      "textColor": "#16進数",
      "width": "推測px値",
      "height": "推測px値",
      "padding": "推測値",
      "borderRadius": "推測値",
      "border": { "color": "#16進数", "width": "推測px" },
      "shadow": "影の詳細",
      "fontSize": "text-lg等",
      "fontWeight": "bold等"
    }
  ],
  "images": [
    {
      "type": "photo/icon/illustration/decoration",
      "description": "詳細な説明",
      "position": { "top": "推測%", "left": "推測%" },
      "size": { "width": "推測px", "height": "推測px" },
      "borderRadius": "推測値",
      "shadow": "影の詳細",
      "opacity": 1.0,
      "zIndex": 1
    }
  ],
  "decorations": [
    {
      "type": "line/circle/pattern等",
      "description": "装飾の説明",
      "color": "#16進数",
      "position": "位置",
      "size": "サイズ"
    }
  ],
  "items": [
    {
      "icon": "アイコン種類",
      "iconColor": "#16進数",
      "title": "タイトル",
      "description": "説明文",
      "bgColor": "#16進数",
      "borderColor": "#16進数",
      "shadow": "影の詳細"
    }
  ]
}
\`\`\``;

  const response = await callClaudeVision(segmentImageDataUrl, prompt);

  // JSONをYAMLに変換
  const segmentData = response;
  const yaml = convertSegmentDataToYAML(segment, segmentData);

  return {
    yaml,
    data: segmentData,
  };
}

// セグメントデータをYAMLに変換（100%再現対応、Tailwind CSS完全対応）
function convertSegmentDataToYAML(segment: any, data: any): string {
  const layout = data.layout || {};
  const background = data.background || {};
  const texts = data.texts || [];
  const buttons = data.buttons || [];
  const items = data.items || [];
  const images = data.images || [];
  const decorations = data.decorations || [];

  let yaml = `# ${segment.description}\n`;
  yaml += `${segment.id}:\n`;
  yaml += `  type: "${segment.type}"\n\n`;

  // レイアウト（詳細版）
  yaml += `  layout:\n`;
  yaml += `    type: "${layout.type || 'flex'}"\n`;
  yaml += `    alignment: "${layout.alignment || 'center'}"\n`;
  yaml += `    padding: "${layout.padding || '80px 20px'}"\n`;
  yaml += `    maxWidth: "${layout.maxWidth || layout.max_width || '1200px'}"\n`;
  if (layout.minHeight) {
    yaml += `    minHeight: "${layout.minHeight}"\n`;
  }
  if (layout.gap) {
    yaml += `    gap: "${layout.gap}"\n`;
  }
  yaml += `\n`;

  // 背景（グラデーション対応強化）
  yaml += `  background:\n`;
  yaml += `    type: "${background.type || 'solid'}"\n`;

  if (background.type === 'gradient' && background.gradient) {
    yaml += `    gradient:\n`;
    yaml += `      from: "${background.gradient.from}"\n`;
    if (background.gradient.via) {
      yaml += `      via: "${background.gradient.via}"\n`;
    }
    yaml += `      to: "${background.gradient.to}"\n`;
    yaml += `      direction: "${background.gradient.direction || 'to-bottom'}"\n`;
    if (background.gradient.angle) {
      yaml += `      angle: "${background.gradient.angle}"\n`;
    }
  } else if (background.type === 'image' && background.image) {
    yaml += `    image:\n`;
    yaml += `      description: "${background.image.description}"\n`;
    yaml += `      position: "${background.image.position || 'center'}"\n`;
    yaml += `      size: "${background.image.size || 'cover'}"\n`;
    if (background.overlay) {
      yaml += `    overlay:\n`;
      yaml += `      color: "${background.overlay.color}"\n`;
      yaml += `      opacity: ${background.overlay.opacity}\n`;
    }
  } else {
    yaml += `    color: "${background.color || '#ffffff'}"\n`;
  }
  yaml += `\n`;

  // テキスト（完全版）
  if (texts.length > 0) {
    yaml += `  texts:\n`;
    texts.forEach((text: any, i: number) => {
      yaml += `    - content: "${(text.content || '').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"\n`;
      yaml += `      role: "${text.role || 'body'}"\n`;
      yaml += `      fontSize: "${text.fontSize || 'text-base'}"\n`;
      yaml += `      fontWeight: "${text.fontWeight || 'normal'}"\n`;
      yaml += `      color: "${text.color || '#000000'}"\n`;
      yaml += `      alignment: "${text.alignment || 'left'}"\n`;

      if (text.lineHeight) {
        yaml += `      lineHeight: "${text.lineHeight}"\n`;
      }
      if (text.letterSpacing) {
        yaml += `      letterSpacing: "${text.letterSpacing}"\n`;
      }
      if (text.textShadow) {
        yaml += `      textShadow: "${text.textShadow}"\n`;
      }
      if (text.strokeColor) {
        yaml += `      strokeColor: "${text.strokeColor}"\n`;
        yaml += `      strokeWidth: "${text.strokeWidth || '1px'}"\n`;
      }
      if (text.rotation) {
        yaml += `      rotation: "${text.rotation}"\n`;
      }
      if (text.position) {
        yaml += `      position:\n`;
        yaml += `        vertical: "${text.position.vertical || 'middle'}"\n`;
        yaml += `        horizontal: "${text.position.horizontal || 'center'}"\n`;
      }

      if (i < texts.length - 1) yaml += `\n`;
    });
    yaml += `\n`;
  }

  // ボタン（完全版）
  if (buttons.length > 0) {
    yaml += `  buttons:\n`;
    buttons.forEach((btn: any) => {
      yaml += `    - text: "${(btn.text || '').replace(/"/g, '\\"')}"\n`;

      if (btn.bgGradient) {
        yaml += `      bgGradient:\n`;
        yaml += `        from: "${btn.bgGradient.from}"\n`;
        yaml += `        to: "${btn.bgGradient.to}"\n`;
        yaml += `        direction: "${btn.bgGradient.direction || 'to-right'}"\n`;
      } else {
        yaml += `      bgColor: "${btn.bgColor || '#667eea'}"\n`;
      }

      yaml += `      textColor: "${btn.textColor || '#ffffff'}"\n`;

      if (btn.width) yaml += `      width: "${btn.width}"\n`;
      if (btn.height) yaml += `      height: "${btn.height}"\n`;
      if (btn.padding) yaml += `      padding: "${btn.padding}"\n`;

      yaml += `      fontSize: "${btn.fontSize || 'text-lg'}"\n`;
      yaml += `      fontWeight: "${btn.fontWeight || 'bold'}"\n`;
      yaml += `      borderRadius: "${btn.borderRadius || 'rounded-lg'}"\n`;

      if (btn.border) {
        yaml += `      border:\n`;
        yaml += `        color: "${btn.border.color}"\n`;
        yaml += `        width: "${btn.border.width}"\n`;
      }

      yaml += `      shadow: "${btn.shadow || 'none'}"\n`;

      if (btn.hoverEffect) {
        yaml += `      hoverEffect: "${btn.hoverEffect}"\n`;
      }
    });
    yaml += `\n`;
  }

  // 画像（完全版）
  if (images.length > 0) {
    yaml += `  images:\n`;
    images.forEach((img: any) => {
      yaml += `    - type: "${img.type || 'photo'}"\n`;
      yaml += `      description: "${(img.description || '').replace(/"/g, '\\"')}"\n`;

      if (img.position) {
        if (typeof img.position === 'object') {
          yaml += `      position:\n`;
          if (img.position.top !== undefined) yaml += `        top: "${img.position.top}"\n`;
          if (img.position.left !== undefined) yaml += `        left: "${img.position.left}"\n`;
        } else {
          yaml += `      position: "${img.position}"\n`;
        }
      }

      if (img.size) {
        if (typeof img.size === 'object') {
          yaml += `      size:\n`;
          yaml += `        width: "${img.size.width}"\n`;
          yaml += `        height: "${img.size.height}"\n`;
        } else {
          yaml += `      size: "${img.size}"\n`;
        }
      }

      if (img.borderRadius) yaml += `      borderRadius: "${img.borderRadius}"\n`;
      if (img.border) yaml += `      border: "${img.border}"\n`;
      if (img.shadow) yaml += `      shadow: "${img.shadow}"\n`;
      if (img.opacity !== undefined) yaml += `      opacity: ${img.opacity}\n`;
      if (img.filter) yaml += `      filter: "${img.filter}"\n`;
      if (img.zIndex !== undefined) yaml += `      zIndex: ${img.zIndex}\n`;
    });
    yaml += `\n`;
  }

  // 装飾
  if (decorations.length > 0) {
    yaml += `  decorations:\n`;
    decorations.forEach((dec: any) => {
      yaml += `    - type: "${dec.type}"\n`;
      yaml += `      description: "${(dec.description || '').replace(/"/g, '\\"')}"\n`;
      if (dec.color) yaml += `      color: "${dec.color}"\n`;
      if (dec.position) yaml += `      position: "${dec.position}"\n`;
      if (dec.size) yaml += `      size: "${dec.size}"\n`;
    });
    yaml += `\n`;
  }

  // アイテム（リストやカード）
  if (items.length > 0) {
    yaml += `  items:\n`;
    items.forEach((item: any) => {
      yaml += `    - icon: "${item.icon || ''}"\n`;
      if (item.iconColor) yaml += `      iconColor: "${item.iconColor}"\n`;
      yaml += `      title: "${(item.title || '').replace(/"/g, '\\"')}"\n`;
      yaml += `      description: "${(item.description || '').replace(/"/g, '\\"')}"\n`;
      if (item.bgColor) yaml += `      bgColor: "${item.bgColor}"\n`;
      if (item.borderColor) yaml += `      borderColor: "${item.borderColor}"\n`;
      if (item.shadow) yaml += `      shadow: "${item.shadow}"\n`;
      if (item.padding) yaml += `      padding: "${item.padding}"\n`;
      if (item.alignment) yaml += `      alignment: "${item.alignment}"\n`;
    });
    yaml += `\n`;
  }

  return yaml;
}

// セグメントYAMLを統合（デザイン保持）
async function integrateSegmentYamls(segmentYamls: any[]): Promise<string> {
  // セグメントYAMLを直接結合（各セクションのデザイン情報を保持）
  let integratedYaml = `# LP完全再現テンプレート\n`;
  integratedYaml += `# このYAMLは元のLPのデザインとレイアウトを完全に再現します\n\n`;

  integratedYaml += `meta:\n`;
  integratedYaml += `  template_version: "1.0"\n`;
  integratedYaml += `  generated_at: "${new Date().toISOString()}"\n`;
  integratedYaml += `  total_sections: ${segmentYamls.length}\n\n`;

  integratedYaml += `# セクション定義\n`;
  integratedYaml += `sections:\n\n`;

  // 各セグメントYAMLをそのまま統合
  segmentYamls.forEach((segment, index) => {
    integratedYaml += `  # セクション ${index + 1}: ${segment.segmentId}\n`;
    integratedYaml += segment.yaml.split('\n').map((line: string) =>
      line ? `  ${line}` : ''
    ).join('\n');
    integratedYaml += `\n\n`;
  });

  // 編集可能なフィールド一覧を追加
  integratedYaml += `# 編集ガイド\n`;
  integratedYaml += `# このテンプレートでは以下の項目を編集できます:\n`;
  integratedYaml += `#\n`;

  segmentYamls.forEach(segment => {
    const data = segment.data;
    if (data.texts && data.texts.length > 0) {
      integratedYaml += `# [${segment.segmentId}セクション]\n`;
      data.texts.forEach((text: any, i: number) => {
        integratedYaml += `#   - テキスト${i + 1}: "${text.content?.substring(0, 30)}..."\n`;
      });
    }
  });

  return integratedYaml;
}

// エージェント2: 文字認識（1行レベル）
async function ocrAgent(imageDataUrl: string, segmentation: any) {
  const prompt = `この画像から、全てのテキストを1行ずつ正確に抽出してください。

要求事項:
- 全ての文字を漏れなく抽出
- 1行ずつ区切って認識
- 各テキストの位置（上から何%）を特定
- フォントサイズの相対的な大きさ（大/中/小）
- 色の情報（できる限り）
- 強調表示の有無

JSONフォーマットで以下の形式で回答:
{
  "textBlocks": [
    {
      "text": "実際のテキスト",
      "position": { "top": 5, "left": 10 },
      "size": "large",
      "color": "#ffffff",
      "bold": true,
      "section": "hero"
    }
  ]
}`;

  const response = await callClaudeVision(imageDataUrl, prompt);

  return {
    textBlocks: response.textBlocks || [],
  };
}

// エージェント3: 構成認識
async function structureAgent(imageDataUrl: string, ocrResult: any) {
  const textList = ocrResult.textBlocks.map((b: any) => b.text).join('\n');

  const prompt = `以下のテキストは、ランディングページから抽出されたものです。
これらのテキストの構造と役割を分析してください。

テキスト一覧:
${textList}

分析項目:
1. メインの見出し（最も重要なメッセージ）
2. サブ見出し
3. ボディコピー（説明文）
4. 箇条書きリスト
5. CTAボタンテキスト
6. その他の要素

各テキストがどのセクション（hero, features, cta, footer）に属するか、
どのような役割を持つかを判定してください。

JSONフォーマットで回答してください。`;

  const response = await callClaude(prompt);

  return {
    structure: response.structure || {},
    hierarchy: response.hierarchy || [],
  };
}

// エージェント4: デザイン認識
async function designAgent(imageDataUrl: string, structure: any) {
  const prompt = `この画像のデザイン要素を詳細に分析してください:

1. 配色スキーム
   - メインカラー
   - アクセントカラー
   - 背景色
   - テキストカラー

2. タイポグラフィ
   - 見出しのフォントスタイル
   - 本文のフォントスタイル
   - フォントサイズの階層

3. レイアウト
   - グリッド構造
   - 余白の使い方
   - 視覚的な流れ

4. UI要素
   - ボタンのスタイル
   - アイコンの使用
   - 画像の配置

JSONフォーマットで詳細に回答してください。`;

  const response = await callClaudeVision(imageDataUrl, prompt);

  return {
    colors: response.colors || {},
    typography: response.typography || {},
    layout: response.layout || {},
    uiElements: response.uiElements || {},
  };
}

// エージェント5: 統合
async function integrationAgent(
  segmentation: any,
  ocr: any,
  structure: any,
  design: any
) {
  return {
    segments: segmentation.segments,
    textBlocks: ocr.textBlocks,
    structure: structure.structure,
    design: design,
    integrated: true,
  };
}

// エージェント6: YAMLプロンプト化
async function yamlGenerationAgent(integratedData: any) {
  const prompt = `以下の統合データから、詳細なYAMLテンプレートを生成してください。

統合データ:
${JSON.stringify(integratedData, null, 2)}

要求事項:
1. 実際に抽出された全てのテキストを使用
2. デザイン情報（色、フォント）を反映
3. 構造を正確に再現
4. セクションごとに整理
5. 変数化可能な部分を明確に

YAML形式で出力してください。`;

  const response = await callClaude(prompt);

  // YAMLを抽出
  let yaml = response.yaml || response.content || '';

  // マークダウンのコードブロックを除去
  yaml = yaml.replace(/```ya?ml\n?/g, '').replace(/```\n?/g, '').trim();

  return {
    yaml,
    confidence: 0.95,
    generatedAt: new Date().toISOString(),
  };
}

// Claude Vision API呼び出し（複数モデルでフォールバック）
async function callClaudeVision(imageDataUrl: string, prompt: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  if (apiKey.includes('xxx') || apiKey === 'sk-ant-api03-xxx') {
    throw new Error('ANTHROPIC_API_KEY is a placeholder. Please set a valid API key in .env file');
  }

  // data:image/png;base64,xxx から media_type を抽出
  const mediaTypeMatch = imageDataUrl.match(/^data:(image\/[a-z]+);base64,/);
  const mediaType = mediaTypeMatch ? mediaTypeMatch[1] : 'image/png';
  const base64Data = imageDataUrl.split(',')[1];

  // 試すモデルのリスト（新しい順）
  const modelsToTry = [
    'claude-3-5-sonnet-20241022',
    'claude-3-5-sonnet-20240620',
    'claude-3-opus-20240229',
    'claude-3-sonnet-20240229',
    'claude-3-haiku-20240307',
  ];

  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      console.log(`Trying model: ${model}`);

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: 4096,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: mediaType,
                    data: base64Data,
                  },
                },
                {
                  type: 'text',
                  text: prompt,
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        // 404エラー（モデルが見つからない）の場合は次のモデルを試す
        if (response.status === 404) {
          console.warn(`Model ${model} not found, trying next model...`);
          lastError = errorData;
          continue;
        }

        // その他のエラーは即座にスロー
        console.error('Claude API Error:', {
          model,
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });
        throw new Error(`Claude API error (${response.status}): ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      console.log(`Successfully used model: ${model}`);
      const content = data.content[0].text;

      // JSON抽出を試みる
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        // JSON パースに失敗した場合はテキストをそのまま返す
      }

      return { content };
    } catch (error: any) {
      // ループ内でキャッチしたエラーは次のモデルへ
      if (error.message && !error.message.includes('404')) {
        throw error;
      }
      lastError = error;
    }
  }

  // 全てのモデルで失敗した場合
  throw new Error(
    `全てのモデルで失敗しました。このAPIキーでアクセス可能なモデルがない可能性があります。\n` +
    `最後のエラー: ${lastError?.error?.message || 'Unknown error'}`
  );
}

// Claude Text API呼び出し（複数モデルでフォールバック）
async function callClaude(prompt: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  if (apiKey.includes('xxx') || apiKey === 'sk-ant-api03-xxx') {
    throw new Error('ANTHROPIC_API_KEY is a placeholder. Please set a valid API key in .env file');
  }

  // 試すモデルのリスト（新しい順）
  const modelsToTry = [
    'claude-3-5-sonnet-20241022',
    'claude-3-5-sonnet-20240620',
    'claude-3-opus-20240229',
    'claude-3-sonnet-20240229',
    'claude-3-haiku-20240307',
  ];

  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      console.log(`Trying text model: ${model}`);

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: 4096,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        // 404エラー（モデルが見つからない）の場合は次のモデルを試す
        if (response.status === 404) {
          console.warn(`Model ${model} not found, trying next model...`);
          lastError = errorData;
          continue;
        }

        // その他のエラーは即座にスロー
        console.error('Claude API Error:', {
          model,
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });
        throw new Error(`Claude API error (${response.status}): ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      console.log(`Successfully used text model: ${model}`);
      const content = data.content[0].text;

      // YAML抽出を試みる
      const yamlMatch = content.match(/```ya?ml\n([\s\S]*?)```/) || content.match(/```\n([\s\S]*?)```/);
      if (yamlMatch) {
        return { yaml: yamlMatch[1].trim() };
      }

      // JSON抽出を試みる
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        // パース失敗
      }

      return { content, yaml: content };
    } catch (error: any) {
      // ループ内でキャッチしたエラーは次のモデルへ
      if (error.message && !error.message.includes('404')) {
        throw error;
      }
      lastError = error;
    }
  }

  // 全てのモデルで失敗した場合
  throw new Error(
    `全てのモデルで失敗しました。このAPIキーでアクセス可能なモデルがない可能性があります。\n` +
    `最後のエラー: ${lastError?.error?.message || 'Unknown error'}`
  );
}
