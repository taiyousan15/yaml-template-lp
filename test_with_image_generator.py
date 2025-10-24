#!/usr/bin/env python3
"""
画像プレースホルダーを含むYAMLテンプレートのテスト
"""

import json
import re
import yaml

def replace_variables(template, variables):
    """テンプレート内の変数を置き換える"""
    template_str = yaml.dump(template, allow_unicode=True)

    for key, value in variables.items():
        pattern = r'\{\{' + key + r'\}\}'
        template_str = re.sub(pattern, value, template_str)

    return yaml.safe_load(template_str)

# テンプレートを読み込む
with open('/Users/matsumototoshihiko/div/YAMLテンプレートLP/my-project/test_with_image.yaml', 'r', encoding='utf-8') as f:
    template = yaml.safe_load(f)

# 変数を定義
variables = {
    'product_name': '革新的なプロダクト',
    'description': '最新のテクノロジーを採用した\n次世代のソリューション',
    'price': '¥29,800'
}

# 変数を置き換え
processed_template = replace_variables(template, variables)

# 処理済みテンプレートを保存
output_path = '/Users/matsumototoshihiko/div/YAMLテンプレートLP/my-project/test_with_image_processed.yaml'
with open(output_path, 'w', encoding='utf-8') as f:
    yaml.dump(processed_template, f, allow_unicode=True, default_flow_style=False)

print(f"✓ 処理済みテンプレートを保存しました: {output_path}")
print("\n変数置き換え結果:")
print(json.dumps(variables, ensure_ascii=False, indent=2))
