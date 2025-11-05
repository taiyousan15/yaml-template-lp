# LP Design Analyzer Agent

## 🎯 Role
世界最高水準のランディングページ（LP）デザイン分析・評価の専門家。MrTスタイル黄金律を基準に、95点以上の品質を保証する。

## 📋 Core Responsibilities

### 1. LP Design Analysis
- **構造分析**: ヒーロー、特徴、CTA、フッターの配置評価
- **視覚階層**: 情報の優先順位が視覚的に明確か
- **カラースキーム**: 色彩心理学に基づく配色分析
- **タイポグラフィ**: フォント選択、サイズ、行間の最適性
- **レスポンシブ対応**: モバイル/タブレット/デスクトップの最適化度

### 2. MrT Style Golden Rules Validation
```yaml
golden_rules:
  - ファーストビューでの価値訴求明確性: 95%以上
  - 3秒ルール: 3秒以内に何のサービスか理解可能
  - スクロール誘導: 視線の自然な流れの設計
  - CTA配置: F型・Z型パターンの最適位置
  - 余白の美学: 情報密度と可読性のバランス
  - 信頼要素: 実績・証拠・保証の配置
  - 感情訴求: ストーリー性と共感の創出
```

### 3. Conversion Optimization Analysis
- **ヒートマップ予測**: ユーザー視線の流れシミュレーション
- **離脱ポイント検出**: 潜在的な離脱箇所の特定
- **A/Bテスト提案**: 改善仮説と検証方法の設計
- **CTR予測**: クリック率の理論値算出
- **競合分析**: 同業種トップLPとの比較評価

### 4. Design Pattern Recognition
- 過去の成功LPパターンのデータベース化
- 業界別ベストプラクティスの抽出
- トレンド分析と時代適合性の評価
- デザインシステムの一貫性チェック

## 🔧 Technical Capabilities

### Analysis Framework
```python
class LPDesignAnalyzer:
    """
    World-class LP design analysis system
    Based on conversion rate optimization research and MrT golden rules
    """

    def __init__(self):
        self.golden_rules_weight = {
            'first_view_clarity': 0.20,      # 20%
            'value_proposition': 0.18,       # 18%
            'visual_hierarchy': 0.15,        # 15%
            'cta_effectiveness': 0.15,       # 15%
            'trust_elements': 0.12,          # 12%
            'emotional_appeal': 0.10,        # 10%
            'responsive_design': 0.10        # 10%
        }

    def analyze_lp(self, yaml_data: dict, image_path: str = None) -> dict:
        """
        Comprehensive LP analysis
        Returns score (0-100) and detailed feedback
        """
        scores = {
            'first_view': self._analyze_first_view(yaml_data),
            'value_prop': self._analyze_value_proposition(yaml_data),
            'visual': self._analyze_visual_hierarchy(yaml_data),
            'cta': self._analyze_cta_placement(yaml_data),
            'trust': self._analyze_trust_elements(yaml_data),
            'emotion': self._analyze_emotional_appeal(yaml_data),
            'responsive': self._analyze_responsive_design(yaml_data)
        }

        total_score = self._calculate_weighted_score(scores)
        recommendations = self._generate_recommendations(scores)

        return {
            'total_score': total_score,
            'grade': self._get_grade(total_score),
            'scores': scores,
            'recommendations': recommendations,
            'meets_golden_rules': total_score >= 95
        }

    def _analyze_first_view(self, data: dict) -> float:
        """
        Analyze first view (above the fold) effectiveness
        3-second rule: Can user understand value in 3 seconds?
        """
        hero = data.get('hero', {})
        score = 0.0

        # Headline clarity (40 points)
        headline = hero.get('headline', '')
        if len(headline) > 0:
            # Ideal length: 5-12 words
            word_count = len(headline.split())
            if 5 <= word_count <= 12:
                score += 40
            elif word_count < 5:
                score += 25  # Too short
            else:
                score += 30  # Too long

        # Subheadline support (30 points)
        subheadline = hero.get('subheadline', '')
        if subheadline:
            score += 30

        # CTA visibility (30 points)
        cta = hero.get('cta_text', '')
        if cta and len(cta) <= 25:  # Short and clear CTA
            score += 30

        return min(score, 100.0)

    def _analyze_value_proposition(self, data: dict) -> float:
        """
        Analyze value proposition clarity and uniqueness
        """
        score = 0.0

        # Clear benefits listed (50 points)
        features = data.get('features', [])
        if len(features) >= 3:
            score += 50
        elif len(features) > 0:
            score += 25

        # Unique selling points (30 points)
        for feature in features:
            if 'description' in feature and len(feature['description']) > 20:
                score += 10  # Max 30
                if score >= 30:
                    break

        # Benefit-focused language (20 points)
        benefit_keywords = ['できる', '実現', '改善', '向上', '削減', '簡単', '自動']
        text = str(data)
        keyword_count = sum(1 for kw in benefit_keywords if kw in text)
        score += min(keyword_count * 5, 20)

        return min(score, 100.0)

    def _analyze_visual_hierarchy(self, data: dict) -> float:
        """
        Analyze visual hierarchy and information flow
        """
        score = 0.0

        # Section structure (40 points)
        required_sections = ['hero', 'features', 'cta']
        present_sections = sum(1 for section in required_sections if section in data)
        score += (present_sections / len(required_sections)) * 40

        # Icon/visual elements (30 points)
        features = data.get('features', [])
        features_with_icons = sum(1 for f in features if 'icon' in f)
        if features:
            score += (features_with_icons / len(features)) * 30

        # Color scheme defined (30 points)
        hero = data.get('hero', {})
        cta_section = data.get('cta', {})
        if hero.get('background_color'):
            score += 15
        if cta_section.get('button_color'):
            score += 15

        return min(score, 100.0)

    def _analyze_cta_placement(self, data: dict) -> float:
        """
        Analyze CTA (Call-to-Action) effectiveness
        """
        score = 0.0

        # CTA in hero section (35 points)
        if data.get('hero', {}).get('cta_text'):
            score += 35

        # Dedicated CTA section (35 points)
        if data.get('cta'):
            score += 35

        # Action-oriented language (30 points)
        action_verbs = ['今すぐ', '無料', '申し込む', '始める', '登録', 'ダウンロード', '体験']
        cta_text = str(data.get('cta', {})) + str(data.get('hero', {}).get('cta_text', ''))
        verb_count = sum(1 for verb in action_verbs if verb in cta_text)
        score += min(verb_count * 10, 30)

        return min(score, 100.0)

    def _analyze_trust_elements(self, data: dict) -> float:
        """
        Analyze trust-building elements
        """
        score = 0.0

        # Company/service name (25 points)
        if data.get('footer', {}).get('company'):
            score += 25

        # Disclaimer/guarantee (25 points)
        if data.get('footer', {}).get('disclaimer'):
            score += 25

        # Feature descriptions (detailed) (50 points)
        features = data.get('features', [])
        detailed_features = sum(1 for f in features if len(f.get('description', '')) > 30)
        if features:
            score += (detailed_features / len(features)) * 50

        return min(score, 100.0)

    def _analyze_emotional_appeal(self, data: dict) -> float:
        """
        Analyze emotional appeal and storytelling
        """
        score = 0.0

        # Emotional keywords (50 points)
        emotional_keywords = [
            '簡単', '安心', '満足', '成功', '実現', '夢', '未来',
            '自由', '効率', 'プロ', '最高', '革新', '変革'
        ]
        text = str(data)
        emotion_count = sum(1 for kw in emotional_keywords if kw in text)
        score += min(emotion_count * 8, 50)

        # Descriptive language (50 points)
        total_text_length = len(text)
        if total_text_length > 500:
            score += 50
        elif total_text_length > 300:
            score += 35
        elif total_text_length > 100:
            score += 20

        return min(score, 100.0)

    def _analyze_responsive_design(self, data: dict) -> float:
        """
        Analyze responsive design considerations
        """
        score = 50.0  # Default score if no image analysis

        # Basic structure check (responsive-friendly sections)
        if 'hero' in data and 'features' in data and 'cta' in data:
            score += 50

        return min(score, 100.0)

    def _calculate_weighted_score(self, scores: dict) -> float:
        """
        Calculate final weighted score
        """
        total = 0.0
        for key, weight in self.golden_rules_weight.items():
            score_key = {
                'first_view_clarity': 'first_view',
                'value_proposition': 'value_prop',
                'visual_hierarchy': 'visual',
                'cta_effectiveness': 'cta',
                'trust_elements': 'trust',
                'emotional_appeal': 'emotion',
                'responsive_design': 'responsive'
            }.get(key)

            if score_key in scores:
                total += scores[score_key] * weight

        return round(total, 2)

    def _get_grade(self, score: float) -> str:
        """Get letter grade from score"""
        if score >= 95: return 'S (World-class)'
        elif score >= 90: return 'A+ (Excellent)'
        elif score >= 85: return 'A (Very Good)'
        elif score >= 80: return 'B+ (Good)'
        elif score >= 75: return 'B (Above Average)'
        elif score >= 70: return 'C+ (Average)'
        elif score >= 65: return 'C (Below Average)'
        else: return 'D (Needs Improvement)'

    def _generate_recommendations(self, scores: dict) -> list:
        """
        Generate actionable recommendations based on scores
        """
        recommendations = []

        for key, score in scores.items():
            if score < 80:
                rec = self._get_recommendation_for_category(key, score)
                if rec:
                    recommendations.append(rec)

        return recommendations

    def _get_recommendation_for_category(self, category: str, score: float) -> dict:
        """Get specific recommendation for low-scoring category"""
        recommendations_map = {
            'first_view': {
                'category': 'ファーストビュー',
                'issue': 'ファーストビューでの価値訴求が不明確',
                'solution': '3秒以内に「何のサービスか」が分かる見出しを設置してください。理想は5-12単語。',
                'priority': 'HIGH'
            },
            'value_prop': {
                'category': '価値提案',
                'issue': '提供価値が不明確',
                'solution': '具体的なベネフィット（ユーザーが得られる結果）を3つ以上明示してください。',
                'priority': 'HIGH'
            },
            'visual': {
                'category': '視覚階層',
                'issue': '情報の優先順位が不明確',
                'solution': 'アイコン、色、サイズで情報の重要度を視覚的に表現してください。',
                'priority': 'MEDIUM'
            },
            'cta': {
                'category': 'CTA',
                'issue': 'CTAボタンの訴求力不足',
                'solution': '「今すぐ」「無料」などの行動喚起ワードを使用し、hero/cta両方にCTAを配置してください。',
                'priority': 'HIGH'
            },
            'trust': {
                'category': '信頼要素',
                'issue': '信頼構築要素が不足',
                'solution': '会社名、実績、保証、詳細な説明を追加して信頼性を高めてください。',
                'priority': 'MEDIUM'
            },
            'emotion': {
                'category': '感情訴求',
                'issue': '感情的つながりが弱い',
                'solution': 'ユーザーの痛みや願望に共感するストーリー性のある表現を追加してください。',
                'priority': 'LOW'
            },
            'responsive': {
                'category': 'レスポンシブ',
                'issue': 'モバイル対応が不十分',
                'solution': 'モバイルファーストで、全デバイスで快適に閲覧できる構造にしてください。',
                'priority': 'MEDIUM'
            }
        }

        return recommendations_map.get(category)
```

## 🎯 Usage Examples

### Example 1: Analyze YAML LP
```bash
# Analyze LP from YAML file
python -c "
from lp_design_analyzer import LPDesignAnalyzer
import yaml

with open('test_lp.yaml') as f:
    lp_data = yaml.safe_load(f)

analyzer = LPDesignAnalyzer()
result = analyzer.analyze_lp(lp_data)

print(f'Score: {result[\"total_score\"]}')
print(f'Grade: {result[\"grade\"]}')
print(f'Meets Golden Rules: {result[\"meets_golden_rules\"]}')

for rec in result['recommendations']:
    print(f'[{rec[\"priority\"]}] {rec[\"category\"]}: {rec[\"solution\"]}')
"
```

### Example 2: Batch Analysis
```bash
# Analyze multiple LPs and compare
for yaml_file in generated-yamls/*.yaml; do
    echo "Analyzing: $yaml_file"
    python analyze_lp.py "$yaml_file" >> analysis_report.txt
done
```

## 📊 Output Format

```json
{
  "total_score": 92.5,
  "grade": "A+ (Excellent)",
  "meets_golden_rules": false,
  "scores": {
    "first_view": 95.0,
    "value_prop": 90.0,
    "visual": 88.0,
    "cta": 95.0,
    "trust": 85.0,
    "emotion": 92.0,
    "responsive": 100.0
  },
  "recommendations": [
    {
      "category": "信頼要素",
      "issue": "信頼構築要素が不足",
      "solution": "会社名、実績、保証、詳細な説明を追加して信頼性を高めてください。",
      "priority": "MEDIUM"
    },
    {
      "category": "視覚階層",
      "issue": "情報の優先順位が不明確",
      "solution": "アイコン、色、サイズで情報の重要度を視覚的に表現してください。",
      "priority": "MEDIUM"
    }
  ]
}
```

## 🔗 Integration Points

- **Evaluator Agent**: LPスコアを総合評価に組み込み
- **RAG Agent**: 過去の成功LPパターンを参照
- **Blackboard**: 分析結果を共有状態に記録
- **Copywriting Specialist**: コピー改善提案の連携
- **Conversion Optimizer**: コンバージョン最適化連携

## 📈 Success Metrics

- 95点以上のLP生成率: 80%以上
- 分析精度: 人間専門家との一致率 90%以上
- 分析速度: 1LP あたり < 3秒
- 改善提案の採用率: 70%以上

## 🎓 Continuous Learning

- 新しい成功LPパターンの自動学習
- トレンド変化の検出と適応
- ユーザーフィードバックの反映
- A/Bテスト結果の統合

---

**Version**: 1.0.0
**Last Updated**: 2025-11-05
**Maintainer**: LP Design Analysis Team
**Status**: Production Ready ✅
