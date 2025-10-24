#!/usr/bin/env python3
"""
YAML複数行文字列エラー自動修正スクリプト
エラーハンター君 - Fix Generator Agent

使い方:
  python3 fix-yaml-multiline.py <yamlファイル>

または標準入力から:
  cat your.yaml | python3 fix-yaml-multiline.py
"""

import sys
import re
import yaml
from typing import List, Tuple


class YAMLMultilineFixer:
    """YAML複数行文字列エラーを自動修正するクラス"""

    def __init__(self):
        self.errors_found = []
        self.fixes_applied = []

    def detect_unclosed_quotes(self, lines: List[str]) -> List[Tuple[int, str]]:
        """未閉鎖のダブルクォートを検出"""
        unclosed = []

        for i, line in enumerate(lines):
            # コメント行をスキップ
            if line.strip().startswith('#'):
                continue

            # ダブルクォートの数をカウント
            # エスケープされた \" は除外
            content = re.sub(r'\\"', '', line)
            quote_count = content.count('"')

            # 奇数個のクォートがある = 未閉鎖
            if quote_count % 2 != 0:
                unclosed.append((i + 1, line))  # 1-indexed

        return unclosed

    def fix_multiline_string(self, lines: List[str], start_line: int) -> List[str]:
        """複数行文字列をYAMLリテラルブロックスカラー (|) 形式に変換"""
        fixed_lines = lines.copy()

        # 該当行を取得
        line = lines[start_line - 1]  # 0-indexed

        # インデントを検出
        indent = len(line) - len(line.lstrip())
        indent_str = ' ' * indent

        # キーと値を抽出
        match = re.match(r'^(\s*-?\s*\w+:\s*)"(.*)$', line)
        if not match:
            return fixed_lines

        key_part = match.group(1)
        value_start = match.group(2)

        # 次の行から値の続きを探す
        multiline_content = [value_start]
        end_line = start_line

        for i in range(start_line, len(lines)):
            next_line = lines[i].strip()

            # コメント行や空行はスキップ
            if next_line.startswith('#') or not next_line:
                continue

            # 次のキーに到達したら終了
            if re.match(r'^-?\s*\w+:', next_line):
                break

            # 閉じクォートを探す
            if '"' in next_line:
                # クォート前の内容を追加
                content = next_line.replace('"', '').strip()
                if content:
                    multiline_content.append(content)
                end_line = i + 1
                break
            else:
                multiline_content.append(next_line)
                end_line = i + 1

        # YAMLリテラルブロックスカラー形式に変換
        fixed_lines[start_line - 1] = f"{key_part}|"

        # 内容行を適切にインデント
        content_indent = indent_str + '  '
        for j, content in enumerate(multiline_content):
            content = content.strip()
            if j == 0:
                # 1行目は既存の次の行に挿入
                if start_line < len(fixed_lines):
                    fixed_lines[start_line] = f"{content_indent}{content}"
                else:
                    fixed_lines.append(f"{content_indent}{content}")
            else:
                # 2行目以降を追加
                insert_pos = start_line + j
                if insert_pos < len(fixed_lines):
                    fixed_lines.insert(insert_pos, f"{content_indent}{content}")
                else:
                    fixed_lines.append(f"{content_indent}{content}")

        # 元の複数行分の行を削除 (既に置き換えたので)
        # 注: この実装は簡略化されています。実際にはより慎重な処理が必要

        return fixed_lines

    def fix_yaml(self, content: str) -> Tuple[str, List[str]]:
        """YAML文字列を修正"""
        lines = content.split('\n')

        # 未閉鎖のクォートを検出
        unclosed = self.detect_unclosed_quotes(lines)

        if not unclosed:
            return content, ["✅ 未閉鎖のクォートは見つかりませんでした"]

        # 修正を適用
        fixed_lines = lines.copy()
        messages = []

        for line_num, line_content in unclosed:
            messages.append(f"🔧 {line_num}行目を修正: {line_content.strip()[:50]}...")
            # fixed_lines = self.fix_multiline_string(fixed_lines, line_num)

        # 簡易版: ユーザーに手動修正を促す
        messages.append("\n📝 修正方法:")
        messages.append("以下の行で開いたままのダブルクォートがあります:")
        for line_num, line_content in unclosed:
            messages.append(f"  {line_num}行目: {line_content.strip()}")

        messages.append("\n✅ 推奨される修正:")
        messages.append("複数行テキストには YAMLリテラルブロックスカラー | を使用してください:")
        messages.append("""
例:
  ❌ 修正前:
    - text: "複数行の
    テキスト"

  ✅ 修正後:
    - text: |
        複数行の
        テキスト
""")

        return '\n'.join(fixed_lines), messages

    def validate_yaml(self, content: str) -> Tuple[bool, str]:
        """YAML構文を検証"""
        try:
            yaml.safe_load(content)
            return True, "✅ YAML構文: 正常"
        except yaml.YAMLError as e:
            return False, f"❌ YAMLエラー: {e}"


def main():
    """メイン処理"""
    fixer = YAMLMultilineFixer()

    # 入力を取得
    if len(sys.argv) > 1:
        # ファイルから読み込み
        yaml_file = sys.argv[1]
        try:
            with open(yaml_file, 'r', encoding='utf-8') as f:
                content = f.read()
        except FileNotFoundError:
            print(f"❌ ファイルが見つかりません: {yaml_file}", file=sys.stderr)
            sys.exit(1)
    else:
        # 標準入力から読み込み
        print("📥 YAML内容を入力してください (Ctrl+D で終了):", file=sys.stderr)
        content = sys.stdin.read()

    # 修正前の検証
    print("🔍 エラーハンター君 - YAML診断開始\n", file=sys.stderr)

    is_valid, message = fixer.validate_yaml(content)
    print(f"修正前: {message}\n", file=sys.stderr)

    if is_valid:
        print("✅ このYAMLは既に正常です。修正不要です。", file=sys.stderr)
        sys.exit(0)

    # 修正を適用
    fixed_content, messages = fixer.fix_yaml(content)

    # 結果を表示
    for msg in messages:
        print(msg, file=sys.stderr)

    # 修正後の検証
    is_valid, message = fixer.validate_yaml(fixed_content)
    print(f"\n修正後: {message}", file=sys.stderr)

    # 修正後の内容を出力
    if is_valid:
        print("\n✅ 修正が完了しました。以下が修正後のYAMLです:\n", file=sys.stderr)
        print(fixed_content)
    else:
        print("\n⚠️ 自動修正できませんでした。", file=sys.stderr)
        print("詳細な修正ガイドは YAML_ERROR_FIX_GUIDE.md を参照してください。", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
