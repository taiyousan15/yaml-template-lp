#!/usr/bin/env python3
"""
差分評価モジュール
SSIM/色差/レイアウト差の評価
"""

import os
import sys
from typing import Dict, Tuple
import cv2
import numpy as np
from skimage.metrics import structural_similarity as ssim
from PIL import Image


def calculate_ssim(image1_path: str, image2_path: str) -> float:
    """
    2つの画像のSSIM（構造的類似性）を計算

    Args:
        image1_path: 画像1のパス
        image2_path: 画像2のパス

    Returns:
        SSIM値（0.0 〜 1.0、1.0に近いほど似ている）
    """
    # 画像読み込み
    img1 = cv2.imread(image1_path)
    img2 = cv2.imread(image2_path)

    # グレースケールに変換
    gray1 = cv2.cvtColor(img1, cv2.COLOR_BGR2GRAY)
    gray2 = cv2.cvtColor(img2, cv2.COLOR_BGR2GRAY)

    # サイズを合わせる
    if gray1.shape != gray2.shape:
        gray2 = cv2.resize(gray2, (gray1.shape[1], gray1.shape[0]))

    # SSIM計算
    score, _ = ssim(gray1, gray2, full=True)

    return float(score)


def calculate_color_delta(image1_path: str, image2_path: str) -> float:
    """
    2つの画像の色差を計算

    Args:
        image1_path: 画像1のパス
        image2_path: 画像2のパス

    Returns:
        色差（0.0 〜 1.0、0に近いほど色が似ている）
    """
    # 画像読み込み
    img1 = cv2.imread(image1_path)
    img2 = cv2.imread(image2_path)

    # サイズを合わせる
    if img1.shape != img2.shape:
        img2 = cv2.resize(img2, (img1.shape[1], img1.shape[0]))

    # 色差を計算（平均絶対誤差）
    mae = np.mean(np.abs(img1.astype(float) - img2.astype(float)))

    # 0-255の範囲を0-1に正規化
    return float(mae / 255.0)


def calculate_layout_delta(blocks1: list, blocks2: list) -> float:
    """
    2つのレイアウトブロックの位置差を計算

    Args:
        blocks1: ブロック1のリスト [{'bbox': (x, y, width, height)}, ...]
        blocks2: ブロック2のリスト

    Returns:
        レイアウト差（0.0 〜 1.0、0に近いほど配置が似ている）
    """
    if not blocks1 or not blocks2:
        return 1.0

    # 各ブロックの中心座標を計算
    def get_centers(blocks):
        centers = []
        for block in blocks:
            bbox = block.get('bbox', {})
            if isinstance(bbox, dict):
                x = bbox.get('x', 0)
                y = bbox.get('y', 0)
                width = bbox.get('width', 0)
                height = bbox.get('height', 0)
            else:  # tuple
                x, y, width, height = bbox

            center_x = x + width / 2
            center_y = y + height / 2
            centers.append((center_x, center_y))
        return centers

    centers1 = get_centers(blocks1)
    centers2 = get_centers(blocks2)

    # 最も近いブロック同士の距離を計算
    distances = []
    for c1 in centers1:
        min_dist = float('inf')
        for c2 in centers2:
            dist = np.sqrt((c1[0] - c2[0])**2 + (c1[1] - c2[1])**2)
            min_dist = min(min_dist, dist)
        distances.append(min_dist)

    if not distances:
        return 1.0

    # 平均距離を0-1の範囲に正規化（仮の最大距離: 1000px）
    avg_distance = np.mean(distances)
    return float(min(avg_distance / 1000.0, 1.0))


def evaluate_diff(original_image_path: str, rendered_image_path: str, 
                  original_blocks: list = None, rendered_blocks: list = None) -> Dict:
    """
    原画像とレンダリング画像の差分を評価

    Args:
        original_image_path: 原画像のパス
        rendered_image_path: レンダリング画像のパス
        original_blocks: 原画像のブロック情報（オプション）
        rendered_blocks: レンダリング画像のブロック情報（オプション）

    Returns:
        差分メトリクス辞書 {
            'ssim': float,
            'colorDelta': float,
            'layoutDelta': float
        }
    """
    # SSIM計算
    ssim_score = calculate_ssim(original_image_path, rendered_image_path)

    # 色差計算
    color_delta = calculate_color_delta(original_image_path, rendered_image_path)

    # レイアウト差計算
    layout_delta = 0.0
    if original_blocks and rendered_blocks:
        layout_delta = calculate_layout_delta(original_blocks, rendered_blocks)

    return {
        'ssim': round(ssim_score, 4),
        'colorDelta': round(color_delta, 4),
        'layoutDelta': round(layout_delta, 4)
    }


def main():
    """テスト用のメイン関数"""
    import json

    if len(sys.argv) < 3:
        print("Usage: python diff_eval.py <original_image> <rendered_image>", file=sys.stderr)
        sys.exit(1)

    original_image = sys.argv[1]
    rendered_image = sys.argv[2]

    if not os.path.exists(original_image):
        print(f"Error: Original image not found: {original_image}", file=sys.stderr)
        sys.exit(1)

    if not os.path.exists(rendered_image):
        print(f"Error: Rendered image not found: {rendered_image}", file=sys.stderr)
        sys.exit(1)

    # 差分評価実行
    metrics = evaluate_diff(original_image, rendered_image)

    # 結果を出力
    result = {
        'status': 'success',
        'diffMetrics': metrics
    }

    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
