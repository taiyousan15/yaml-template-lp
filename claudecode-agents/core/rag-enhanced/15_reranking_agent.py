#!/usr/bin/env python3
"""
リランキング・エージェント (Reranking Agent)

検索結果をより精密なモデルで再評価・再ランキング。

実装手法:
1. Cross-Encoder Reranking - クエリとドキュメントを同時にエンコード
2. LLM-based Reranking - GPT-4/Claude等で高度な評価
3. ColBERT - Late Interaction モデル

ArXiv研究ベース:
- Cross-Encoder vs Bi-Encoder
- LLM as a Reranker
- ColBERT: Efficient and Effective Passage Search

Author: Claude Code 42-Agent System
Version: 1.0.0
"""

import time
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from enum import Enum


class RerankingMethod(Enum):
    """リランキング手法"""
    CROSS_ENCODER = "cross_encoder"
    LLM_RERANKER = "llm_reranker"
    COLBERT = "colbert"
    COHERE_RERANK = "cohere_rerank"


@dataclass
class RankedResult:
    """ランク付けされた検索結果"""
    doc_id: str
    content: str
    original_rank: int
    original_score: float
    reranked_score: float
    reranked_rank: int
    metadata: Dict[str, Any]


class CrossEncoderReranker:
    """
    Cross-Encoder リランカー

    クエリとドキュメントを同時にエンコードし、
    より正確な関連性スコアを計算。

    Bi-Encoder（デンスベクトル検索）より精度が高いが、
    計算コストも高い。

    推奨モデル:
    - ms-marco-MiniLM-L-6-v2 (軽量)
    - ms-marco-TinyBERT-L-2-v2 (超軽量)
    - cross-encoder/ms-marco-electra-base (高精度)
    """

    def __init__(self, model_name: str = "ms-marco-MiniLM-L-6-v2"):
        self.model_name = model_name
        # 実際の実装では、sentence-transformersライブラリを使用
        # self.model = CrossEncoder(model_name)

    def rerank(
        self,
        query: str,
        documents: List[Dict[str, Any]],
        top_k: Optional[int] = None
    ) -> List[RankedResult]:
        """
        Cross-Encoderでリランキング

        Args:
            query: クエリ
            documents: 検索結果のリスト [{'doc_id', 'content', 'score', 'rank', ...}]
            top_k: 返す結果数（Noneの場合は全て）

        Returns:
            リランキングされた結果
        """
        print(f"[Cross-Encoder] Reranking {len(documents)} documents...")
        start_time = time.time()

        # クエリとドキュメントのペアを作成
        pairs = [(query, doc['content']) for doc in documents]

        # Cross-Encoderでスコア計算（実際の実装）
        # scores = self.model.predict(pairs)

        # ダミー実装: 簡易的なスコア計算
        scores = []
        for doc in documents:
            # キーワードマッチングベースのスコア
            score = self._simple_scoring(query, doc['content'])
            scores.append(score)

        # スコアでソート
        ranked_docs = sorted(
            zip(documents, scores),
            key=lambda x: x[1],
            reverse=True
        )

        # RankedResultオブジェクトを作成
        results = []
        for new_rank, (doc, score) in enumerate(ranked_docs, 1):
            result = RankedResult(
                doc_id=doc['doc_id'],
                content=doc['content'],
                original_rank=doc.get('rank', 0),
                original_score=doc.get('score', 0.0),
                reranked_score=score,
                reranked_rank=new_rank,
                metadata=doc.get('metadata', {})
            )
            results.append(result)

        # Top-Kのみ返す
        if top_k:
            results = results[:top_k]

        elapsed = time.time() - start_time
        print(f"[Cross-Encoder] Completed in {elapsed:.2f}s")

        return results

    def _simple_scoring(self, query: str, content: str) -> float:
        """簡易スコアリング（ダミー実装）"""
        query_tokens = set(query.lower().split())
        content_tokens = set(content.lower().split())

        # Jaccard similarity
        intersection = query_tokens & content_tokens
        union = query_tokens | content_tokens

        if not union:
            return 0.0

        return len(intersection) / len(union)


class LLMReranker:
    """
    LLMベース・リランカー

    GPT-4, Claude, Gemini等の大規模言語モデルを使用して
    検索結果をリランキング。

    特徴:
    - 最も高精度（人間レベル）
    - セマンティック理解が深い
    - コンテキストを考慮した判断
    - 計算コストが非常に高い（最終候補のみに使用推奨）

    使用シーン:
    - 最終候補（上位10-20件）のリランキング
    - 高精度が求められる重要クエリ
    """

    def __init__(self, model: str = "gpt-4"):
        self.model = model

    def rerank(
        self,
        query: str,
        documents: List[Dict[str, Any]],
        top_k: int = 10
    ) -> List[RankedResult]:
        """
        LLMでリランキング

        プロンプト例:
        ```
        Given the query: "{query}"

        Rank the following documents by relevance (1-10, 10 is most relevant):

        Document 1: {doc1_content}
        Document 2: {doc2_content}
        ...

        Return only a JSON array of document IDs sorted by relevance:
        ["doc_3", "doc_1", "doc_5", ...]
        ```
        """
        print(f"[LLM Reranker] Using {self.model} to rerank {len(documents)} documents...")
        start_time = time.time()

        # LLMプロンプトの構築
        prompt = self._build_reranking_prompt(query, documents)

        # LLM API呼び出し（実際の実装）
        # response = llm_client.complete(prompt, model=self.model)
        # ranked_doc_ids = json.loads(response.text)

        # ダミー実装: スコアベースのランキング
        scored_docs = []
        for doc in documents:
            score = doc.get('score', 0.0)
            scored_docs.append((doc, score))

        # スコアでソート
        scored_docs.sort(key=lambda x: x[1], reverse=True)

        # RankedResultオブジェクトを作成
        results = []
        for new_rank, (doc, score) in enumerate(scored_docs[:top_k], 1):
            result = RankedResult(
                doc_id=doc['doc_id'],
                content=doc['content'],
                original_rank=doc.get('rank', 0),
                original_score=doc.get('score', 0.0),
                reranked_score=score,
                reranked_rank=new_rank,
                metadata=doc.get('metadata', {})
            )
            results.append(result)

        elapsed = time.time() - start_time
        print(f"[LLM Reranker] Completed in {elapsed:.2f}s (Cost: ~${elapsed * 0.03:.4f})")

        return results

    def _build_reranking_prompt(self, query: str, documents: List[Dict[str, Any]]) -> str:
        """リランキング用のプロンプトを構築"""
        prompt = f"""Given the query: "{query}"

Rank the following documents by relevance to the query. Return a JSON array of document IDs sorted by relevance (most relevant first).

Documents:
"""

        for i, doc in enumerate(documents, 1):
            content_preview = doc['content'][:200]
            prompt += f"\nDocument {i} (ID: {doc['doc_id']}): {content_preview}...\n"

        prompt += "\nReturn only the JSON array: [\"doc_id1\", \"doc_id2\", ...]"

        return prompt


class CohereReranker:
    """
    Cohere Rerank API

    Cohereが提供する専用リランキングAPI。
    高速・高精度・多言語対応。

    特徴:
    - 専用モデルで最適化
    - 高速（数百ms）
    - 商用利用に適している
    - 多言語対応（100+ languages）

    料金:
    - $2.00 / 1000 searches (standard)
    - $0.40 / 1000 searches (lite)
    """

    def __init__(self, api_key: str, model: str = "rerank-english-v2.0"):
        self.api_key = api_key
        self.model = model

    def rerank(
        self,
        query: str,
        documents: List[Dict[str, Any]],
        top_k: int = 10
    ) -> List[RankedResult]:
        """
        Cohere Rerank APIでリランキング

        API呼び出し例:
        ```python
        import cohere
        co = cohere.Client(api_key)

        results = co.rerank(
            model="rerank-english-v2.0",
            query=query,
            documents=[doc['content'] for doc in documents],
            top_n=top_k
        )
        ```
        """
        print(f"[Cohere Rerank] Reranking {len(documents)} documents...")
        start_time = time.time()

        # Cohere API呼び出し（実際の実装）
        # import cohere
        # co = cohere.Client(self.api_key)
        # results = co.rerank(...)

        # ダミー実装
        scored_docs = [(doc, doc.get('score', 0.0)) for doc in documents]
        scored_docs.sort(key=lambda x: x[1], reverse=True)

        # RankedResultオブジェクトを作成
        results = []
        for new_rank, (doc, score) in enumerate(scored_docs[:top_k], 1):
            result = RankedResult(
                doc_id=doc['doc_id'],
                content=doc['content'],
                original_rank=doc.get('rank', 0),
                original_score=doc.get('score', 0.0),
                reranked_score=score,
                reranked_rank=new_rank,
                metadata=doc.get('metadata', {})
            )
            results.append(result)

        elapsed = time.time() - start_time
        print(f"[Cohere Rerank] Completed in {elapsed:.2f}s")

        return results


class RerankingAgent:
    """
    リランキング・エージェント

    複数のリランキング手法を提供し、
    シーンに応じて最適な手法を選択。

    推奨使用パターン:
    1. 第1段階: Hybrid Search (100-200件取得)
    2. 第2段階: Cross-Encoder (上位50件をリランキング)
    3. 第3段階: LLM Reranker (最終候補10件をリランキング) ※オプション

    性能向上:
    - Cross-Encoder: +10-15% 精度向上
    - LLM Reranker: +20-30% 精度向上
    """

    def __init__(self, config: Dict[str, Any]):
        self.config = config

        # リランカーの初期化
        self.cross_encoder = CrossEncoderReranker(
            model_name=config.get('cross_encoder_model', 'ms-marco-MiniLM-L-6-v2')
        )

        self.llm_reranker = LLMReranker(
            model=config.get('llm_model', 'gpt-4')
        )

        if config.get('cohere_api_key'):
            self.cohere_reranker = CohereReranker(
                api_key=config['cohere_api_key'],
                model=config.get('cohere_model', 'rerank-english-v2.0')
            )
        else:
            self.cohere_reranker = None

    def rerank(
        self,
        query: str,
        documents: List[Dict[str, Any]],
        method: RerankingMethod = RerankingMethod.CROSS_ENCODER,
        top_k: int = 10
    ) -> List[RankedResult]:
        """
        検索結果をリランキング

        Args:
            query: クエリ
            documents: 検索結果
            method: リランキング手法
            top_k: 返す結果数

        Returns:
            リランキングされた結果
        """
        print(f"\n[Reranking Agent] Method: {method.value}")
        print(f"  Input: {len(documents)} documents")
        print(f"  Target: Top-{top_k}")

        if method == RerankingMethod.CROSS_ENCODER:
            results = self.cross_encoder.rerank(query, documents, top_k)

        elif method == RerankingMethod.LLM_RERANKER:
            results = self.llm_reranker.rerank(query, documents, top_k)

        elif method == RerankingMethod.COHERE_RERANK:
            if self.cohere_reranker:
                results = self.cohere_reranker.rerank(query, documents, top_k)
            else:
                print("[Warning] Cohere API key not provided. Falling back to Cross-Encoder.")
                results = self.cross_encoder.rerank(query, documents, top_k)

        else:
            # デフォルト: Cross-Encoder
            results = self.cross_encoder.rerank(query, documents, top_k)

        print(f"  Output: {len(results)} reranked documents")

        return results

    def two_stage_reranking(
        self,
        query: str,
        documents: List[Dict[str, Any]],
        stage1_top_k: int = 50,
        stage2_top_k: int = 10
    ) -> List[RankedResult]:
        """
        2段階リランキング

        Stage 1: Cross-Encoder (上位50件)
        Stage 2: LLM Reranker (最終10件)

        コストと精度のバランスが最適。
        """
        print(f"\n[Two-Stage Reranking]")
        print(f"  Stage 1: Cross-Encoder (Top-{stage1_top_k})")
        print(f"  Stage 2: LLM Reranker (Top-{stage2_top_k})")

        # Stage 1: Cross-Encoder
        stage1_results = self.cross_encoder.rerank(query, documents, stage1_top_k)

        # Stage 2: LLM Reranker
        # RankedResultをdict形式に変換
        stage1_docs = [
            {
                'doc_id': r.doc_id,
                'content': r.content,
                'score': r.reranked_score,
                'rank': r.reranked_rank,
                'metadata': r.metadata
            }
            for r in stage1_results
        ]

        stage2_results = self.llm_reranker.rerank(query, stage1_docs, stage2_top_k)

        return stage2_results


def main():
    """テスト実行"""
    config = {
        'cross_encoder_model': 'ms-marco-MiniLM-L-6-v2',
        'llm_model': 'gpt-4',
    }

    agent = RerankingAgent(config)

    # テストドキュメント
    test_docs = [
        {'doc_id': 'doc1', 'content': 'Python is a programming language', 'score': 0.8, 'rank': 1},
        {'doc_id': 'doc2', 'content': 'JavaScript runs in browsers', 'score': 0.6, 'rank': 2},
        {'doc_id': 'doc3', 'content': 'Python is used for machine learning', 'score': 0.7, 'rank': 3},
    ]

    query = "Python programming"

    # Cross-Encoderでリランキング
    results = agent.rerank(query, test_docs, method=RerankingMethod.CROSS_ENCODER, top_k=3)

    print(f"\nReranked Results:")
    for result in results:
        print(f"  [{result.reranked_rank}] {result.doc_id} (score: {result.reranked_score:.3f})")
        print(f"      Original rank: {result.original_rank} (score: {result.original_score:.3f})")
        print(f"      {result.content[:80]}...")


if __name__ == "__main__":
    main()
