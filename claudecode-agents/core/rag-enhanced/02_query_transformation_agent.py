#!/usr/bin/env python3
"""
クエリ変換エージェント (Query Transformation Agent)

複雑なクエリを最適化・分解し、検索精度を向上させる。

実装手法:
1. Query Decomposition - 複雑なクエリを単純なサブクエリに分解
2. Step-Back Prompting - 抽象的な原理から推論
3. RAG-Fusion - 複数のクエリバリエーションを生成

ArXiv研究ベース:
- Query Decomposition for Multi-Hop QA
- Step-Back Prompting (Google DeepMind)
- RAG-Fusion with Reciprocal Rank Fusion

Author: Claude Code 42-Agent System
Version: 1.0.0
"""

import json
import time
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from enum import Enum


class TransformationMethod(Enum):
    """クエリ変換手法"""
    DECOMPOSITION = "decomposition"
    STEP_BACK = "step_back"
    RAG_FUSION = "rag_fusion"
    EXPANSION = "expansion"


@dataclass
class TransformedQuery:
    """変換されたクエリ"""
    original_query: str
    method: TransformationMethod
    transformed_queries: List[str]
    metadata: Dict[str, Any]


class QueryTransformationAgent:
    """
    クエリ変換エージェント

    3つの主要手法:
    1. Query Decomposition - "AとBを比較" → ["Aとは?", "Bとは?", "AとBの違いは?"]
    2. Step-Back Prompting - "Xのバグ修正" → "Xの仕組みは?" → バグ修正
    3. RAG-Fusion - クエリの複数バリエーション生成 → 並列検索 → RRF統合
    """

    def __init__(self, config: Dict[str, Any]):
        self.config = config

    def transform(
        self,
        query: str,
        method: TransformationMethod
    ) -> TransformedQuery:
        """クエリを変換"""
        print(f"\n[Query Transformation] Method: {method.value}")
        print(f"  Original: {query}")

        if method == TransformationMethod.DECOMPOSITION:
            result = self.decompose_query(query)
        elif method == TransformationMethod.STEP_BACK:
            result = self.step_back_prompting(query)
        elif method == TransformationMethod.RAG_FUSION:
            result = self.rag_fusion(query)
        elif method == TransformationMethod.EXPANSION:
            result = self.expand_query(query)
        else:
            result = TransformedQuery(
                original_query=query,
                method=method,
                transformed_queries=[query],
                metadata={}
            )

        print(f"  Transformed: {len(result.transformed_queries)} queries")
        for i, q in enumerate(result.transformed_queries, 1):
            print(f"    {i}. {q}")

        return result

    def decompose_query(self, query: str) -> TransformedQuery:
        """
        Query Decomposition - クエリを単純なサブクエリに分解

        例:
        "PythonとJavaScriptのパフォーマンスを比較してください"
        → ["Pythonのパフォーマンス特性は?",
           "JavaScriptのパフォーマンス特性は?",
           "PythonとJavaScriptのパフォーマンスの違いは?"]
        """
        subqueries = []

        # パターンマッチング（簡易実装）
        query_lower = query.lower()

        # 比較クエリの検出
        if any(word in query_lower for word in ['compare', '比較', 'difference', '違い', 'vs']):
            # "AとB"を抽出
            entities = self._extract_entities(query)
            if len(entities) >= 2:
                for entity in entities:
                    subqueries.append(f"{entity}とは何ですか？")
                    subqueries.append(f"{entity}の特徴は？")
                subqueries.append(f"{entities[0]}と{entities[1]}の違いは？")

        # マルチホップクエリの検出
        elif any(word in query_lower for word in ['how', 'why', 'explain', 'どのように', 'なぜ', '説明']):
            # 前提知識 → 本質
            subqueries.append(f"{query}の前提となる概念は？")
            subqueries.append(query)
            subqueries.append(f"{query}の具体例は？")

        # デフォルト: クエリをそのまま使用
        if not subqueries:
            subqueries = [query]

        return TransformedQuery(
            original_query=query,
            method=TransformationMethod.DECOMPOSITION,
            transformed_queries=subqueries,
            metadata={'num_subqueries': len(subqueries)}
        )

    def step_back_prompting(self, query: str) -> TransformedQuery:
        """
        Step-Back Prompting - 抽象的な原理から推論

        Google DeepMindの手法。具体的な質問の前に、
        より抽象的・一般的な質問をすることで精度向上。

        例:
        "Pythonで文字列を反転する方法は？"
        → Step-back: "Pythonの文字列操作の基本は？"
        → 元のクエリ: "Pythonで文字列を反転する方法は？"
        """
        # Step-back クエリを生成
        step_back_query = self._generate_step_back_query(query)

        # Step-back → 元のクエリの順序
        transformed_queries = [step_back_query, query]

        return TransformedQuery(
            original_query=query,
            method=TransformationMethod.STEP_BACK,
            transformed_queries=transformed_queries,
            metadata={
                'step_back_query': step_back_query,
                'execution_order': 'step_back_first'
            }
        )

    def rag_fusion(self, query: str) -> TransformedQuery:
        """
        RAG-Fusion - 複数のクエリバリエーションを生成

        同じ意図の複数表現を生成し、並列検索 → RRF統合。
        検索精度が大幅に向上（+20-30%）。

        例:
        "Pythonの非同期処理"
        → ["Pythonの非同期処理とは",
           "Pythonでasync/awaitを使う方法",
           "Pythonの並行処理の仕組み"]
        """
        # クエリのバリエーションを生成（実際はLLMで生成）
        variations = self._generate_query_variations(query)

        return TransformedQuery(
            original_query=query,
            method=TransformationMethod.RAG_FUSION,
            transformed_queries=variations,
            metadata={
                'num_variations': len(variations),
                'fusion_method': 'reciprocal_rank_fusion'
            }
        )

    def expand_query(self, query: str) -> TransformedQuery:
        """
        Query Expansion - 同義語・関連語を追加

        クエリに同義語や関連キーワードを追加し、
        検索のカバレッジを向上。
        """
        # 同義語・関連語を追加（実際は辞書やLLMで）
        expanded = self._add_synonyms(query)

        return TransformedQuery(
            original_query=query,
            method=TransformationMethod.EXPANSION,
            transformed_queries=[expanded],
            metadata={'expansion_terms': []}
        )

    def _extract_entities(self, query: str) -> List[str]:
        """クエリからエンティティ（固有名詞等）を抽出"""
        # 簡易実装: 大文字始まりの単語を抽出
        import re
        words = re.findall(r'\b[A-Z][a-z]+\b', query)

        # 日本語の場合は「と」「や」で分割
        if not words and ('と' in query or 'や' in query):
            parts = re.split(r'[とや、]', query)
            words = [p.strip() for p in parts if p.strip()]

        return words[:2]  # 最大2つ

    def _generate_step_back_query(self, query: str) -> str:
        """Step-backクエリを生成"""
        query_lower = query.lower()

        # パターンマッチング
        if 'how to' in query_lower or 'どのように' in query_lower:
            # "how to X" → "What is X?"
            topic = query.replace('how to', '').replace('どのように', '').strip()
            return f"{topic}とは何ですか？"

        elif 'why' in query_lower or 'なぜ' in query_lower:
            # "why X" → "What is X?"
            topic = query.replace('why', '').replace('なぜ', '').strip()
            return f"{topic}の基本原理は？"

        elif 'error' in query_lower or 'bug' in query_lower or 'エラー' in query_lower:
            # "X error" → "How does X work?"
            topic = query.replace('error', '').replace('bug', '').replace('エラー', '').strip()
            return f"{topic}の仕組みは？"

        # デフォルト: より一般的な質問
        return f"{query}の基本概念は？"

    def _generate_query_variations(self, query: str) -> List[str]:
        """クエリのバリエーションを生成"""
        variations = [query]  # 元のクエリも含む

        # バリエーション1: "〜とは"
        variations.append(f"{query}とは")

        # バリエーション2: "〜の方法"
        if '?' not in query and '？' not in query:
            variations.append(f"{query}の方法")

        # バリエーション3: "〜の仕組み"
        variations.append(f"{query}の仕組み")

        # 実際の実装では、LLMで多様なバリエーションを生成:
        # prompt = f"Generate 3 different ways to ask: {query}"
        # variations = llm.complete(prompt)

        return variations[:4]  # 最大4つ

    def _add_synonyms(self, query: str) -> str:
        """同義語を追加"""
        # 簡易実装: 同義語辞書
        synonyms = {
            'fast': ['quick', 'rapid', 'speedy'],
            'error': ['bug', 'issue', 'problem'],
            'function': ['method', 'procedure', 'routine'],
        }

        expanded = query
        for word, syns in synonyms.items():
            if word in query.lower():
                expanded += f" OR {' OR '.join(syns)}"

        return expanded


def main():
    """テスト実行"""
    config = {}
    agent = QueryTransformationAgent(config)

    test_queries = [
        ("PythonとJavaScriptのパフォーマンスを比較してください", TransformationMethod.DECOMPOSITION),
        ("Pythonで文字列を反転する方法は？", TransformationMethod.STEP_BACK),
        ("Pythonの非同期処理", TransformationMethod.RAG_FUSION),
    ]

    for query, method in test_queries:
        print(f"\n{'='*80}")
        result = agent.transform(query, method)
        print(f"  Metadata: {json.dumps(result.metadata, ensure_ascii=False, indent=2)}")


if __name__ == "__main__":
    main()
