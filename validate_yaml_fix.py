#!/usr/bin/env python3
"""
YAML検証スクリプト - 修正後の検証
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

        print(f"✅ {file_path}")
        print(f"   セクション数: {len(data.get('sections', {}))}")
        print(f"   メタ情報: {data.get('meta', {}).get('generated_at', 'N/A')}")
        return True
    except yaml.YAMLError as e:
        print(f"❌ {file_path}")
        print(f"   エラー: {e}")
        return False
    except Exception as e:
        print(f"❌ {file_path}")
        print(f"   予期しないエラー: {e}")
        return False

if __name__ == "__main__":
    yaml_file = "/Users/matsumototoshihiko/div/YAMLテンプレートLP/my-project/generated-yamls/design-2025-10-21T14-28-09-419Z.yaml"

    print("=" * 60)
    print("YAML修正後の検証")
    print("=" * 60)
    print()

    if validate_yaml_file(yaml_file):
        print()
        print("🎉 修正完了！YAMLファイルは正常にパースできます。")
        sys.exit(0)
    else:
        print()
        print("⚠️ まだエラーが残っています。")
        sys.exit(1)
