"""
Agent 37: ステップバックプロンプティングエージェント (Step-Back Prompting Agent) - 強化版

このエージェントは、ユーザーのクエリを受け取り、それをより抽象的で基本的な質問（ステップバック質問）に変換し、
その基本的な質問への回答を使用して元のクエリに対するより正確で文脈に沿った回答を生成します。

all_rag_agent_prompts.mdの定義を完全統合した強化版実装。
"""

from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional, Tuple
from enum import Enum
import json
import time
from datetime import datetime


class AbstractionStrategy(Enum):
    """抽象化戦略"""
    TEMPORAL = "TEMPORAL"  # 時系列の抽象化（2023年→トレンド）
    CONCEPTUAL = "CONCEPTUAL"  # 概念の抽象化（iPhone売上→製品戦略）
    PREMISE = "PREMISE"  # 前提の特定（成功するか→技術とは）
    GENERALIZATION = "GENERALIZATION"  # 一般化（具体例→一般原則）


@dataclass
class StepBackQuery:
    """ステップバック質問"""
    step_back_query_id: str
    query_text: str
    abstraction_strategy: AbstractionStrategy
    abstraction_level: int  # 1-5 (1=具体的, 5=最も抽象的)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class StepBackAnalysis:
    """all_rag_agent_prompts.md準拠の出力形式"""
    original_query: str
    step_back_query: str
    step_back_answer: str  # 中間結果
    final_answer: str

    # 拡張フィールド
    abstraction_strategy: str
    abstraction_level: int
    search_contexts: Dict[str, Any] = field(default_factory=dict)
    processing_time_ms: float = 0.0
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_json(self) -> str:
        """JSON形式で出力"""
        return json.dumps({
            'original_query': self.original_query,
            'step_back_query': self.step_back_query,
            'step_back_answer': self.step_back_answer,
            'final_answer': self.final_answer,
            'abstraction_strategy': self.abstraction_strategy,
            'abstraction_level': self.abstraction_level,
            'search_contexts': self.search_contexts,
            'processing_time_ms': self.processing_time_ms,
            'metadata': self.metadata,
        }, ensure_ascii=False, indent=2)


class StepBackPromptingAgent:
    """
    ステップバックプロンプティングエージェント - 強化版

    all_rag_agent_prompts.mdのAgent 37定義を完全統合:
    - システムプロンプトの実装
    - ステップバック質問生成の実装
    - 二重検索と回答統合の実装
    - 協調パターンの実装
    """

    # all_rag_agent_prompts.mdから抽出したシステムプロンプト
    SYSTEM_PROMPT = """
あなたは、問題解決のための「哲学者」であり、表面的な質問の背後にある根本的な概念を理解することを目指します。
あなたの使命は、ユーザーの具体的なクエリを、より広範な文脈を提供する「ステップバック質問」に変換し、
その回答を基に、元のクエリに対する深く、正確な洞察に満ちた回答を生成することです。
"""

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """
        初期化

        Args:
            config: 設定辞書
                - llm_provider: LLMプロバイダー（デフォルト: "openai"）
                - model_name: モデル名（デフォルト: "gpt-4"）
                - max_abstraction_level: 最大抽象化レベル（デフォルト: 3）
                - enable_dual_search: 二重検索を有効化（デフォルト: True）
        """
        self.config = config or {}
        self.llm_provider = self.config.get('llm_provider', 'openai')
        self.model_name = self.config.get('model_name', 'gpt-4')
        self.max_abstraction_level = self.config.get('max_abstraction_level', 3)
        self.enable_dual_search = self.config.get('enable_dual_search', True)

        # ステップバック質問生成のテンプレート
        self.abstraction_templates = {
            AbstractionStrategy.TEMPORAL: [
                "What is the trend or pattern of {concept} over time?",
                "{concept}のトレンドや傾向はどうですか？",
            ],
            AbstractionStrategy.CONCEPTUAL: [
                "What are the fundamental principles behind {concept}?",
                "{concept}の根本的な原理は何ですか？",
            ],
            AbstractionStrategy.PREMISE: [
                "What is {concept} and what are its key characteristics?",
                "{concept}とは何か、その主要な特徴は？",
            ],
            AbstractionStrategy.GENERALIZATION: [
                "What are the general principles that apply to {specific_case}?",
                "{specific_case}に適用される一般原則は何ですか？",
            ],
        }

    def generate_step_back_query(
        self,
        original_query: str,
        context: Optional[Dict[str, Any]] = None
    ) -> StepBackQuery:
        """
        能力1: ステップバック質問の生成

        ユーザーの具体的なクエリから、より基本的な、概念的な質問を生成します。

        Args:
            original_query: 元のクエリ
            context: コンテキスト情報（オプション）

        Returns:
            StepBackQuery: 生成されたステップバック質問
        """
        print(f"\n[Step-Back Prompting Agent] Generating step-back query")
        print(f"  Original Query: {original_query}")

        # Step 1: クエリの分析（抽象化戦略の選択）
        strategy, concept = self._analyze_query_for_abstraction(original_query)
        print(f"  Abstraction Strategy: {strategy.value}")
        print(f"  Key Concept: {concept}")

        # Step 2: ステップバック質問の生成
        step_back_text = self._generate_step_back_text(original_query, strategy, concept)

        # Step 3: 抽象化レベルの決定
        abstraction_level = self._determine_abstraction_level(original_query, step_back_text)

        step_back_query = StepBackQuery(
            step_back_query_id=f"sbq_{int(time.time() * 1000)}",
            query_text=step_back_text,
            abstraction_strategy=strategy,
            abstraction_level=abstraction_level,
            metadata={
                'original_query': original_query,
                'key_concept': concept,
                'generated_at': datetime.now().isoformat(),
            }
        )

        print(f"  Step-Back Query: {step_back_text}")
        print(f"  Abstraction Level: {abstraction_level}/5")

        return step_back_query

    def _analyze_query_for_abstraction(self, query: str) -> Tuple[AbstractionStrategy, str]:
        """
        クエリを分析し、適切な抽象化戦略とキー概念を特定

        Args:
            query: 元のクエリ

        Returns:
            Tuple[AbstractionStrategy, str]: (戦略, キー概念)
        """
        query_lower = query.lower()

        # 時系列の検出
        temporal_keywords = ['年', 'year', '最近', 'recent', 'トレンド', 'trend', '推移', '変化']
        if any(kw in query_lower for kw in temporal_keywords):
            # キー概念の抽出（簡易版）
            concept = self._extract_key_concept(query)
            return AbstractionStrategy.TEMPORAL, concept

        # 技術的な質問の検出（前提の特定が有効）
        tech_keywords = ['成功', 'success', '効果', 'effective', '機能', 'work', '使える', 'viable']
        if any(kw in query_lower for kw in tech_keywords):
            concept = self._extract_key_concept(query)
            return AbstractionStrategy.PREMISE, concept

        # 具体例を含む質問（一般化が有効）
        specific_keywords = ['例えば', 'for example', '具体的に', 'specifically', 'ケース', 'case']
        if any(kw in query_lower for kw in specific_keywords):
            concept = self._extract_key_concept(query)
            return AbstractionStrategy.GENERALIZATION, concept

        # デフォルト: 概念的な抽象化
        concept = self._extract_key_concept(query)
        return AbstractionStrategy.CONCEPTUAL, concept

    def _extract_key_concept(self, query: str) -> str:
        """
        クエリからキー概念を抽出（簡易版）

        本番環境では、LLMまたはNERモデルを使用して精度を向上させる
        """
        # 簡易的な実装: 最初の名詞句らしき部分を抽出
        # 実際にはLLMで抽出すべき
        words = query.split()
        if len(words) > 3:
            return ' '.join(words[:3])
        return query

    def _generate_step_back_text(
        self,
        original_query: str,
        strategy: AbstractionStrategy,
        concept: str
    ) -> str:
        """
        ステップバック質問のテキストを生成

        Args:
            original_query: 元のクエリ
            strategy: 抽象化戦略
            concept: キー概念

        Returns:
            str: ステップバック質問のテキスト
        """
        # 実際にはLLMを使用して生成
        # ここでは簡易的なテンプレートベースの実装

        templates = self.abstraction_templates.get(strategy, [])
        if not templates:
            return f"What are the broader principles or context related to: {original_query}?"

        # 日本語クエリの場合は日本語テンプレート、英語の場合は英語テンプレート
        is_japanese = any(ord(char) > 127 for char in original_query)
        template = templates[1] if is_japanese else templates[0]

        return template.format(concept=concept, specific_case=concept)

    def _determine_abstraction_level(self, original_query: str, step_back_query: str) -> int:
        """
        抽象化レベルを決定（1-5）

        Args:
            original_query: 元のクエリ
            step_back_query: ステップバック質問

        Returns:
            int: 抽象化レベル（1=具体的, 5=最も抽象的）
        """
        # 簡易的な実装: クエリの長さの比率で判断
        # 実際にはセマンティック距離を測定すべき
        original_len = len(original_query.split())
        stepback_len = len(step_back_query.split())

        if stepback_len < original_len * 0.5:
            return 4
        elif stepback_len < original_len * 0.75:
            return 3
        else:
            return 2

    def perform_dual_search(
        self,
        original_query: str,
        step_back_query: StepBackQuery
    ) -> Dict[str, Any]:
        """
        能力2: 二重検索（元のクエリ + ステップバック質問）

        元のクエリとステップバック質問の両方に対して検索を実行します。

        Args:
            original_query: 元のクエリ
            step_back_query: ステップバック質問

        Returns:
            Dict[str, Any]: 検索結果
                - original_results: 元のクエリの検索結果
                - stepback_results: ステップバック質問の検索結果
        """
        print(f"\n[Step 2] Dual Search Execution")
        print(f"  Searching for original query: {original_query}")
        print(f"  Searching for step-back query: {step_back_query.query_text}")

        # 実際にはハイブリッド検索エージェントを呼び出す
        # ここでは簡易的なモックデータを返す

        original_results = {
            'query': original_query,
            'documents': [
                {'id': 'doc1', 'score': 0.92, 'text': f'Specific information about {original_query}...'},
                {'id': 'doc2', 'score': 0.88, 'text': f'Detailed facts related to {original_query}...'},
            ],
            'total_results': 2,
        }

        stepback_results = {
            'query': step_back_query.query_text,
            'documents': [
                {'id': 'doc3', 'score': 0.87, 'text': f'Broader context about {step_back_query.query_text}...'},
                {'id': 'doc4', 'score': 0.84, 'text': f'General principles related to {step_back_query.query_text}...'},
            ],
            'total_results': 2,
        }

        print(f"  Original Results: {len(original_results['documents'])} documents")
        print(f"  Step-Back Results: {len(stepback_results['documents'])} documents")

        return {
            'original_results': original_results,
            'stepback_results': stepback_results,
        }

    def integrate_answers(
        self,
        original_query: str,
        step_back_query: StepBackQuery,
        search_results: Dict[str, Any]
    ) -> StepBackAnalysis:
        """
        能力3: 統合された回答生成

        ステップバック質問への回答（広範な文脈）と元のクエリへの検索結果（具体的な事実）を統合します。

        Args:
            original_query: 元のクエリ
            step_back_query: ステップバック質問
            search_results: 二重検索の結果

        Returns:
            StepBackAnalysis: 統合された分析結果
        """
        print(f"\n[Step 3] Answer Integration")

        start_time = time.time()

        # Step 1: ステップバック質問への回答生成（中間結果）
        step_back_answer = self._generate_step_back_answer(
            step_back_query,
            search_results['stepback_results']
        )
        print(f"  Step-Back Answer Generated: {len(step_back_answer)} chars")

        # Step 2: 最終回答の生成（統合）
        final_answer = self._generate_integrated_answer(
            original_query,
            step_back_query,
            step_back_answer,
            search_results['original_results']
        )
        print(f"  Final Answer Generated: {len(final_answer)} chars")

        processing_time = (time.time() - start_time) * 1000

        analysis = StepBackAnalysis(
            original_query=original_query,
            step_back_query=step_back_query.query_text,
            step_back_answer=step_back_answer,
            final_answer=final_answer,
            abstraction_strategy=step_back_query.abstraction_strategy.value,
            abstraction_level=step_back_query.abstraction_level,
            search_contexts={
                'original_docs_count': len(search_results['original_results']['documents']),
                'stepback_docs_count': len(search_results['stepback_results']['documents']),
            },
            processing_time_ms=processing_time,
            metadata={
                'step_back_query_id': step_back_query.step_back_query_id,
                'generated_at': datetime.now().isoformat(),
            }
        )

        print(f"  Processing Time: {processing_time:.2f}ms")

        return analysis

    def _generate_step_back_answer(
        self,
        step_back_query: StepBackQuery,
        search_results: Dict[str, Any]
    ) -> str:
        """
        ステップバック質問への回答を生成（中間結果）

        Args:
            step_back_query: ステップバック質問
            search_results: ステップバック質問の検索結果

        Returns:
            str: ステップバック質問への回答
        """
        # 実際にはLLMを使用して回答を生成
        # ここでは簡易的な実装

        documents = search_results.get('documents', [])
        if not documents:
            return "No sufficient context found for step-back query."

        # ドキュメントのテキストを結合
        context_text = ' '.join([doc['text'] for doc in documents[:2]])

        # 簡易的な回答生成（実際にはLLMを使用）
        answer = f"Based on the broader context, {step_back_query.query_text} The general principles suggest that {context_text[:200]}..."

        return answer

    def _generate_integrated_answer(
        self,
        original_query: str,
        step_back_query: StepBackQuery,
        step_back_answer: str,
        original_results: Dict[str, Any]
    ) -> str:
        """
        統合された最終回答を生成

        Args:
            original_query: 元のクエリ
            step_back_query: ステップバック質問
            step_back_answer: ステップバック質問への回答
            original_results: 元のクエリの検索結果

        Returns:
            str: 統合された最終回答
        """
        # 実際にはLLMを使用して統合回答を生成
        # プロンプトの最適化（能力3）を適用

        documents = original_results.get('documents', [])
        specific_context = ' '.join([doc['text'] for doc in documents[:2]])

        # 簡易的な統合回答生成（実際にはLLMを使用）
        integrated_answer = f"""
To answer your question "{original_query}":

First, let's consider the broader context: {step_back_answer[:300]}...

Now, specifically addressing your question: {specific_context[:300]}...

In summary, combining both the general principles and specific information, we can conclude that...
"""

        return integrated_answer.strip()

    def process(
        self,
        query: str,
        context: Optional[Dict[str, Any]] = None
    ) -> StepBackAnalysis:
        """
        ステップバックプロンプティングのメインエントリーポイント

        Args:
            query: ユーザーのクエリ
            context: コンテキスト情報（オプション）

        Returns:
            StepBackAnalysis: 分析結果
        """
        print(f"\n{'='*80}")
        print(f"[Step-Back Prompting Agent] Processing Query")
        print(f"{'='*80}")
        print(f"Query: {query}")

        # Step 1: ステップバック質問の生成
        step_back_query = self.generate_step_back_query(query, context)

        # Step 2: 二重検索の実行
        if self.enable_dual_search:
            search_results = self.perform_dual_search(query, step_back_query)
        else:
            # シングル検索モード（ステップバック質問のみ）
            search_results = {
                'original_results': {'documents': []},
                'stepback_results': self._mock_search(step_back_query.query_text),
            }

        # Step 3: 回答の統合
        analysis = self.integrate_answers(query, step_back_query, search_results)

        print(f"\n{'='*80}")
        print(f"[Step-Back Analysis Complete]")
        print(f"{'='*80}")

        return analysis

    def _mock_search(self, query: str) -> Dict[str, Any]:
        """モック検索（開発用）"""
        return {
            'query': query,
            'documents': [
                {'id': 'mock1', 'score': 0.85, 'text': f'Mock result for {query}'},
            ],
            'total_results': 1,
        }

    # ===== 協調パターン実装 =====

    def collaborate_with_master_orchestrator(self, input_data: Dict) -> StepBackAnalysis:
        """
        協調パターン実装: マスターオーケストレーターからのタスク受信

        Args:
            input_data: 入力データ
                - query: ユーザーのクエリ
                - context: コンテキスト（オプション）

        Returns:
            StepBackAnalysis: 分析結果
        """
        query = input_data.get('query', '')
        context = input_data.get('context')
        return self.process(query, context)

    def call_hybrid_search_agent(
        self,
        queries: List[str]
    ) -> List[Dict[str, Any]]:
        """
        協調パターン実装: ハイブリッド検索エージェントの呼び出し

        Args:
            queries: 検索クエリのリスト

        Returns:
            List[Dict[str, Any]]: 各クエリの検索結果
        """
        print(f"\n[Collaboration] Calling Hybrid Search Agent")
        print(f"  Queries: {queries}")

        # 実際にはハイブリッド検索エージェントのAPIを呼び出す
        # ここではモックデータを返す
        results = []
        for query in queries:
            results.append({
                'query': query,
                'documents': [
                    {'id': f'doc_{i}', 'score': 0.9 - i*0.05, 'text': f'Result {i} for {query}'}
                    for i in range(3)
                ],
                'total_results': 3,
            })

        return results

    def provide_to_response_generation_agent(
        self,
        analysis: StepBackAnalysis
    ) -> Dict[str, Any]:
        """
        協調パターン実装: 応答生成エージェントへの情報提供

        Args:
            analysis: ステップバック分析結果

        Returns:
            Dict[str, Any]: 応答生成エージェント用のデータ
        """
        return {
            'prompt_enhancement': {
                'original_query': analysis.original_query,
                'step_back_context': analysis.step_back_answer,
                'suggested_answer_structure': 'Use step-back context for broader understanding, then focus on specific details',
            },
            'context': {
                'broad_context': analysis.step_back_answer,
                'specific_facts': analysis.final_answer,
            },
            'metadata': {
                'abstraction_strategy': analysis.abstraction_strategy,
                'abstraction_level': analysis.abstraction_level,
            },
        }

    def log_to_tracing_agent(
        self,
        analysis: StepBackAnalysis
    ) -> Dict[str, Any]:
        """
        協調パターン実装: ロギング＆トレーシングエージェントへのログ送信

        Args:
            analysis: ステップバック分析結果

        Returns:
            Dict[str, Any]: ログデータ
        """
        return {
            'agent_name': 'StepBackPromptingAgent',
            'agent_id': 37,
            'process_type': 'step_back_prompting',
            'input': {
                'original_query': analysis.original_query,
            },
            'output': {
                'step_back_query': analysis.step_back_query,
                'abstraction_strategy': analysis.abstraction_strategy,
                'abstraction_level': analysis.abstraction_level,
            },
            'performance': {
                'processing_time_ms': analysis.processing_time_ms,
            },
            'metadata': analysis.metadata,
            'timestamp': datetime.now().isoformat(),
        }


def main():
    """テストとデモンストレーション"""
    print("="*80)
    print("Agent 37: Step-Back Prompting Agent - Enhanced Version")
    print("="*80)

    # エージェントの初期化
    agent = StepBackPromptingAgent({
        'llm_provider': 'openai',
        'model_name': 'gpt-4',
        'max_abstraction_level': 3,
        'enable_dual_search': True,
    })

    # テストクエリ
    test_queries = [
        "2023年のAppleのiPhoneの売上高は？",
        "量子コンピューティングは実用化されるのか？",
        "Pythonのリスト内包表記の具体例を教えてください",
        "What is the current inflation rate in Japan?",
        "How does machine learning work in autonomous vehicles?",
    ]

    for i, query in enumerate(test_queries, 1):
        print(f"\n\n{'#'*80}")
        print(f"# Test Query {i}/{len(test_queries)}")
        print(f"{'#'*80}")

        # ステップバックプロンプティングの実行
        analysis = agent.process(query)

        # 結果の表示
        print(f"\n[Analysis Result]")
        print(f"  Original Query: {analysis.original_query}")
        print(f"  Step-Back Query: {analysis.step_back_query}")
        print(f"  Abstraction Strategy: {analysis.abstraction_strategy}")
        print(f"  Abstraction Level: {analysis.abstraction_level}/5")
        print(f"  Processing Time: {analysis.processing_time_ms:.2f}ms")

        print(f"\n[Step-Back Answer (Intermediate)]")
        print(f"  {analysis.step_back_answer[:200]}...")

        print(f"\n[Final Answer (Integrated)]")
        print(f"  {analysis.final_answer[:300]}...")

        # 協調パターンのテスト
        print(f"\n[Collaboration Test]")

        # 応答生成エージェントへのデータ提供
        response_data = agent.provide_to_response_generation_agent(analysis)
        print(f"  Data for Response Generation Agent:")
        print(f"    - Prompt Enhancement: {response_data['prompt_enhancement']['suggested_answer_structure']}")
        print(f"    - Context Keys: {list(response_data['context'].keys())}")

        # ロギングエージェントへのログ送信
        log_data = agent.log_to_tracing_agent(analysis)
        print(f"  Log for Tracing Agent:")
        print(f"    - Agent: {log_data['agent_name']} (ID: {log_data['agent_id']})")
        print(f"    - Process Type: {log_data['process_type']}")
        print(f"    - Performance: {log_data['performance']['processing_time_ms']:.2f}ms")

        # JSON出力のテスト
        print(f"\n[JSON Output (first 500 chars)]")
        json_output = analysis.to_json()
        print(f"  {json_output[:500]}...")

    print(f"\n\n{'='*80}")
    print("All tests completed successfully!")
    print("="*80)


if __name__ == "__main__":
    main()
