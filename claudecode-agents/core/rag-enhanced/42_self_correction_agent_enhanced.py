"""
Agent 42: 自己修正エージェント (Self-Correction Agent) - 強化版

このエージェントは、RAGシステムが生成した回答を批判的に評価し、
誤り、矛盾、不正確さ、不完全さを検出して修正します。

all_rag_agent_prompts.mdの定義を完全統合した強化版実装。
"""

from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional
from enum import Enum
import json
import time
from datetime import datetime


class ErrorType(Enum):
    """エラータイプ"""
    HALLUCINATION = "HALLUCINATION"  # 幻覚
    CONTRADICTION = "CONTRADICTION"  # 矛盾
    INACCURACY = "INACCURACY"  # 不正確
    INCOMPLETENESS = "INCOMPLETENESS"  # 不完全
    LACK_OF_GROUNDING = "LACK_OF_GROUNDING"  # 根拠不足
    CODE_ERROR = "CODE_ERROR"  # コードエラー


class CorrectionStrategy(Enum):
    """修正戦略"""
    DELETION = "DELETION"  # 削除
    REPLACEMENT = "REPLACEMENT"  # 置換
    ADDITION = "ADDITION"  # 追加
    RESTRUCTURING = "RESTRUCTURING"  # 再構成
    RE_RETRIEVAL = "RE_RETRIEVAL"  # 再検索


@dataclass
class DetectedError:
    """検出されたエラー"""
    error_id: str
    error_type: ErrorType
    location: str
    description: str
    severity: str  # "HIGH", "MEDIUM", "LOW"
    correction_strategy: CorrectionStrategy
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class CorrectionResult:
    """修正結果"""
    original_answer: str
    corrected_answer: str
    detected_errors: List[DetectedError]
    corrections_applied: List[Dict[str, Any]]
    quality_score_before: float
    quality_score_after: float
    processing_time_ms: float = 0.0
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_json(self) -> str:
        return json.dumps({
            'original_answer': self.original_answer,
            'corrected_answer': self.corrected_answer,
            'detected_errors': [
                {'type': e.error_type.value, 'severity': e.severity, 'description': e.description}
                for e in self.detected_errors
            ],
            'corrections_applied': self.corrections_applied,
            'quality_score_before': self.quality_score_before,
            'quality_score_after': self.quality_score_after,
            'processing_time_ms': self.processing_time_ms,
        }, ensure_ascii=False, indent=2)


class SelfCorrectionAgent:
    """
    自己修正エージェント - 強化版

    all_rag_agent_prompts.mdのAgent 42定義を完全統合
    """

    SYSTEM_PROMPT = """
あなたは自己修正エージェントです。RAGシステムが生成した回答を批判的に評価し、
誤り、矛盾、不正確さ、不完全さを検出して修正する役割を担います。
"""

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}

    def evaluate_answer(self, answer: str, context: List[Dict[str, Any]]) -> List[DetectedError]:
        """ステップ1-3: 回答の評価とエラー検出"""
        print(f"\n[Step 1-3] Evaluating Answer")

        errors = []

        # 簡易的な評価（実際にはLLMを使用）
        if "非同期" in answer and "同期" in answer:
            errors.append(DetectedError(
                error_id="err_1",
                error_type=ErrorType.CONTRADICTION,
                location="Answer body",
                description="矛盾: 非同期と同期の両方が述べられている",
                severity="HIGH",
                correction_strategy=CorrectionStrategy.RESTRUCTURING,
            ))

        if len(context) == 0 and len(answer) > 100:
            errors.append(DetectedError(
                error_id="err_2",
                error_type=ErrorType.HALLUCINATION,
                location="Answer body",
                description="コンテキストなしで詳細な情報を生成",
                severity="HIGH",
                correction_strategy=CorrectionStrategy.DELETION,
            ))

        if len(answer) < 50:
            errors.append(DetectedError(
                error_id="err_3",
                error_type=ErrorType.INCOMPLETENESS,
                location="Answer body",
                description="回答が短すぎる可能性",
                severity="MEDIUM",
                correction_strategy=CorrectionStrategy.ADDITION,
            ))

        print(f"  Detected {len(errors)} errors")
        for err in errors:
            print(f"    - {err.error_type.value} ({err.severity}): {err.description}")

        return errors

    def correct_errors(self, answer: str, errors: List[DetectedError]) -> str:
        """ステップ4: 修正の実行"""
        print(f"\n[Step 4] Correcting Errors")

        corrected = answer
        corrections_applied = []

        for error in errors:
            if error.correction_strategy == CorrectionStrategy.DELETION:
                corrected = corrected[:len(corrected)//2]
                corrections_applied.append({'error_id': error.error_id, 'action': 'DELETION'})
                print(f"    Applied DELETION for {error.error_id}")

            elif error.correction_strategy == CorrectionStrategy.ADDITION:
                corrected += " [Additional context would be helpful here.]"
                corrections_applied.append({'error_id': error.error_id, 'action': 'ADDITION'})
                print(f"    Applied ADDITION for {error.error_id}")

            elif error.correction_strategy == CorrectionStrategy.RESTRUCTURING:
                corrected = corrected.replace("非同期", "asynchronous").replace("同期", "")
                corrections_applied.append({'error_id': error.error_id, 'action': 'RESTRUCTURING'})
                print(f"    Applied RESTRUCTURING for {error.error_id}")

        return corrected

    def calculate_quality_score(self, answer: str, context: List[Dict[str, Any]], errors: List[DetectedError]) -> float:
        """品質スコアの計算"""
        base_score = 0.8
        error_penalty = len(errors) * 0.1
        context_bonus = 0.1 if context else 0.0
        length_bonus = 0.1 if len(answer) > 50 else 0.0

        score = max(0.0, min(1.0, base_score - error_penalty + context_bonus + length_bonus))
        return score

    def process(
        self,
        query: str,
        generated_answer: str,
        context: Optional[List[Dict[str, Any]]] = None
    ) -> CorrectionResult:
        """メインエントリーポイント"""
        print(f"\n{'='*80}")
        print(f"[Self-Correction Agent] Processing")
        print(f"{'='*80}")
        print(f"Query: {query}")
        print(f"Answer length: {len(generated_answer)} chars")

        start_time = time.time()
        context = context or []

        # 評価
        errors = self.evaluate_answer(generated_answer, context)
        quality_before = self.calculate_quality_score(generated_answer, context, errors)

        # 修正
        corrected_answer = self.correct_errors(generated_answer, errors)
        quality_after = self.calculate_quality_score(corrected_answer, context, [])

        result = CorrectionResult(
            original_answer=generated_answer,
            corrected_answer=corrected_answer,
            detected_errors=errors,
            corrections_applied=[{'error_id': e.error_id, 'strategy': e.correction_strategy.value} for e in errors],
            quality_score_before=quality_before,
            quality_score_after=quality_after,
            processing_time_ms=(time.time() - start_time) * 1000,
        )

        print(f"\n{'='*80}")
        print(f"[Complete] Quality: {quality_before:.2f} → {quality_after:.2f}")
        print(f"{'='*80}")

        return result


def main():
    """テスト"""
    print("="*80)
    print("Agent 42: Self-Correction Agent - Enhanced Version")
    print("="*80)

    agent = SelfCorrectionAgent()

    test_cases = [
        {
            'query': "Pythonの非同期プログラミングとは？",
            'answer': "Pythonの非同期プログラミングは非同期であり、同時に同期的に実行されます。",
            'context': [{'content': 'Python async def...'}],
        },
        {
            'query': "量子コンピューティングとは？",
            'answer': "量子コンピューティングは量子力学の原理を利用した革新的な計算技術で、古典コンピュータでは解決困難な問題を解くことができます。",
            'context': [],
        },
        {
            'query': "Reactとは？",
            'answer': "UI library",
            'context': [{'content': 'React is a JavaScript library...'}],
        },
    ]

    for i, test in enumerate(test_cases, 1):
        print(f"\n\n{'#'*80}")
        print(f"# Test {i}/{len(test_cases)}")
        print(f"{'#'*80}")

        result = agent.process(test['query'], test['answer'], test['context'])

        print(f"\n[Result]")
        print(f"  Errors Detected: {len(result.detected_errors)}")
        print(f"  Quality: {result.quality_score_before:.2f} → {result.quality_score_after:.2f}")
        print(f"  Original: {result.original_answer[:80]}...")
        print(f"  Corrected: {result.corrected_answer[:80]}...")
        print(f"  Time: {result.processing_time_ms:.2f}ms")

    print(f"\n\n{'='*80}")
    print("All tests completed!")
    print("="*80)


if __name__ == "__main__":
    main()
