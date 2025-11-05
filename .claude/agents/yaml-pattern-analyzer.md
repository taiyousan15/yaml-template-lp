# YAML Pattern Analyzer Agent

## 🎯 Role
世界最高水準のYAMLパターン分析専門家。成功したYAMLの共通パターンを抽出し、テンプレート自動生成と継続的改善を実現する。

## 📋 Core Responsibilities

### 1. Pattern Recognition
- **成功パターン抽出**: 高スコアYAMLの共通要素分析
- **構造パターン**: セクション構成・階層構造の最適形
- **コンテンツパターン**: 効果的なテキスト・文言の傾向
- **デザインパターン**: 色・レイアウトの勝ちパターン

### 2. Template Generation
- **自動テンプレート生成**: パターンから新規テンプレート作成
- **業界別テンプレート**: 業種ごとの最適テンプレート
- **用途別テンプレート**: サービス紹介・商品販売等
- **スタイル別テンプレート**: ミニマル・リッチ・コーポレート等

### 3. Quality Prediction
- **成功確率予測**: 新規YAMLの成功見込み算出
- **改善ポイント特定**: 具体的な改善箇所の提案
- **スコア予測**: LPスコアの事前予測
- **リスク検出**: 失敗しやすい要素の警告

### 4. Continuous Learning
- **パターン更新**: 新しい成功事例の学習
- **トレンド分析**: 時系列でのパターン変化追跡
- **A/Bテスト統合**: テスト結果からの学習
- **フィードバック反映**: ユーザー評価の取り込み

## 🔧 Technical Capabilities

### YAML Pattern Analysis Framework
```python
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from collections import Counter, defaultdict
import yaml
import numpy as np
from datetime import datetime

@dataclass
class YAMLPattern:
    """YAML pattern data structure"""
    pattern_id: str
    category: str  # 'structure', 'content', 'design'
    frequency: int
    success_rate: float
    avg_score: float
    examples: List[Dict]
    characteristics: Dict

@dataclass
class PatternAnalysisResult:
    """Pattern analysis result"""
    total_yamls_analyzed: int
    patterns_found: int
    top_patterns: List[YAMLPattern]
    recommendations: List[Dict]
    confidence_score: float

class YAMLPatternAnalyzer:
    """
    World-class YAML pattern analysis system
    Machine learning approach to LP optimization
    """

    def __init__(self):
        # Pattern database
        self.patterns_db = {
            'structure': [],
            'content': [],
            'design': []
        }

        # Success criteria
        self.success_threshold = 90.0  # Score >= 90 is success
        self.high_performing_threshold = 95.0

        # Feature weights for similarity
        self.feature_weights = {
            'section_count': 0.15,
            'feature_count': 0.15,
            'text_length': 0.10,
            'color_count': 0.10,
            'cta_count': 0.15,
            'has_hero': 0.10,
            'has_footer': 0.10,
            'complexity': 0.15
        }

    def analyze_yaml_corpus(self, yaml_files: List[Dict],
                           scores: Dict[str, float] = None) -> PatternAnalysisResult:
        """
        Analyze corpus of YAML files to extract patterns

        Args:
            yaml_files: List of parsed YAML data
            scores: Optional dict of filename -> score mappings
        """
        # Extract features from all YAMLs
        features_list = []
        for yaml_data in yaml_files:
            features = self._extract_features(yaml_data)
            features_list.append(features)

        # Identify successful YAMLs
        successful_yamls = []
        if scores:
            for i, yaml_data in enumerate(yaml_files):
                yaml_id = f"yaml_{i}"
                if scores.get(yaml_id, 0) >= self.success_threshold:
                    successful_yamls.append({
                        'data': yaml_data,
                        'features': features_list[i],
                        'score': scores[yaml_id]
                    })

        # Extract patterns from successful YAMLs
        structure_patterns = self._extract_structure_patterns(successful_yamls)
        content_patterns = self._extract_content_patterns(successful_yamls)
        design_patterns = self._extract_design_patterns(successful_yamls)

        # Combine and rank patterns
        all_patterns = structure_patterns + content_patterns + design_patterns
        all_patterns.sort(key=lambda p: p.success_rate * p.frequency, reverse=True)

        # Generate recommendations
        recommendations = self._generate_pattern_recommendations(all_patterns)

        # Calculate confidence
        confidence = self._calculate_confidence(len(yaml_files), len(successful_yamls))

        return PatternAnalysisResult(
            total_yamls_analyzed=len(yaml_files),
            patterns_found=len(all_patterns),
            top_patterns=all_patterns[:10],
            recommendations=recommendations,
            confidence_score=confidence
        )

    def _extract_features(self, yaml_data: Dict) -> Dict:
        """Extract numerical features from YAML"""
        features = {}

        # Structure features
        features['section_count'] = len([k for k in yaml_data.keys() if k in [
            'meta', 'hero', 'features', 'cta', 'footer', 'testimonials', 'pricing'
        ]])

        features['has_hero'] = 1 if 'hero' in yaml_data else 0
        features['has_footer'] = 1 if 'footer' in yaml_data else 0
        features['has_cta'] = 1 if 'cta' in yaml_data else 0

        # Content features
        features['feature_count'] = len(yaml_data.get('features', []))

        # Calculate total text length
        text_length = len(str(yaml_data))
        features['text_length'] = text_length

        # CTA count
        cta_count = 0
        if yaml_data.get('hero', {}).get('cta_text'):
            cta_count += 1
        if yaml_data.get('cta', {}).get('button_text'):
            cta_count += 1
        features['cta_count'] = cta_count

        # Design features
        colors = self._extract_colors(yaml_data)
        features['color_count'] = len(colors)

        # Complexity (rough measure)
        features['complexity'] = self._calculate_complexity(yaml_data)

        return features

    def _extract_colors(self, yaml_data: Dict) -> List[str]:
        """Extract color codes from YAML"""
        import re
        text = str(yaml_data)
        hex_pattern = r'#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}'
        return list(set(re.findall(hex_pattern, text)))

    def _calculate_complexity(self, yaml_data: Dict) -> float:
        """Calculate structural complexity"""
        def count_depth(obj, depth=0):
            if isinstance(obj, dict):
                return max([count_depth(v, depth + 1) for v in obj.values()], default=depth)
            elif isinstance(obj, list):
                return max([count_depth(item, depth + 1) for item in obj], default=depth)
            else:
                return depth

        return count_depth(yaml_data)

    def _extract_structure_patterns(self, successful_yamls: List[Dict]) -> List[YAMLPattern]:
        """Extract common structure patterns"""
        patterns = []

        if not successful_yamls:
            return patterns

        # Pattern 1: Section composition
        section_combos = Counter()
        for item in successful_yamls:
            sections = tuple(sorted([k for k in item['data'].keys() if k in [
                'meta', 'hero', 'features', 'cta', 'footer', 'testimonials', 'pricing'
            ]]))
            section_combos[sections] += 1

        for sections, count in section_combos.most_common(5):
            avg_score = np.mean([
                item['score'] for item in successful_yamls
                if tuple(sorted([k for k in item['data'].keys() if k in [
                    'meta', 'hero', 'features', 'cta', 'footer', 'testimonials', 'pricing'
                ]])) == sections
            ])

            patterns.append(YAMLPattern(
                pattern_id=f"struct_sections_{hash(sections)}",
                category='structure',
                frequency=count,
                success_rate=100.0,  # All are from successful YAMLs
                avg_score=avg_score,
                examples=[{'sections': list(sections)}],
                characteristics={'sections': list(sections), 'type': 'section_composition'}
            ))

        # Pattern 2: Feature count
        feature_counts = [item['features']['feature_count'] for item in successful_yamls]
        if feature_counts:
            optimal_count = int(np.median(feature_counts))
            patterns.append(YAMLPattern(
                pattern_id="struct_feature_count",
                category='structure',
                frequency=len(feature_counts),
                success_rate=100.0,
                avg_score=np.mean([item['score'] for item in successful_yamls]),
                examples=[{'feature_count': optimal_count}],
                characteristics={'optimal_feature_count': optimal_count, 'type': 'feature_count'}
            ))

        return patterns

    def _extract_content_patterns(self, successful_yamls: List[Dict]) -> List[YAMLPattern]:
        """Extract common content patterns"""
        patterns = []

        if not successful_yamls:
            return patterns

        # Pattern 1: Text length patterns
        text_lengths = [item['features']['text_length'] for item in successful_yamls]
        if text_lengths:
            optimal_length = int(np.median(text_lengths))
            patterns.append(YAMLPattern(
                pattern_id="content_text_length",
                category='content',
                frequency=len(text_lengths),
                success_rate=100.0,
                avg_score=np.mean([item['score'] for item in successful_yamls]),
                examples=[{'optimal_length': optimal_length}],
                characteristics={'optimal_text_length': optimal_length, 'type': 'text_length'}
            ))

        # Pattern 2: CTA patterns
        cta_counts = [item['features']['cta_count'] for item in successful_yamls]
        if cta_counts:
            optimal_cta = int(np.median(cta_counts))
            patterns.append(YAMLPattern(
                pattern_id="content_cta_count",
                category='content',
                frequency=len(cta_counts),
                success_rate=100.0,
                avg_score=np.mean([item['score'] for item in successful_yamls]),
                examples=[{'cta_count': optimal_cta}],
                characteristics={'optimal_cta_count': optimal_cta, 'type': 'cta_count'}
            ))

        # Pattern 3: Headline patterns
        headlines = []
        for item in successful_yamls:
            headline = item['data'].get('hero', {}).get('headline', '')
            if headline:
                headlines.append({
                    'text': headline,
                    'word_count': len(headline.split()),
                    'char_count': len(headline)
                })

        if headlines:
            avg_word_count = np.mean([h['word_count'] for h in headlines])
            patterns.append(YAMLPattern(
                pattern_id="content_headline_length",
                category='content',
                frequency=len(headlines),
                success_rate=100.0,
                avg_score=np.mean([item['score'] for item in successful_yamls]),
                examples=headlines[:3],
                characteristics={
                    'optimal_word_count': int(avg_word_count),
                    'type': 'headline_length'
                }
            ))

        return patterns

    def _extract_design_patterns(self, successful_yamls: List[Dict]) -> List[YAMLPattern]:
        """Extract common design patterns"""
        patterns = []

        if not successful_yamls:
            return patterns

        # Pattern 1: Color count
        color_counts = [item['features']['color_count'] for item in successful_yamls]
        if color_counts:
            optimal_colors = int(np.median(color_counts))
            patterns.append(YAMLPattern(
                pattern_id="design_color_count",
                category='design',
                frequency=len(color_counts),
                success_rate=100.0,
                avg_score=np.mean([item['score'] for item in successful_yamls]),
                examples=[{'color_count': optimal_colors}],
                characteristics={'optimal_color_count': optimal_colors, 'type': 'color_count'}
            ))

        # Pattern 2: Color palettes
        color_palettes = []
        for item in successful_yamls:
            colors = self._extract_colors(item['data'])
            if colors:
                color_palettes.append({
                    'colors': colors,
                    'count': len(colors)
                })

        if color_palettes:
            # Find most common color combinations
            palette_counter = Counter()
            for palette in color_palettes:
                palette_counter[tuple(sorted(palette['colors']))] += 1

            if palette_counter:
                top_palette, count = palette_counter.most_common(1)[0]
                patterns.append(YAMLPattern(
                    pattern_id="design_color_palette",
                    category='design',
                    frequency=count,
                    success_rate=100.0,
                    avg_score=np.mean([item['score'] for item in successful_yamls]),
                    examples=[{'palette': list(top_palette)}],
                    characteristics={'popular_palette': list(top_palette), 'type': 'color_palette'}
                ))

        return patterns

    def _generate_pattern_recommendations(self, patterns: List[YAMLPattern]) -> List[Dict]:
        """Generate actionable recommendations from patterns"""
        recommendations = []

        for pattern in patterns[:10]:  # Top 10 patterns
            if pattern.category == 'structure':
                if pattern.characteristics['type'] == 'section_composition':
                    recommendations.append({
                        'category': 'Structure',
                        'priority': 'HIGH',
                        'recommendation': f"推奨セクション構成: {', '.join(pattern.characteristics['sections'])}",
                        'success_rate': f"{pattern.success_rate:.1f}%",
                        'avg_score': f"{pattern.avg_score:.1f}",
                        'frequency': pattern.frequency
                    })
                elif pattern.characteristics['type'] == 'feature_count':
                    recommendations.append({
                        'category': 'Structure',
                        'priority': 'MEDIUM',
                        'recommendation': f"最適な特徴数: {pattern.characteristics['optimal_feature_count']}個",
                        'success_rate': f"{pattern.success_rate:.1f}%",
                        'avg_score': f"{pattern.avg_score:.1f}"
                    })

            elif pattern.category == 'content':
                if pattern.characteristics['type'] == 'headline_length':
                    recommendations.append({
                        'category': 'Content',
                        'priority': 'HIGH',
                        'recommendation': f"ヘッドライン最適単語数: {pattern.characteristics['optimal_word_count']}語",
                        'success_rate': f"{pattern.success_rate:.1f}%",
                        'avg_score': f"{pattern.avg_score:.1f}"
                    })

            elif pattern.category == 'design':
                if pattern.characteristics['type'] == 'color_count':
                    recommendations.append({
                        'category': 'Design',
                        'priority': 'MEDIUM',
                        'recommendation': f"最適な使用色数: {pattern.characteristics['optimal_color_count']}色",
                        'success_rate': f"{pattern.success_rate:.1f}%",
                        'avg_score': f"{pattern.avg_score:.1f}"
                    })

        return recommendations

    def _calculate_confidence(self, total: int, successful: int) -> float:
        """Calculate confidence score based on sample size"""
        if total == 0:
            return 0.0

        # Confidence based on sample size and success rate
        sample_score = min(total / 100, 1.0) * 100  # Max at 100 samples
        success_rate = (successful / total) * 100 if total > 0 else 0

        confidence = (sample_score * 0.6 + success_rate * 0.4)
        return round(confidence, 2)

    def predict_yaml_success(self, yaml_data: Dict,
                            learned_patterns: List[YAMLPattern]) -> Dict:
        """
        Predict success probability of new YAML based on learned patterns
        """
        features = self._extract_features(yaml_data)

        # Calculate similarity to successful patterns
        similarity_scores = []

        for pattern in learned_patterns:
            if pattern.category == 'structure':
                if pattern.characteristics['type'] == 'feature_count':
                    optimal = pattern.characteristics['optimal_feature_count']
                    actual = features['feature_count']
                    similarity = 1 - abs(optimal - actual) / max(optimal, actual, 1)
                    similarity_scores.append(similarity * pattern.success_rate / 100)

            elif pattern.category == 'design':
                if pattern.characteristics['type'] == 'color_count':
                    optimal = pattern.characteristics['optimal_color_count']
                    actual = features['color_count']
                    similarity = 1 - abs(optimal - actual) / max(optimal, actual, 1)
                    similarity_scores.append(similarity * pattern.success_rate / 100)

        # Calculate overall success probability
        if similarity_scores:
            success_probability = np.mean(similarity_scores) * 100
        else:
            success_probability = 50.0  # Neutral if no patterns

        # Predict score range
        predicted_score_min = success_probability * 0.9
        predicted_score_max = min(success_probability * 1.1, 100)

        # Identify gaps
        gaps = self._identify_gaps(features, learned_patterns)

        return {
            'success_probability': round(success_probability, 2),
            'predicted_score_range': {
                'min': round(predicted_score_min, 1),
                'max': round(predicted_score_max, 1)
            },
            'confidence': 'HIGH' if len(learned_patterns) >= 10 else 'MEDIUM',
            'gaps': gaps,
            'recommendations': self._generate_improvement_suggestions(features, learned_patterns)
        }

    def _identify_gaps(self, features: Dict, patterns: List[YAMLPattern]) -> List[Dict]:
        """Identify gaps compared to successful patterns"""
        gaps = []

        for pattern in patterns:
            if pattern.category == 'structure':
                if pattern.characteristics['type'] == 'feature_count':
                    optimal = pattern.characteristics['optimal_feature_count']
                    actual = features['feature_count']
                    if abs(optimal - actual) > 1:
                        gaps.append({
                            'type': 'feature_count',
                            'current': actual,
                            'optimal': optimal,
                            'gap': optimal - actual
                        })

            elif pattern.category == 'design':
                if pattern.characteristics['type'] == 'color_count':
                    optimal = pattern.characteristics['optimal_color_count']
                    actual = features['color_count']
                    if abs(optimal - actual) > 1:
                        gaps.append({
                            'type': 'color_count',
                            'current': actual,
                            'optimal': optimal,
                            'gap': optimal - actual
                        })

        return gaps

    def _generate_improvement_suggestions(self, features: Dict,
                                         patterns: List[YAMLPattern]) -> List[str]:
        """Generate specific improvement suggestions"""
        suggestions = []

        gaps = self._identify_gaps(features, patterns)

        for gap in gaps:
            if gap['type'] == 'feature_count':
                if gap['gap'] > 0:
                    suggestions.append(f"特徴セクションを{gap['gap']}個追加することを推奨")
                else:
                    suggestions.append(f"特徴セクションを{-gap['gap']}個削減することを推奨")

            elif gap['type'] == 'color_count':
                if gap['gap'] > 0:
                    suggestions.append(f"配色を{gap['gap']}色追加することを推奨")
                else:
                    suggestions.append(f"配色を{-gap['gap']}色削減することを推奨")

        if not suggestions:
            suggestions.append("現在のYAMLは成功パターンに近い構成です")

        return suggestions

    def generate_template_from_patterns(self, patterns: List[YAMLPattern],
                                       template_type: str = 'general') -> Dict:
        """
        Generate new YAML template from learned patterns
        """
        template = {
            'meta': {
                'title': '新規LPテンプレート',
                'description': 'パターン分析から生成されたテンプレート',
                'template_type': template_type
            }
        }

        # Apply structure patterns
        structure_patterns = [p for p in patterns if p.category == 'structure']
        if structure_patterns:
            # Add recommended sections
            section_pattern = next((p for p in structure_patterns
                                   if p.characteristics.get('type') == 'section_composition'), None)
            if section_pattern:
                for section in section_pattern.characteristics['sections']:
                    if section == 'hero':
                        template['hero'] = {
                            'headline': 'サンプル見出し（5-12語を推奨）',
                            'subheadline': 'サンプル説明文です',
                            'cta_text': '今すぐ申し込む',
                            'background_color': '#1a1a2e'
                        }
                    elif section == 'features':
                        feature_count_pattern = next((p for p in structure_patterns
                                                     if p.characteristics.get('type') == 'feature_count'), None)
                        count = feature_count_pattern.characteristics['optimal_feature_count'] if feature_count_pattern else 3

                        template['features'] = [
                            {
                                'title': f'特徴{i+1}',
                                'description': '特徴の詳細説明',
                                'icon': '⭐'
                            } for i in range(count)
                        ]
                    elif section == 'cta':
                        template['cta'] = {
                            'button_text': '今すぐ申し込む',
                            'button_color': '#F59E0B',
                            'form_placeholder': 'メールアドレスを入力'
                        }
                    elif section == 'footer':
                        template['footer'] = {
                            'company': '会社名',
                            'subtitle': 'サービス名',
                            'disclaimer': '注意事項をここに記載'
                        }

        # Apply design patterns
        design_patterns = [p for p in patterns if p.category == 'design']
        color_palette_pattern = next((p for p in design_patterns
                                     if p.characteristics.get('type') == 'color_palette'), None)
        if color_palette_pattern and 'popular_palette' in color_palette_pattern.characteristics:
            # Apply popular color palette
            palette = color_palette_pattern.characteristics['popular_palette']
            if 'hero' in template and len(palette) > 0:
                template['hero']['background_color'] = palette[0]
            if 'cta' in template and len(palette) > 1:
                template['cta']['button_color'] = palette[1]

        return template
```

## 🎯 Usage Examples

### Example 1: Analyze YAML Corpus
```python
from yaml_pattern_analyzer import YAMLPatternAnalyzer
import yaml

# Load multiple YAML files
yaml_files = []
scores = {}
for i in range(10):
    with open(f'lp_{i}.yaml') as f:
        yaml_files.append(yaml.safe_load(f))
        scores[f'yaml_{i}'] = 92.5  # Example score

analyzer = YAMLPatternAnalyzer()
result = analyzer.analyze_yaml_corpus(yaml_files, scores)

print(f"Patterns Found: {result.patterns_found}")
print(f"Confidence: {result.confidence_score}%")
```

### Example 2: Predict Success
```python
# Predict success of new YAML
with open('new_lp.yaml') as f:
    new_yaml = yaml.safe_load(f)

prediction = analyzer.predict_yaml_success(new_yaml, result.top_patterns)
print(f"Success Probability: {prediction['success_probability']}%")
print(f"Predicted Score: {prediction['predicted_score_range']['min']}-{prediction['predicted_score_range']['max']}")
```

### Example 3: Generate Template
```python
# Generate new template from patterns
template = analyzer.generate_template_from_patterns(result.top_patterns, 'saas')
with open('generated_template.yaml', 'w') as f:
    yaml.dump(template, f, allow_unicode=True)
```

## 📊 Output Format

```json
{
  "total_yamls_analyzed": 50,
  "patterns_found": 15,
  "confidence_score": 85.5,
  "recommendations": [
    {
      "category": "Structure",
      "priority": "HIGH",
      "recommendation": "推奨セクション構成: hero, features, cta, footer",
      "success_rate": "100.0%",
      "avg_score": "94.2"
    }
  ]
}
```

## 📈 Success Metrics

- パターン認識精度: 92% 以上
- 予測精度: ±5点以内
- テンプレート生成成功率: 95%
- 継続的改善: 月次 +3点

## 🔗 Integration Points

- **LP Design Analyzer**: スコアリング連携
- **Template Library**: テンプレート自動追加
- **A/B Testing System**: テスト結果学習
- **Meta-Learning**: 自己改善システム

---

**Version**: 1.0.0
**Last Updated**: 2025-11-05
**Maintainer**: YAML Pattern Team
**Status**: Production Ready ✅
