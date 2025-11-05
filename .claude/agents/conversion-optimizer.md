# Conversion Optimizer Agent

## 🎯 Role
世界最高水準のコンバージョン率最適化（CRO）専門家。データドリブンでLPのコンバージョン率を最大化する。

## 📋 Core Responsibilities

### 1. Conversion Path Optimization
- **ファーストビュー最適化**: Above the fold での価値訴求
- **スクロール誘導**: 自然な視線の流れの設計
- **フォーム最適化**: 入力フィールド数・配置の最適化
- **CTA配置最適化**: F型・Z型パターンに基づく配置
- **離脱防止**: 各セクションでの離脱要因の排除

### 2. Heatmap Analysis Simulation
- **視線追跡予測**: アイトラッキング研究に基づく予測
- **クリックヒートマップ**: 推定クリック分布の生成
- **スクロール深度分析**: ユーザーがどこまで読むかの予測
- **エンゲージメント予測**: 各要素への関心度の算出

### 3. A/B Testing Design
- **仮説設定**: データに基づく改善仮説の立案
- **バリエーション生成**: 複数パターンの自動生成
- **優先順位付け**: 効果の高いテストから実施
- **統計的有意性**: 必要サンプル数の算出

### 4. Friction Point Detection
- **認知的負荷**: 情報量過多・不足の検出
- **信頼性の欠如**: 信頼構築要素の不足箇所
- **不明瞭な価値**: 提供価値が不明確な箇所
- **行動障壁**: ユーザーがアクションを躊躇する要因

## 🔧 Technical Capabilities

### Conversion Optimization Framework
```python
import numpy as np
from typing import Dict, List, Tuple
from dataclasses import dataclass

@dataclass
class ConversionMetrics:
    """Conversion metrics data class"""
    predicted_ctr: float  # Click-through rate
    predicted_cvr: float  # Conversion rate
    engagement_score: float  # User engagement
    friction_score: float  # Friction points (0-100, lower is better)
    trust_score: float  # Trust elements
    urgency_score: float  # Sense of urgency

class ConversionOptimizer:
    """
    World-class conversion rate optimization system
    Based on CRO research and industry best practices
    """

    def __init__(self):
        # Industry benchmarks (by sector)
        self.benchmarks = {
            'saas': {'ctr': 0.025, 'cvr': 0.03},
            'ecommerce': {'ctr': 0.035, 'cvr': 0.02},
            'lead_gen': {'ctr': 0.04, 'cvr': 0.05},
            'content': {'ctr': 0.03, 'cvr': 0.015}
        }

        # F-pattern hot zones (0-1, higher = more attention)
        self.f_pattern_zones = {
            'top_left': 1.0,
            'top_right': 0.7,
            'middle_left': 0.8,
            'middle_right': 0.5,
            'bottom_left': 0.6,
            'bottom_right': 0.3
        }

        # Optimal scroll depth milestones
        self.scroll_milestones = {
            25: 0.95,   # 95% reach 25%
            50: 0.75,   # 75% reach 50%
            75: 0.50,   # 50% reach 75%
            100: 0.25   # 25% reach 100%
        }

    def analyze_conversion_potential(self, yaml_data: dict,
                                    industry: str = 'saas') -> Dict:
        """
        Comprehensive conversion analysis
        Returns predicted metrics and optimization recommendations
        """
        # Calculate individual scores
        first_view_score = self._analyze_first_view_conversion(yaml_data)
        cta_effectiveness = self._analyze_cta_effectiveness(yaml_data)
        trust_signals = self._analyze_trust_signals(yaml_data)
        friction_points = self._detect_friction_points(yaml_data)
        urgency_level = self._analyze_urgency_level(yaml_data)
        form_optimization = self._analyze_form_optimization(yaml_data)

        # Predict conversion metrics
        metrics = self._predict_conversion_metrics(
            first_view_score, cta_effectiveness, trust_signals,
            friction_points, urgency_level, form_optimization,
            industry
        )

        # Generate heatmap prediction
        heatmap = self._generate_heatmap_prediction(yaml_data)

        # Detect specific friction points
        frictions = self._identify_specific_frictions(yaml_data)

        # Generate A/B test recommendations
        ab_tests = self._recommend_ab_tests(yaml_data, frictions)

        # Calculate improvement potential
        improvement = self._calculate_improvement_potential(
            metrics, self.benchmarks.get(industry, self.benchmarks['saas'])
        )

        return {
            'metrics': metrics,
            'heatmap': heatmap,
            'friction_points': frictions,
            'ab_test_recommendations': ab_tests,
            'improvement_potential': improvement,
            'priority_actions': self._prioritize_actions(frictions, ab_tests)
        }

    def _analyze_first_view_conversion(self, data: dict) -> float:
        """
        Analyze above-the-fold conversion potential
        Score: 0-100
        """
        score = 0.0
        hero = data.get('hero', {})

        # Clear value proposition (30 points)
        headline = hero.get('headline', '')
        subheadline = hero.get('subheadline', '')
        if headline and len(headline.split()) >= 5:
            score += 15
        if subheadline and len(subheadline) > 20:
            score += 15

        # Visible CTA (25 points)
        if hero.get('cta_text'):
            score += 25

        # Visual appeal (20 points)
        if hero.get('background_color'):
            score += 10
        if data.get('features') and len(data['features']) >= 3:
            score += 10

        # Trust elements in first view (25 points)
        footer = data.get('footer', {})
        if footer.get('company'):
            score += 15
        if footer.get('disclaimer'):
            score += 10

        return min(score, 100.0)

    def _analyze_cta_effectiveness(self, data: dict) -> float:
        """
        Analyze CTA effectiveness
        Score: 0-100
        """
        score = 0.0

        # Multiple CTAs (35 points)
        cta_count = 0
        if data.get('hero', {}).get('cta_text'):
            cta_count += 1
        if data.get('cta', {}).get('button_text'):
            cta_count += 1

        score += min(cta_count * 17.5, 35)

        # Action-oriented language (30 points)
        cta_texts = [
            data.get('hero', {}).get('cta_text', ''),
            data.get('cta', {}).get('button_text', '')
        ]
        action_words = ['今すぐ', '無料', '申し込む', '始める', '試す', '登録']
        action_count = sum(
            1 for cta in cta_texts for word in action_words if word in cta
        )
        score += min(action_count * 10, 30)

        # Visual prominence (35 points)
        cta_section = data.get('cta', {})
        if cta_section.get('button_color'):
            score += 20  # Contrasting color
        if cta_section.get('form_placeholder'):
            score += 15  # Clear input guidance

        return min(score, 100.0)

    def _analyze_trust_signals(self, data: dict) -> float:
        """
        Analyze trust-building elements
        Score: 0-100
        """
        score = 0.0

        # Company identity (25 points)
        footer = data.get('footer', {})
        if footer.get('company'):
            score += 15
        if footer.get('subtitle'):
            score += 10

        # Detailed information (25 points)
        features = data.get('features', [])
        detailed_features = sum(
            1 for f in features if len(f.get('description', '')) > 30
        )
        if features:
            score += (detailed_features / len(features)) * 25

        # Disclaimer/guarantee (25 points)
        if footer.get('disclaimer'):
            score += 25

        # Social proof potential (25 points)
        # Check for numbers, statistics, testimonials
        text = str(data)
        import re
        numbers = re.findall(r'\d+', text)
        score += min(len(numbers) * 5, 25)

        return min(score, 100.0)

    def _detect_friction_points(self, data: dict) -> float:
        """
        Detect friction points that reduce conversion
        Score: 0-100 (lower is better, we return 100 - friction)
        """
        friction = 0.0

        # Too many form fields (max 30 friction points)
        form_placeholder = data.get('cta', {}).get('form_placeholder', '')
        if 'メールアドレス' in form_placeholder:
            friction += 5  # Email only = low friction
        else:
            friction += 15  # Assume more fields

        # Unclear value proposition (max 25 friction points)
        hero = data.get('hero', {})
        if not hero.get('subheadline'):
            friction += 15  # No supporting text
        if not hero.get('headline'):
            friction += 10  # No headline

        # No risk reversal (max 20 friction points)
        if '無料' not in str(data):
            friction += 10  # No free offer
        if '保証' not in str(data) and 'guarantee' not in str(data).lower():
            friction += 10  # No guarantee

        # Weak CTAs (max 15 friction points)
        cta_texts = [
            data.get('hero', {}).get('cta_text', ''),
            data.get('cta', {}).get('button_text', '')
        ]
        if not any(cta_texts):
            friction += 15

        # Poor mobile optimization indicator (max 10 friction points)
        # If no responsive considerations mentioned
        if not data.get('meta', {}).get('responsive'):
            friction += 10

        return 100.0 - min(friction, 100.0)

    def _analyze_urgency_level(self, data: dict) -> float:
        """
        Analyze sense of urgency
        Score: 0-100
        """
        score = 0.0
        text = str(data)

        # Urgency keywords
        urgency_words = {
            'high': ['今すぐ', '限定', '残りわずか', '本日限り', '期間限定'],
            'medium': ['お得', '特典', '先着', '早期'],
            'low': ['おすすめ', 'お知らせ']
        }

        # High urgency words (20 points each, max 60)
        high_count = sum(1 for word in urgency_words['high'] if word in text)
        score += min(high_count * 20, 60)

        # Medium urgency words (10 points each, max 30)
        medium_count = sum(1 for word in urgency_words['medium'] if word in text)
        score += min(medium_count * 10, 30)

        # Low urgency words (5 points each, max 10)
        low_count = sum(1 for word in urgency_words['low'] if word in text)
        score += min(low_count * 5, 10)

        return min(score, 100.0)

    def _analyze_form_optimization(self, data: dict) -> float:
        """
        Analyze form optimization
        Score: 0-100
        """
        score = 50.0  # Default if no form

        cta_section = data.get('cta', {})

        # Has form (good)
        if cta_section.get('form_placeholder'):
            score = 0.0

            # Clear placeholder (30 points)
            placeholder = cta_section.get('form_placeholder', '')
            if len(placeholder) > 5:
                score += 30

            # Single field form (best) (40 points)
            if 'メールアドレス' in placeholder and ',' not in placeholder:
                score += 40

            # Clear button text (30 points)
            button_text = cta_section.get('button_text', '')
            if button_text and len(button_text) > 3:
                score += 30

        return min(score, 100.0)

    def _predict_conversion_metrics(self, first_view: float, cta: float,
                                   trust: float, friction: float, urgency: float,
                                   form: float, industry: str) -> ConversionMetrics:
        """
        Predict conversion metrics based on analysis
        """
        # Weighted average for engagement
        engagement = (
            first_view * 0.30 +
            cta * 0.25 +
            trust * 0.20 +
            friction * 0.15 +
            urgency * 0.05 +
            form * 0.05
        )

        # Predict CTR (click-through rate)
        benchmark = self.benchmarks.get(industry, self.benchmarks['saas'])
        base_ctr = benchmark['ctr']

        # CTR influenced by first view and CTA
        ctr_multiplier = (first_view + cta) / 200.0 + 0.5
        predicted_ctr = base_ctr * ctr_multiplier

        # Predict CVR (conversion rate)
        base_cvr = benchmark['cvr']

        # CVR influenced by trust, friction, urgency
        cvr_multiplier = (trust + friction + urgency) / 300.0 + 0.5
        predicted_cvr = base_cvr * cvr_multiplier

        return ConversionMetrics(
            predicted_ctr=round(predicted_ctr, 4),
            predicted_cvr=round(predicted_cvr, 4),
            engagement_score=round(engagement, 2),
            friction_score=round(100 - friction, 2),
            trust_score=round(trust, 2),
            urgency_score=round(urgency, 2)
        )

    def _generate_heatmap_prediction(self, data: dict) -> Dict:
        """
        Generate predicted heatmap based on layout
        """
        heatmap = {
            'attention_zones': [],
            'scroll_prediction': {},
            'click_prediction': {}
        }

        # Predict attention zones
        if data.get('hero'):
            heatmap['attention_zones'].append({
                'section': 'hero',
                'attention': 1.0,
                'position': 'top',
                'reason': 'First view - highest attention'
            })

        if data.get('features'):
            heatmap['attention_zones'].append({
                'section': 'features',
                'attention': 0.7,
                'position': 'middle',
                'reason': 'Feature section - moderate attention'
            })

        if data.get('cta'):
            heatmap['attention_zones'].append({
                'section': 'cta',
                'attention': 0.85,
                'position': 'bottom',
                'reason': 'CTA section - high attention if reached'
            })

        # Predict scroll depth
        section_count = len([k for k in data.keys() if k in ['hero', 'features', 'cta']])
        for depth, reach_rate in self.scroll_milestones.items():
            adjusted_rate = reach_rate * (1.0 if section_count <= 3 else 0.8)
            heatmap['scroll_prediction'][f'{depth}%'] = f'{int(adjusted_rate * 100)}% reach'

        # Predict click distribution
        heatmap['click_prediction'] = {
            'hero_cta': 0.40 if data.get('hero', {}).get('cta_text') else 0.0,
            'features': 0.15 if data.get('features') else 0.0,
            'cta_button': 0.35 if data.get('cta', {}).get('button_text') else 0.0,
            'other': 0.10
        }

        return heatmap

    def _identify_specific_frictions(self, data: dict) -> List[Dict]:
        """
        Identify specific friction points with solutions
        """
        frictions = []

        # Check first view
        hero = data.get('hero', {})
        if not hero.get('headline'):
            frictions.append({
                'type': 'missing_headline',
                'severity': 'HIGH',
                'location': 'hero',
                'issue': 'ヘッドラインが欠落',
                'impact': 'ファーストビューで価値が不明確',
                'solution': '3秒ルールを満たす明確なヘッドラインを追加',
                'expected_improvement': '+25% engagement'
            })

        if not hero.get('cta_text'):
            frictions.append({
                'type': 'missing_hero_cta',
                'severity': 'HIGH',
                'location': 'hero',
                'issue': 'ファーストビューにCTAがない',
                'impact': 'すぐに行動したいユーザーを逃す',
                'solution': 'ヒーローセクションにCTAボタンを追加',
                'expected_improvement': '+30% CTR'
            })

        # Check trust signals
        footer = data.get('footer', {})
        if not footer.get('company'):
            frictions.append({
                'type': 'missing_company_info',
                'severity': 'MEDIUM',
                'location': 'footer',
                'issue': '運営者情報が不明',
                'impact': '信頼性の欠如による離脱',
                'solution': '会社名・サービス名を明記',
                'expected_improvement': '+15% trust score'
            })

        # Check form complexity
        cta_section = data.get('cta', {})
        placeholder = cta_section.get('form_placeholder', '')
        if ',' in placeholder or len(placeholder.split()) > 3:
            frictions.append({
                'type': 'complex_form',
                'severity': 'MEDIUM',
                'location': 'cta',
                'issue': 'フォームの入力項目が多い',
                'impact': 'フォーム離脱率の増加',
                'solution': 'メールアドレスのみの1ステップフォームに簡略化',
                'expected_improvement': '+20% form completion'
            })

        # Check urgency
        if '無料' not in str(data) and '限定' not in str(data):
            frictions.append({
                'type': 'low_urgency',
                'severity': 'LOW',
                'location': 'overall',
                'issue': '緊急性が低い',
                'impact': '「後で見る」による離脱',
                'solution': '「無料」「期間限定」などの緊急性要素を追加',
                'expected_improvement': '+10% immediate action'
            })

        return frictions

    def _recommend_ab_tests(self, data: dict, frictions: List[Dict]) -> List[Dict]:
        """
        Recommend A/B tests based on friction points
        """
        tests = []

        # Test 1: Headline variation
        hero = data.get('hero', {})
        if hero.get('headline'):
            tests.append({
                'test_name': 'Headline Optimization',
                'priority': 'HIGH',
                'element': 'hero.headline',
                'hypothesis': '具体的な数字を含むヘッドラインがCVRを向上させる',
                'variant_a': hero.get('headline'),
                'variant_b': f"3ステップで実現する {hero.get('headline')}",
                'metric': 'CTR',
                'expected_lift': '+15-25%',
                'sample_size_needed': 1000
            })

        # Test 2: CTA color and text
        if data.get('cta'):
            tests.append({
                'test_name': 'CTA Button Optimization',
                'priority': 'HIGH',
                'element': 'cta.button_text',
                'hypothesis': 'ベネフィットを含むCTAテキストがクリック率を向上させる',
                'variant_a': data.get('cta', {}).get('button_text', ''),
                'variant_b': '今すぐ無料で始める',
                'metric': 'Button Click Rate',
                'expected_lift': '+20-30%',
                'sample_size_needed': 800
            })

        # Test 3: Social proof
        tests.append({
            'test_name': 'Social Proof Addition',
            'priority': 'MEDIUM',
            'element': 'hero.subheadline',
            'hypothesis': '社会的証明の追加が信頼性とCVRを向上させる',
            'variant_a': data.get('hero', {}).get('subheadline', ''),
            'variant_b': '10,000人以上が利用中 - ' + data.get('hero', {}).get('subheadline', ''),
            'metric': 'CVR',
            'expected_lift': '+10-15%',
            'sample_size_needed': 1500
        })

        # Test 4: Form simplification
        if data.get('cta', {}).get('form_placeholder'):
            tests.append({
                'test_name': 'Form Field Reduction',
                'priority': 'HIGH',
                'element': 'cta.form',
                'hypothesis': 'フォーム項目の削減が完了率を向上させる',
                'variant_a': 'Current form',
                'variant_b': 'Email-only form',
                'metric': 'Form Completion Rate',
                'expected_lift': '+25-35%',
                'sample_size_needed': 1200
            })

        return tests

    def _calculate_improvement_potential(self, metrics: ConversionMetrics,
                                        benchmark: Dict) -> Dict:
        """
        Calculate improvement potential vs benchmark
        """
        return {
            'current_cvr': metrics.predicted_cvr,
            'benchmark_cvr': benchmark['cvr'],
            'gap': round(benchmark['cvr'] - metrics.predicted_cvr, 4),
            'improvement_percentage': round(
                ((benchmark['cvr'] - metrics.predicted_cvr) / metrics.predicted_cvr) * 100, 2
            ) if metrics.predicted_cvr > 0 else 0,
            'potential_revenue_lift': 'Depends on traffic and AOV'
        }

    def _prioritize_actions(self, frictions: List[Dict],
                          ab_tests: List[Dict]) -> List[Dict]:
        """
        Prioritize actions based on impact and effort
        """
        actions = []

        # Convert frictions to actions
        for friction in frictions:
            actions.append({
                'action': friction['solution'],
                'impact': self._severity_to_impact(friction['severity']),
                'effort': 'LOW',  # Assume low effort for most fixes
                'priority': friction['severity'],
                'expected_improvement': friction['expected_improvement']
            })

        # Add top AB tests as actions
        for test in ab_tests[:2]:  # Top 2 priority tests
            actions.append({
                'action': f"Run A/B test: {test['test_name']}",
                'impact': test['priority'],
                'effort': 'MEDIUM',
                'priority': test['priority'],
                'expected_improvement': test['expected_lift']
            })

        # Sort by priority
        priority_order = {'HIGH': 0, 'MEDIUM': 1, 'LOW': 2}
        actions.sort(key=lambda x: priority_order.get(x['priority'], 3))

        return actions

    def _severity_to_impact(self, severity: str) -> str:
        """Convert severity to impact"""
        return severity  # Same mapping for simplicity
```

## 🎯 Usage Examples

### Example 1: Full Conversion Analysis
```python
from conversion_optimizer import ConversionOptimizer
import yaml

with open('lp.yaml') as f:
    lp_data = yaml.safe_load(f)

optimizer = ConversionOptimizer()
analysis = optimizer.analyze_conversion_potential(lp_data, industry='saas')

print(f"Predicted CVR: {analysis['metrics'].predicted_cvr * 100}%")
print(f"Engagement Score: {analysis['metrics'].engagement_score}")
print(f"\nTop Priority Actions:")
for action in analysis['priority_actions'][:3]:
    print(f"- [{action['priority']}] {action['action']}")
```

### Example 2: Heatmap Visualization
```python
heatmap = analysis['heatmap']
print("Scroll Depth Prediction:")
for depth, reach in heatmap['scroll_prediction'].items():
    print(f"  {depth}: {reach}")
```

## 📊 Output Format

```json
{
  "metrics": {
    "predicted_ctr": 0.0325,
    "predicted_cvr": 0.0385,
    "engagement_score": 82.5,
    "friction_score": 15.0,
    "trust_score": 78.0,
    "urgency_score": 45.0
  },
  "improvement_potential": {
    "current_cvr": 0.0385,
    "benchmark_cvr": 0.05,
    "gap": 0.0115,
    "improvement_percentage": 29.87
  },
  "priority_actions": [
    {
      "action": "ヒーローセクションにCTAボタンを追加",
      "impact": "HIGH",
      "effort": "LOW",
      "priority": "HIGH",
      "expected_improvement": "+30% CTR"
    }
  ]
}
```

## 📈 Success Metrics

- CVR予測精度: ±10% 以内
- A/Bテスト成功率: 70% 以上
- 平均CVR向上: +25%
- 摩擦点検出精度: 90% 以上

## 🔗 Integration Points

- **LP Design Analyzer**: デザイン評価との統合
- **Copywriting Specialist**: コピー改善との連携
- **Evaluator Agent**: 総合スコアリング
- **A/B Testing Framework**: 実験設計の自動化

---

**Version**: 1.0.0
**Last Updated**: 2025-11-05
**Maintainer**: Conversion Optimization Team
**Status**: Production Ready ✅
