"""
Agent 38: RAG-Fusionエージェント (RAG-Fusion Agent) - 強化版

このエージェントは、ユーザーのクエリから複数の検索クエリを生成し、
それぞれの検索結果を組み合わせて（フュージョン）、
より包括的で多様なコンテキストを応答生成エージェントに提供します。

all_rag_agent_prompts.mdの定義を完全統合した強化版実装。
"""

from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional, Tuple
from enum import Enum
import json
import time
from datetime import datetime
from collections import defaultdict


class QueryGenerationStrategy(Enum):
    """クエリ生成戦略"""
    SPECIFIC_PHRASE = "SPECIFIC_PHRASE"  # 具体的なフレーズ
    GENERAL_CONCEPT = "GENERAL_CONCEPT"  # 一般的な概念
    RELATED_QUESTION = "RELATED_QUESTION"  # 関連する質問
    SYNONYM_VARIATION = "SYNONYM_VARIATION"  # 同義語のバリエーション


@dataclass
class GeneratedQuery:
    """生成されたクエリ"""
    query_id: str
    query_text: str
    generation_strategy: QueryGenerationStrategy
    keywords: List[str]
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class FusedDocument:
    """融合されたドキュメント"""
    document_id: str
    rrf_score: float
    text_snippet: str
    sources: List[str]  # どのクエリから取得されたか
    original_scores: Dict[str, float]  # 各クエリでの元のスコア
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class RAGFusionResult:
    """all_rag_agent_prompts.md準拠の出力形式"""
    generated_queries: List[str]
    fused_results: List[Dict[str, Any]]

    # 拡張フィールド
    original_query: str
    query_generation_strategies: List[str]
    total_documents_before_fusion: int
    total_documents_after_fusion: int
    diversity_score: float  # 0.0-1.0
    processing_time_ms: float = 0.0
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_json(self) -> str:
        """JSON形式で出力"""
        return json.dumps({
            'generated_queries': self.generated_queries,
            'fused_results': self.fused_results,
            'original_query': self.original_query,
            'query_generation_strategies': self.query_generation_strategies,
            'total_documents_before_fusion': self.total_documents_before_fusion,
            'total_documents_after_fusion': self.total_documents_after_fusion,
            'diversity_score': self.diversity_score,
            'processing_time_ms': self.processing_time_ms,
            'metadata': self.metadata,
        }, ensure_ascii=False, indent=2)


class RAGFusionAgent:
    """
    RAG-Fusionエージェント - 強化版

    all_rag_agent_prompts.mdのAgent 38定義を完全統合:
    - システムプロンプトの実装
    - マルチクエリ生成の実装
    - Reciprocal Rank Fusion (RRF)アルゴリズムの実装
    - 重複排除と多様性確保の実装
    - 協調パターンの実装
    """

    # all_rag_agent_prompts.mdから抽出したシステムプロンプト
    SYSTEM_PROMPT = """
あなたは、検索結果の「多様性の追求者」であり、単一の検索クエリの限界を克服することを目指します。
あなたの使命は、ユーザーのクエリから複数の視点やキーワードを抽出し、それらを基に複数の検索クエリを生成し、
得られた結果をインテリジェントに融合して、最も関連性の高い、重複のないコンテキストのセットを提供することです。
"""

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """
        初期化

        Args:
            config: 設定辞書
                - llm_provider: LLMプロバイダー（デフォルト: "openai"）
                - model_name: モデル名（デフォルト: "gpt-4"）
                - num_queries: 生成するクエリ数（デフォルト: 4）
                - rrf_k: RRFパラメータk（デフォルト: 60）
                - max_results: 最終結果の最大数（デフォルト: 10）
                - enable_diversity: 多様性確保を有効化（デフォルト: True）
        """
        self.config = config or {}
        self.llm_provider = self.config.get('llm_provider', 'openai')
        self.model_name = self.config.get('model_name', 'gpt-4')
        self.num_queries = self.config.get('num_queries', 4)
        self.rrf_k = self.config.get('rrf_k', 60)
        self.max_results = self.config.get('max_results', 10)
        self.enable_diversity = self.config.get('enable_diversity', True)

        # キーワード抽出用の同義語辞書（簡易版）
        self.synonym_dict = {
            'python': ['python', 'パイソン', 'py'],
            'javascript': ['javascript', 'js', 'ジャバスクリプト'],
            'machine learning': ['machine learning', 'ML', '機械学習', '機学'],
            'database': ['database', 'DB', 'データベース'],
        }

    def generate_multi_queries(
        self,
        original_query: str,
        context: Optional[Dict[str, Any]] = None
    ) -> List[GeneratedQuery]:
        """
        能力1: マルチクエリ生成

        ユーザーのクエリから複数の検索クエリを生成します。

        Args:
            original_query: 元のクエリ
            context: コンテキスト情報（オプション）

        Returns:
            List[GeneratedQuery]: 生成されたクエリのリスト
        """
        print(f"\n[RAG-Fusion Agent] Generating Multiple Queries")
        print(f"  Original Query: {original_query}")
        print(f"  Target Number: {self.num_queries} queries")

        # Step 1: キーワード抽出
        keywords = self._extract_keywords(original_query)
        print(f"  Extracted Keywords: {keywords}")

        # Step 2: クエリの多様化
        generated_queries = []

        # 戦略1: 具体的なフレーズ（元のクエリそのまま）
        generated_queries.append(GeneratedQuery(
            query_id=f"q_specific_{int(time.time() * 1000)}",
            query_text=original_query,
            generation_strategy=QueryGenerationStrategy.SPECIFIC_PHRASE,
            keywords=keywords,
            metadata={'note': 'Original query as-is'},
        ))

        # 戦略2: 一般的な概念
        general_query = self._generate_general_concept_query(original_query, keywords)
        generated_queries.append(GeneratedQuery(
            query_id=f"q_general_{int(time.time() * 1000) + 1}",
            query_text=general_query,
            generation_strategy=QueryGenerationStrategy.GENERAL_CONCEPT,
            keywords=keywords,
            metadata={'note': 'Generalized version'},
        ))

        # 戦略3: 関連する質問
        related_query = self._generate_related_question(original_query, keywords)
        generated_queries.append(GeneratedQuery(
            query_id=f"q_related_{int(time.time() * 1000) + 2}",
            query_text=related_query,
            generation_strategy=QueryGenerationStrategy.RELATED_QUESTION,
            keywords=keywords,
            metadata={'note': 'Related question'},
        ))

        # 戦略4: 同義語のバリエーション
        if len(generated_queries) < self.num_queries:
            synonym_query = self._generate_synonym_variation(original_query, keywords)
            generated_queries.append(GeneratedQuery(
                query_id=f"q_synonym_{int(time.time() * 1000) + 3}",
                query_text=synonym_query,
                generation_strategy=QueryGenerationStrategy.SYNONYM_VARIATION,
                keywords=keywords,
                metadata={'note': 'Synonym variation'},
            ))

        print(f"\n[Generated Queries]")
        for i, gq in enumerate(generated_queries, 1):
            print(f"  {i}. [{gq.generation_strategy.value}] {gq.query_text}")

        return generated_queries

    def _extract_keywords(self, query: str) -> List[str]:
        """
        キーワード抽出（簡易版）

        本番環境では、LLMまたはNLPモデルを使用して精度を向上させる
        """
        # 簡易的な実装: 3文字以上の単語を抽出
        # 実際にはLLMやTF-IDFを使用すべき
        import re
        words = re.findall(r'\b\w{3,}\b', query.lower())
        # 重複を除去して最大5つまで
        unique_words = []
        for word in words:
            if word not in unique_words:
                unique_words.append(word)
            if len(unique_words) >= 5:
                break
        return unique_words

    def _generate_general_concept_query(self, original_query: str, keywords: List[str]) -> str:
        """一般的な概念のクエリを生成"""
        # 簡易的な実装: 最初のキーワードを使用
        if keywords:
            return f"What is {keywords[0]} and how does it work?"
        return f"General concepts related to: {original_query}"

    def _generate_related_question(self, original_query: str, keywords: List[str]) -> str:
        """関連する質問を生成"""
        # 簡易的な実装: キーワードを使って関連質問を作成
        if keywords:
            return f"What are the benefits and applications of {keywords[0]}?"
        return f"What are related topics to: {original_query}?"

    def _generate_synonym_variation(self, original_query: str, keywords: List[str]) -> str:
        """同義語のバリエーションを生成"""
        # 簡易的な実装: 同義語辞書を使用
        query_lower = original_query.lower()
        for key, synonyms in self.synonym_dict.items():
            for syn in synonyms:
                if syn in query_lower:
                    # 最初の同義語以外に置き換え
                    replacement = [s for s in synonyms if s != syn][0] if len(synonyms) > 1 else syn
                    return original_query.replace(syn, replacement)
        # 同義語が見つからない場合は、キーワードを使った別表現
        if keywords:
            return f"{keywords[0]} examples and use cases"
        return original_query

    def perform_multi_search(
        self,
        generated_queries: List[GeneratedQuery]
    ) -> Dict[str, List[Dict[str, Any]]]:
        """
        複数のクエリで検索を実行

        Args:
            generated_queries: 生成されたクエリのリスト

        Returns:
            Dict[str, List[Dict]]: クエリIDごとの検索結果
        """
        print(f"\n[Step 2] Multi-Search Execution")
        print(f"  Executing {len(generated_queries)} searches")

        # 実際にはハイブリッド検索エージェントを呼び出す
        # ここでは簡易的なモックデータを返す

        search_results = {}
        for gq in generated_queries:
            results = self._mock_search(gq.query_text, gq.query_id)
            search_results[gq.query_id] = results
            print(f"    [{gq.query_id}] {len(results)} documents found")

        total_docs = sum(len(results) for results in search_results.values())
        print(f"  Total Documents (before fusion): {total_docs}")

        return search_results

    def _mock_search(self, query: str, query_id: str) -> List[Dict[str, Any]]:
        """モック検索（開発用）"""
        # 各クエリで3-5個のドキュメントを返す（一部重複あり）
        base_id = hash(query_id) % 10
        num_docs = 3 + (base_id % 3)

        results = []
        for i in range(num_docs):
            doc_id = f"doc_{base_id + i}"
            results.append({
                'id': doc_id,
                'score': 0.95 - i * 0.08,
                'text': f"Document {doc_id} content related to: {query[:50]}...",
                'metadata': {'source_query_id': query_id},
            })

        return results

    def fuse_results(
        self,
        search_results: Dict[str, List[Dict[str, Any]]],
        generated_queries: List[GeneratedQuery]
    ) -> List[FusedDocument]:
        """
        能力2: 検索結果のフュージョン（Reciprocal Rank Fusion）

        各検索クエリから得られたドキュメントのランキングを統合します。

        Args:
            search_results: クエリIDごとの検索結果
            generated_queries: 生成されたクエリのリスト

        Returns:
            List[FusedDocument]: 融合されたドキュメントのリスト
        """
        print(f"\n[Step 3] Result Fusion (RRF)")
        print(f"  RRF Parameter k: {self.rrf_k}")

        # Step 1: Reciprocal Rank Fusion (RRF)の適用
        rrf_scores = self._apply_rrf(search_results)
        print(f"  Computed RRF scores for {len(rrf_scores)} unique documents")

        # Step 2: 重複排除と多様性の確保
        fused_documents = self._deduplicate_and_ensure_diversity(
            rrf_scores,
            search_results,
            generated_queries
        )
        print(f"  Final Fused Documents: {len(fused_documents)}")

        # Step 3: スコアでソート
        fused_documents.sort(key=lambda x: x.rrf_score, reverse=True)

        # 上位N件のみ返す
        fused_documents = fused_documents[:self.max_results]

        print(f"\n[Top Fused Documents]")
        for i, doc in enumerate(fused_documents[:5], 1):
            print(f"    {i}. {doc.document_id} (RRF: {doc.rrf_score:.4f}, sources: {len(doc.sources)})")

        return fused_documents

    def _apply_rrf(
        self,
        search_results: Dict[str, List[Dict[str, Any]]]
    ) -> Dict[str, float]:
        """
        Reciprocal Rank Fusion (RRF)アルゴリズムの適用

        RRF Score = Σ (1 / (k + rank))

        Args:
            search_results: クエリIDごとの検索結果

        Returns:
            Dict[str, float]: ドキュメントIDごとのRRFスコア
        """
        rrf_scores = defaultdict(float)

        for query_id, results in search_results.items():
            for rank, doc in enumerate(results, start=1):
                doc_id = doc['id']
                rrf_score = 1.0 / (self.rrf_k + rank)
                rrf_scores[doc_id] += rrf_score

        return dict(rrf_scores)

    def _deduplicate_and_ensure_diversity(
        self,
        rrf_scores: Dict[str, float],
        search_results: Dict[str, List[Dict[str, Any]]],
        generated_queries: List[GeneratedQuery]
    ) -> List[FusedDocument]:
        """
        重複排除と多様性の確保

        Args:
            rrf_scores: ドキュメントIDごとのRRFスコア
            search_results: クエリIDごとの検索結果
            generated_queries: 生成されたクエリのリスト

        Returns:
            List[FusedDocument]: 融合されたドキュメントのリスト
        """
        # ドキュメントIDごとの詳細情報を収集
        doc_details = {}
        for query_id, results in search_results.items():
            for doc in results:
                doc_id = doc['id']
                if doc_id not in doc_details:
                    doc_details[doc_id] = {
                        'text': doc['text'],
                        'sources': [],
                        'original_scores': {},
                    }
                doc_details[doc_id]['sources'].append(query_id)
                doc_details[doc_id]['original_scores'][query_id] = doc['score']

        # FusedDocumentオブジェクトを作成
        fused_documents = []
        for doc_id, rrf_score in rrf_scores.items():
            if doc_id in doc_details:
                details = doc_details[doc_id]
                fused_doc = FusedDocument(
                    document_id=doc_id,
                    rrf_score=rrf_score,
                    text_snippet=details['text'][:200] + '...' if len(details['text']) > 200 else details['text'],
                    sources=details['sources'],
                    original_scores=details['original_scores'],
                    metadata={
                        'num_sources': len(details['sources']),
                        'avg_original_score': sum(details['original_scores'].values()) / len(details['original_scores']),
                    }
                )
                fused_documents.append(fused_doc)

        # 多様性の確保（オプション）
        if self.enable_diversity:
            fused_documents = self._ensure_diversity(fused_documents, generated_queries)

        return fused_documents

    def _ensure_diversity(
        self,
        fused_documents: List[FusedDocument],
        generated_queries: List[GeneratedQuery]
    ) -> List[FusedDocument]:
        """
        多様性の確保

        異なるクエリソースから取得されたドキュメントを優先的に含める

        Args:
            fused_documents: 融合されたドキュメントのリスト
            generated_queries: 生成されたクエリのリスト

        Returns:
            List[FusedDocument]: 多様性を確保したドキュメントのリスト
        """
        # 簡易的な実装: 各クエリソースから最低1つのドキュメントを含める
        query_ids = [gq.query_id for gq in generated_queries]
        covered_queries = set()
        diverse_docs = []

        # まず、各クエリソースから1つずつ取得
        for doc in sorted(fused_documents, key=lambda x: x.rrf_score, reverse=True):
            for source in doc.sources:
                if source not in covered_queries:
                    diverse_docs.append(doc)
                    covered_queries.update(doc.sources)
                    break
            if len(covered_queries) >= len(query_ids):
                break

        # 残りは通常のRRFスコア順に追加
        for doc in fused_documents:
            if doc not in diverse_docs:
                diverse_docs.append(doc)

        return diverse_docs

    def prepare_context_for_response_generation(
        self,
        fused_documents: List[FusedDocument],
        original_query: str
    ) -> Dict[str, Any]:
        """
        能力3: コンテキストの準備

        融合されたドキュメントを応答生成エージェント用に整形します。

        Args:
            fused_documents: 融合されたドキュメントのリスト
            original_query: 元のクエリ

        Returns:
            Dict[str, Any]: 応答生成エージェント用のコンテキスト
        """
        print(f"\n[Step 4] Context Preparation")

        # 最終コンテキストの選択
        context_documents = fused_documents[:self.max_results]
        print(f"  Selected {len(context_documents)} documents for context")

        # プロンプトの調整
        context = {
            'original_query': original_query,
            'documents': [
                {
                    'id': doc.document_id,
                    'text': doc.text_snippet,
                    'relevance_score': doc.rrf_score,
                    'diversity_info': {
                        'sources': doc.sources,
                        'num_sources': len(doc.sources),
                    }
                }
                for doc in context_documents
            ],
            'prompt_instruction': (
                "The following documents were retrieved using RAG-Fusion, "
                "combining results from multiple search queries. "
                "Please synthesize information from these diverse sources to provide a comprehensive answer."
            ),
            'metadata': {
                'fusion_method': 'Reciprocal Rank Fusion (RRF)',
                'total_search_queries': len(set().union(*[set(doc.sources) for doc in context_documents])),
                'diversity_enabled': self.enable_diversity,
            }
        }

        return context

    def process(
        self,
        query: str,
        context: Optional[Dict[str, Any]] = None
    ) -> RAGFusionResult:
        """
        RAG-Fusionのメインエントリーポイント

        Args:
            query: ユーザーのクエリ
            context: コンテキスト情報（オプション）

        Returns:
            RAGFusionResult: 融合結果
        """
        print(f"\n{'='*80}")
        print(f"[RAG-Fusion Agent] Processing Query")
        print(f"{'='*80}")
        print(f"Query: {query}")

        start_time = time.time()

        # Step 1: マルチクエリ生成
        generated_queries = self.generate_multi_queries(query, context)

        # Step 2: マルチ検索の実行
        search_results = self.perform_multi_search(generated_queries)
        total_docs_before = sum(len(results) for results in search_results.values())

        # Step 3: 結果のフュージョン
        fused_documents = self.fuse_results(search_results, generated_queries)

        # Step 4: コンテキストの準備
        prepared_context = self.prepare_context_for_response_generation(fused_documents, query)

        # 多様性スコアの計算
        diversity_score = self._calculate_diversity_score(fused_documents, generated_queries)

        processing_time = (time.time() - start_time) * 1000

        result = RAGFusionResult(
            generated_queries=[gq.query_text for gq in generated_queries],
            fused_results=[
                {
                    'document_id': doc.document_id,
                    'rrf_score': doc.rrf_score,
                    'text_snippet': doc.text_snippet,
                    'sources': doc.sources,
                }
                for doc in fused_documents
            ],
            original_query=query,
            query_generation_strategies=[gq.generation_strategy.value for gq in generated_queries],
            total_documents_before_fusion=total_docs_before,
            total_documents_after_fusion=len(fused_documents),
            diversity_score=diversity_score,
            processing_time_ms=processing_time,
            metadata={
                'rrf_k': self.rrf_k,
                'max_results': self.max_results,
                'enable_diversity': self.enable_diversity,
                'prepared_context': prepared_context,
            }
        )

        print(f"\n{'='*80}")
        print(f"[RAG-Fusion Complete]")
        print(f"{'='*80}")
        print(f"  Generated Queries: {len(generated_queries)}")
        print(f"  Documents Before Fusion: {total_docs_before}")
        print(f"  Documents After Fusion: {len(fused_documents)}")
        print(f"  Diversity Score: {diversity_score:.2f}")
        print(f"  Processing Time: {processing_time:.2f}ms")

        return result

    def _calculate_diversity_score(
        self,
        fused_documents: List[FusedDocument],
        generated_queries: List[GeneratedQuery]
    ) -> float:
        """
        多様性スコアを計算（0.0-1.0）

        異なるクエリソースから取得されたドキュメントの割合を評価

        Args:
            fused_documents: 融合されたドキュメントのリスト
            generated_queries: 生成されたクエリのリスト

        Returns:
            float: 多様性スコア（0.0-1.0）
        """
        if not fused_documents or not generated_queries:
            return 0.0

        total_query_ids = {gq.query_id for gq in generated_queries}
        covered_query_ids = set()

        for doc in fused_documents:
            covered_query_ids.update(doc.sources)

        # カバレッジ率
        coverage_ratio = len(covered_query_ids) / len(total_query_ids) if total_query_ids else 0.0

        # 平均ソース数
        avg_sources_per_doc = sum(len(doc.sources) for doc in fused_documents) / len(fused_documents)
        source_diversity = min(avg_sources_per_doc / len(total_query_ids), 1.0) if total_query_ids else 0.0

        # 総合スコア
        diversity_score = (coverage_ratio * 0.6 + source_diversity * 0.4)

        return diversity_score

    # ===== 協調パターン実装 =====

    def collaborate_with_master_orchestrator(self, input_data: Dict) -> RAGFusionResult:
        """
        協調パターン実装: マスターオーケストレーターからのタスク受信

        Args:
            input_data: 入力データ
                - query: ユーザーのクエリ
                - context: コンテキスト（オプション）

        Returns:
            RAGFusionResult: 融合結果
        """
        query = input_data.get('query', '')
        context = input_data.get('context')
        return self.process(query, context)

    def call_hybrid_search_agent_multiple_times(
        self,
        generated_queries: List[GeneratedQuery]
    ) -> Dict[str, List[Dict[str, Any]]]:
        """
        協調パターン実装: ハイブリッド検索エージェントの複数回呼び出し

        Args:
            generated_queries: 生成されたクエリのリスト

        Returns:
            Dict[str, List[Dict]]: クエリIDごとの検索結果
        """
        print(f"\n[Collaboration] Calling Hybrid Search Agent (multiple times)")
        print(f"  Number of Queries: {len(generated_queries)}")

        # 実際にはハイブリッド検索エージェントのAPIを複数回呼び出す
        # ここではモックデータを返す
        return self.perform_multi_search(generated_queries)

    def provide_to_response_generation_agent(
        self,
        result: RAGFusionResult
    ) -> Dict[str, Any]:
        """
        協調パターン実装: 応答生成エージェントへの融合コンテキスト提供

        Args:
            result: RAG-Fusion結果

        Returns:
            Dict[str, Any]: 応答生成エージェント用のデータ
        """
        prepared_context = result.metadata.get('prepared_context', {})
        return {
            'context_type': 'rag_fusion',
            'original_query': result.original_query,
            'fused_context': prepared_context,
            'diversity_info': {
                'diversity_score': result.diversity_score,
                'num_search_queries': len(result.generated_queries),
                'num_fused_documents': result.total_documents_after_fusion,
            },
            'prompt_enhancement': prepared_context.get('prompt_instruction', ''),
        }

    def log_to_tracing_agent(
        self,
        result: RAGFusionResult
    ) -> Dict[str, Any]:
        """
        協調パターン実装: ロギング＆トレーシングエージェントへのログ送信

        Args:
            result: RAG-Fusion結果

        Returns:
            Dict[str, Any]: ログデータ
        """
        return {
            'agent_name': 'RAGFusionAgent',
            'agent_id': 38,
            'process_type': 'rag_fusion',
            'input': {
                'original_query': result.original_query,
            },
            'output': {
                'num_generated_queries': len(result.generated_queries),
                'generated_queries': result.generated_queries,
                'total_documents_before_fusion': result.total_documents_before_fusion,
                'total_documents_after_fusion': result.total_documents_after_fusion,
                'diversity_score': result.diversity_score,
            },
            'performance': {
                'processing_time_ms': result.processing_time_ms,
            },
            'metadata': {
                'query_generation_strategies': result.query_generation_strategies,
                'rrf_k': result.metadata.get('rrf_k'),
                'enable_diversity': result.metadata.get('enable_diversity'),
            },
            'timestamp': datetime.now().isoformat(),
        }


def main():
    """テストとデモンストレーション"""
    print("="*80)
    print("Agent 38: RAG-Fusion Agent - Enhanced Version")
    print("="*80)

    # エージェントの初期化
    agent = RAGFusionAgent({
        'llm_provider': 'openai',
        'model_name': 'gpt-4',
        'num_queries': 4,
        'rrf_k': 60,
        'max_results': 10,
        'enable_diversity': True,
    })

    # テストクエリ
    test_queries = [
        "Pythonで機械学習を始める方法",
        "What are the best practices for React performance optimization?",
        "量子コンピューティングの実用化はいつ頃になるか",
        "How to implement authentication in Node.js applications?",
        "データベースの正規化とは何か",
    ]

    for i, query in enumerate(test_queries, 1):
        print(f"\n\n{'#'*80}")
        print(f"# Test Query {i}/{len(test_queries)}")
        print(f"{'#'*80}")

        # RAG-Fusionの実行
        result = agent.process(query)

        # 結果の表示
        print(f"\n[Fusion Result Summary]")
        print(f"  Original Query: {result.original_query}")
        print(f"  Generated Queries: {len(result.generated_queries)}")
        for j, gq in enumerate(result.generated_queries, 1):
            print(f"    {j}. {gq}")
        print(f"  Documents (Before Fusion): {result.total_documents_before_fusion}")
        print(f"  Documents (After Fusion): {result.total_documents_after_fusion}")
        print(f"  Diversity Score: {result.diversity_score:.2f}")
        print(f"  Processing Time: {result.processing_time_ms:.2f}ms")

        print(f"\n[Top Fused Results]")
        for j, doc in enumerate(result.fused_results[:3], 1):
            print(f"  {j}. {doc['document_id']} (RRF: {doc['rrf_score']:.4f})")
            print(f"     Sources: {doc['sources']}")
            print(f"     Text: {doc['text_snippet'][:100]}...")

        # 協調パターンのテスト
        print(f"\n[Collaboration Test]")

        # 応答生成エージェントへのデータ提供
        response_data = agent.provide_to_response_generation_agent(result)
        print(f"  Data for Response Generation Agent:")
        print(f"    - Context Type: {response_data['context_type']}")
        print(f"    - Diversity Score: {response_data['diversity_info']['diversity_score']:.2f}")
        print(f"    - Num Fused Documents: {response_data['diversity_info']['num_fused_documents']}")

        # ロギングエージェントへのログ送信
        log_data = agent.log_to_tracing_agent(result)
        print(f"  Log for Tracing Agent:")
        print(f"    - Agent: {log_data['agent_name']} (ID: {log_data['agent_id']})")
        print(f"    - Process Type: {log_data['process_type']}")
        print(f"    - Performance: {log_data['performance']['processing_time_ms']:.2f}ms")

        # JSON出力のテスト
        print(f"\n[JSON Output (first 500 chars)]")
        json_output = result.to_json()
        print(f"  {json_output[:500]}...")

    print(f"\n\n{'='*80}")
    print("All tests completed successfully!")
    print("="*80)


if __name__ == "__main__":
    main()
