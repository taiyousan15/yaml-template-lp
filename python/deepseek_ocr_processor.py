#!/usr/bin/env python3
"""
DeepSeek-OCR を使用してLP画像をMarkdown経由でYAMLに変換するスクリプト

使用方法:
    python deepseek_ocr_processor.py <image_path> [--output <output_path>]
"""

import os
import sys
import json
import argparse
import re
from pathlib import Path
import yaml

# DeepSeek-OCRのインポート (GPU利用可能な場合のみ)
try:
    from transformers import AutoModel, AutoTokenizer
    import torch
    DEEPSEEK_AVAILABLE = torch.cuda.is_available()
except ImportError:
    DEEPSEEK_AVAILABLE = False
    print("Warning: DeepSeek-OCR dependencies not installed or CUDA not available", file=sys.stderr)


class DeepSeekOCRProcessor:
    """DeepSeek-OCRを使用してLP画像を処理"""

    def __init__(self, model_name='deepseek-ai/DeepSeek-OCR', device_id=0):
        """
        Args:
            model_name: Hugging Faceのモデル名
            device_id: CUDA デバイスID
        """
        if not DEEPSEEK_AVAILABLE:
            raise RuntimeError("DeepSeek-OCR requires CUDA and torch to be installed")

        os.environ["CUDA_VISIBLE_DEVICES"] = str(device_id)

        print(f"Loading DeepSeek-OCR model: {model_name}")
        self.tokenizer = AutoTokenizer.from_pretrained(
            model_name,
            trust_remote_code=True
        )

        self.model = AutoModel.from_pretrained(
            model_name,
            _attn_implementation='flash_attention_2',
            trust_remote_code=True,
            use_safetensors=True
        )

        self.model = self.model.eval().cuda().to(torch.bfloat16)
        print("Model loaded successfully")

    def process_image_to_markdown(
        self,
        image_path: str,
        output_path: str = './output',
        base_size: int = 1024,
        image_size: int = 640,
        crop_mode: bool = True,
        save_results: bool = True
    ) -> str:
        """
        LP画像をMarkdownに変換

        Args:
            image_path: 入力画像パス
            output_path: 出力ディレクトリ
            base_size: ベースサイズ (Gundam設定: 1024)
            image_size: 画像サイズ (Gundam設定: 640)
            crop_mode: クロップモード (Gundam設定: True)
            save_results: 結果を保存するか

        Returns:
            str: 生成されたMarkdown
        """
        # Goundingプロンプト（高精度なドキュメント変換用）
        prompt = "<image>\n<|grounding|>Convert the document to markdown. "

        print(f"Processing image: {image_path}")
        print(f"Configuration: base_size={base_size}, image_size={image_size}, crop_mode={crop_mode}")

        # DeepSeek-OCR実行
        result = self.model.infer(
            self.tokenizer,
            prompt=prompt,
            image_file=image_path,
            output_path=output_path,
            base_size=base_size,
            image_size=image_size,
            crop_mode=crop_mode,
            save_results=save_results,
            test_compress=True
        )

        print(f"OCR completed. Result type: {type(result)}")

        # 結果はdict or str形式で返される
        if isinstance(result, dict):
            markdown_text = result.get('text', '') or result.get('content', '')
        elif isinstance(result, str):
            markdown_text = result
        else:
            markdown_text = str(result)

        return markdown_text

    def markdown_to_yaml(self, markdown_text: str) -> str:
        """
        Markdownテキストを構造化されたYAMLテンプレートに変換

        Args:
            markdown_text: Markdownテキスト

        Returns:
            str: YAML形式のテンプレート
        """
        print("Converting Markdown to YAML...")

        # Markdownを行単位で解析
        lines = markdown_text.split('\n')

        # セクション構造を検出
        sections = []
        current_section = None

        for line in lines:
            line = line.strip()
            if not line:
                continue

            # 見出しレベルを検出
            if line.startswith('#'):
                heading_level = len(re.match(r'^#+', line).group())
                heading_text = line.lstrip('#').strip()

                # レベル1,2の見出しは新しいセクション
                if heading_level <= 2:
                    if current_section:
                        sections.append(current_section)

                    section_type = self._infer_section_type(heading_text, len(sections))
                    current_section = {
                        'id': f'section{len(sections) + 1}',
                        'type': section_type,
                        'texts': [],
                        'buttons': [],
                        'items': []
                    }

                    # 見出しを追加
                    current_section['texts'].append({
                        'content': heading_text,
                        'role': 'headline' if heading_level == 1 else 'subheadline',
                        'fontSize': 'text-5xl' if heading_level == 1 else 'text-3xl',
                        'fontWeight': 'bold',
                        'color': '#000000',
                        'alignment': 'center'
                    })

                # レベル3以降はサブ見出し
                elif heading_level >= 3 and current_section:
                    current_section['texts'].append({
                        'content': heading_text,
                        'role': 'subheadline',
                        'fontSize': 'text-xl' if heading_level == 3 else 'text-lg',
                        'fontWeight': 'semibold',
                        'color': '#000000',
                        'alignment': 'left'
                    })

            # ボタンっぽいテキストを検出
            elif self._is_button_text(line) and current_section:
                current_section['buttons'].append({
                    'text': line,
                    'bgColor': '#667eea',
                    'textColor': '#ffffff',
                    'size': 'medium',
                    'borderRadius': 'rounded-lg',
                    'shadow': True
                })

            # リスト項目
            elif line.startswith('-') or line.startswith('*') or re.match(r'^\d+\.', line):
                if current_section:
                    list_text = re.sub(r'^[-*\d.]\s*', '', line)
                    current_section['items'].append({
                        'icon': '✓',
                        'title': list_text[:50],
                        'description': list_text if len(list_text) <= 100 else list_text[:100] + '...'
                    })

            # 通常のテキスト
            elif current_section:
                current_section['texts'].append({
                    'content': line,
                    'role': 'body',
                    'fontSize': 'text-base',
                    'fontWeight': 'normal',
                    'color': '#333333',
                    'alignment': 'left'
                })

        # 最後のセクションを追加
        if current_section:
            sections.append(current_section)

        # セクションが検出されなかった場合はデフォルトセクション作成
        if not sections:
            sections.append({
                'id': 'main',
                'type': 'content',
                'texts': [{
                    'content': markdown_text[:500],
                    'role': 'body',
                    'fontSize': 'text-base',
                    'fontWeight': 'normal',
                    'color': '#000000',
                    'alignment': 'left'
                }],
                'buttons': [],
                'items': []
            })

        # YAML構造を構築
        yaml_data = {
            'meta': {
                'template_version': '2.0',
                'generator': 'DeepSeek-OCR',
                'total_sections': len(sections)
            },
            'sections': {}
        }

        for section in sections:
            section_id = section['id']
            yaml_data['sections'][section_id] = {
                'type': section['type'],
                'layout': {
                    'type': 'flex',
                    'alignment': 'center',
                    'padding': '80px 20px',
                    'maxWidth': '1200px'
                },
                'background': {
                    'type': 'solid',
                    'color': '#ffffff'
                },
                'texts': section['texts'],
                'buttons': section['buttons'],
                'items': section['items']
            }

        # YAML文字列に変換
        yaml_string = yaml.dump(
            yaml_data,
            allow_unicode=True,
            default_flow_style=False,
            sort_keys=False,
            width=120
        )

        return yaml_string

    def _infer_section_type(self, heading_text: str, section_index: int) -> str:
        """見出しテキストからセクションタイプを推測"""
        heading_lower = heading_text.lower()

        # キーワードマッチング
        if section_index == 0 or any(word in heading_lower for word in ['hero', 'メイン', 'トップ', 'キャッチ']):
            return 'hero'
        elif any(word in heading_lower for word in ['特徴', 'feature', '機能', 'できること']):
            return 'features'
        elif any(word in heading_lower for word in ['メリット', 'benefit', '利点', '効果']):
            return 'benefits'
        elif any(word in heading_lower for word in ['お客様', '声', 'testimonial', 'レビュー', '評価']):
            return 'testimonial'
        elif any(word in heading_lower for word in ['問い合わせ', 'contact', '申し込み', 'cta', '今すぐ', '無料']):
            return 'cta'
        elif any(word in heading_lower for word in ['footer', 'フッター', '会社情報', 'サイト情報']):
            return 'footer'
        else:
            return 'content'

    def _is_button_text(self, text: str) -> bool:
        """テキストがボタンっぽいかを判定"""
        button_keywords = [
            '今すぐ', '無料', '申し込み', '登録', 'ダウンロード', '購入',
            '詳しく', '開始', 'スタート', 'お問い合わせ', 'クリック',
            'button', 'click', 'start', 'free', 'download', 'sign up'
        ]

        text_lower = text.lower()

        # キーワードマッチ
        if any(keyword in text_lower for keyword in button_keywords):
            return True

        # 短いテキストで矢印や記号を含む
        if len(text) < 30 and any(symbol in text for symbol in ['→', '»', '>', '▶']):
            return True

        return False

    def process_image_to_yaml(
        self,
        image_path: str,
        output_yaml_path: str = None,
        **kwargs
    ) -> str:
        """
        LP画像を直接YAMLに変換（ワンステップ処理）

        Args:
            image_path: 入力画像パス
            output_yaml_path: 出力YAMLパス（Noneの場合は返却のみ）
            **kwargs: process_image_to_markdownに渡す追加引数

        Returns:
            str: YAML文字列
        """
        # Step 1: 画像 → Markdown
        markdown_text = self.process_image_to_markdown(image_path, **kwargs)

        # Step 2: Markdown → YAML
        yaml_text = self.markdown_to_yaml(markdown_text)

        # Step 3: ファイル保存
        if output_yaml_path:
            output_file = Path(output_yaml_path)
            output_file.parent.mkdir(parents=True, exist_ok=True)
            output_file.write_text(yaml_text, encoding='utf-8')
            print(f"YAML saved to: {output_yaml_path}")

        return yaml_text


def main():
    """CLI エントリーポイント"""
    parser = argparse.ArgumentParser(description='DeepSeek-OCR LP Image to YAML Converter')
    parser.add_argument('image_path', help='Input LP image path')
    parser.add_argument('--output', '-o', help='Output YAML file path', default=None)
    parser.add_argument('--output-dir', help='Output directory for intermediate files', default='./output')
    parser.add_argument('--base-size', type=int, default=1024, help='Base size (default: 1024)')
    parser.add_argument('--image-size', type=int, default=640, help='Image size (default: 640)')
    parser.add_argument('--no-crop', action='store_true', help='Disable crop mode')
    parser.add_argument('--device', type=int, default=0, help='CUDA device ID (default: 0)')

    args = parser.parse_args()

    # 画像ファイルの存在確認
    if not os.path.exists(args.image_path):
        print(f"Error: Image file not found: {args.image_path}", file=sys.stderr)
        sys.exit(1)

    # プロセッサー初期化
    try:
        processor = DeepSeekOCRProcessor(device_id=args.device)
    except Exception as e:
        print(f"Error initializing DeepSeek-OCR: {e}", file=sys.stderr)
        sys.exit(1)

    # 処理実行
    try:
        yaml_output = processor.process_image_to_yaml(
            image_path=args.image_path,
            output_yaml_path=args.output,
            output_path=args.output_dir,
            base_size=args.base_size,
            image_size=args.image_size,
            crop_mode=not args.no_crop,
            save_results=True
        )

        # 出力ファイル指定がない場合は標準出力へ
        if not args.output:
            print("\n" + "="*80)
            print("Generated YAML:")
            print("="*80)
            print(yaml_output)

    except Exception as e:
        print(f"Error during processing: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
