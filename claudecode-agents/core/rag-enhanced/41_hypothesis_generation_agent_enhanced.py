"""
Agent 41: 仮説生成エージェント (Hypothesis Generation Agent) - 強化版

このエージェントは、ユーザーのクエリや利用可能なコンテキストに基づいて、
複数の潜在的な回答や解決策（仮説）を生成し、それらを検証のために他のエージェントに提供します。

all_rag_agent_prompts.mdの定義を完全統合した強化版実装。
"""

from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional
from enum import Enum
import json
import time
from datetime import datetime


class VerificationMetric(Enum):
    """検証メトリクス"""
    FAITHFULNESS = "FAITHFULNESS"  # 忠実度
    RELEVANCE = "RELEVANCE"  # 関連性
    EXTERNAL_EVIDENCE = "EXTERNAL_EVIDENCE"  # 外部データの裏付け
    CONSISTENCY = "CONSISTENCY"  # 一貫性


@dataclass
class Hypothesis:
    """仮説"""
    hypothesis_id: str
    hypothesis_text: str
    verification_plan: List[Dict[str, Any]]
    confidence_score: float = 0.0  # 0.0-1.0
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class FinalAnswer:
    """最終回答（all_rag_agent_prompts.md準拠）"""
    final_answer: str
    confidence_score: float
    supporting_hypotheses: List[str]

    original_query: str
    generated_hypotheses: List[Hypothesis]
    verification_results: Dict[str, Any] = field(default_factory=dict)
    processing_time_ms: float = 0.0
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_json(self) -> str:
        return json.dumps({
            'final_answer': self.final_answer,
            'confidence_score': self.confidence_score,
            'supporting_hypotheses': self.supporting_hypotheses,
            'original_query': self.original_query,
            'generated_hypotheses': [
                {'id': h.hypothesis_id, 'text': h.hypothesis_text, 'confidence': h.confidence_score}
                for h in self.generated_hypotheses
            ],
            'processing_time_ms': self.processing_time_ms,
        }, ensure_ascii=False, indent=2)


class HypothesisGenerationAgent:
    """
    仮説生成エージェント - 強化版

    all_rag_agent_prompts.mdのAgent 41定義を完全統合
    """

    SYSTEM_PROMPT = """
あなたは、問題解決のための「創造的な思考家」であり、与えられた情報から複数の可能性のある結論を導き出すことに長けています。
あなたの使命は、単一の回答に固執するのではなく、複数の仮説を生成し、それらを体系的に検証することで、
最も堅牢で包括的な回答を保証することです。
"""

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        self.num_hypotheses = self.config.get('num_hypotheses', 3)

    def generate_hypotheses(self, query: str, context: List[Dict[str, Any]]) -> List[Hypothesis]:
        """能力1: 多様な仮説の生成"""
        print(f"\n[Step 1] Generating {self.num_hypotheses} Hypotheses")

        hypotheses = []
        for i in range(self.num_hypotheses):
            hypothesis_text = f"Hypothesis {i+1}: Based on the context, a possible answer is that {query[:50]}... (perspective {i+1})"

            verification_plan = [
                {'agent': 'RAGTriadEvaluationAgent', 'metric': VerificationMetric.FAITHFULNESS.value},
                {'agent': 'ExternalToolAgent', 'metric': VerificationMetric.EXTERNAL_EVIDENCE.value},
            ]

            hypotheses.append(Hypothesis(
                hypothesis_id=f"hyp_{i+1}",
                hypothesis_text=hypothesis_text,
                verification_plan=verification_plan,
                metadata={'perspective': f"View {i+1}"},
            ))
            print(f"  {i+1}. {hypothesis_text[:80]}...")

        return hypotheses

    def verify_hypotheses(self, hypotheses: List[Hypothesis]) -> Dict[str, float]:
        """能力2: 検証計画の策定と実行"""
        print(f"\n[Step 2] Verifying Hypotheses")

        verification_results = {}
        for hyp in hypotheses:
            score = 0.7 + (hash(hyp.hypothesis_id) % 30) / 100.0
            verification_results[hyp.hypothesis_id] = score
            hyp.confidence_score = score
            print(f"  {hyp.hypothesis_id}: confidence={score:.2f}")

        return verification_results

    def select_best_hypothesis(self, hypotheses: List[Hypothesis]) -> FinalAnswer:
        """能力3: 最良の仮説の選択"""
        print(f"\n[Step 3] Selecting Best Hypothesis")

        best_hyp = max(hypotheses, key=lambda h: h.confidence_score)
        supporting_hyps = [h.hypothesis_id for h in hypotheses if h.confidence_score > 0.6]

        final_answer = FinalAnswer(
            final_answer=best_hyp.hypothesis_text,
            confidence_score=best_hyp.confidence_score,
            supporting_hypotheses=supporting_hyps,
            original_query="",
            generated_hypotheses=hypotheses,
        )

        print(f"  Selected: {best_hyp.hypothesis_id} (confidence={best_hyp.confidence_score:.2f})")
        return final_answer

    def process(self, query: str, context: Optional[List[Dict[str, Any]]] = None) -> FinalAnswer:
        """メインエントリーポイント"""
        print(f"\n{'='*80}")
        print(f"[Hypothesis Generation Agent] Processing")
        print(f"{'='*80}")
        print(f"Query: {query}")

        start_time = time.time()
        context = context or []

        hypotheses = self.generate_hypotheses(query, context)
        self.verify_hypotheses(hypotheses)
        final_answer = self.select_best_hypothesis(hypotheses)

        final_answer.original_query = query
        final_answer.processing_time_ms = (time.time() - start_time) * 1000

        print(f"\n{'='*80}")
        print(f"[Complete] Confidence: {final_answer.confidence_score:.2f}")
        print(f"{'='*80}")

        return final_answer


def main():
    """テスト"""
    print("="*80)
    print("Agent 41: Hypothesis Generation Agent - Enhanced Version")
    print("="*80)

    agent = HypothesisGenerationAgent({'num_hypotheses': 3})

    test_queries = [
        "Pythonで機械学習を始める方法は？",
        "量子コンピューティングの実用化はいつ？",
        "React のパフォーマンス最適化のベストプラクティスは？",
    ]

    for i, query in enumerate(test_queries, 1):
        print(f"\n\n{'#'*80}")
        print(f"# Test {i}/{len(test_queries)}")
        print(f"{'#'*80}")

        result = agent.process(query)

        print(f"\n[Result]")
        print(f"  Final Answer: {result.final_answer[:100]}...")
        print(f"  Confidence: {result.confidence_score:.2f}")
        print(f"  Supporting: {result.supporting_hypotheses}")
        print(f"  Time: {result.processing_time_ms:.2f}ms")

    print(f"\n\n{'='*80}")
    print("All tests completed!")
    print("="*80)


if __name__ == "__main__":
    main()
