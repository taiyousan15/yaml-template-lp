#!/usr/bin/env python3
"""
マスター・オーケストレーター・エージェント (Master Orchestrator Agent)

RAGシステム全体の司令塔として、クエリを解釈し、最適な戦略（DAG）を策定し、
他のエージェントを協調させてタスクを遂行させる。

ArXiv研究ベース:
- Agentic RAG Architecture (ArXiv 2507.18910v1)
- Dynamic Task Decomposition
- Multi-Agent Coordination

Author: Claude Code 42-Agent System
Version: 1.0.0
"""

import json
import time
from typing import Dict, List, Any, Optional
from enum import Enum
from dataclasses import dataclass, field
from pathlib import Path


class QueryType(Enum):
    """クエリの種類を分類"""
    SIMPLE_FACT = "simple_fact"  # 単純な事実確認
    CODE_SEARCH = "code_search"  # コード検索
    EXPLANATION = "explanation"  # 説明を求める
    COMPARISON = "comparison"  # 比較
    DEBUGGING = "debugging"  # デバッグ支援
    OPTIMIZATION = "optimization"  # 最適化提案
    MULTI_HOP = "multi_hop"  # 複数ステップの推論が必要


class Strategy(Enum):
    """実行戦略の種類"""
    SIMPLE_RAG = "simple_rag"  # 単純なRAG検索
    HYBRID_SEARCH = "hybrid_search"  # ハイブリッド検索
    QUERY_DECOMPOSITION = "query_decomposition"  # クエリ分解
    STEP_BACK = "step_back"  # ステップバックプロンプティング
    RAG_FUSION = "rag_fusion"  # RAG-Fusion (複数クエリ生成)
    GRAPH_REASONING = "graph_reasoning"  # グラフ推論
    ITERATIVE_REFINEMENT = "iterative_refinement"  # 反復改善


@dataclass
class Task:
    """個別タスクの定義"""
    task_id: str
    task_type: str
    description: str
    agent_id: str
    dependencies: List[str] = field(default_factory=list)
    input_data: Dict[str, Any] = field(default_factory=dict)
    output_data: Dict[str, Any] = field(default_factory=dict)
    status: str = "pending"  # pending, in_progress, completed, failed
    start_time: Optional[float] = None
    end_time: Optional[float] = None
    error: Optional[str] = None


@dataclass
class ExecutionPlan:
    """実行計画（DAG）"""
    plan_id: str
    query: str
    query_type: QueryType
    strategy: Strategy
    tasks: List[Task]
    estimated_time: float = 0.0
    estimated_cost: float = 0.0
    priority: int = 0  # 0-10, 10が最高


class MasterOrchestrator:
    """
    マスター・オーケストレーター

    役割:
    1. クエリ解析と分類
    2. 最適な戦略の選択
    3. タスクDAGの生成
    4. エージェント間の協調制御
    5. 進捗監視とエラーハンドリング
    6. 最終回答の統合
    """

    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.blackboard_path = config.get('blackboard_path',
                                          'deliverable/reporting/blackboard_state.json')
        self.execution_plans: Dict[str, ExecutionPlan] = {}
        self.available_agents = self._load_available_agents()

        # 戦略ごとの成功率と実行時間の統計（メタ学習用）
        self.strategy_stats = {
            Strategy.SIMPLE_RAG: {'success_rate': 0.85, 'avg_time': 2.5},
            Strategy.HYBRID_SEARCH: {'success_rate': 0.92, 'avg_time': 3.8},
            Strategy.QUERY_DECOMPOSITION: {'success_rate': 0.88, 'avg_time': 5.2},
            Strategy.STEP_BACK: {'success_rate': 0.90, 'avg_time': 4.1},
            Strategy.RAG_FUSION: {'success_rate': 0.94, 'avg_time': 6.5},
            Strategy.GRAPH_REASONING: {'success_rate': 0.91, 'avg_time': 7.0},
            Strategy.ITERATIVE_REFINEMENT: {'success_rate': 0.89, 'avg_time': 8.5},
        }

    def _load_available_agents(self) -> Dict[str, Dict[str, Any]]:
        """利用可能なエージェントのリストをロード"""
        agents = {
            'coordinator': {'type': 'orchestration', 'capabilities': ['task_dispatch']},
            'auth': {'type': 'security', 'capabilities': ['authentication', 'authorization']},
            'rag': {'type': 'retrieval', 'capabilities': ['simple_search']},
            'blackboard': {'type': 'state', 'capabilities': ['state_management']},
            'evaluator': {'type': 'evaluation', 'capabilities': ['scoring']},

            # 新規RAGエージェント (Phase 1で追加予定)
            'hybrid_search': {'type': 'retrieval', 'capabilities': ['bm25', 'dense', 'splade']},
            'reranking': {'type': 'retrieval', 'capabilities': ['cross_encoder', 'llm_rerank']},
            'query_transformation': {'type': 'query', 'capabilities': ['decomposition', 'step_back', 'fusion']},
            'rag_triad': {'type': 'evaluation', 'capabilities': ['context_relevance', 'groundedness', 'answer_relevance']},
        }
        return agents

    def analyze_query(self, query: str) -> Dict[str, Any]:
        """
        クエリを分析して種類を判定

        Returns:
            - query_type: QueryType
            - complexity: int (1-10)
            - keywords: List[str]
            - intent: str
        """
        query_lower = query.lower()

        # キーワードベースの分類（本来はLLMベースの分類が理想）
        if any(word in query_lower for word in ['debug', 'fix', 'error', 'bug']):
            query_type = QueryType.DEBUGGING
        elif any(word in query_lower for word in ['optimize', 'improve', 'performance']):
            query_type = QueryType.OPTIMIZATION
        elif any(word in query_lower for word in ['compare', 'difference', 'vs', 'versus']):
            query_type = QueryType.COMPARISON
        elif any(word in query_lower for word in ['explain', 'how', 'why', 'what']):
            query_type = QueryType.EXPLANATION
        elif any(word in query_lower for word in ['function', 'class', 'method', 'code']):
            query_type = QueryType.CODE_SEARCH
        else:
            query_type = QueryType.SIMPLE_FACT

        # 複雑度の推定
        complexity = self._estimate_complexity(query)

        # キーワード抽出（簡易版）
        keywords = [word for word in query.split() if len(word) > 3][:5]

        # 意図の推定
        intent = self._infer_intent(query, query_type)

        return {
            'query_type': query_type,
            'complexity': complexity,
            'keywords': keywords,
            'intent': intent,
        }

    def _estimate_complexity(self, query: str) -> int:
        """クエリの複雑度を1-10で推定"""
        complexity = 1

        # 長さによる複雑度
        word_count = len(query.split())
        if word_count > 50:
            complexity += 3
        elif word_count > 20:
            complexity += 2
        elif word_count > 10:
            complexity += 1

        # 論理演算子の存在
        logical_ops = ['and', 'or', 'not', 'but', 'also']
        complexity += sum(1 for op in logical_ops if op in query.lower())

        # 疑問詞の数
        question_words = ['what', 'why', 'how', 'when', 'where', 'who']
        complexity += sum(1 for word in question_words if word in query.lower())

        return min(complexity, 10)

    def _infer_intent(self, query: str, query_type: QueryType) -> str:
        """ユーザーの意図を推定"""
        intents = {
            QueryType.SIMPLE_FACT: "ユーザーは特定の事実を知りたい",
            QueryType.CODE_SEARCH: "ユーザーは特定のコードを見つけたい",
            QueryType.EXPLANATION: "ユーザーは概念や動作を理解したい",
            QueryType.COMPARISON: "ユーザーは複数の選択肢を比較して決定したい",
            QueryType.DEBUGGING: "ユーザーは問題を解決したい",
            QueryType.OPTIMIZATION: "ユーザーはパフォーマンスを向上させたい",
            QueryType.MULTI_HOP: "ユーザーは複数ステップの推論結果を求めている",
        }
        return intents.get(query_type, "意図不明")

    def select_strategy(self, analysis: Dict[str, Any]) -> Strategy:
        """
        クエリ分析結果から最適な戦略を選択

        選択基準:
        1. クエリの種類
        2. 複雑度
        3. 過去の成功率
        4. 実行時間の制約
        """
        query_type = analysis['query_type']
        complexity = analysis['complexity']

        # 単純なクエリ → Simple RAG
        if complexity <= 3:
            return Strategy.SIMPLE_RAG

        # コード検索 → Hybrid Search
        if query_type == QueryType.CODE_SEARCH:
            return Strategy.HYBRID_SEARCH

        # 複雑な説明 → Step Back
        if query_type == QueryType.EXPLANATION and complexity >= 7:
            return Strategy.STEP_BACK

        # 比較 → Query Decomposition
        if query_type == QueryType.COMPARISON:
            return Strategy.QUERY_DECOMPOSITION

        # デバッグ → RAG Fusion
        if query_type == QueryType.DEBUGGING:
            return Strategy.RAG_FUSION

        # グラフ推論が必要
        if query_type == QueryType.OPTIMIZATION and complexity >= 8:
            return Strategy.GRAPH_REASONING

        # デフォルトはHybrid Search
        return Strategy.HYBRID_SEARCH

    def create_execution_plan(self, query: str) -> ExecutionPlan:
        """
        クエリから実行計画（DAG）を生成

        Steps:
        1. クエリ分析
        2. 戦略選択
        3. タスク分解
        4. 依存関係の定義
        5. エージェント割り当て
        """
        # 1. クエリ分析
        analysis = self.analyze_query(query)

        # 2. 戦略選択
        strategy = self.select_strategy(analysis)

        # 3. タスク分解（戦略ごとに異なる）
        tasks = self._decompose_to_tasks(query, strategy, analysis)

        # 4. 実行計画の作成
        plan_id = f"plan_{int(time.time() * 1000)}"
        plan = ExecutionPlan(
            plan_id=plan_id,
            query=query,
            query_type=analysis['query_type'],
            strategy=strategy,
            tasks=tasks,
            estimated_time=self._estimate_execution_time(tasks, strategy),
            estimated_cost=self._estimate_cost(tasks, strategy),
            priority=self._calculate_priority(analysis)
        )

        self.execution_plans[plan_id] = plan
        return plan

    def _decompose_to_tasks(self, query: str, strategy: Strategy,
                           analysis: Dict[str, Any]) -> List[Task]:
        """戦略に基づいてタスクに分解"""
        tasks = []

        if strategy == Strategy.SIMPLE_RAG:
            # Task 1: Simple search
            tasks.append(Task(
                task_id="task_1",
                task_type="search",
                description="Simple RAG search",
                agent_id="rag",
                input_data={'query': query}
            ))
            # Task 2: Generate answer
            tasks.append(Task(
                task_id="task_2",
                task_type="generation",
                description="Generate answer from context",
                agent_id="generative",
                dependencies=["task_1"],
                input_data={'query': query}
            ))

        elif strategy == Strategy.HYBRID_SEARCH:
            # Task 1: Hybrid search (BM25 + Dense + SPLADE)
            tasks.append(Task(
                task_id="task_1",
                task_type="hybrid_search",
                description="Hybrid search with BM25, Dense, SPLADE",
                agent_id="hybrid_search",
                input_data={'query': query}
            ))
            # Task 2: Reranking
            tasks.append(Task(
                task_id="task_2",
                task_type="reranking",
                description="Rerank search results",
                agent_id="reranking",
                dependencies=["task_1"],
                input_data={'query': query}
            ))
            # Task 3: Generate answer
            tasks.append(Task(
                task_id="task_3",
                task_type="generation",
                description="Generate answer from reranked context",
                agent_id="generative",
                dependencies=["task_2"],
                input_data={'query': query}
            ))

        elif strategy == Strategy.RAG_FUSION:
            # Task 1: Generate multiple query variations
            tasks.append(Task(
                task_id="task_1",
                task_type="query_generation",
                description="Generate query variations",
                agent_id="query_transformation",
                input_data={'query': query, 'method': 'rag_fusion'}
            ))
            # Task 2: Parallel searches
            for i in range(3):  # 3つの並列検索
                tasks.append(Task(
                    task_id=f"task_2_{i}",
                    task_type="parallel_search",
                    description=f"Search with query variation {i+1}",
                    agent_id="hybrid_search",
                    dependencies=["task_1"],
                    input_data={'query_index': i}
                ))
            # Task 3: Reciprocal Rank Fusion
            tasks.append(Task(
                task_id="task_3",
                task_type="fusion",
                description="Reciprocal Rank Fusion",
                agent_id="rag_fusion",
                dependencies=[f"task_2_{i}" for i in range(3)],
                input_data={'fusion_method': 'rrf'}
            ))
            # Task 4: Generate answer
            tasks.append(Task(
                task_id="task_4",
                task_type="generation",
                description="Generate answer from fused results",
                agent_id="generative",
                dependencies=["task_3"],
                input_data={'query': query}
            ))

        elif strategy == Strategy.QUERY_DECOMPOSITION:
            # Task 1: Decompose query
            tasks.append(Task(
                task_id="task_1",
                task_type="decomposition",
                description="Decompose complex query",
                agent_id="query_transformation",
                input_data={'query': query, 'method': 'decomposition'}
            ))
            # Task 2-N: Search for each subquery
            # (実際には動的に生成)
            for i in range(3):  # 仮に3つのサブクエリ
                tasks.append(Task(
                    task_id=f"task_2_{i}",
                    task_type="subquery_search",
                    description=f"Search subquery {i+1}",
                    agent_id="hybrid_search",
                    dependencies=["task_1"],
                    input_data={'subquery_index': i}
                ))
            # Task 3: Integrate results
            tasks.append(Task(
                task_id="task_3",
                task_type="integration",
                description="Integrate subquery results",
                agent_id="result_integrator",
                dependencies=[f"task_2_{i}" for i in range(3)],
                input_data={'query': query}
            ))
            # Task 4: Generate answer
            tasks.append(Task(
                task_id="task_4",
                task_type="generation",
                description="Generate integrated answer",
                agent_id="generative",
                dependencies=["task_3"],
                input_data={'query': query}
            ))

        # 他の戦略も同様に定義...

        return tasks

    def _estimate_execution_time(self, tasks: List[Task], strategy: Strategy) -> float:
        """実行時間を推定（秒）"""
        stats = self.strategy_stats.get(strategy, {'avg_time': 5.0})
        return stats['avg_time']

    def _estimate_cost(self, tasks: List[Task], strategy: Strategy) -> float:
        """コスト推定（ドル）"""
        # タスク数とLLM呼び出し回数から推定
        llm_calls = sum(1 for t in tasks if t.task_type in ['generation', 'reranking', 'query_generation'])
        cost_per_call = 0.01  # 仮の値
        return llm_calls * cost_per_call

    def _calculate_priority(self, analysis: Dict[str, Any]) -> int:
        """優先度を計算（0-10）"""
        priority = 5  # デフォルト

        # 複雑度が高い → 優先度を上げる
        if analysis['complexity'] >= 8:
            priority += 2

        # デバッグやエラー関連 → 優先度を上げる
        if analysis['query_type'] == QueryType.DEBUGGING:
            priority += 3

        return min(priority, 10)

    def execute_plan(self, plan: ExecutionPlan) -> Dict[str, Any]:
        """
        実行計画を実行

        Returns:
            - success: bool
            - result: Any
            - execution_time: float
            - metadata: Dict
        """
        start_time = time.time()

        print(f"[Orchestrator] Executing plan: {plan.plan_id}")
        print(f"  Strategy: {plan.strategy.value}")
        print(f"  Tasks: {len(plan.tasks)}")
        print(f"  Estimated time: {plan.estimated_time:.2f}s")

        # タスクの実行（トポロジカルソート順）
        completed_tasks = set()
        results = {}

        while len(completed_tasks) < len(plan.tasks):
            # 依存関係を満たしているタスクを実行
            for task in plan.tasks:
                if task.task_id in completed_tasks:
                    continue

                # 依存タスクが全て完了しているか確認
                if all(dep in completed_tasks for dep in task.dependencies):
                    # タスク実行
                    task_result = self._execute_task(task, results)
                    results[task.task_id] = task_result
                    completed_tasks.add(task.task_id)

                    # Blackboardに記録
                    self._log_to_blackboard(plan, task, task_result)

        execution_time = time.time() - start_time

        # 最終結果の取得（最後のタスクの結果）
        final_task = plan.tasks[-1]
        final_result = results.get(final_task.task_id, {})

        # 統計情報の更新（メタ学習）
        self._update_strategy_stats(plan.strategy, True, execution_time)

        return {
            'success': True,
            'result': final_result,
            'execution_time': execution_time,
            'metadata': {
                'plan_id': plan.plan_id,
                'strategy': plan.strategy.value,
                'tasks_executed': len(plan.tasks),
                'estimated_time': plan.estimated_time,
                'actual_time': execution_time,
            }
        }

    def _execute_task(self, task: Task, previous_results: Dict[str, Any]) -> Dict[str, Any]:
        """個別タスクを実行"""
        print(f"  [Task] {task.task_id}: {task.description}")

        task.status = "in_progress"
        task.start_time = time.time()

        try:
            # エージェントに処理を委譲（実際の実装では各エージェントを呼び出す）
            # ここでは簡易的なシミュレーション
            time.sleep(0.1)  # 実行時間のシミュレーション

            result = {
                'task_id': task.task_id,
                'status': 'success',
                'output': f'Result of {task.task_id}',
                'agent': task.agent_id,
            }

            task.status = "completed"
            task.output_data = result

        except Exception as e:
            task.status = "failed"
            task.error = str(e)
            result = {
                'task_id': task.task_id,
                'status': 'failed',
                'error': str(e)
            }

        task.end_time = time.time()
        return result

    def _log_to_blackboard(self, plan: ExecutionPlan, task: Task, result: Dict[str, Any]):
        """Blackboardに実行ログを記録"""
        try:
            blackboard_path = Path(self.blackboard_path)

            if blackboard_path.exists():
                with open(blackboard_path, 'r') as f:
                    state = json.load(f)
            else:
                state = {'executions': []}

            # 実行記録を追加
            execution = {
                'timestamp': time.time(),
                'plan_id': plan.plan_id,
                'task_id': task.task_id,
                'agent_id': task.agent_id,
                'status': task.status,
                'result': result
            }

            if 'executions' not in state:
                state['executions'] = []

            state['executions'].append(execution)

            # 保存
            blackboard_path.parent.mkdir(parents=True, exist_ok=True)
            with open(blackboard_path, 'w') as f:
                json.dump(state, f, indent=2)

        except Exception as e:
            print(f"[Warning] Failed to log to blackboard: {e}")

    def _update_strategy_stats(self, strategy: Strategy, success: bool, execution_time: float):
        """戦略の統計情報を更新（メタ学習）"""
        if strategy not in self.strategy_stats:
            self.strategy_stats[strategy] = {
                'success_rate': 0.85,
                'avg_time': 5.0,
                'total_executions': 0
            }

        stats = self.strategy_stats[strategy]

        # 成功率の更新（指数移動平均）
        alpha = 0.1
        stats['success_rate'] = (1 - alpha) * stats['success_rate'] + alpha * (1.0 if success else 0.0)

        # 実行時間の更新
        stats['avg_time'] = (1 - alpha) * stats['avg_time'] + alpha * execution_time

        stats['total_executions'] = stats.get('total_executions', 0) + 1

    def run(self, query: str) -> Dict[str, Any]:
        """
        メインエントリーポイント

        Args:
            query: ユーザーからのクエリ

        Returns:
            実行結果
        """
        print(f"\n{'='*80}")
        print(f"[Master Orchestrator] Processing query: {query}")
        print(f"{'='*80}\n")

        # 1. 実行計画の作成
        plan = self.create_execution_plan(query)

        print(f"[Analysis]")
        print(f"  Query Type: {plan.query_type.value}")
        print(f"  Strategy: {plan.strategy.value}")
        print(f"  Estimated Time: {plan.estimated_time:.2f}s")
        print(f"  Estimated Cost: ${plan.estimated_cost:.4f}")
        print(f"  Priority: {plan.priority}/10")
        print()

        # 2. 実行計画の実行
        result = self.execute_plan(plan)

        print(f"\n[Execution Complete]")
        print(f"  Actual Time: {result['execution_time']:.2f}s")
        print(f"  Success: {result['success']}")
        print(f"{'='*80}\n")

        return result


def main():
    """テスト実行"""
    config = {
        'blackboard_path': 'deliverable/reporting/blackboard_state.json'
    }

    orchestrator = MasterOrchestrator(config)

    # テストクエリ
    test_queries = [
        "getUserById関数はどこで定義されていますか？",
        "認証システムの仕組みを説明してください",
        "REST APIとGraphQLを比較してください",
        "ログイン時のエラーをデバッグしてください",
        "データベースクエリのパフォーマンスを最適化したい",
    ]

    for query in test_queries:
        result = orchestrator.run(query)
        print(f"Result: {json.dumps(result, indent=2, ensure_ascii=False)}\n")


if __name__ == "__main__":
    main()
