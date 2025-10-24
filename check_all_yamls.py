#!/usr/bin/env python3
"""
全YAMLファイル一括検証スクリプト
"""

import yaml
import sys
from pathlib import Path

def validate_yaml_file(file_path):
    """YAMLファイルを検証"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            data = yaml.safe_load(content)

        # セクション数を確認
        sections = data.get('sections', {}) if isinstance(data, dict) else {}
        section_count = len(sections) if isinstance(sections, dict) else 0

        return {
            'success': True,
            'file': str(file_path),
            'sections': section_count,
            'meta': data.get('meta', {}) if isinstance(data, dict) else {},
            'error': None
        }
    except yaml.YAMLError as e:
        return {
            'success': False,
            'file': str(file_path),
            'error': str(e)
        }
    except Exception as e:
        return {
            'success': False,
            'file': str(file_path),
            'error': f"予期しないエラー: {e}"
        }

if __name__ == "__main__":
    # generated-yamlsディレクトリ内のすべてのYAMLファイルを検索
    yaml_dir = Path("/Users/matsumototoshihiko/div/YAMLテンプレートLP/my-project/generated-yamls")
    yaml_files = list(yaml_dir.glob("*.yaml")) + list(yaml_dir.glob("*.yml"))

    print("=" * 60)
    print("全YAMLファイル検証")
    print("=" * 60)
    print(f"検索ディレクトリ: {yaml_dir}")
    print(f"発見されたファイル: {len(yaml_files)}個")
    print()

    results = []
    for yaml_file in yaml_files:
        result = validate_yaml_file(yaml_file)
        results.append(result)

    # 結果を表示
    success_count = 0
    error_count = 0

    for result in results:
        if result['success']:
            print(f"✅ {Path(result['file']).name}")
            print(f"   セクション: {result['sections']}, メタ: {result['meta'].get('generated_at', 'N/A')}")
            success_count += 1
        else:
            print(f"❌ {Path(result['file']).name}")
            print(f"   エラー: {result['error']}")
            error_count += 1

    print()
    print("=" * 60)
    print(f"検証結果: 成功 {success_count}個 / エラー {error_count}個")
    print("=" * 60)

    if error_count > 0:
        sys.exit(1)
    else:
        print("🎉 すべてのYAMLファイルは正常です！")
        sys.exit(0)
