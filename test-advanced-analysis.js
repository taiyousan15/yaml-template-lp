#!/usr/bin/env node
/**
 * Advanced Analysis API テストスクリプト
 * 画像から100%再現可能なYAMLを生成
 */

const fs = require('fs');
const path = require('path');

const IMAGE_PATH = '/Users/matsumototoshihiko/Desktop/スクリーンショット 2025-10-21 21.10.55.png';
const API_URL = 'http://localhost:3005/api/v1/templates/advanced-analysis';
const OUTPUT_DIR = './generated-yamls';

async function testAdvancedAnalysis() {
  console.log('🚀 Advanced Analysis API テスト開始\n');
  console.log('📁 画像パス:', IMAGE_PATH);
  console.log('🌐 API URL:', API_URL);
  console.log('');

  // 画像ファイルの存在確認
  if (!fs.existsSync(IMAGE_PATH)) {
    console.error('❌ エラー: 画像ファイルが見つかりません:', IMAGE_PATH);
    process.exit(1);
  }

  // 出力ディレクトリ作成
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  try {
    // 画像ファイルを読み込み
    const fileBuffer = fs.readFileSync(IMAGE_PATH);
    const blob = new Blob([fileBuffer], { type: 'image/png' });

    // FormDataを作成（Node.js 22のネイティブFormDataを使用）
    const formData = new FormData();
    formData.append('file', blob, 'design.png');

    console.log('📤 画像をAPIに送信中...\n');

    const startTime = Date.now();

    // APIリクエスト（Node.js 22のネイティブfetchを使用）
    const response = await fetch(API_URL, {
      method: 'POST',
      body: formData,
    });

    const processingTime = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ APIエラー:', response.status, response.statusText);
      console.error('エラー詳細:', errorText);
      process.exit(1);
    }

    const result = await response.json();

    console.log('✅ 処理完了！\n');
    console.log('⏱️  処理時間:', processingTime, 'ms');
    console.log('📊 セグメント数:', result.metadata?.totalSegments || 0);
    console.log('🔍 分析完了セグメント:', result.metadata?.analyzedSegments || 0);
    console.log('');

    // YAMLを保存
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const yamlOutputPath = path.join(OUTPUT_DIR, `design-${timestamp}.yaml`);
    fs.writeFileSync(yamlOutputPath, result.yaml, 'utf-8');

    console.log('💾 YAMLを保存しました:', yamlOutputPath);
    console.log('');

    // セグメント情報を保存
    const segmentsOutputPath = path.join(OUTPUT_DIR, `segments-${timestamp}.json`);
    fs.writeFileSync(segmentsOutputPath, JSON.stringify(result.segments, null, 2), 'utf-8');

    console.log('💾 セグメント情報を保存しました:', segmentsOutputPath);
    console.log('');

    // 生成されたYAMLの一部を表示
    console.log('📄 生成されたYAML（最初の50行）:');
    console.log('─'.repeat(80));
    const yamlLines = result.yaml.split('\n').slice(0, 50);
    console.log(yamlLines.join('\n'));
    if (result.yaml.split('\n').length > 50) {
      console.log('...');
      console.log(`（残り ${result.yaml.split('\n').length - 50} 行）`);
    }
    console.log('─'.repeat(80));
    console.log('');

    // ステップ情報を表示
    if (result.steps) {
      console.log('📋 処理ステップ:');
      result.steps.forEach((step) => {
        const statusIcon = step.status === 'completed' ? '✅' : step.status === 'processing' ? '⏳' : '⏸️';
        console.log(`  ${statusIcon} ステップ${step.step}: ${step.name} (${step.status})`);
      });
      console.log('');
    }

    console.log('🎉 テスト成功！');
    console.log('');
    console.log('次のステップ:');
    console.log('  1. 生成されたYAMLファイルを確認:', yamlOutputPath);
    console.log('  2. YAML Rendererで表示: http://localhost:3005/yaml-renderer');
    console.log('  3. セグメント詳細を確認:', segmentsOutputPath);

  } catch (error) {
    console.error('❌ エラー:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 実行
testAdvancedAnalysis();
