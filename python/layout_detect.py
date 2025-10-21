#!/usr/bin/env python3
"""
レイアウト検出モジュール
OpenCVを使用して画像から要素（Text/Image/Button/Frame）を検出
"""

import sys
import json
from typing import List, Dict
import cv2
import numpy as np

def detect_layout(image_path: str) -> List[Dict]:
    """レイアウト検出"""
    try:
        # 画像読み込み
        img = cv2.imread(image_path)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # エッジ検出
        edges = cv2.Canny(gray, 50, 150)

        # 輪郭検出
        contours, _ = cv2.findContours(edges, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

        blocks = []
        for i, contour in enumerate(contours):
            x, y, w, h = cv2.boundingRect(contour)

            # 小さすぎる領域は無視
            if w < 10 or h < 10:
                continue

            # TODO: 機械学習モデルで要素タイプを分類
            # 現在は単純なヒューリスティック
            aspect_ratio = w / h
            area = w * h

            if aspect_ratio > 3:
                element_type = 'Text'
            elif aspect_ratio < 0.5:
                element_type = 'Image'
            else:
                element_type = 'Frame'

            blocks.append({
                'id': f'block_{i}',
                'type': element_type,
                'bbox': {'x': int(x), 'y': int(y), 'width': int(w), 'height': int(h)},
                'area': int(area),
            })

        return blocks

    except Exception as e:
        print(f"Layout detection error: {e}", file=sys.stderr)
        return []

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python layout_detect.py <image_path>")
        sys.exit(1)

    image_path = sys.argv[1]
    blocks = detect_layout(image_path)
    print(json.dumps(blocks, ensure_ascii=False, indent=2))
