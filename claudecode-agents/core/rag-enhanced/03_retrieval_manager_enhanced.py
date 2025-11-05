#!/usr/bin/env python3
"""
リトリーバル・マネージャー・エージェント - 強化版 (Retrieval Manager Agent - Enhanced)

複数の検索エージェントを管理し、最適な検索戦略を適用

Author: Claude Code 42-Agent System
Version: 2.0.0
"""

import json
import time
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field
from enum import Enum


class SearchStrategy(Enum):
    """検索戦略"""
    HYBRID = "hybrid"
    SEMANTIC_ONLY = "semantic_only"
    KEYWORD_ONLY = "keyword_only"
    CODE_SEARCH = "code_search"
    MULTI_INDEX = "multi_index"


@dataclass
class RetrievalDocument:
    """検索されたドキュメント"""
    doc_id: str
    content: str
    score: float
    source: str  # どの検索エージェントから
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class RetrievalResult:
    """検索結果"""
    query: str
    documents: List[RetrievalDocument]
    strategy_used: SearchStrategy
    total_candidates: int
    reranked: bool = False
    metadata: Dict[str, Any] = field(default_factory=dict)


class RetrievalManagerAgent:
    """
    リトリーバル・マネージャー・エージェント

    ## 役割
    複数の検索エージェントを管理し、最適な検索戦略を適用

    ## 責任
    1. 検索戦略の選択
    2. 検索実行
    3. 結果の集約と正規化
    4. リランキングのトリガー
    """

    SYSTEM_PROMPT = """
あなたはRetrieval Manager Agentです。
複数の検索エージェント（ハイブリッド検索、クエリルーティングなど）を管理し、
変換されたクエリに対して最適な検索戦略を適用して、
最も関連性の高いコンテキストを取得します。

**責任:**
1. 検索戦略の選択（クエリの特性に基づく）
2. 選択された検索エージェントの呼び出し
3. 複数検索エージェントからの結果集約
4. リランキングエージェントへの結果受け渡し
"""

    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.search_agents: Dict[str, Any] = {}

    def register_search_agent(self, agent_name: str, agent_instance: Any):
        """検索エージェントを登録"""
        self.search_agents[agent_name] = agent_instance
        print(f"[Retrieval Manager] Registered: {agent_name}")

    def retrieve(self, queries: List[str], top_k: int = 10) -> Dict[str, Any]:
        """
        クエリリストから関連ドキュメントを検索

        Args:
            queries: 変換されたクエリのリスト
            top_k: 取得する上位ドキュメント数

        Returns:
            検索結果の辞書
        """
        print(f"\n{'='*80}")
        print(f"[Retrieval Manager] Retrieving documents")
        print(f"  Queries: {len(queries)}")
        print(f"  Top-K: {top_k}")
        print(f"{'='*80}\n")

        all_documents = []

        for i, query in enumerate(queries, 1):
            print(f"  [Query {i}/{len(queries)}] {query}")

            # 戦略選択
            strategy = self._select_strategy(query)
            print(f"    Strategy: {strategy.value}")

            # 検索実行
            docs = self._execute_search(query, strategy, top_k)
            all_documents.extend(docs)
            print(f"    Retrieved: {len(docs)} documents")

        # スコアで集約・正規化
        aggregated = self._aggregate_and_normalize(all_documents, top_k)

        # リランキング
        reranked = self._rerank(aggregated)

        result = {
            'documents': [
                {
                    'doc_id': doc.doc_id,
                    'content': doc.content,
                    'score': doc.score,
                    'source': doc.source,
                    'metadata': doc.metadata
                }
                for doc in reranked[:top_k]
            ],
            'total_candidates': len(all_documents),
            'final_count': len(reranked[:top_k]),
            'reranked': True
        }

        print(f"\n[Retrieval Complete]")
        print(f"  Total candidates: {len(all_documents)}")
        print(f"  Final documents: {len(reranked[:top_k])}")

        return result

    def _select_strategy(self, query: str) -> SearchStrategy:
        """クエリに基づいて検索戦略を選択"""
        query_lower = query.lower()

        # コード関連
        if any(kw in query_lower for kw in ['function', 'class', 'method', 'code', 'def ', 'import']):
            return SearchStrategy.CODE_SEARCH

        # キーワード重視
        if len(query.split()) <= 3:
            return SearchStrategy.KEYWORD_ONLY

        # デフォルト: ハイブリッド
        return SearchStrategy.HYBRID

    def _execute_search(self, query: str, strategy: SearchStrategy, top_k: int) -> List[RetrievalDocument]:
        """検索を実行"""
        # 実際の実装では、登録された検索エージェントを呼び出す
        # ここでは模擬データを返す

        mock_docs = []
        for i in range(min(top_k, 5)):
            mock_docs.append(RetrievalDocument(
                doc_id=f"doc_{i}_{int(time.time())}",
                content=f"Document {i} related to: {query}",
                score=1.0 - (i * 0.1),
                source=strategy.value,
                metadata={'query': query, 'rank': i}
            ))

        return mock_docs

    def _aggregate_and_normalize(self, documents: List[RetrievalDocument], top_k: int) -> List[RetrievalDocument]:
        """結果を集約・正規化"""
        # スコアで降順ソート
        sorted_docs = sorted(documents, key=lambda d: d.score, reverse=True)

        # 重複除去（doc_idベース）
        seen = set()
        unique_docs = []
        for doc in sorted_docs:
            if doc.doc_id not in seen:
                seen.add(doc.doc_id)
                unique_docs.append(doc)

        return unique_docs[:top_k * 2]  # リランキング用に多めに取得

    def _rerank(self, documents: List[RetrievalDocument]) -> List[RetrievalDocument]:
        """リランキング（Reranking Agentを呼び出す想定）"""
        # 実装ではReranking Agentに委譲
        # ここでは簡易実装
        return documents


def main():
    """テスト実行"""
    manager = RetrievalManagerAgent({})

    # テストクエリ
    queries = [
        "What is RAG?",
        "Vector database performance",
        "Python async function example"
    ]

    result = manager.retrieve(queries, top_k=5)

    print(f"\n{'#'*80}")
    print(f"[Final Result]")
    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
