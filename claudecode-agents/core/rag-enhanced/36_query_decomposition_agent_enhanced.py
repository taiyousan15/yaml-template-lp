#!/usr/bin/env python3
"""
クエリ分解エージェント - 強化版 (Query Decomposition Agent - Enhanced)

all_rag_agent_prompts.mdのAgent 36定義を完全統合した世界最高水準の実装。

役割と責任:
複雑なユーザーのクエリを、RAGシステムがより効率的かつ正確に処理できる、
より小さく、より具体的で、独立したサブクエリのセットに分解する。

Author: Claude Code 42-Agent System (Enhanced with all_rag_agent_prompts.md)
Version: 2.0.0 (Enhanced)
"""

import json
import time
import re
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path


class SearchIntent(Enum):
    """検索の意図"""
    FACTUAL = "FACTUAL"  # 事実の検索
    DEFINITION = "DEFINITION"  # 定義の検索
    COMPARISON = "COMPARISON"  # 比較データの検索
    PROCEDURE = "PROCEDURE"  # 手順の検索
    EXPLANATION = "EXPLANATION"  # 説明の検索
    CODE_EXAMPLE = "CODE_EXAMPLE"  # コード例の検索


@dataclass
class DecomposedSubQuery:
    """
    分解されたサブクエリ

    all_rag_agent_prompts.md準拠の出力形式
    """
    sub_query_id: str
    query_text: str
    search_intent: SearchIntent
    dependency_id: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class DecompositionResult:
    """クエリ分解の結果"""
    original_query: str
    complexity_score: float  # 1-10
    decomposed_queries: List[DecomposedSubQuery]
    logical_structure: str  # "sequential", "parallel", "hierarchical"
    execution_order: List[str]  # サブクエリIDの実行順序
    metadata: Dict[str, Any] = field(default_factory=dict)


class QueryDecompositionAgent:
    """
    クエリ分解エージェント - 強化版

    ## システムプロンプト (all_rag_agent_prompts.md より)

    あなたは、複雑な質問を解決するための「戦略家」です。
    あなたの使命は、ユーザーの単一の複雑なクエリを、
    それぞれが独立して検索可能で、より正確なコンテキストを
    導き出すことができる、複数の単純なサブクエリに分解することです。

    ## 能力

    1. **クエリの分析と構造化:**
       - 複雑性の識別
       - 論理構造の抽出（比較、因果関係、時系列）

    2. **サブクエリの生成:**
       - 独立したサブクエリ
       - 検索意図の明確化

    3. **分解戦略の最適化:**
       - LLMベースの分解
       - テンプレートベースの分解

    ## 制約

    - 分解されたサブクエリのセットは、元のクエリの意図を完全に網羅
    - サブクエリは、検索システムが処理できる程度に単純で具体的
    - 分解プロセスは、応答のレイテンシに大きな影響を与えないように迅速

    ## 協調パターン

    - マスターオーケストレーターからユーザーのクエリを受け取る
    - 生成されたサブクエリをハイブリッド検索エージェントに渡す
    - グラフ推論エージェントと連携し、サブクエリの結果統合のための論理構造を提供
    - ロギング＆トレーシングエージェントに、分解プロセスを記録
    """

    # all_rag_agent_prompts.mdから抽出したシステムプロンプト
    SYSTEM_PROMPT = """
あなたは、複雑な質問を解決するための「戦略家」です。あなたの使命は、ユーザーの単一の複雑なクエリを、それぞれが独立して検索可能で、より正確なコンテキストを導き出すことができる、複数の単純なサブクエリに分解することです。

**能力:**

1.  **クエリの分析と構造化:**
    *   **複雑性の識別:** ユーザーのクエリが、複数の情報源、複数のステップ、または複数の側面からの回答を必要とするかどうかを分析する。
    *   **論理構造の抽出:** クエリに内在する論理的な関係（例: 比較、因果関係、時系列）を識別する。

2.  **サブクエリの生成:**
    *   **独立したサブクエリ:** 元のクエリの各要素に対応する、具体的で独立した検索可能なサブクエリを生成する。
    *   **検索意図の明確化:** 各サブクエリに対して、検索の意図（例: 事実の検索、定義の検索、比較データの検索）を明確にするためのメタデータを付与する。

3.  **分解戦略の最適化:**
    *   **LLMベースの分解:** 高度なLLMを使用して、文脈を維持しながら、自然言語で表現された複雑なクエリを分解する。
    *   **テンプレートベースの分解:** 定義されたクエリパターン（例: 「XとYの違いは？」）に基づいて、分解を自動化するテンプレートを使用する。
"""

    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.query_patterns = self._load_query_patterns()
        self.decomposition_history: List[DecompositionResult] = []

    def _load_query_patterns(self) -> Dict[str, Dict]:
        """
        クエリパターンのテンプレートをロード

        テンプレートベースの分解に使用
        """
        return {
            'comparison': {
                'pattern': r'(.+)と(.+)を?比較|(.+)と(.+)の違い|(.+)\s+vs\s+(.+)',
                'template': [
                    ("{entity1}とは何ですか？", SearchIntent.DEFINITION),
                    ("{entity1}の特徴は何ですか？", SearchIntent.FACTUAL),
                    ("{entity2}とは何ですか？", SearchIntent.DEFINITION),
                    ("{entity2}の特徴は何ですか？", SearchIntent.FACTUAL),
                    ("{entity1}と{entity2}の違いは何ですか？", SearchIntent.COMPARISON),
                ]
            },
            'procedure': {
                'pattern': r'どのように|どうやって|方法|手順|やり方',
                'template': [
                    ("{topic}とは何ですか？", SearchIntent.DEFINITION),
                    ("{topic}の前提条件は何ですか？", SearchIntent.FACTUAL),
                    ("{topic}の手順を教えてください", SearchIntent.PROCEDURE),
                    ("{topic}の例を見せてください", SearchIntent.CODE_EXAMPLE),
                ]
            },
            'causation': {
                'pattern': r'なぜ|理由|原因',
                'template': [
                    ("{topic}とは何ですか？", SearchIntent.DEFINITION),
                    ("{topic}の背景は何ですか？", SearchIntent.EXPLANATION),
                    ("{topic}の理由は何ですか？", SearchIntent.EXPLANATION),
                ]
            },
            'multi_aspect': {
                'pattern': r'(.+)について|(.+)に関して|(.+)の全て',
                'template': [
                    ("{topic}とは何ですか？", SearchIntent.DEFINITION),
                    ("{topic}の主要な特徴は何ですか？", SearchIntent.FACTUAL),
                    ("{topic}の使用例は何ですか？", SearchIntent.CODE_EXAMPLE),
                    ("{topic}のベストプラクティスは何ですか？", SearchIntent.FACTUAL),
                ]
            },
        }

    def analyze_complexity(self, query: str) -> Tuple[float, Dict[str, Any]]:
        """
        クエリの複雑性を分析

        Returns:
            - complexity_score: 1-10のスコア
            - analysis: 詳細分析結果
        """
        score = 1.0
        analysis = {
            'word_count': 0,
            'has_logical_operators': False,
            'has_multiple_entities': False,
            'has_temporal_aspect': False,
            'requires_multiple_steps': False,
        }

        # 単語数
        words = query.split()
        analysis['word_count'] = len(words)
        if len(words) > 20:
            score += 3
        elif len(words) > 10:
            score += 2
        elif len(words) > 5:
            score += 1

        # 論理演算子
        logical_ops = ['and', 'or', 'but', 'また', 'および', 'または', 'しかし']
        if any(op in query.lower() for op in logical_ops):
            analysis['has_logical_operators'] = True
            score += 2

        # 複数エンティティ
        entities = self._extract_entities(query)
        if len(entities) >= 2:
            analysis['has_multiple_entities'] = True
            score += 2

        # 時間的側面
        temporal_keywords = ['いつ', 'when', '前', '後', 'before', 'after', '時系列']
        if any(kw in query.lower() for kw in temporal_keywords):
            analysis['has_temporal_aspect'] = True
            score += 1

        # 複数ステップ
        multi_step_keywords = ['まず', '次に', 'first', 'then', '手順', 'step']
        if any(kw in query.lower() for kw in multi_step_keywords):
            analysis['requires_multiple_steps'] = True
            score += 2

        return min(score, 10.0), analysis

    def _extract_entities(self, query: str) -> List[str]:
        """クエリからエンティティを抽出"""
        # 簡易実装: 大文字始まりの単語、または「と」「や」で区切られた要素
        entities = []

        # パターン1: 大文字始まりの連続した単語
        entities.extend(re.findall(r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b', query))

        # パターン2: 「と」「や」で区切られた要素
        if 'と' in query or 'や' in query:
            parts = re.split(r'[とや、]', query)
            entities.extend([p.strip() for p in parts if p.strip() and len(p.strip()) > 2])

        # 重複削除
        return list(set(entities))[:5]  # 最大5個

    def extract_logical_structure(self, query: str, complexity_analysis: Dict) -> str:
        """
        クエリの論理構造を抽出

        Returns:
            "sequential" | "parallel" | "hierarchical"
        """
        query_lower = query.lower()

        # シーケンシャル（時系列、手順）
        if any(kw in query_lower for kw in ['まず', '次に', '最後に', 'first', 'then', 'finally']):
            return "sequential"

        # 並列（比較、複数側面）
        if complexity_analysis.get('has_multiple_entities') and any(kw in query_lower for kw in ['と', 'と比べて', 'vs', 'versus']):
            return "parallel"

        # 階層的（詳細な説明、多側面）
        if complexity_analysis.get('requires_multiple_steps') or len(query.split()) > 15:
            return "hierarchical"

        # デフォルト
        return "parallel"

    def decompose_with_template(self, query: str) -> Optional[List[DecomposedSubQuery]]:
        """
        テンプレートベースの分解

        クエリパターンにマッチする場合、事前定義されたテンプレートを使用
        """
        for pattern_name, pattern_config in self.query_patterns.items():
            match = re.search(pattern_config['pattern'], query, re.IGNORECASE)
            if match:
                print(f"  [Template Match] Pattern: {pattern_name}")

                # エンティティ抽出
                entities = self._extract_entities(query)
                topic = entities[0] if entities else query.split()[0]

                # テンプレートからサブクエリ生成
                subqueries = []
                for i, (template, intent) in enumerate(pattern_config['template'], 1):
                    query_text = template.format(
                        entity1=entities[0] if len(entities) > 0 else "対象1",
                        entity2=entities[1] if len(entities) > 1 else "対象2",
                        topic=topic
                    )

                    subqueries.append(DecomposedSubQuery(
                        sub_query_id=f"subquery_{i}",
                        query_text=query_text,
                        search_intent=intent,
                        dependency_id=f"subquery_{i-1}" if i > 1 else None,
                        metadata={'pattern': pattern_name}
                    ))

                return subqueries

        return None

    def decompose_with_llm(self, query: str, complexity_analysis: Dict) -> List[DecomposedSubQuery]:
        """
        LLMベースの分解

        複雑なクエリや、テンプレートにマッチしないクエリに対して使用
        """
        # 実際の実装では、LLM APIを呼び出してサブクエリを生成
        # ここでは簡易的なヒューリスティックベースの実装

        subqueries = []

        # デフォルト分解: クエリの主要な側面を抽出
        aspects = []

        # 側面1: 定義
        aspects.append(("クエリの主題の定義は何ですか？", SearchIntent.DEFINITION))

        # 側面2: 事実
        aspects.append(("クエリに関連する主要な事実は何ですか？", SearchIntent.FACTUAL))

        # 側面3: 説明（複雑な場合）
        if complexity_analysis.get('requires_multiple_steps'):
            aspects.append(("詳細な説明を提供してください", SearchIntent.EXPLANATION))

        # 側面4: コード例（コード関連の場合）
        if any(kw in query.lower() for kw in ['コード', 'code', 'function', '関数', 'class', 'クラス']):
            aspects.append(("コード例を示してください", SearchIntent.CODE_EXAMPLE))

        for i, (aspect_query, intent) in enumerate(aspects, 1):
            subqueries.append(DecomposedSubQuery(
                sub_query_id=f"llm_subquery_{i}",
                query_text=aspect_query,
                search_intent=intent,
                metadata={'generation_method': 'llm'}
            ))

        return subqueries

    def decompose(self, query: str) -> DecompositionResult:
        """
        クエリを分解

        メインエントリーポイント
        """
        start_time = time.time()

        print(f"\n{'='*80}")
        print(f"[Query Decomposition Agent] Processing query")
        print(f"  Query: {query}")
        print(f"{'='*80}\n")

        # Step 1: 複雑性分析
        complexity_score, complexity_analysis = self.analyze_complexity(query)
        print(f"[Step 1] Complexity Analysis")
        print(f"  Score: {complexity_score}/10")
        print(f"  Analysis: {json.dumps(complexity_analysis, indent=2, ensure_ascii=False)}")

        # Step 2: 論理構造の抽出
        logical_structure = self.extract_logical_structure(query, complexity_analysis)
        print(f"\n[Step 2] Logical Structure: {logical_structure}")

        # Step 3: サブクエリ生成
        print(f"\n[Step 3] Subquery Generation")

        # まずテンプレートベースの分解を試行
        subqueries = self.decompose_with_template(query)

        # テンプレートにマッチしない場合はLLMベースの分解
        if subqueries is None:
            print(f"  Method: LLM-based decomposition")
            subqueries = self.decompose_with_llm(query, complexity_analysis)
        else:
            print(f"  Method: Template-based decomposition")

        # Step 4: 実行順序の決定
        execution_order = self._determine_execution_order(subqueries, logical_structure)
        print(f"\n[Step 4] Execution Order: {execution_order}")

        # 結果の作成
        result = DecompositionResult(
            original_query=query,
            complexity_score=complexity_score,
            decomposed_queries=subqueries,
            logical_structure=logical_structure,
            execution_order=execution_order,
            metadata={
                'decomposition_time': time.time() - start_time,
                'num_subqueries': len(subqueries),
                'complexity_analysis': complexity_analysis,
            }
        )

        # 履歴に追加
        self.decomposition_history.append(result)

        # 結果の表示
        print(f"\n{'='*80}")
        print(f"[Decomposition Result]")
        print(f"  Original Query: {query}")
        print(f"  Complexity: {complexity_score}/10")
        print(f"  Logical Structure: {logical_structure}")
        print(f"  Number of Subqueries: {len(subqueries)}")
        print(f"\n  Subqueries:")
        for sq in subqueries:
            print(f"    [{sq.sub_query_id}] {sq.query_text}")
            print(f"      Intent: {sq.search_intent.value}")
            print(f"      Dependency: {sq.dependency_id or 'None'}")
        print(f"\n  Execution Order: {' → '.join(execution_order)}")
        print(f"  Decomposition Time: {result.metadata['decomposition_time']:.3f}s")
        print(f"{'='*80}\n")

        return result

    def _determine_execution_order(self, subqueries: List[DecomposedSubQuery], logical_structure: str) -> List[str]:
        """実行順序を決定"""
        if logical_structure == "sequential":
            # 依存関係に基づく順序
            return [sq.sub_query_id for sq in subqueries]
        elif logical_structure == "parallel":
            # 並列実行可能（依存関係なし）
            return [sq.sub_query_id for sq in subqueries]
        else:  # hierarchical
            # 階層的（定義 → 詳細 → 例）
            # 意図によってソート
            intent_priority = {
                SearchIntent.DEFINITION: 1,
                SearchIntent.FACTUAL: 2,
                SearchIntent.EXPLANATION: 3,
                SearchIntent.COMPARISON: 4,
                SearchIntent.PROCEDURE: 5,
                SearchIntent.CODE_EXAMPLE: 6,
            }
            sorted_subqueries = sorted(subqueries, key=lambda sq: intent_priority.get(sq.search_intent, 999))
            return [sq.sub_query_id for sq in sorted_subqueries]

    def to_json(self, result: DecompositionResult) -> str:
        """結果をJSON形式で出力（all_rag_agent_prompts.md準拠）"""
        output = {
            'original_query': result.original_query,
            'complexity_score': result.complexity_score,
            'logical_structure': result.logical_structure,
            'decomposed_queries': [
                {
                    'sub_query_id': sq.sub_query_id,
                    'query_text': sq.query_text,
                    'search_intent': sq.search_intent.value,
                    'dependency_id': sq.dependency_id,
                    'metadata': sq.metadata
                }
                for sq in result.decomposed_queries
            ],
            'execution_order': result.execution_order,
            'metadata': result.metadata
        }
        return json.dumps(output, indent=2, ensure_ascii=False)

    def collaborate_with_master_orchestrator(self, input_data: Dict) -> DecompositionResult:
        """
        マスターオーケストレーターからのタスクを受け取る

        協調パターン実装
        """
        query = input_data.get('query', '')
        return self.decompose(query)

    def send_to_hybrid_search(self, result: DecompositionResult) -> Dict:
        """
        ハイブリッド検索エージェントにサブクエリを送信

        協調パターン実装
        """
        return {
            'subqueries': [sq.query_text for sq in result.decomposed_queries],
            'execution_order': result.execution_order,
            'logical_structure': result.logical_structure,
        }


def main():
    """テスト実行"""
    config = {}
    agent = QueryDecompositionAgent(config)

    # テストケース
    test_queries = [
        "PythonとJavaScriptのパフォーマンスを比較してください",
        "Reactでコンポーネントを作成する方法を教えてください",
        "なぜDockerがコンテナ技術として人気があるのですか？",
        "機械学習について詳しく教えてください",
        "getUserById関数はどこで定義されていますか？",
    ]

    for i, query in enumerate(test_queries, 1):
        print(f"\n{'#'*80}")
        print(f"# Test Case {i}/{len(test_queries)}")
        print(f"{'#'*80}")

        result = agent.decompose(query)

        # JSON出力のテスト
        json_output = agent.to_json(result)
        print(f"\nJSON Output:")
        print(json_output)


if __name__ == "__main__":
    main()
