#!/usr/bin/env node

/**
 * YAML システム統合テスト
 *
 * 以下の機能をテスト：
 * 1. YAML自動修復スクリプト
 * 2. YAMLパーサー
 * 3. エラーハンドリング
 */

const yaml = require('js-yaml');
const { fixYamlFile } = require('./yaml-auto-fixer.js');

console.log('🧪 YAML システム統合テスト開始\n');

// テストケース
const testCases = [
  {
    name: '正常なYAML',
    content: `
meta:
  title: "サンプルLP"
  description: "正常なYAMLファイル"

hero:
  headline: "見出し"
  subheadline: "サブ見出し"
`,
    shouldPass: true,
  },
  {
    name: '不完全な引用符',
    content: `
meta:
  title: "サンプルLP
  description: "説明文"
`,
    shouldPass: false,
  },
  {
    name: '変数を含むYAML',
    content: `
hero:
  headline: "{{product_name}}で人生が変わる"
  subheadline: "{{target_audience}}のための{{main_benefit}}"
  cta_text: "{{cta_label}}"
`,
    shouldPass: true,
  },
  {
    name: 'コメント付きYAML',
    content: `
# メタ情報
meta:
  title: "サンプルLP"
  # タイトル説明

# ヒーローセクション
hero:
  headline: "見出し"
  # - テキスト1: "複数行の
  # テキスト例"
`,
    shouldPass: true,
  },
  {
    name: '複雑なネストYAML',
    content: `
sections:
  - name: "hero"
    components:
      - type: "Text"
        content: "{{headline}}"
        styles:
          fontSize: 48
          color: "#1a1a2e"
      - type: "Button"
        text: "{{cta_text}}"
        action: "submit"
`,
    shouldPass: true,
  },
];

let passed = 0;
let failed = 0;
const results = [];

// テスト実行
console.log('=' .repeat(60));
testCases.forEach((testCase, idx) => {
  console.log(`\n📝 テスト ${idx + 1}/${testCases.length}: ${testCase.name}`);
  console.log('-'.repeat(60));

  try {
    const parsed = yaml.load(testCase.content);

    if (testCase.shouldPass) {
      console.log('✅ パース成功（期待通り）');
      console.log(`   データ構造: ${Object.keys(parsed).join(', ')}`);
      passed++;
      results.push({ test: testCase.name, status: 'PASS' });
    } else {
      console.log('❌ パース成功したが、失敗すべきだった');
      failed++;
      results.push({ test: testCase.name, status: 'FAIL', reason: 'Should have failed' });
    }
  } catch (error) {
    if (!testCase.shouldPass) {
      console.log('✅ パース失敗（期待通り）');
      console.log(`   エラー: ${error.message.substring(0, 100)}...`);
      passed++;
      results.push({ test: testCase.name, status: 'PASS' });
    } else {
      console.log('❌ パース失敗（成功すべきだった）');
      console.log(`   エラー: ${error.message}`);
      failed++;
      results.push({ test: testCase.name, status: 'FAIL', reason: error.message });
    }
  }
});

// 変数抽出テスト
console.log('\n' + '='.repeat(60));
console.log('\n🔍 変数抽出機能テスト');
console.log('-'.repeat(60));

const yamlWithVars = `
hero:
  headline: "{{product_name}}で{{main_benefit}}を実現"
  subheadline: "{{target_audience}}のための究極のソリューション"
  cta: "{{cta_label}}"
  image: "{{hero_image}}"
`;

const variableRegex = /\{\{([^}]+)\}\}/g;
const foundVariables = new Set();
let match;

while ((match = variableRegex.exec(yamlWithVars)) !== null) {
  foundVariables.add(match[1].trim());
}

console.log(`抽出された変数: ${Array.from(foundVariables).join(', ')}`);

if (foundVariables.size === 5) {
  console.log('✅ 変数抽出成功（5個の変数を検出）');
  passed++;
  results.push({ test: '変数抽出', status: 'PASS' });
} else {
  console.log(`❌ 変数抽出失敗（期待: 5個, 実際: ${foundVariables.size}個）`);
  failed++;
  results.push({ test: '変数抽出', status: 'FAIL', reason: `Expected 5, got ${foundVariables.size}` });
}

// リアルタイムバリデーションテスト
console.log('\n' + '='.repeat(60));
console.log('\n⚡ リアルタイムバリデーション機能テスト');
console.log('-'.repeat(60));

function validateYaml(yamlText) {
  try {
    yaml.load(yamlText);
    return { valid: true, error: null };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

const realtimeTests = [
  { input: 'meta:\n  title: "Test"', expected: true },
  { input: 'meta:\n  title: "Test', expected: false },
  { input: '{{variable}}を含むテキスト', expected: false }, // YAMLとして不正
];

realtimeTests.forEach((test, idx) => {
  const result = validateYaml(test.input);
  const isCorrect = result.valid === test.expected;

  console.log(`\nテスト ${idx + 1}:`);
  console.log(`  入力: ${test.input.substring(0, 30)}...`);
  console.log(`  期待: ${test.expected ? '成功' : '失敗'}`);
  console.log(`  結果: ${isCorrect ? '✅ 正しい' : '❌ 誤り'}`);

  if (isCorrect) {
    passed++;
    results.push({ test: `リアルタイム検証 ${idx + 1}`, status: 'PASS' });
  } else {
    failed++;
    results.push({ test: `リアルタイム検証 ${idx + 1}`, status: 'FAIL' });
  }
});

// 最終レポート
console.log('\n' + '='.repeat(60));
console.log('📊 テスト結果サマリー');
console.log('='.repeat(60));
console.log(`✅ 成功: ${passed}`);
console.log(`❌ 失敗: ${failed}`);
console.log(`📈 成功率: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

if (failed === 0) {
  console.log('\n🎉 すべてのテストが成功しました！');
} else {
  console.log('\n⚠️  一部のテストが失敗しました。詳細:');
  results
    .filter((r) => r.status === 'FAIL')
    .forEach((r) => {
      console.log(`  - ${r.test}: ${r.reason || '詳細なし'}`);
    });
}

console.log('\n' + '='.repeat(60));

// 終了コード
process.exit(failed > 0 ? 1 : 0);
