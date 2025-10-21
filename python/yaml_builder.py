#!/usr/bin/env python3
"""
YAMLテンプレート生成モジュール
OCR結果とレイアウト情報からYAMLを生成
"""

import sys
import json
import yaml
from typing import List, Dict

def build_yaml(ocr_results: List[Dict], layout_blocks: List[Dict]) -> str:
    """YAMLテンプレート生成"""
    try:
        template = {
            'figma_component': {
                'name': 'Auto-generated Template',
                'type': 'Frame',
                'layout_mode': 'VERTICAL',
                'spacing': 24,
                'padding': {'top': 40, 'right': 40, 'bottom': 40, 'left': 40},
                'background_color': '#FFFFFF',
                'children': []
            }
        }

        # レイアウトブロックごとに要素を生成
        for block in layout_blocks:
            child = {
                'name': block['id'],
                'type': block['type'],
            }

            if block['type'] == 'Text':
                # OCR結果からテキストを探す
                matching_text = ''
                for ocr in ocr_results:
                    if _bbox_overlap(ocr['bbox'], block['bbox']):
                        matching_text = ocr['text']
                        break

                child['content'] = f'{{{{{block["id"]}}}}}'  # 変数化
                child['font'] = {'family': 'Noto Sans JP', 'weight': 'Regular', 'size': 16}
                child['fills'] = [{'type': 'SOLID', 'color': '#333333'}]

            elif block['type'] == 'Image':
                child['content'] = f'{block["id"]}.png'
                child['width'] = block['bbox']['width']
                child['height'] = block['bbox']['height']

            template['figma_component']['children'].append(child)

        return yaml.dump(template, allow_unicode=True, sort_keys=False)

    except Exception as e:
        print(f"YAML build error: {e}", file=sys.stderr)
        return ''

def _bbox_overlap(bbox1: Dict, bbox2: Dict) -> bool:
    """2つのバウンディングボックスが重なっているか判定"""
    x1, y1 = bbox1['x'], bbox1['y']
    x2, y2 = bbox2['x'], bbox2['y']
    w1, h1 = bbox1['width'], bbox1['height']
    w2, h2 = bbox2['width'], bbox2['height']

    return not (x1 + w1 < x2 or x2 + w2 < x1 or y1 + h1 < y2 or y2 + h2 < y1)

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python yaml_builder.py <ocr_json> <layout_json>")
        sys.exit(1)

    ocr_file = sys.argv[1]
    layout_file = sys.argv[2]

    with open(ocr_file) as f:
        ocr_results = json.load(f)

    with open(layout_file) as f:
        layout_blocks = json.load(f)

    yaml_output = build_yaml(ocr_results, layout_blocks)
    print(yaml_output)
