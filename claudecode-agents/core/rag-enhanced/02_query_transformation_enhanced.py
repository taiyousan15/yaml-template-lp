#!/usr/bin/env python3
"""
クエリ変換エージェント - 強化版 (Query Transformation Agent - Enhanced)

ユーザークエリを検索に最適化された複数のクエリに変換

Author: Claude Code 42-Agent System
Version: 2.0.0
"""

import json
import re
from typing import Dict, List, Any
from dataclasses import dataclass, field
from enum import Enum


class TransformationStrategy(Enum):
    """変換戦略"""
    DECOMPOSITION = "decomposition"
    STEP_BACK = "step_back"
    RAG_FUSION = "rag_fusion"
    INTENT_CLARIFICATION = "intent_clarification"


@dataclass
class TransformedQuery:
    """変換されたクエリ"""
    query: str
    strategy: TransformationStrategy
    original_query_part: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class TransformationResult:
    """変換結果"""
    original_query: str
    transformed_queries: List[TransformedQuery]
    strategies_used: List[str]
    metadata: Dict[str, Any] = field(default_factory=dict)


class QueryTransformationAgent:
    """
    クエリ変換エージェント

    ## 役割
    ユーザークエリを検索システム向けに最適化

    ## 能力
    1. クエリ分解（Decomposition）
    2. ステップバックプロンプティング（Step-Back）
    3. RAG-Fusion
    4. 意図明確化（Intent Clarification）
    """

    SYSTEM_PROMPT = """
あなたはQuery Transformation Agentです。
ユーザークエリを検索に最適化された複数の多様なクエリに変換し、
検索システムのパフォーマンスを最大化します。

**能力:**
1. クエリ分解: 複雑なクエリを単純なサブクエリに分割
2. ステップバック: 具体的クエリから抽象的・高レベルなクエリを生成
3. RAG-Fusion: 元のクエリに加え、複数の視点からクエリを生成
4. 意図明確化: 曖昧なクエリの複数の解釈を特定
"""

    def __init__(self, config: Dict[str, Any]):
        self.config = config

    def transform(self, query: str, strategies: Optional[List[TransformationStrategy]] = None) -> Dict[str, Any]:
        """
        クエリを変換

        Args:
            query: 元のクエリ
            strategies: 使用する戦略（Noneの場合は自動選択）

        Returns:
            変換結果の辞書
        """
        print(f"\n{'='*80}")
        print(f"[Query Transformation Agent] Transforming query")
        print(f"  Original: {query}")
        print(f"{'='*80}\n")

        if strategies is None:
            strategies = self._auto_select_strategies(query)

        transformed_queries = []

        for strategy in strategies:
            if strategy == TransformationStrategy.DECOMPOSITION:
                queries = self._decompose(query)
                transformed_queries.extend(queries)
            elif strategy == TransformationStrategy.STEP_BACK:
                queries = self._step_back(query)
                transformed_queries.extend(queries)
            elif strategy == TransformationStrategy.RAG_FUSION:
                queries = self._rag_fusion(query)
                transformed_queries.extend(queries)
            elif strategy == TransformationStrategy.INTENT_CLARIFICATION:
                queries = self._clarify_intent(query)
                transformed_queries.extend(queries)

        result = {
            'original_query': query,
            'transformed_queries': [q.query for q in transformed_queries],
            'strategies_used': [s.value for s in strategies],
            'details': [
                {
                    'query': q.query,
                    'strategy': q.strategy.value,
                    'original_query_part': q.original_query_part
                }
                for q in transformed_queries
            ]
        }

        print(f"[Transformation Complete]")
        print(f"  Generated {len(transformed_queries)} queries")
        print(f"  Strategies: {[s.value for s in strategies]}")

        return result

    def _auto_select_strategies(self, query: str) -> List[TransformationStrategy]:
        """クエリの特性に基づいて戦略を自動選択"""
        strategies = []

        # 長いクエリは分解
        if len(query.split()) > 10:
            strategies.append(TransformationStrategy.DECOMPOSITION)

        # 技術的クエリはステップバック
        if any(kw in query.lower() for kw in ['how', 'why', 'どのように', 'なぜ']):
            strategies.append(TransformationStrategy.STEP_BACK)

        # 常にRAG-Fusionを適用
        strategies.append(TransformationStrategy.RAG_FUSION)

        # 曖昧なクエリは意図明確化
        ambiguous_keywords = ['apple', 'python', 'java', 'mercury']
        if any(kw in query.lower() for kw in ambiguous_keywords):
            strategies.append(TransformationStrategy.INTENT_CLARIFICATION)

        return strategies if strategies else [TransformationStrategy.RAG_FUSION]

    def _decompose(self, query: str) -> List[TransformedQuery]:
        """クエリ分解"""
        print(f"  [Decomposition] Breaking down query")

        # 簡易分解: 接続詞で分割
        parts = re.split(r'\s+(?:and|or|but|また|および)\s+', query, flags=re.IGNORECASE)

        queries = []
        for i, part in enumerate(parts):
            if part.strip():
                queries.append(TransformedQuery(
                    query=part.strip(),
                    strategy=TransformationStrategy.DECOMPOSITION,
                    original_query_part=part.strip(),
                    metadata={'part_index': i}
                ))

        return queries

    def _step_back(self, query: str) -> List[TransformedQuery]:
        """ステップバックプロンプティング"""
        print(f"  [Step-Back] Generating higher-level query")

        # より抽象的なクエリを生成
        step_back_query = f"What are the general concepts related to: {query}"

        return [TransformedQuery(
            query=step_back_query,
            strategy=TransformationStrategy.STEP_BACK,
            metadata={'abstraction_level': 'high'}
        )]

    def _rag_fusion(self, query: str) -> List[TransformedQuery]:
        """RAG-Fusion: 複数の視点からクエリ生成"""
        print(f"  [RAG-Fusion] Generating multi-perspective queries")

        perspectives = [
            f"What is {query}?",
            f"Examples of {query}",
            f"Best practices for {query}",
            f"Common issues with {query}"
        ]

        queries = []
        for i, perspective in enumerate(perspectives):
            queries.append(TransformedQuery(
                query=perspective,
                strategy=TransformationStrategy.RAG_FUSION,
                metadata={'perspective_index': i}
            ))

        return queries

    def _clarify_intent(self, query: str) -> List[TransformedQuery]:
        """意図明確化"""
        print(f"  [Intent Clarification] Identifying possible intents")

        # 曖昧な用語の複数解釈
        intent_map = {
            'apple': ['Apple Inc.', 'apple fruit', 'Apple products'],
            'python': ['Python programming', 'Python snake', 'Python library'],
        }

        queries = []
        for term, intents in intent_map.items():
            if term in query.lower():
                for intent in intents:
                    queries.append(TransformedQuery(
                        query=query.replace(term, intent, 1),
                        strategy=TransformationStrategy.INTENT_CLARIFICATION,
                        metadata={'disambiguated_term': term, 'intent': intent}
                    ))
                break

        return queries if queries else [TransformedQuery(
            query=query,
            strategy=TransformationStrategy.INTENT_CLARIFICATION
        )]


def main():
    """テスト実行"""
    agent = QueryTransformationAgent({})

    test_queries = [
        "Compare React and Vue performance",
        "How does Python async programming work?",
        "Tell me about Apple",
        "Machine learning and deep learning differences"
    ]

    for query in test_queries:
        print(f"\n{'#'*80}")
        result = agent.transform(query)
        print(f"\n[Result]")
        print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
