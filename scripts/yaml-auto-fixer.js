#!/usr/bin/env node

/**
 * YAML自動修復スクリプト
 *
 * YAMLパースエラーを自動検出し、修復を試みる
 * - マルチライン文字列の構文エラー
 * - 引用符の不一致
 * - インデントエラー
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const glob = require('glob');

// 修復ルール
const FIXES = {
  // 不完全な引用符を修正
  unclosedQuotes: (line, lineNum) => {
    const quoteCount = (line.match(/"/g) || []).length;
    if (quoteCount % 2 !== 0) {
      console.warn(`  [Line ${lineNum}] 不完全な引用符を検出: ${line.substring(0, 50)}...`);
      return line + '"';
    }
    return line;
  },

  // コメントアウトされた不正な構文を削除
  invalidCommentedLines: (line, lineNum) => {
    // コメント行で引用符が不完全な場合
    if (line.trim().startsWith('#')) {
      const contentAfterHash = line.substring(line.indexOf('#') + 1);
      const quoteCount = (contentAfterHash.match(/"/g) || []).length;

      if (quoteCount % 2 !== 0) {
        console.warn(`  [Line ${lineNum}] 不正なコメント行を修正: ${line.substring(0, 50)}...`);
        // 引用符を閉じる
        return line + '"';
      }
    }
    return line;
  },

  // マルチラインキーエラーの修正
  multilineKeyError: (lines, startIdx) => {
    const line = lines[startIdx];

    // "キー: "値..." パターンで値が複数行にまたがる場合
    const match = line.match(/^(\s*)(#\s*)?-?\s*([^:]+):\s*"([^"]*)$/);

    if (match) {
      const [_, indent, comment, key, partialValue] = match;
      console.warn(`  [Line ${startIdx + 1}] マルチライン値を検出: ${key}`);

      // 次の行で引用符の終わりを探す
      let endIdx = startIdx + 1;
      let fullValue = partialValue;

      while (endIdx < lines.length) {
        const nextLine = lines[endIdx];
        fullValue += ' ' + nextLine.trim();

        if (nextLine.includes('"')) {
          // 引用符が見つかった - 複数行を1行にまとめる
          const closingIdx = fullValue.indexOf('"', partialValue.length);
          if (closingIdx !== -1) {
            const finalValue = fullValue.substring(0, closingIdx);
            const newLine = `${indent}${comment || ''}- ${key}: "${finalValue}"`;

            // 元の複数行を削除して新しい1行に置き換え
            lines.splice(startIdx, endIdx - startIdx + 1, newLine);
            console.log(`    ✓ 修正完了: ${key} (${endIdx - startIdx + 1}行 -> 1行)`);
            return true;
          }
        }

        endIdx++;

        // 10行以上続く場合は諦める
        if (endIdx - startIdx > 10) {
          console.error(`    ✗ 修正失敗: 引用符の終わりが見つかりません`);
          break;
        }
      }
    }

    return false;
  },
};

/**
 * YAMLファイルを修復
 */
function fixYamlFile(filePath) {
  console.log(`\n📄 処理中: ${filePath}`);

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    let lines = content.split('\n');
    let modified = false;

    // パス1: 行単位の修正
    for (let i = 0; i < lines.length; i++) {
      const originalLine = lines[i];

      // 引用符の修正
      let fixedLine = FIXES.unclosedQuotes(lines[i], i + 1);
      if (fixedLine !== lines[i]) {
        lines[i] = fixedLine;
        modified = true;
      }

      // コメント行の修正
      fixedLine = FIXES.invalidCommentedLines(lines[i], i + 1);
      if (fixedLine !== lines[i]) {
        lines[i] = fixedLine;
        modified = true;
      }
    }

    // パス2: マルチライン修正
    let i = 0;
    while (i < lines.length) {
      if (FIXES.multilineKeyError(lines, i)) {
        modified = true;
        // 修正されたので次の行へ
      }
      i++;
    }

    // 修正された内容を検証
    const fixedContent = lines.join('\n');

    try {
      yaml.load(fixedContent);
      console.log('  ✅ YAMLパース成功！');

      if (modified) {
        // バックアップ作成
        const backupPath = filePath + '.backup';
        fs.writeFileSync(backupPath, content, 'utf-8');
        console.log(`  💾 バックアップ作成: ${backupPath}`);

        // 修正内容を書き込み
        fs.writeFileSync(filePath, fixedContent, 'utf-8');
        console.log(`  ✓ ファイル修正完了`);

        return { success: true, modified: true, errors: [] };
      } else {
        console.log('  ℹ️  修正不要（元から正常）');
        return { success: true, modified: false, errors: [] };
      }
    } catch (parseError) {
      console.error(`  ❌ 修正後もパースエラー: ${parseError.message}`);

      // エラー位置の詳細を表示
      if (parseError.mark) {
        const errorLine = parseError.mark.line + 1;
        const errorCol = parseError.mark.column + 1;
        console.error(`  位置: Line ${errorLine}, Column ${errorCol}`);
        console.error(`  内容: ${lines[parseError.mark.line]}`);
      }

      return {
        success: false,
        modified: modified,
        errors: [parseError.message],
        errorLine: parseError.mark?.line
      };
    }

  } catch (error) {
    console.error(`  ❌ ファイル読み込みエラー: ${error.message}`);
    return { success: false, modified: false, errors: [error.message] };
  }
}

/**
 * すべてのYAMLファイルをスキャン
 */
function scanAndFixAllYaml(directory) {
  console.log('🔍 YAMLファイルをスキャン中...\n');

  const patterns = [
    path.join(directory, '**/*.yaml'),
    path.join(directory, '**/*.yml'),
  ];

  const yamlFiles = [];
  patterns.forEach(pattern => {
    const files = glob.sync(pattern, {
      ignore: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**']
    });
    yamlFiles.push(...files);
  });

  console.log(`📊 見つかったYAMLファイル: ${yamlFiles.length}件\n`);

  const results = {
    total: yamlFiles.length,
    success: 0,
    modified: 0,
    failed: 0,
    failedFiles: [],
  };

  yamlFiles.forEach(file => {
    const result = fixYamlFile(file);

    if (result.success) {
      results.success++;
      if (result.modified) {
        results.modified++;
      }
    } else {
      results.failed++;
      results.failedFiles.push({
        path: file,
        errors: result.errors,
        errorLine: result.errorLine,
      });
    }
  });

  return results;
}

/**
 * レポート出力
 */
function printReport(results) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 YAML自動修復レポート');
  console.log('='.repeat(60));
  console.log(`✅ 成功: ${results.success}/${results.total}`);
  console.log(`🔧 修正: ${results.modified}件`);
  console.log(`❌ 失敗: ${results.failed}件`);

  if (results.failedFiles.length > 0) {
    console.log('\n❌ 修復失敗ファイル:');
    results.failedFiles.forEach((file, idx) => {
      console.log(`\n${idx + 1}. ${file.path}`);
      if (file.errorLine !== undefined) {
        console.log(`   エラー行: ${file.errorLine + 1}`);
      }
      file.errors.forEach(err => {
        console.log(`   - ${err}`);
      });
    });
  }

  console.log('\n' + '='.repeat(60));

  if (results.failed === 0) {
    console.log('✅ すべてのYAMLファイルが正常です！');
  } else {
    console.log('⚠️  一部のファイルで修復が必要です。手動で確認してください。');
  }
}

/**
 * メイン実行
 */
function main() {
  const targetDir = process.argv[2] || process.cwd();

  console.log('🚀 YAML自動修復スクリプト起動\n');
  console.log(`📁 対象ディレクトリ: ${targetDir}\n`);

  const results = scanAndFixAllYaml(targetDir);
  printReport(results);

  // 失敗があれば終了コード1
  process.exit(results.failed > 0 ? 1 : 0);
}

// 実行
if (require.main === module) {
  main();
}

module.exports = { fixYamlFile, scanAndFixAllYaml };
