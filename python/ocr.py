#!/usr/bin/env python3
"""
OCR処理モジュール
Tesseract または AWS Textract を使用して画像からテキストを抽出
"""

import os
import sys
from typing import List, Dict
import cv2
import numpy as np

# OCR_PROVIDER環境変数で切り替え
OCR_PROVIDER = os.getenv('OCR_PROVIDER', 'tesseract')

def extract_text_tesseract(image_path: str) -> List[Dict]:
    """Tesseractを使用してOCR"""
    try:
        import pytesseract

        # 画像読み込み
        img = cv2.imread(image_path)

        # 日本語OCR
        data = pytesseract.image_to_data(img, lang='jpn', output_type=pytesseract.Output.DICT)

        results = []
        for i in range(len(data['text'])):
            text = data['text'][i].strip()
            if text:
                results.append({
                    'text': text,
                    'confidence': float(data['conf'][i]),
                    'bbox': {
                        'x': int(data['left'][i]),
                        'y': int(data['top'][i]),
                        'width': int(data['width'][i]),
                        'height': int(data['height'][i]),
                    }
                })

        return results

    except Exception as e:
        print(f"Tesseract OCR error: {e}", file=sys.stderr)
        return []

def extract_text_textract(image_path: str) -> List[Dict]:
    """AWS Textractを使用してOCR"""
    try:
        import boto3

        # TODO: AWS Textract実装
        # 現在はモック
        return []

    except Exception as e:
        print(f"Textract OCR error: {e}", file=sys.stderr)
        return []

def extract_text(image_path: str) -> List[Dict]:
    """OCR実行（プロバイダー自動選択）"""
    if OCR_PROVIDER == 'textract':
        return extract_text_textract(image_path)
    else:
        return extract_text_tesseract(image_path)

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python ocr.py <image_path>")
        sys.exit(1)

    image_path = sys.argv[1]
    results = extract_text(image_path)

    import json
    print(json.dumps(results, ensure_ascii=False, indent=2))
