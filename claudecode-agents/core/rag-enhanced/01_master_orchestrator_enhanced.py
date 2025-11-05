#!/usr/bin/env python3
"""
マスターオーケストレーターエージェント - 強化版 (Master Orchestrator Agent - Enhanced)

RAGシステム全体の統括・調整を行う中央コーディネーター

Author: Claude Code 42-Agent System
Version: 2.0.0
"""

import json
import time
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field
from enum import Enum


class ProcessingStage(Enum):
    """処理ステージ"""
    RECEIVED = "RECEIVED"
    QUERY_TRANSFORMATION = "QUERY_TRANSFORMATION"
    RETRIEVAL = "RETRIEVAL"
    GENERATION = "GENERATION"
    COMPLETED = "COMPLETED"
    ERROR = "ERROR"


@dataclass
class OrchestrationTask:
    """オーケストレーションタスク"""
    task_id: str
    original_query: str
    stage: ProcessingStage
    transformed_queries: List[str] = field(default_factory=list)
    retrieved_context: List[Dict] = field(default_factory=list)
    generated_answer: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)
    error: Optional[str] = None


@dataclass
class OrchestrationResult:
    """オーケストレーション結果"""
    task_id: str
    original_query: str
    final_answer: str
    context_used: List[Dict]
    processing_time: float
    stages_completed: List[str]
    metadata: Dict[str, Any] = field(default_factory=dict)


class MasterOrchestratorAgent:
    """
    マスターオーケストレーターエージェント

    ## 役割
    RAGシステム全体の中央コーディネーター

    ## 責任
    1. ユーザークエリを受信し、全エージェントを調整
    2. クエリ→レスポンスのパイプラインを管理
    3. エラー回復とシステム全体の調整
    4. 適切な専門エージェントへのタスクルーティング
    """

    SYSTEM_PROMPT = """
あなたはRAGシステムのマスターオーケストレーターです。
全てのエージェントを統括し、ユーザーの質問に対して最適な回答を生成するために
各専門エージェントを調整します。

**主な責任:**
1. クエリ受信と前処理
2. Query Transformation Agentへのクエリ変換依頼
3. Retrieval Manager Agentへの検索依頼
4. Generative Agentへの回答生成依頼
5. エラー処理とリトライ戦略
6. 全体のパフォーマンスモニタリング
"""

    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.task_history: List[OrchestrationTask] = []
        self.agent_registry: Dict[str, Any] = {}

    def register_agent(self, agent_name: str, agent_instance: Any):
        """エージェントを登録"""
        self.agent_registry[agent_name] = agent_instance
        print(f"[Orchestrator] Registered agent: {agent_name}")

    def process_query(self, query: str, options: Optional[Dict] = None) -> OrchestrationResult:
        """
        クエリを処理（メインエントリーポイント）

        Args:
            query: ユーザークエリ
            options: 処理オプション

        Returns:
            OrchestrationResult
        """
        start_time = time.time()
        task_id = f"task_{int(time.time() * 1000)}"

        print(f"\n{'='*80}")
        print(f"[Master Orchestrator] Processing Query")
        print(f"  Task ID: {task_id}")
        print(f"  Query: {query}")
        print(f"{'='*80}\n")

        # タスク作成
        task = OrchestrationTask(
            task_id=task_id,
            original_query=query,
            stage=ProcessingStage.RECEIVED,
            metadata={'start_time': start_time, 'options': options or {}}
        )

        try:
            # Stage 1: Query Transformation
            task.stage = ProcessingStage.QUERY_TRANSFORMATION
            transformed = self._transform_query(query, options)
            task.transformed_queries = transformed
            print(f"[Stage 1] Query Transformation Complete: {len(transformed)} queries")

            # Stage 2: Retrieval
            task.stage = ProcessingStage.RETRIEVAL
            context = self._retrieve_context(transformed, options)
            task.retrieved_context = context
            print(f"[Stage 2] Retrieval Complete: {len(context)} documents")

            # Stage 3: Generation
            task.stage = ProcessingStage.GENERATION
            answer = self._generate_answer(query, context, options)
            task.generated_answer = answer
            print(f"[Stage 3] Generation Complete")

            # Complete
            task.stage = ProcessingStage.COMPLETED
            processing_time = time.time() - start_time

            result = OrchestrationResult(
                task_id=task_id,
                original_query=query,
                final_answer=answer,
                context_used=context,
                processing_time=processing_time,
                stages_completed=[s.value for s in [
                    ProcessingStage.QUERY_TRANSFORMATION,
                    ProcessingStage.RETRIEVAL,
                    ProcessingStage.GENERATION,
                    ProcessingStage.COMPLETED
                ]],
                metadata={
                    'num_transformed_queries': len(transformed),
                    'num_context_docs': len(context),
                    'answer_length': len(answer)
                }
            )

            print(f"\n{'='*80}")
            print(f"[Orchestration Complete]")
            print(f"  Task ID: {task_id}")
            print(f"  Processing Time: {processing_time:.3f}s")
            print(f"  Answer Length: {len(answer)} chars")
            print(f"{'='*80}\n")

            return result

        except Exception as e:
            task.stage = ProcessingStage.ERROR
            task.error = str(e)
            print(f"\n[ERROR] Orchestration failed: {e}")
            raise
        finally:
            self.task_history.append(task)

    def _transform_query(self, query: str, options: Optional[Dict]) -> List[str]:
        """クエリ変換（Query Transformation Agent呼び出し）"""
        # Agent 02を呼び出す想定
        if 'query_transformation_agent' in self.agent_registry:
            agent = self.agent_registry['query_transformation_agent']
            result = agent.transform(query)
            return result.get('transformed_queries', [query])

        # デフォルト: 元のクエリのみ
        return [query]

    def _retrieve_context(self, queries: List[str], options: Optional[Dict]) -> List[Dict]:
        """コンテキスト検索（Retrieval Manager Agent呼び出し）"""
        # Agent 03を呼び出す想定
        if 'retrieval_manager_agent' in self.agent_registry:
            agent = self.agent_registry['retrieval_manager_agent']
            result = agent.retrieve(queries)
            return result.get('documents', [])

        # デフォルト: 空のコンテキスト
        return []

    def _generate_answer(self, query: str, context: List[Dict], options: Optional[Dict]) -> str:
        """回答生成（Generative Agent呼び出し）"""
        # Agent 04を呼び出す想定
        if 'generative_agent' in self.agent_registry:
            agent = self.agent_registry['generative_agent']
            result = agent.generate(query, context)
            return result.get('answer', '')

        # デフォルト: プレースホルダー
        return f"Answer to: {query} (using {len(context)} context documents)"

    def get_statistics(self) -> Dict[str, Any]:
        """統計情報を取得"""
        total_tasks = len(self.task_history)
        completed = sum(1 for t in self.task_history if t.stage == ProcessingStage.COMPLETED)
        errors = sum(1 for t in self.task_history if t.stage == ProcessingStage.ERROR)

        return {
            'total_tasks': total_tasks,
            'completed': completed,
            'errors': errors,
            'success_rate': completed / total_tasks if total_tasks > 0 else 0,
            'registered_agents': list(self.agent_registry.keys())
        }


def main():
    """テスト実行"""
    config = {}
    orchestrator = MasterOrchestratorAgent(config)

    # テストクエリ
    test_queries = [
        "What is RAG?",
        "How do vector databases work?",
        "Explain transformer architecture"
    ]

    for query in test_queries:
        result = orchestrator.process_query(query)
        print(f"\n[Result]")
        print(f"  Query: {result.original_query}")
        print(f"  Answer: {result.final_answer}")
        print(f"  Time: {result.processing_time:.3f}s")

    # 統計表示
    stats = orchestrator.get_statistics()
    print(f"\n[Statistics]")
    print(json.dumps(stats, indent=2))


if __name__ == "__main__":
    main()
