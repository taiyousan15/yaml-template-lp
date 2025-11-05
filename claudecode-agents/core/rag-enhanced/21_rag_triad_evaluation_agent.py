#!/usr/bin/env python3
"""
RAG Triad評価エージェント (RAG Triad Evaluation Agent)

RAGシステムの品質を3つの軸で評価:
1. Context Relevance (コンテキスト関連性)
2. Groundedness (根拠性)
3. Answer Relevance (回答関連性)

TruLens, RAGAs フレームワークで標準化された評価手法。

ArXiv研究ベース:
- RAG Triad (ArXiv 2507.18910v1)
- TruLens Eval Framework
- RAGAS: Automated Evaluation of RAG

Author: Claude Code 42-Agent System
Version: 1.0.0
"""

import json
import time
from typing import Dict, List, Any, Tuple, Optional
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
import re


class EvaluationScore(Enum):
    """評価スコアの等級"""
    EXCELLENT = (0.9, 1.0, "Excellent")
    GOOD = (0.7, 0.9, "Good")
    FAIR = (0.5, 0.7, "Fair")
    POOR = (0.3, 0.5, "Poor")
    VERY_POOR = (0.0, 0.3, "Very Poor")

    @staticmethod
    def from_score(score: float) -> 'EvaluationScore':
        """スコアから等級を判定"""
        for grade in EvaluationScore:
            min_score, max_score, _ = grade.value
            if min_score <= score < max_score:
                return grade
        return EvaluationScore.VERY_POOR


@dataclass
class RAGTriadResult:
    """RAG Triad評価結果"""
    query: str
    retrieved_contexts: List[str]
    generated_answer: str

    # 3つの評価スコア (0.0 - 1.0)
    context_relevance: float = 0.0
    groundedness: float = 0.0
    answer_relevance: float = 0.0

    # 総合スコア
    overall_score: float = 0.0

    # 詳細分析
    details: Dict[str, Any] = field(default_factory=dict)

    # メタデータ
    timestamp: float = field(default_factory=time.time)
    evaluation_time: float = 0.0


class ContextRelevanceEvaluator:
    """
    コンテキスト関連性評価

    評価内容:
    - 検索されたコンテキストがクエリにどれだけ関連しているか
    - 不要な情報が含まれていないか
    - 必要な情報が欠けていないか

    スコア計算:
    - 各コンテキストの関連度を評価
    - 加重平均で総合スコア
    """

    def __init__(self):
        pass

    def evaluate(self, query: str, contexts: List[str]) -> Tuple[float, Dict[str, Any]]:
        """
        コンテキスト関連性を評価

        Returns:
            - score: 0.0 - 1.0
            - details: 詳細分析結果
        """
        if not contexts:
            return 0.0, {'error': 'No contexts provided'}

        # 各コンテキストの関連度を評価
        relevance_scores = []
        context_details = []

        for i, context in enumerate(contexts):
            # キーワードオーバーラップベースの評価（簡易版）
            relevance = self._calculate_keyword_overlap(query, context)

            # LLMベースの評価（実際の実装）
            # relevance = self._llm_evaluate_relevance(query, context)

            relevance_scores.append(relevance)
            context_details.append({
                'context_id': i,
                'relevance': relevance,
                'length': len(context),
                'preview': context[:100]
            })

        # 総合スコア（平均）
        overall_score = sum(relevance_scores) / len(relevance_scores)

        details = {
            'individual_scores': relevance_scores,
            'context_details': context_details,
            'num_contexts': len(contexts),
            'avg_relevance': overall_score,
            'max_relevance': max(relevance_scores),
            'min_relevance': min(relevance_scores),
        }

        return overall_score, details

    def _calculate_keyword_overlap(self, query: str, context: str) -> float:
        """キーワードのオーバーラップで関連度を計算"""
        # クエリとコンテキストのトークン化
        query_tokens = set(self._tokenize(query))
        context_tokens = set(self._tokenize(context))

        if not query_tokens:
            return 0.0

        # Jaccard類似度
        intersection = query_tokens & context_tokens
        union = query_tokens | context_tokens

        if not union:
            return 0.0

        jaccard = len(intersection) / len(union)

        # 重要キーワード（3文字以上）の一致度も考慮
        important_query_tokens = {t for t in query_tokens if len(t) > 3}
        if important_query_tokens:
            important_match_ratio = len(important_query_tokens & context_tokens) / len(important_query_tokens)
            # 加重平均
            score = 0.5 * jaccard + 0.5 * important_match_ratio
        else:
            score = jaccard

        return min(score, 1.0)

    def _tokenize(self, text: str) -> List[str]:
        """テキストをトークン化"""
        text = text.lower()
        text = re.sub(r'[^\w\s]', ' ', text)
        tokens = text.split()
        return [t for t in tokens if len(t) > 2]

    def _llm_evaluate_relevance(self, query: str, context: str) -> float:
        """
        LLMベースの関連性評価（実際の実装用）

        プロンプト:
        Given the query "{query}" and the context "{context}",
        rate the relevance of the context to the query on a scale of 0.0 to 1.0.

        0.0 = Completely irrelevant
        0.5 = Somewhat relevant
        1.0 = Highly relevant

        Return only the numeric score.
        """
        # 実際にはLLM APIを呼び出す
        # response = llm.complete(prompt)
        # return float(response.text.strip())
        return 0.75  # ダミー値


class GroundednessEvaluator:
    """
    根拠性評価 (Groundedness / Faithfulness)

    評価内容:
    - 生成された回答がコンテキストに基づいているか
    - 幻覚（Hallucination）がないか
    - 事実と異なる情報が含まれていないか

    スコア計算:
    - 回答の各ステートメントがコンテキストで支持されているか
    - 支持されているステートメントの割合
    """

    def __init__(self):
        pass

    def evaluate(self, contexts: List[str], answer: str) -> Tuple[float, Dict[str, Any]]:
        """
        根拠性を評価

        Returns:
            - score: 0.0 - 1.0
            - details: 詳細分析結果
        """
        if not answer or not contexts:
            return 0.0, {'error': 'No answer or contexts provided'}

        # 回答をステートメント（文）に分割
        statements = self._extract_statements(answer)

        if not statements:
            return 0.0, {'error': 'No statements found in answer'}

        # 各ステートメントの根拠性を評価
        grounded_count = 0
        statement_details = []

        for statement in statements:
            is_grounded, support_source = self._is_statement_grounded(statement, contexts)

            if is_grounded:
                grounded_count += 1

            statement_details.append({
                'statement': statement,
                'is_grounded': is_grounded,
                'support_source': support_source,
            })

        # スコア = 根拠のあるステートメントの割合
        score = grounded_count / len(statements) if statements else 0.0

        details = {
            'total_statements': len(statements),
            'grounded_statements': grounded_count,
            'ungrounded_statements': len(statements) - grounded_count,
            'statement_details': statement_details,
            'groundedness_ratio': score,
        }

        return score, details

    def _extract_statements(self, text: str) -> List[str]:
        """テキストをステートメント（文）に分割"""
        # 文の境界で分割（簡易版）
        sentences = re.split(r'[.!?。！？]\s*', text)
        # 空文字列を除外
        statements = [s.strip() for s in sentences if s.strip()]
        return statements

    def _is_statement_grounded(self, statement: str, contexts: List[str]) -> Tuple[bool, Optional[int]]:
        """
        ステートメントがコンテキストで支持されているか判定

        Returns:
            - is_grounded: True/False
            - support_source: 支持するコンテキストのインデックス（またはNone）
        """
        statement_tokens = set(self._tokenize(statement))

        best_match_score = 0.0
        best_match_idx = None

        for i, context in enumerate(contexts):
            context_tokens = set(self._tokenize(context))

            # 重要キーワード（3文字以上）の一致度
            important_tokens = {t for t in statement_tokens if len(t) > 3}
            if not important_tokens:
                continue

            match_count = len(important_tokens & context_tokens)
            match_ratio = match_count / len(important_tokens)

            if match_ratio > best_match_score:
                best_match_score = match_ratio
                best_match_idx = i

        # しきい値: 70%以上一致で根拠ありと判定
        is_grounded = best_match_score >= 0.7

        return is_grounded, best_match_idx if is_grounded else None

    def _tokenize(self, text: str) -> List[str]:
        """テキストをトークン化"""
        text = text.lower()
        text = re.sub(r'[^\w\s]', ' ', text)
        tokens = text.split()
        return [t for t in tokens if len(t) > 2]


class AnswerRelevanceEvaluator:
    """
    回答関連性評価

    評価内容:
    - 生成された回答がクエリに対してどれだけ適切か
    - クエリの意図を満たしているか
    - 不要な情報が含まれていないか
    - 簡潔で明確か

    スコア計算:
    - クエリと回答のセマンティック類似度
    - クエリの意図との一致度
    - 回答の完全性
    """

    def __init__(self):
        pass

    def evaluate(self, query: str, answer: str) -> Tuple[float, Dict[str, Any]]:
        """
        回答関連性を評価

        Returns:
            - score: 0.0 - 1.0
            - details: 詳細分析結果
        """
        if not answer or not query:
            return 0.0, {'error': 'No answer or query provided'}

        # 1. キーワードオーバーラップ
        keyword_score = self._calculate_keyword_overlap(query, answer)

        # 2. クエリタイプと回答の一致
        query_type_score = self._evaluate_query_type_match(query, answer)

        # 3. 回答の完全性
        completeness_score = self._evaluate_completeness(query, answer)

        # 4. 簡潔性（冗長でないか）
        conciseness_score = self._evaluate_conciseness(answer)

        # 総合スコア（加重平均）
        overall_score = (
            0.3 * keyword_score +
            0.3 * query_type_score +
            0.25 * completeness_score +
            0.15 * conciseness_score
        )

        details = {
            'keyword_overlap': keyword_score,
            'query_type_match': query_type_score,
            'completeness': completeness_score,
            'conciseness': conciseness_score,
            'answer_length': len(answer),
            'query_length': len(query),
        }

        return overall_score, details

    def _calculate_keyword_overlap(self, query: str, answer: str) -> float:
        """キーワードのオーバーラップスコア"""
        query_tokens = set(self._tokenize(query))
        answer_tokens = set(self._tokenize(answer))

        if not query_tokens:
            return 0.0

        # 重要キーワード（3文字以上）の一致度
        important_query_tokens = {t for t in query_tokens if len(t) > 3}
        if not important_query_tokens:
            return 0.5  # クエリに重要キーワードがない場合は中立

        match_count = len(important_query_tokens & answer_tokens)
        match_ratio = match_count / len(important_query_tokens)

        return match_ratio

    def _evaluate_query_type_match(self, query: str, answer: str) -> float:
        """クエリタイプと回答の一致度"""
        query_lower = query.lower()

        # Whatクエリ → 定義や説明があるか
        if query_lower.startswith(('what', '何')):
            # 説明的な回答（"is", "are"などを含む）
            if any(word in answer.lower() for word in ['is', 'are', 'です', 'である']):
                return 0.9
            return 0.5

        # Howクエリ → 手順や方法があるか
        elif query_lower.startswith(('how', 'どのように', 'どうやって')):
            # 手順を示すキーワード
            if any(word in answer.lower() for word in ['step', 'first', 'then', 'まず', '次に']):
                return 0.9
            return 0.6

        # Whyクエリ → 理由や原因があるか
        elif query_lower.startswith(('why', 'なぜ')):
            # 理由を示すキーワード
            if any(word in answer.lower() for word in ['because', 'reason', 'なぜなら', 'ため']):
                return 0.9
            return 0.6

        # Whereクエリ → 場所があるか
        elif query_lower.startswith(('where', 'どこ')):
            # 場所を示すキーワード
            if any(word in answer.lower() for word in ['in', 'at', 'on', 'で', 'に']):
                return 0.8
            return 0.5

        # その他
        return 0.7

    def _evaluate_completeness(self, query: str, answer: str) -> float:
        """回答の完全性（クエリの意図を満たしているか）"""
        # 回答の長さで簡易評価
        answer_length = len(answer.split())

        # 短すぎる回答はNG
        if answer_length < 10:
            return 0.3

        # 適度な長さ
        if 10 <= answer_length <= 200:
            return 0.9

        # 長すぎる回答は減点
        if answer_length > 500:
            return 0.7

        return 0.8

    def _evaluate_conciseness(self, answer: str) -> float:
        """簡潔性（冗長でないか）"""
        # 文の平均長で評価
        sentences = re.split(r'[.!?。！？]\s*', answer)
        sentences = [s.strip() for s in sentences if s.strip()]

        if not sentences:
            return 0.0

        avg_sentence_length = sum(len(s.split()) for s in sentences) / len(sentences)

        # 適度な文長（10-30語）
        if 10 <= avg_sentence_length <= 30:
            return 0.9

        # 短すぎる or 長すぎる
        if avg_sentence_length < 5 or avg_sentence_length > 50:
            return 0.6

        return 0.8

    def _tokenize(self, text: str) -> List[str]:
        """テキストをトークン化"""
        text = text.lower()
        text = re.sub(r'[^\w\s]', ' ', text)
        tokens = text.split()
        return [t for t in tokens if len(t) > 2]


class RAGTriadEvaluationAgent:
    """
    RAG Triad評価エージェント

    RAGシステムの品質を3つの軸で総合評価:
    1. Context Relevance (コンテキスト関連性)
    2. Groundedness (根拠性)
    3. Answer Relevance (回答関連性)

    使用方法:
    ```python
    agent = RAGTriadEvaluationAgent(config)

    result = agent.evaluate(
        query="What is Python?",
        contexts=["Python is a programming language...", "..."],
        answer="Python is a high-level programming language..."
    )

    print(f"Overall Score: {result.overall_score:.2f}")
    print(f"Context Relevance: {result.context_relevance:.2f}")
    print(f"Groundedness: {result.groundedness:.2f}")
    print(f"Answer Relevance: {result.answer_relevance:.2f}")
    ```
    """

    def __init__(self, config: Dict[str, Any]):
        self.config = config

        # 3つの評価器
        self.context_relevance_evaluator = ContextRelevanceEvaluator()
        self.groundedness_evaluator = GroundednessEvaluator()
        self.answer_relevance_evaluator = AnswerRelevanceEvaluator()

        # 各評価軸の重み（カスタマイズ可能）
        self.weights = config.get('weights', {
            'context_relevance': 0.3,
            'groundedness': 0.4,  # 幻覚防止のため重視
            'answer_relevance': 0.3,
        })

        # 評価履歴
        self.evaluation_history: List[RAGTriadResult] = []

    def evaluate(
        self,
        query: str,
        contexts: List[str],
        answer: str
    ) -> RAGTriadResult:
        """
        RAG Triad評価を実行

        Args:
            query: ユーザーのクエリ
            contexts: 検索されたコンテキストのリスト
            answer: 生成された回答

        Returns:
            RAGTriadResult: 評価結果
        """
        start_time = time.time()

        print(f"\n{'='*80}")
        print(f"[RAG Triad Evaluation]")
        print(f"  Query: {query[:100]}...")
        print(f"  Contexts: {len(contexts)} items")
        print(f"  Answer Length: {len(answer)} chars")
        print(f"{'='*80}\n")

        # 1. Context Relevance評価
        context_relevance, context_details = self.context_relevance_evaluator.evaluate(query, contexts)
        print(f"[1/3] Context Relevance: {context_relevance:.3f} ({EvaluationScore.from_score(context_relevance).value[2]})")

        # 2. Groundedness評価
        groundedness, groundedness_details = self.groundedness_evaluator.evaluate(contexts, answer)
        print(f"[2/3] Groundedness: {groundedness:.3f} ({EvaluationScore.from_score(groundedness).value[2]})")

        # 3. Answer Relevance評価
        answer_relevance, answer_details = self.answer_relevance_evaluator.evaluate(query, answer)
        print(f"[3/3] Answer Relevance: {answer_relevance:.3f} ({EvaluationScore.from_score(answer_relevance).value[2]})")

        # 総合スコア（加重平均）
        overall_score = (
            self.weights['context_relevance'] * context_relevance +
            self.weights['groundedness'] * groundedness +
            self.weights['answer_relevance'] * answer_relevance
        )

        evaluation_time = time.time() - start_time

        # 結果オブジェクトの作成
        result = RAGTriadResult(
            query=query,
            retrieved_contexts=contexts,
            generated_answer=answer,
            context_relevance=context_relevance,
            groundedness=groundedness,
            answer_relevance=answer_relevance,
            overall_score=overall_score,
            evaluation_time=evaluation_time,
            details={
                'context_relevance_details': context_details,
                'groundedness_details': groundedness_details,
                'answer_relevance_details': answer_details,
                'weights': self.weights,
            }
        )

        # 履歴に追加
        self.evaluation_history.append(result)

        # サマリー表示
        print(f"\n{'='*80}")
        print(f"[Evaluation Summary]")
        print(f"  Overall Score: {overall_score:.3f} ({EvaluationScore.from_score(overall_score).value[2]})")
        print(f"  Evaluation Time: {evaluation_time:.2f}s")
        print(f"{'='*80}\n")

        return result

    def get_statistics(self) -> Dict[str, Any]:
        """評価統計情報を取得"""
        if not self.evaluation_history:
            return {'error': 'No evaluation history'}

        return {
            'total_evaluations': len(self.evaluation_history),
            'avg_context_relevance': sum(r.context_relevance for r in self.evaluation_history) / len(self.evaluation_history),
            'avg_groundedness': sum(r.groundedness for r in self.evaluation_history) / len(self.evaluation_history),
            'avg_answer_relevance': sum(r.answer_relevance for r in self.evaluation_history) / len(self.evaluation_history),
            'avg_overall_score': sum(r.overall_score for r in self.evaluation_history) / len(self.evaluation_history),
            'avg_evaluation_time': sum(r.evaluation_time for r in self.evaluation_history) / len(self.evaluation_history),
        }

    def save_results(self, output_path: str):
        """評価結果をファイルに保存"""
        output_file = Path(output_path)
        output_file.parent.mkdir(parents=True, exist_ok=True)

        results_data = []
        for result in self.evaluation_history:
            results_data.append({
                'query': result.query,
                'contexts_count': len(result.retrieved_contexts),
                'answer_length': len(result.generated_answer),
                'context_relevance': result.context_relevance,
                'groundedness': result.groundedness,
                'answer_relevance': result.answer_relevance,
                'overall_score': result.overall_score,
                'evaluation_time': result.evaluation_time,
                'timestamp': result.timestamp,
            })

        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump({
                'statistics': self.get_statistics(),
                'results': results_data,
            }, f, indent=2, ensure_ascii=False)

        print(f"[RAG Triad] Results saved to: {output_path}")


def main():
    """テスト実行"""
    config = {
        'weights': {
            'context_relevance': 0.3,
            'groundedness': 0.4,
            'answer_relevance': 0.3,
        }
    }

    agent = RAGTriadEvaluationAgent(config)

    # テストケース
    test_cases = [
        {
            'query': "What is Python?",
            'contexts': [
                "Python is a high-level, interpreted programming language known for its simplicity and readability.",
                "Python supports multiple programming paradigms including procedural, object-oriented, and functional programming.",
                "Python was created by Guido van Rossum and first released in 1991.",
            ],
            'answer': "Python is a high-level programming language that is known for its simplicity and readability. It supports multiple programming paradigms and is widely used in web development, data science, and automation."
        },
        {
            'query': "How to reverse a string in Python?",
            'contexts': [
                "In Python, you can reverse a string using slicing with [::-1].",
                "Another method is to use the reversed() function combined with join().",
            ],
            'answer': "To reverse a string in Python, you can use slicing: string[::-1]. For example, 'hello'[::-1] returns 'olleh'."
        },
    ]

    for i, test_case in enumerate(test_cases, 1):
        print(f"\n{'#'*80}")
        print(f"# Test Case {i}")
        print(f"{'#'*80}")

        result = agent.evaluate(
            query=test_case['query'],
            contexts=test_case['contexts'],
            answer=test_case['answer']
        )

        print(f"\nDetailed Results:")
        print(f"  Context Relevance: {result.context_relevance:.3f}")
        print(f"  Groundedness: {result.groundedness:.3f}")
        print(f"  Answer Relevance: {result.answer_relevance:.3f}")
        print(f"  Overall Score: {result.overall_score:.3f}")

    # 統計情報
    print(f"\n{'#'*80}")
    print(f"# Statistics")
    print(f"{'#'*80}")
    stats = agent.get_statistics()
    for key, value in stats.items():
        print(f"  {key}: {value:.3f}" if isinstance(value, float) else f"  {key}: {value}")

    # 結果を保存
    agent.save_results('deliverable/reporting/rag_triad_results.json')


if __name__ == "__main__":
    main()
