#!/usr/bin/env python3
"""
ジェネレーティブ・エージェント - 強化版 (Generative Agent - Enhanced)

リランクされたコンテキストから最終回答を生成

Author: Claude Code 42-Agent System
Version: 2.0.0
"""

import json
import time
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field


@dataclass
class GroundedSentence:
    """グラウンディング情報付き文"""
    sentence: str
    context_ids: List[str]
    confidence: float = 1.0


@dataclass
class GenerationResult:
    """生成結果"""
    generated_answer: str
    grounding: List[GroundedSentence]
    context_used: List[str]
    metadata: Dict[str, Any] = field(default_factory=dict)


class GenerativeAgent:
    """
    ジェネレーティブ・エージェント

    ## 役割
    リランクされたコンテキストと元のクエリに基づいて最終回答を生成

    ## 責任
    1. 情報の統合と要約
    2. 自然言語生成
    3. コード生成（必要に応じて）
    4. グラウンディング（出典明示）
    """

    SYSTEM_PROMPT = """
あなたはGenerative Agentです。
リランクされたコンテキストと元のクエリに基づいて、
ユーザーの質問に対する最終的な回答を生成します。

**責任:**
1. 情報の統合と要約: 複数のコンテキストから関連情報を抽出・統合
2. 自然言語生成: 技術的に正確で、自然・明瞭・簡潔なテキスト生成
3. コード生成: クエリがコード生成を要求する場合、実行可能なコードを生成
4. グラウンディング: 生成された回答の各部分が基づくコンテキストを明示

**制約:**
- 忠実性（Faithfulness）: 提供されたコンテキストに厳密に基づく
- 簡潔性: 不要な情報を避け、ユーザーの質問に直接回答
- 安全性: 機密情報や有害コンテンツの生成を厳格にフィルタリング
"""

    def __init__(self, config: Dict[str, Any]):
        self.config = config

    def generate(self, query: str, context: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        回答を生成

        Args:
            query: 元のクエリ
            context: 検索されたコンテキストドキュメント

        Returns:
            生成結果の辞書
        """
        print(f"\n{'='*80}")
        print(f"[Generative Agent] Generating answer")
        print(f"  Query: {query}")
        print(f"  Context docs: {len(context)}")
        print(f"{'='*80}\n")

        start_time = time.time()

        # Step 1: コンテキストの分析
        relevant_info = self._extract_relevant_info(query, context)
        print(f"  [Step 1] Extracted {len(relevant_info)} relevant pieces")

        # Step 2: 回答生成
        answer = self._generate_answer(query, relevant_info)
        print(f"  [Step 2] Generated answer ({len(answer)} chars)")

        # Step 3: グラウンディング
        grounding = self._add_grounding(answer, context)
        print(f"  [Step 3] Added grounding for {len(grounding)} sentences")

        generation_time = time.time() - start_time

        result = {
            'answer': answer,
            'grounding': [
                {
                    'sentence': g.sentence,
                    'context_ids': g.context_ids,
                    'confidence': g.confidence
                }
                for g in grounding
            ],
            'context_used': [c.get('doc_id', f'doc_{i}') for i, c in enumerate(context)],
            'metadata': {
                'generation_time': generation_time,
                'answer_length': len(answer),
                'num_sentences': len(grounding)
            }
        }

        print(f"\n[Generation Complete]")
        print(f"  Answer: {answer[:100]}...")
        print(f"  Time: {generation_time:.3f}s")

        return result

    def _extract_relevant_info(self, query: str, context: List[Dict]) -> List[str]:
        """コンテキストから関連情報を抽出"""
        relevant = []

        for doc in context:
            content = doc.get('content', '')
            # 簡易実装: コンテキスト全体を関連情報とする
            if content:
                relevant.append(content)

        return relevant

    def _generate_answer(self, query: str, relevant_info: List[str]) -> str:
        """回答を生成"""
        # 実際の実装では、LLM APIを呼び出して回答を生成
        # ここでは簡易実装

        if not relevant_info:
            return f"I don't have enough information to answer: {query}"

        # コンテキストを要約
        combined_info = " ".join(relevant_info[:3])  # 上位3つを使用

        # テンプレートベースの回答生成
        answer = (
            f"Based on the available information, here's what I found about '{query}':\n\n"
            f"{combined_info[:500]}...\n\n"
            f"This information is derived from {len(relevant_info)} relevant sources."
        )

        return answer

    def _add_grounding(self, answer: str, context: List[Dict]) -> List[GroundedSentence]:
        """グラウンディング情報を追加"""
        # 文に分割
        sentences = answer.split('. ')

        grounded = []
        for i, sentence in enumerate(sentences):
            if sentence.strip():
                # 簡易実装: 全てのコンテキストIDを使用
                context_ids = [c.get('doc_id', f'doc_{j}') for j, c in enumerate(context[:3])]

                grounded.append(GroundedSentence(
                    sentence=sentence.strip() + ('.' if not sentence.endswith('.') else ''),
                    context_ids=context_ids,
                    confidence=1.0 - (i * 0.05)  # 文の順序に基づく信頼度
                ))

        return grounded


def main():
    """テスト実行"""
    agent = GenerativeAgent({})

    # テストデータ
    query = "What is RAG?"
    context = [
        {'doc_id': 'doc1', 'content': 'RAG stands for Retrieval-Augmented Generation.'},
        {'doc_id': 'doc2', 'content': 'RAG combines retrieval and generation for better answers.'},
        {'doc_id': 'doc3', 'content': 'RAG systems use vector databases for efficient search.'}
    ]

    result = agent.generate(query, context)

    print(f"\n{'#'*80}")
    print(f"[Result]")
    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
