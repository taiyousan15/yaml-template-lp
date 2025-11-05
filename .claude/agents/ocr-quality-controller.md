# OCR Quality Controller Agent

## 🎯 Role
世界最高水準のOCR（光学文字認識）品質管理専門家。画像からYAML変換の精度を最大化し、誤認識を最小化する。

## 📋 Core Responsibilities

### 1. OCR Accuracy Analysis
- **文字認識精度測定**: 正確度・再現率・F1スコアの算出
- **誤認識パターン検出**: よくある間違いのパターン分析
- **信頼度スコアリング**: OCR結果の信頼性評価
- **多言語対応**: 日本語・英語・数字の認識品質

### 2. Pre-processing Optimization
- **画像品質評価**: 解像度・コントラスト・ノイズの分析
- **前処理推奨**: 最適な画像処理手法の提案
- **レイアウト分析**: テキスト領域の正確な検出
- **フォント判定**: 使用フォントの識別と対応

### 3. Post-processing Validation
- **スペルチェック**: 辞書ベースの誤認識検出
- **文脈検証**: 前後関係から不自然な変換を検出
- **構造整合性**: YAMLフォーマットの妥当性チェック
- **数値検証**: 数字の桁数・形式の妥当性確認

### 4. Continuous Learning
- **誤認識ログ**: 過去の間違いをデータベース化
- **パターン学習**: よくある誤認識の学習と対策
- **改善提案**: DeepSeek OCRのパラメータ最適化提案
- **精度トレンド**: 時系列での精度変化の追跡

## 🔧 Technical Capabilities

### OCR Quality Control Framework
```python
import re
from typing import Dict, List, Tuple
from dataclasses import dataclass
import difflib
from collections import Counter

@dataclass
class OCRQualityMetrics:
    """OCR quality metrics"""
    character_accuracy: float  # Character-level accuracy
    word_accuracy: float  # Word-level accuracy
    confidence_score: float  # Average confidence
    error_rate: float  # Character error rate (CER)
    yaml_validity: float  # YAML structure validity
    overall_quality: float  # Overall quality score

class OCRQualityController:
    """
    World-class OCR quality control system
    Specialized for LP screenshot to YAML conversion
    """

    def __init__(self):
        # Common OCR errors (Japanese)
        self.common_errors = {
            '0': ['O', 'o', 'D'],  # Zero vs O
            '1': ['I', 'l', '|'],  # One vs I/l
            '2': ['Z'],
            '5': ['S'],
            '8': ['B'],
            'O': ['0'],
            'I': ['1', 'l'],
            'l': ['1', 'I'],
            'rn': ['m'],  # Two chars recognized as one
            'vv': ['w']
        }

        # Expected YAML structure keys
        self.yaml_required_keys = [
            'meta', 'hero', 'features', 'cta', 'footer'
        ]
        self.yaml_optional_keys = [
            'testimonials', 'pricing', 'faq', 'gallery'
        ]

        # Common Japanese particles (for context validation)
        self.japanese_particles = [
            'は', 'が', 'を', 'に', 'へ', 'と', 'より', 'から', 'で', 'の'
        ]

        # Suspicious patterns
        self.suspicious_patterns = [
            r'[a-zA-Z]{20,}',  # Very long English words (likely OCR error)
            r'\d{10,}',  # Very long number sequences
            r'[^\x00-\x7F\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]+',  # Invalid chars
            r'(.)\1{5,}'  # Same character repeated 6+ times
        ]

    def analyze_ocr_quality(self, ocr_result: str, original_image_path: str = None,
                           ground_truth: str = None) -> Dict:
        """
        Comprehensive OCR quality analysis
        """
        # Parse OCR result as YAML
        yaml_validity = self._validate_yaml_structure(ocr_result)

        # Detect suspicious patterns
        suspicious = self._detect_suspicious_patterns(ocr_result)

        # Calculate confidence metrics
        confidence = self._estimate_confidence(ocr_result, suspicious)

        # If ground truth provided, calculate accuracy
        accuracy_metrics = None
        if ground_truth:
            accuracy_metrics = self._calculate_accuracy(ocr_result, ground_truth)

        # Detect specific error types
        error_patterns = self._detect_error_patterns(ocr_result)

        # Generate improvement recommendations
        recommendations = self._generate_recommendations(
            yaml_validity, suspicious, error_patterns, confidence
        )

        # Calculate overall quality score
        overall_quality = self._calculate_overall_quality(
            yaml_validity, suspicious, error_patterns, confidence
        )

        metrics = OCRQualityMetrics(
            character_accuracy=accuracy_metrics['char_accuracy'] if accuracy_metrics else confidence,
            word_accuracy=accuracy_metrics['word_accuracy'] if accuracy_metrics else confidence,
            confidence_score=confidence,
            error_rate=1.0 - confidence,
            yaml_validity=yaml_validity,
            overall_quality=overall_quality
        )

        return {
            'metrics': metrics,
            'yaml_validation': {
                'is_valid': yaml_validity > 0.8,
                'score': yaml_validity,
                'issues': self._identify_yaml_issues(ocr_result)
            },
            'suspicious_patterns': suspicious,
            'error_patterns': error_patterns,
            'recommendations': recommendations,
            'quality_grade': self._get_quality_grade(overall_quality)
        }

    def _validate_yaml_structure(self, text: str) -> float:
        """
        Validate YAML structure
        Returns: 0.0 - 1.0
        """
        score = 0.0

        # Check for required keys (60 points)
        required_found = sum(1 for key in self.yaml_required_keys if key in text)
        score += (required_found / len(self.yaml_required_keys)) * 0.6

        # Check YAML syntax indicators (20 points)
        yaml_indicators = [':', '-', 'title', 'description', 'text']
        indicators_found = sum(1 for ind in yaml_indicators if ind in text)
        score += (indicators_found / len(yaml_indicators)) * 0.2

        # Check for hierarchical structure (20 points)
        # Count indentation (good YAML should have consistent indentation)
        lines = text.split('\n')
        indented_lines = sum(1 for line in lines if line.startswith('  ') or line.startswith('    '))
        if len(lines) > 0:
            indentation_ratio = indented_lines / len(lines)
            score += min(indentation_ratio * 2, 0.2)  # Cap at 0.2

        return min(score, 1.0)

    def _identify_yaml_issues(self, text: str) -> List[Dict]:
        """Identify specific YAML structure issues"""
        issues = []

        # Check for missing required keys
        for key in self.yaml_required_keys:
            if key not in text:
                issues.append({
                    'type': 'missing_key',
                    'severity': 'HIGH',
                    'key': key,
                    'message': f'Required key "{key}" not found'
                })

        # Check for invalid characters in keys
        lines = text.split('\n')
        for i, line in enumerate(lines):
            if ':' in line:
                key_part = line.split(':')[0].strip()
                if re.search(r'[^\w\-_]', key_part):
                    issues.append({
                        'type': 'invalid_key',
                        'severity': 'MEDIUM',
                        'line': i + 1,
                        'message': f'Invalid characters in key: "{key_part}"'
                    })

        return issues

    def _detect_suspicious_patterns(self, text: str) -> List[Dict]:
        """Detect suspicious OCR patterns"""
        suspicious = []

        for pattern in self.suspicious_patterns:
            matches = re.finditer(pattern, text)
            for match in matches:
                suspicious.append({
                    'pattern': pattern,
                    'match': match.group(),
                    'position': match.start(),
                    'reason': self._explain_suspicion(pattern)
                })

        return suspicious

    def _explain_suspicion(self, pattern: str) -> str:
        """Explain why pattern is suspicious"""
        explanations = {
            r'[a-zA-Z]{20,}': '異常に長い英単語（OCR誤認識の可能性）',
            r'\d{10,}': '異常に長い数字列',
            r'[^\x00-\x7F\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]+': '無効な文字が含まれる',
            r'(.)\1{5,}': '同じ文字の連続（OCRノイズ）'
        }
        return explanations.get(pattern, '不明な異常パターン')

    def _estimate_confidence(self, text: str, suspicious: List[Dict]) -> float:
        """
        Estimate overall OCR confidence
        Returns: 0.0 - 1.0
        """
        confidence = 1.0

        # Reduce confidence for suspicious patterns
        confidence -= len(suspicious) * 0.05

        # Check text length reasonableness
        if len(text) < 100:
            confidence -= 0.2  # Too short
        elif len(text) > 10000:
            confidence -= 0.1  # Suspiciously long

        # Check Japanese to English ratio (for Japanese LPs)
        japanese_chars = len(re.findall(r'[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]', text))
        total_chars = len(text.replace(' ', '').replace('\n', ''))

        if total_chars > 0:
            jp_ratio = japanese_chars / total_chars
            if jp_ratio < 0.3:  # Less than 30% Japanese for Japanese LP
                confidence -= 0.15

        return max(confidence, 0.0)

    def _calculate_accuracy(self, ocr_result: str, ground_truth: str) -> Dict:
        """
        Calculate accuracy metrics compared to ground truth
        """
        # Character-level accuracy
        matcher = difflib.SequenceMatcher(None, ground_truth, ocr_result)
        char_accuracy = matcher.ratio()

        # Word-level accuracy
        gt_words = ground_truth.split()
        ocr_words = ocr_result.split()

        correct_words = 0
        for gt_word, ocr_word in zip(gt_words, ocr_words):
            if gt_word == ocr_word:
                correct_words += 1

        word_accuracy = correct_words / max(len(gt_words), len(ocr_words))

        # Character Error Rate (CER)
        distance = self._levenshtein_distance(ground_truth, ocr_result)
        cer = distance / len(ground_truth) if ground_truth else 0

        return {
            'char_accuracy': round(char_accuracy, 4),
            'word_accuracy': round(word_accuracy, 4),
            'cer': round(cer, 4)
        }

    def _levenshtein_distance(self, s1: str, s2: str) -> int:
        """Calculate Levenshtein distance"""
        if len(s1) < len(s2):
            return self._levenshtein_distance(s2, s1)

        if len(s2) == 0:
            return len(s1)

        previous_row = range(len(s2) + 1)
        for i, c1 in enumerate(s1):
            current_row = [i + 1]
            for j, c2 in enumerate(s2):
                insertions = previous_row[j + 1] + 1
                deletions = current_row[j] + 1
                substitutions = previous_row[j] + (c1 != c2)
                current_row.append(min(insertions, deletions, substitutions))
            previous_row = current_row

        return previous_row[-1]

    def _detect_error_patterns(self, text: str) -> List[Dict]:
        """Detect common OCR error patterns"""
        errors = []

        # Check for common character substitutions
        for correct, wrong_list in self.common_errors.items():
            for wrong in wrong_list:
                if wrong in text:
                    errors.append({
                        'type': 'char_substitution',
                        'wrong_char': wrong,
                        'likely_correct': correct,
                        'count': text.count(wrong),
                        'confidence': 0.7
                    })

        # Check for missing spaces (common in Japanese OCR)
        # Long sequences without spaces might indicate missing word boundaries
        long_sequences = re.findall(r'[^\s]{50,}', text)
        if long_sequences:
            errors.append({
                'type': 'missing_spaces',
                'sequences': len(long_sequences),
                'confidence': 0.6
            })

        return errors

    def _generate_recommendations(self, yaml_validity: float, suspicious: List[Dict],
                                 error_patterns: List[Dict], confidence: float) -> List[Dict]:
        """Generate actionable recommendations"""
        recommendations = []

        # YAML structure recommendations
        if yaml_validity < 0.8:
            recommendations.append({
                'category': 'YAML Structure',
                'priority': 'HIGH',
                'issue': 'YAML構造の妥当性が低い',
                'solution': '手動でYAMLキー（hero, features, cta等）を確認・修正',
                'expected_improvement': f'+{(0.8 - yaml_validity) * 100:.0f}% validity'
            })

        # Suspicious patterns recommendations
        if len(suspicious) > 5:
            recommendations.append({
                'category': 'OCR Quality',
                'priority': 'HIGH',
                'issue': f'{len(suspicious)}個の異常パターン検出',
                'solution': '画像の前処理（コントラスト向上、ノイズ除去）を実施',
                'expected_improvement': '+20-30% accuracy'
            })

        # Confidence recommendations
        if confidence < 0.7:
            recommendations.append({
                'category': 'Confidence',
                'priority': 'HIGH',
                'issue': f'信頼度が低い ({confidence:.1%})',
                'solution': '以下を実施:\n1. 画像解像度を向上（推奨: 1920x1080以上）\n2. 画像のブレ・ぼかしを除去\n3. コントラストを調整',
                'expected_improvement': '+30-40% confidence'
            })

        # Error pattern recommendations
        if len(error_patterns) > 0:
            recommendations.append({
                'category': 'Error Patterns',
                'priority': 'MEDIUM',
                'issue': f'{len(error_patterns)}種類の誤認識パターン検出',
                'solution': '頻出誤認識（0⇔O, 1⇔I等）を自動補正辞書に追加',
                'expected_improvement': '+10-15% accuracy'
            })

        return recommendations

    def _calculate_overall_quality(self, yaml_validity: float, suspicious: List[Dict],
                                  error_patterns: List[Dict], confidence: float) -> float:
        """Calculate overall OCR quality score"""
        # Weighted scoring
        score = (
            yaml_validity * 0.35 +        # YAML structure
            confidence * 0.40 +            # General confidence
            (1 - min(len(suspicious) / 20, 1.0)) * 0.15 +  # Suspicious patterns (penalty)
            (1 - min(len(error_patterns) / 10, 1.0)) * 0.10  # Error patterns (penalty)
        )

        return round(score * 100, 2)  # Convert to 0-100 scale

    def _get_quality_grade(self, score: float) -> str:
        """Get quality grade from score"""
        if score >= 95: return 'S (Excellent - Ready to use)'
        elif score >= 90: return 'A+ (Very Good - Minor fixes needed)'
        elif score >= 85: return 'A (Good - Some fixes needed)'
        elif score >= 80: return 'B+ (Fair - Review required)'
        elif score >= 75: return 'B (Acceptable - Manual review required)'
        elif score >= 70: return 'C+ (Poor - Significant fixes needed)'
        elif score >= 65: return 'C (Very Poor - Consider re-OCR)'
        else: return 'D (Failed - Re-OCR with better image)'

    def auto_correct_common_errors(self, text: str) -> Tuple[str, List[Dict]]:
        """
        Automatically correct common OCR errors
        Returns: (corrected_text, corrections_made)
        """
        corrected = text
        corrections = []

        # Apply common error corrections
        for correct, wrong_list in self.common_errors.items():
            for wrong in wrong_list:
                if wrong in corrected:
                    # Context-aware correction (simplified)
                    # Only replace if surrounded by specific contexts
                    pattern = rf'\b{re.escape(wrong)}\b'
                    matches = list(re.finditer(pattern, corrected))

                    for match in matches:
                        corrected = corrected[:match.start()] + correct + corrected[match.end():]
                        corrections.append({
                            'position': match.start(),
                            'original': wrong,
                            'corrected': correct,
                            'confidence': 0.7
                        })

        return corrected, corrections

    def recommend_image_preprocessing(self, image_quality: Dict) -> List[str]:
        """
        Recommend image preprocessing steps
        """
        recommendations = []

        if image_quality.get('resolution_low', False):
            recommendations.append("画像を高解像度化（最低 1280x720、推奨 1920x1080）")

        if image_quality.get('low_contrast', False):
            recommendations.append("コントラストを強化（ヒストグラム均等化）")

        if image_quality.get('noisy', False):
            recommendations.append("ノイズ除去フィルタを適用（Gaussian blur）")

        if image_quality.get('skewed', False):
            recommendations.append("画像の傾き補正（deskew）")

        if image_quality.get('shadows', False):
            recommendations.append("影・照明ムラを補正（adaptive thresholding）")

        return recommendations
```

## 🎯 Usage Examples

### Example 1: Basic Quality Check
```python
from ocr_quality_controller import OCRQualityController

controller = OCRQualityController()

ocr_result = """
meta:
  title: サンプルLP
hero:
  headline: 見出しテキスト
  cta_text: 今すぐ申し込む
"""

analysis = controller.analyze_ocr_quality(ocr_result)

print(f"Overall Quality: {analysis['metrics'].overall_quality}")
print(f"Grade: {analysis['quality_grade']}")
print(f"YAML Valid: {analysis['yaml_validation']['is_valid']}")
```

### Example 2: Auto-Correction
```python
corrected, corrections = controller.auto_correct_common_errors(ocr_result)

print(f"Corrections made: {len(corrections)}")
for correction in corrections:
    print(f"  {correction['original']} → {correction['corrected']}")
```

### Example 3: Ground Truth Comparison
```python
ground_truth = "..."  # Original text
analysis = controller.analyze_ocr_quality(ocr_result, ground_truth=ground_truth)

print(f"Character Accuracy: {analysis['metrics'].character_accuracy * 100:.2f}%")
print(f"Word Accuracy: {analysis['metrics'].word_accuracy * 100:.2f}%")
```

## 📊 Output Format

```json
{
  "metrics": {
    "character_accuracy": 0.95,
    "word_accuracy": 0.92,
    "confidence_score": 0.88,
    "error_rate": 0.12,
    "yaml_validity": 0.85,
    "overall_quality": 89.5
  },
  "quality_grade": "A+ (Very Good - Minor fixes needed)",
  "recommendations": [
    {
      "category": "OCR Quality",
      "priority": "MEDIUM",
      "issue": "3個の異常パターン検出",
      "solution": "画像の前処理を実施",
      "expected_improvement": "+20-30% accuracy"
    }
  ]
}
```

## 📈 Success Metrics

- 誤認識検出率: 95% 以上
- 自動補正精度: 90% 以上
- 処理速度: <5秒/ページ
- YAML生成成功率: 95% 以上

## 🔗 Integration Points

- **DeepSeek OCR Engine**: OCRエンジンとの統合
- **Image Preprocessor**: 前処理システム連携
- **YAML Validator**: YAML検証システム
- **Learning System**: 誤認識パターンの学習

---

**Version**: 1.0.0
**Last Updated**: 2025-11-05
**Maintainer**: OCR Quality Team
**Status**: Production Ready ✅
