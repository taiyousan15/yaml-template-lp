#!/usr/bin/env python3
"""
Bulk agent generator for agents 05-35

This script generates all remaining RAG agents efficiently.
"""

import os
from pathlib import Path

# Base directory
BASE_DIR = Path(__file__).parent / "core" / "rag-enhanced"

# Agent definitions (simplified for bulk generation)
AGENTS = {
    # Group 2: Ingestion (05-10)
    5: ("polyglot_router", "Polyglot Router Agent", "データタイプを識別し、適切なパーサーにルーティング"),
    6: ("ast_parser", "AST Parser Agent", "ソースコードをASTに変換し、構造ベースでチャンク化"),
    7: ("markdown_parser", "Markdown Parser Agent", "Markdown文書を構造的にパースしチャンク化"),
    8: ("api_schema_parser", "API Schema Parser Agent", "OpenAPI/Swaggerスキーマをパース"),
    9: ("code_summary_generation", "Code Summary Generation Agent", "コードチャンクの要約を生成"),
    10: ("static_analysis", "Static Analysis Agent", "静的解析ツールを実行しメトリクスを抽出"),

    # Group 3: Vectorization (11-13)
    11: ("embedding_manager", "Embedding Manager Agent", "埋め込みモデルのライフサイクルを管理"),
    12: ("vector_store_manager", "Vector Store Manager Agent", "ベクトルDBの選択・設定・運用・最適化"),
    13: ("metadata_enrichment", "Metadata Enrichment Agent", "文書に追加メタデータを自動抽出・付与"),

    # Group 4: Search (14-17)
    14: ("hybrid_search", "Hybrid Search Agent", "セマンティック検索とキーワード検索を融合"),
    15: ("reranking", "Reranking Agent", "言語モデルベースの手法で再順位付け"),
    16: ("query_routing", "Query Routing Agent", "クエリを分析し最適な検索戦略へルーティング"),
    17: ("dynamic_alpha_adjustment", "Dynamic Alpha Adjustment Agent", "ハイブリッド検索のα値を動的調整"),

    # Group 5: CI/CD (18-20)
    18: ("change_detection", "Change Detection Agent", "ソースデータの変更を継続的に監視・検出"),
    19: ("incremental_update", "Incremental Update Agent", "検出された変更に基づきKBを効率的に更新"),
    20: ("index_sync", "Index Sync Agent", "複数データストア間のデータ整合性を保証"),

    # Group 6: Evaluation (21-25)
    21: ("rag_triad_evaluation", "RAG Triad Evaluation Agent", "RAGトライアドの3つの側面を測定"),
    22: ("benchmark_execution", "Benchmark Execution Agent", "標準ベンチマークデータセットで性能評価"),
    23: ("ab_test", "A/B Test Agent", "A/Bテストの設計・実行・分析"),
    24: ("quality_monitoring", "Quality Monitoring Agent", "RAGシステムの品質メトリクスを継続監視"),
    25: ("performance_profiling", "Performance Profiling Agent", "システムリソース使用状況をプロファイリング"),

    # Group 7: Monitoring (26-29)
    26: ("logging_tracing", "Logging & Tracing Agent", "全システムオペレーションの包括的ログ記録"),
    27: ("metrics_collection", "Metrics Collection Agent", "システム全体のメトリクスを収集"),
    28: ("alerting", "Alerting Agent", "アラート条件の定義と異常検出"),
    29: ("dashboard", "Dashboard Agent", "リアルタイムダッシュボードの生成"),

    # Group 8: Operations & Security (30-35)
    30: ("pii_detection", "PII Detection Agent", "個人情報の検出とマスキング"),
    31: ("access_control", "Access Control Agent", "アクセス制御とセキュリティポリシー管理"),
    32: ("hyperparameter_tuning", "Hyperparameter Tuning Agent", "ハイパーパラメータの自動チューニング"),
    33: ("cache_optimization", "Cache Optimization Agent", "キャッシュ戦略の最適化"),
    34: ("cost_optimization", "Cost Optimization Agent", "コスト最適化戦略の実装"),
    35: ("feedback_collection", "Feedback Collection Agent", "ユーザーフィードバックの収集と分析"),
}

TEMPLATE = '''#!/usr/bin/env python3
"""
{agent_name_en} - 強化版 ({agent_name_full} - Enhanced)

{description}

Author: Claude Code 42-Agent System
Version: 2.0.0
"""

import json
import time
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field


@dataclass
class {class_name}Result:
    """処理結果"""
    success: bool
    data: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)
    error: Optional[str] = None


class {class_name}:
    """
    {agent_name_full}

    ## 役割
    {description}

    ## 主な機能
    1. データ処理
    2. 結果の集約
    3. メタデータの付与
    """

    SYSTEM_PROMPT = """
あなたは{agent_name_full}です。
{description}

主な責任とタスクを実行します。
"""

    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.history: List[{class_name}Result] = []

    def process(self, input_data: Dict[str, Any]) -> {class_name}Result:
        """
        メイン処理関数

        Args:
            input_data: 入力データ

        Returns:
            処理結果
        """
        print(f"\\n{{'='*80}}")
        print(f"[{agent_name_full}] Processing")
        print(f"{{'='*80}}\\n")

        start_time = time.time()

        try:
            # メイン処理ロジック
            result_data = self._execute_main_logic(input_data)

            result = {class_name}Result(
                success=True,
                data=result_data,
                metadata={{
                    'processing_time': time.time() - start_time,
                    'timestamp': time.time()
                }}
            )

            print(f"[Processing Complete] Time: {{result.metadata['processing_time']:.3f}}s")

            return result

        except Exception as e:
            error_msg = f"Processing failed: {{str(e)}}"
            print(f"[ERROR] {{error_msg}}")

            return {class_name}Result(
                success=False,
                error=error_msg,
                metadata={{'processing_time': time.time() - start_time}}
            )
        finally:
            pass

    def _execute_main_logic(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """メインロジックの実装"""
        # 実装固有のロジックをここに記述
        return {{
            'status': 'processed',
            'input_received': input_data,
            'output': 'processed_data'
        }}

    def get_statistics(self) -> Dict[str, Any]:
        """統計情報を取得"""
        total = len(self.history)
        successful = sum(1 for r in self.history if r.success)

        return {{
            'total_processed': total,
            'successful': successful,
            'failed': total - successful,
            'success_rate': successful / total if total > 0 else 0
        }}


def main():
    """テスト実行"""
    agent = {class_name}({{}})

    # テストデータ
    test_input = {{
        'test_key': 'test_value',
        'data': [1, 2, 3]
    }}

    result = agent.process(test_input)

    print(f"\\n{{'#'*80}}")
    print(f"[Test Result]")
    print(json.dumps({{
        'success': result.success,
        'data': result.data,
        'metadata': result.metadata,
        'error': result.error
    }}, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
'''


def generate_agent(agent_num, agent_key, agent_name, description):
    """個別のエージェントファイルを生成"""
    # クラス名生成
    class_name = ''.join(word.capitalize() for word in agent_key.split('_')) + 'Agent'

    # ファイル名
    filename = f"{agent_num:02d}_{agent_key}_enhanced.py"
    filepath = BASE_DIR / filename

    # コンテンツ生成
    content = TEMPLATE.format(
        agent_name_en=agent_name,
        agent_name_full=agent_name,
        description=description,
        class_name=class_name
    )

    # ファイル書き込み
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"✓ Generated: {filename}")
    return filepath


def main():
    """メイン処理"""
    print("Generating agents 05-35...")
    print(f"Target directory: {BASE_DIR}")
    print("="*80)

    generated_files = []

    for agent_num, (agent_key, agent_name, description) in AGENTS.items():
        try:
            filepath = generate_agent(agent_num, agent_key, agent_name, description)
            generated_files.append(filepath)
        except Exception as e:
            print(f"✗ Failed to generate agent {agent_num}: {e}")

    print("="*80)
    print(f"Successfully generated {len(generated_files)} agents")
    print(f"Total agents: {len(generated_files)}")

    # 統計表示
    groups = {
        "Group 2 (Ingestion)": range(5, 11),
        "Group 3 (Vectorization)": range(11, 14),
        "Group 4 (Search)": range(14, 18),
        "Group 5 (CI/CD)": range(18, 21),
        "Group 6 (Evaluation)": range(21, 26),
        "Group 7 (Monitoring)": range(26, 30),
        "Group 8 (Ops/Security)": range(30, 36),
    }

    print("\n" + "="*80)
    print("Generation Summary by Group:")
    for group_name, agent_range in groups.items():
        count = sum(1 for num in agent_range if num in AGENTS)
        print(f"  {group_name}: {count} agents")

    return generated_files


if __name__ == "__main__":
    generated = main()
