#!/usr/bin/env python3
"""
YAMLテンプレートベースの画像生成エンジン

このスクリプトは、YAMLテンプレートファイルを読み込み、
高品質な画像を生成します。

使用方法:
    python yamlImageGenerator.py <yaml_file> --output <output_path> [--width <width>] [--height <height>]

機能:
    - 背景色の正確な再現
    - 枠線（stroke）の描画
    - 角丸矩形（corner_radius）の描画
    - テキストハイライト機能
    - 日本語フォント対応（Noto Sans JP: Regular, Medium, Bold）
    - 水平・垂直レイアウトの正確な配置
    - パディングとスペーシングの処理
    - 画像プレースホルダーの描画
    - 画像サイズの自動計算
    - 高品質PNG出力（quality=95, optimize=True）
"""

import argparse
import json
import logging
import os
import re
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any

import yaml
from PIL import Image, ImageDraw, ImageFont

# ロギング設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class FontManager:
    """フォント管理クラス"""

    # フォントパスの候補リスト
    FONT_PATHS = [
        "/usr/share/fonts/opentype/noto",
        "/usr/share/fonts/truetype/noto",
        "/System/Library/Fonts",
        "/Library/Fonts",
        "C:/Windows/Fonts",
    ]

    # フォントファミリーとウェイトのマッピング
    FONT_FILES = {
        "Noto Sans JP": {
            "Regular": [
                "NotoSansCJKjp-Regular.otf",
                "NotoSansJP-Regular.otf",
                "NotoSansCJK-Regular.ttc",
                "AppleSDGothicNeo.ttc",  # macOS fallback
                "Hiragino Sans GB.ttc"  # macOS fallback
            ],
            "Medium": [
                "NotoSansCJKjp-Medium.otf",
                "NotoSansJP-Medium.otf",
                "NotoSansCJK-Medium.ttc",
                "AppleSDGothicNeo.ttc",  # macOS fallback
                "Hiragino Sans GB.ttc"  # macOS fallback
            ],
            "Bold": [
                "NotoSansCJKjp-Bold.otf",
                "NotoSansJP-Bold.otf",
                "NotoSansCJK-Bold.ttc",
                "AppleSDGothicNeo.ttc",  # macOS fallback
                "Hiragino Sans GB.ttc"  # macOS fallback
            ],
        },
        "Inter": {
            "Regular": ["Inter-Regular.ttf", "Arial.ttf", "Helvetica.ttc"],
            "Medium": ["Inter-Medium.ttf", "Arial.ttf", "Helvetica.ttc"],
            "Bold": ["Inter-Bold.ttf", "Arial-Bold.ttf", "ArialBold.ttf", "Helvetica.ttc"],
        }
    }

    def __init__(self):
        self.font_cache: Dict[str, ImageFont.FreeTypeFont] = {}
        self.available_fonts: Dict[str, Dict[str, str]] = {}
        self._scan_fonts()

    def _scan_fonts(self):
        """利用可能なフォントをスキャン"""
        for family, weights in self.FONT_FILES.items():
            self.available_fonts[family] = {}
            for weight, filenames in weights.items():
                for font_path in self.FONT_PATHS:
                    if not os.path.exists(font_path):
                        continue
                    for filename in filenames:
                        full_path = os.path.join(font_path, filename)
                        if os.path.exists(full_path):
                            self.available_fonts[family][weight] = full_path
                            logger.info(f"Found font: {family} {weight} at {full_path}")
                            break
                    if weight in self.available_fonts[family]:
                        break

    def get_font(self, family: str = "Noto Sans JP", weight: str = "Regular", size: int = 16) -> ImageFont.FreeTypeFont:
        """フォントを取得（キャッシュ機能付き）"""
        cache_key = f"{family}_{weight}_{size}"

        if cache_key in self.font_cache:
            return self.font_cache[cache_key]

        # フォントファイルを検索
        font_path = None
        if family in self.available_fonts and weight in self.available_fonts[family]:
            font_path = self.available_fonts[family][weight]

        # フォントが見つからない場合、フォールバック
        if not font_path:
            logger.warning(f"Font not found: {family} {weight}, using fallback")
            # Regularにフォールバック
            if family in self.available_fonts and "Regular" in self.available_fonts[family]:
                font_path = self.available_fonts[family]["Regular"]
            # それでも見つからない場合、Noto Sans JPにフォールバック
            elif "Noto Sans JP" in self.available_fonts and "Regular" in self.available_fonts["Noto Sans JP"]:
                font_path = self.available_fonts["Noto Sans JP"]["Regular"]

        # フォントをロード
        try:
            if font_path:
                font = ImageFont.truetype(font_path, size)
            else:
                logger.warning("No fonts available, using default font")
                font = ImageFont.load_default()
        except Exception as e:
            logger.error(f"Failed to load font: {e}")
            font = ImageFont.load_default()

        self.font_cache[cache_key] = font
        return font


class LayoutEngine:
    """レイアウトエンジン - 要素の配置とサイズ計算を担当"""

    def __init__(self, font_manager: FontManager):
        self.font_manager = font_manager

    def calculate_text_size(self, text: str, font: ImageFont.FreeTypeFont) -> Tuple[int, int]:
        """テキストのサイズを計算"""
        # 一時的なImageDrawオブジェクトを作成してテキストサイズを測定
        temp_img = Image.new('RGB', (1, 1))
        draw = ImageDraw.Draw(temp_img)
        bbox = draw.textbbox((0, 0), text, font=font)
        width = bbox[2] - bbox[0]
        height = bbox[3] - bbox[1]
        return (width, height)

    def calculate_element_size(self, element: Dict[str, Any]) -> Tuple[int, int]:
        """要素のサイズを計算"""
        elem_type = element.get("type", "Frame")

        if elem_type == "Text":
            return self._calculate_text_element_size(element)
        elif elem_type == "Image":
            return self._calculate_image_element_size(element)
        elif elem_type in ["Frame", "AutoLayout"]:
            return self._calculate_frame_element_size(element)
        else:
            logger.warning(f"Unknown element type: {elem_type}")
            return (0, 0)

    def _calculate_text_element_size(self, element: Dict[str, Any]) -> Tuple[int, int]:
        """テキスト要素のサイズを計算"""
        content = element.get("content", "")
        font_config = element.get("font", {})
        family = font_config.get("family", "Noto Sans JP")
        weight = font_config.get("weight", "Regular")
        size = font_config.get("size", 16)

        font = self.font_manager.get_font(family, weight, size)

        # 改行を考慮してサイズを計算
        lines = content.split("\n")
        max_width = 0
        total_height = 0

        for line in lines:
            w, h = self.calculate_text_size(line if line else " ", font)
            max_width = max(max_width, w)
            total_height += h

        # 行間スペースを追加（フォントサイズの20%）
        if len(lines) > 1:
            total_height += int(size * 0.2 * (len(lines) - 1))

        return (max_width, total_height)

    def _calculate_image_element_size(self, element: Dict[str, Any]) -> Tuple[int, int]:
        """画像要素のサイズを計算"""
        width = element.get("width", 100)
        height = element.get("height", 100)
        return (width, height)

    def _calculate_frame_element_size(self, element: Dict[str, Any]) -> Tuple[int, int]:
        """フレーム要素のサイズを計算"""
        children = element.get("children", [])
        if not children:
            return (0, 0)

        layout_mode = element.get("layout_mode", "VERTICAL")
        spacing = element.get("spacing", 0)
        padding = element.get("padding", {})

        # パディングを取得
        pad_top = padding.get("top", 0)
        pad_right = padding.get("right", 0)
        pad_bottom = padding.get("bottom", 0)
        pad_left = padding.get("left", 0)

        # 子要素のサイズを計算
        child_sizes = [self.calculate_element_size(child) for child in children]

        if layout_mode == "HORIZONTAL":
            # 水平レイアウト: 幅を合計、高さは最大値
            total_width = sum(w for w, h in child_sizes)
            total_width += spacing * (len(children) - 1)
            max_height = max((h for w, h in child_sizes), default=0)

            width = total_width + pad_left + pad_right
            height = max_height + pad_top + pad_bottom
        else:
            # 垂直レイアウト: 高さを合計、幅は最大値
            max_width = max((w for w, h in child_sizes), default=0)
            total_height = sum(h for w, h in child_sizes)
            total_height += spacing * (len(children) - 1)

            width = max_width + pad_left + pad_right
            height = total_height + pad_top + pad_bottom

        return (width, height)


class ImageRenderer:
    """画像レンダリングエンジン"""

    def __init__(self, font_manager: FontManager, layout_engine: LayoutEngine):
        self.font_manager = font_manager
        self.layout_engine = layout_engine

    def render(self, template: Dict[str, Any], width: Optional[int] = None, height: Optional[int] = None) -> Image.Image:
        """テンプレートを画像にレンダリング"""
        # サイズを自動計算または指定値を使用
        if width is None or height is None:
            calc_width, calc_height = self.layout_engine.calculate_element_size(template)
            width = width or calc_width
            height = height or calc_height

        logger.info(f"Rendering image with size: {width}x{height}")

        # 背景色を取得
        bg_color = self._parse_color(template.get("background_color", "#FFFFFF"))

        # 画像を作成
        image = Image.new('RGB', (width, height), bg_color)
        draw = ImageDraw.Draw(image)

        # 要素を描画
        self._render_element(draw, template, 0, 0, width, height)

        return image

    def _render_element(self, draw: ImageDraw.ImageDraw, element: Dict[str, Any],
                       x: int, y: int, parent_width: int, parent_height: int):
        """要素を描画"""
        elem_type = element.get("type", "Frame")

        if elem_type == "Text":
            self._render_text(draw, element, x, y)
        elif elem_type == "Image":
            self._render_image(draw, element, x, y)
        elif elem_type in ["Frame", "AutoLayout"]:
            self._render_frame(draw, element, x, y, parent_width, parent_height)

    def _render_text(self, draw: ImageDraw.ImageDraw, element: Dict[str, Any], x: int, y: int):
        """テキストを描画"""
        content = element.get("content", "")
        font_config = element.get("font", {})
        family = font_config.get("family", "Noto Sans JP")
        weight = font_config.get("weight", "Regular")
        size = font_config.get("size", 16)

        # フォントを取得
        font = self.font_manager.get_font(family, weight, size)

        # テキストカラーを取得
        fills = element.get("fills", [{"type": "SOLID", "color": "#000000"}])
        text_color = "#000000"
        if fills and len(fills) > 0:
            text_color = fills[0].get("color", "#000000")
        text_color = self._parse_color(text_color)

        # 背景色があれば背景を描画
        if "background_color" in element:
            bg_color = self._parse_color(element["background_color"])
            text_width, text_height = self.layout_engine.calculate_element_size(element)
            draw.rectangle([x, y, x + text_width, y + text_height], fill=bg_color)

        # ハイライトがある場合の処理
        highlights = element.get("highlights", [])
        if highlights:
            self._render_text_with_highlights(draw, content, font, text_color, highlights, x, y, size)
        else:
            # 通常のテキスト描画（改行対応）
            lines = content.split("\n")
            current_y = y
            line_spacing = int(size * 0.2)

            for line in lines:
                draw.text((x, current_y), line, font=font, fill=text_color)
                _, line_height = self.layout_engine.calculate_text_size(line if line else " ", font)
                current_y += line_height + line_spacing

    def _render_text_with_highlights(self, draw: ImageDraw.ImageDraw, content: str,
                                    font: ImageFont.FreeTypeFont, text_color: Tuple[int, int, int],
                                    highlights: List[Dict[str, str]], x: int, y: int, font_size: int):
        """ハイライト付きテキストを描画"""
        lines = content.split("\n")
        current_y = y
        line_spacing = int(font_size * 0.2)

        for line in lines:
            current_x = x
            remaining_text = line

            # 各行をハイライト部分と通常部分に分割して描画
            while remaining_text:
                # ハイライト部分を検索
                highlight_found = False

                for highlight in highlights:
                    highlight_text = highlight.get("text", "")
                    if highlight_text and highlight_text in remaining_text:
                        # ハイライト前のテキスト
                        idx = remaining_text.index(highlight_text)
                        if idx > 0:
                            before_text = remaining_text[:idx]
                            draw.text((current_x, current_y), before_text, font=font, fill=text_color)
                            w, _ = self.layout_engine.calculate_text_size(before_text, font)
                            current_x += w

                        # ハイライト部分
                        highlight_color = self._parse_color(highlight.get("color", "#FFA500"))
                        draw.text((current_x, current_y), highlight_text, font=font, fill=highlight_color)
                        w, _ = self.layout_engine.calculate_text_size(highlight_text, font)
                        current_x += w

                        # 残りのテキストを更新
                        remaining_text = remaining_text[idx + len(highlight_text):]
                        highlight_found = True
                        break

                # ハイライトが見つからなかった場合、残りのテキストを通常色で描画
                if not highlight_found:
                    draw.text((current_x, current_y), remaining_text, font=font, fill=text_color)
                    break

            # 次の行へ
            _, line_height = self.layout_engine.calculate_text_size(line if line else " ", font)
            current_y += line_height + line_spacing

    def _render_image(self, draw: ImageDraw.ImageDraw, element: Dict[str, Any], x: int, y: int):
        """画像を描画（プレースホルダー）"""
        width = element.get("width", 100)
        height = element.get("height", 100)
        corner_radius = element.get("corner_radius", 0)

        # プレースホルダーとして薄いグレーの矩形を描画
        placeholder_color = (220, 220, 220)

        if corner_radius > 0:
            self._draw_rounded_rectangle(draw, [x, y, x + width, y + height],
                                        corner_radius, fill=placeholder_color)
        else:
            draw.rectangle([x, y, x + width, y + height], fill=placeholder_color)

        # 画像アイコンを中央に描画
        icon_size = min(width, height) // 4
        icon_x = x + (width - icon_size) // 2
        icon_y = y + (height - icon_size) // 2
        draw.rectangle([icon_x, icon_y, icon_x + icon_size, icon_y + icon_size],
                      outline=(150, 150, 150), width=2)

    def _render_frame(self, draw: ImageDraw.ImageDraw, element: Dict[str, Any],
                     x: int, y: int, parent_width: int, parent_height: int):
        """フレームを描画"""
        # フレームのサイズを計算
        frame_width, frame_height = self.layout_engine.calculate_element_size(element)

        # 背景色
        bg_color = element.get("background_color")
        if bg_color:
            bg_color = self._parse_color(bg_color)
            corner_radius = element.get("corner_radius", 0)

            if corner_radius > 0:
                self._draw_rounded_rectangle(draw, [x, y, x + frame_width, y + frame_height],
                                            corner_radius, fill=bg_color)
            else:
                draw.rectangle([x, y, x + frame_width, y + frame_height], fill=bg_color)

        # 枠線
        stroke = element.get("stroke")
        if stroke:
            stroke_color = self._parse_color(stroke.get("color", "#000000"))
            stroke_weight = stroke.get("weight", 1)
            corner_radius = element.get("corner_radius", 0)

            if corner_radius > 0:
                self._draw_rounded_rectangle(draw, [x, y, x + frame_width, y + frame_height],
                                            corner_radius, outline=stroke_color, width=stroke_weight)
            else:
                draw.rectangle([x, y, x + frame_width, y + frame_height],
                             outline=stroke_color, width=stroke_weight)

        # 子要素を描画
        children = element.get("children", [])
        if children:
            self._render_children(draw, element, x, y)

    def _render_children(self, draw: ImageDraw.ImageDraw, parent: Dict[str, Any], parent_x: int, parent_y: int):
        """子要素を描画"""
        children = parent.get("children", [])
        layout_mode = parent.get("layout_mode", "VERTICAL")
        spacing = parent.get("spacing", 0)
        padding = parent.get("padding", {})

        # パディングを取得
        pad_top = padding.get("top", 0)
        pad_left = padding.get("left", 0)

        # 初期位置
        current_x = parent_x + pad_left
        current_y = parent_y + pad_top

        for child in children:
            # 子要素を描画
            self._render_element(draw, child, current_x, current_y, 0, 0)

            # 次の位置を計算
            child_width, child_height = self.layout_engine.calculate_element_size(child)

            if layout_mode == "HORIZONTAL":
                current_x += child_width + spacing
            else:
                current_y += child_height + spacing

    def _draw_rounded_rectangle(self, draw: ImageDraw.ImageDraw, coords: List[int],
                               radius: int, fill=None, outline=None, width=1):
        """角丸矩形を描画"""
        x1, y1, x2, y2 = coords

        # 角丸矩形を描画（PILのrounded_rectangleを使用）
        if hasattr(draw, 'rounded_rectangle'):
            draw.rounded_rectangle([x1, y1, x2, y2], radius=radius, fill=fill, outline=outline, width=width)
        else:
            # フォールバック: 通常の矩形を描画
            if fill:
                draw.rectangle([x1, y1, x2, y2], fill=fill)
            if outline:
                draw.rectangle([x1, y1, x2, y2], outline=outline, width=width)

    def _parse_color(self, color_str: str) -> Tuple[int, int, int]:
        """カラー文字列をRGBタプルに変換"""
        if not color_str:
            return (255, 255, 255)

        # #RRGGBB形式
        if color_str.startswith("#"):
            color_str = color_str[1:]
            try:
                r = int(color_str[0:2], 16)
                g = int(color_str[2:4], 16)
                b = int(color_str[4:6], 16)
                return (r, g, b)
            except (ValueError, IndexError):
                logger.warning(f"Invalid color format: {color_str}, using white")
                return (255, 255, 255)

        return (255, 255, 255)


class YAMLImageGenerator:
    """YAMLテンプレートから画像を生成するメインクラス"""

    def __init__(self):
        self.font_manager = FontManager()
        self.layout_engine = LayoutEngine(self.font_manager)
        self.renderer = ImageRenderer(self.font_manager, self.layout_engine)

    def load_yaml(self, yaml_path: str) -> Dict[str, Any]:
        """YAMLファイルを読み込む"""
        logger.info(f"Loading YAML file: {yaml_path}")

        try:
            with open(yaml_path, 'r', encoding='utf-8') as f:
                data = yaml.safe_load(f)
            logger.info("YAML file loaded successfully")
            return data
        except Exception as e:
            logger.error(f"Failed to load YAML file: {e}")
            raise

    def generate_image(self, template: Dict[str, Any], output_path: str,
                      width: Optional[int] = None, height: Optional[int] = None):
        """画像を生成"""
        logger.info(f"Generating image: {output_path}")

        try:
            # 画像をレンダリング
            image = self.renderer.render(template, width, height)

            # 出力ディレクトリを作成
            output_dir = os.path.dirname(output_path)
            if output_dir:
                os.makedirs(output_dir, exist_ok=True)

            # 画像を保存
            image.save(output_path, format='PNG', quality=95, optimize=True)
            logger.info(f"Image saved successfully: {output_path}")

        except Exception as e:
            logger.error(f"Failed to generate image: {e}")
            raise

    def generate_from_yaml(self, yaml_path: str, output_path: str,
                          width: Optional[int] = None, height: Optional[int] = None):
        """YAMLファイルから画像を生成"""
        template = self.load_yaml(yaml_path)
        self.generate_image(template, output_path, width, height)


def main():
    """メイン関数"""
    parser = argparse.ArgumentParser(
        description='YAMLテンプレートから画像を生成します',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
使用例:
  python yamlImageGenerator.py template.yaml --output output.png
  python yamlImageGenerator.py template.yaml --output output.png --width 800 --height 600
        """
    )

    parser.add_argument('yaml_file', help='YAMLテンプレートファイルのパス')
    parser.add_argument('--output', '-o', required=True, help='出力画像ファイルのパス')
    parser.add_argument('--width', '-w', type=int, help='画像の幅（省略時は自動計算）')
    parser.add_argument('--height', '-H', type=int, help='画像の高さ（省略時は自動計算）')
    parser.add_argument('--verbose', '-v', action='store_true', help='詳細ログを表示')

    args = parser.parse_args()

    # ログレベルを設定
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    # 画像生成
    try:
        generator = YAMLImageGenerator()
        generator.generate_from_yaml(args.yaml_file, args.output, args.width, args.height)
        print(f"✓ 画像を生成しました: {args.output}")
        sys.exit(0)
    except Exception as e:
        print(f"✗ エラーが発生しました: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
