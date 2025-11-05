# エージェント強化統合計画

**目的**: `all_rag_agent_prompts.md`の詳細なエージェント定義を使用して、既存の42体マルチエージェントシステムを世界最高水準に強化する。

**実行日**: 2025年11月5日
**統合責任者**: Claude Code + Manus AI

---

## 1. 現状分析

### 既存システム（Phase 1完了）

#### Phase 1で実装済み（5エージェント）
| # | エージェント | ファイル | 行数 | 状態 |
|---|---|---|---|---|
| 1 | マスター・オーケストレーター | `core/rag-enhanced/01_master_orchestrator.py` | 600行 | ✅ 実装済み |
| 2 | クエリ変換 | `core/rag-enhanced/02_query_transformation_agent.py` | 400行 | ✅ 実装済み |
| 14 | ハイブリッド検索 | `core/rag-enhanced/14_hybrid_search_agent.py` | 700行 | ✅ 実装済み |
| 15 | リランキング | `core/rag-enhanced/15_reranking_agent.py` | 400行 | ✅ 実装済み |
| 21 | RAG Triad評価 | `core/rag-enhanced/21_rag_triad_evaluation_agent.py` | 800行 | ✅ 実装済み |

#### 既存のコアエージェント（基本実装）
| # | エージェント | ディレクトリ | 状態 |
|---|---|---|---|
| - | Coordinator | `core/coordinator/` | 🔄 要強化 |
| - | Auth (A-JWT) | `core/auth/` | 🔄 要強化 |
| - | RAG | `core/rag/` | 🔄 要強化 |
| - | Blackboard | `core/blackboard/` | 🔄 要強化 |
| - | Evaluator | `core/evaluator/` | ✅ 実装済み |

### all_rag_agent_prompts.mdから得られた強化ポイント

#### 詳細な定義が含まれるエージェント（全42エージェント）

**Group 10: 高度な推論機能（7エージェント）**
- ✅ 36. クエリ分解エージェント（Phase 1実装済み）
- ✅ 37. ステップバックプロンプティングエージェント（Phase 1実装済み）
- ✅ 38. RAG-Fusionエージェント（Phase 1実装済み）
- 🆕 39. 外部ツールエージェント（新規実装必要）
- 🆕 40. グラフ推論エージェント（新規実装必要）
- 🆕 41. 仮説生成エージェント（新規実装必要）
- 🆕 42. 自己修正エージェント（新規実装必要）

**その他のエージェント（読み込み継続必要）**
- Group 1-9の詳細定義

---

## 2. 統合戦略

### 統合アプローチ

#### Phase 1.5: 既存エージェントの強化（1-2日）
1. **Phase 1実装エージェントの強化**
   - all_rag_agent_prompts.mdの詳細定義を反映
   - システムプロンプトの統合
   - 協調パターンの明確化
   - 入出力形式の標準化

2. **コアエージェントの強化**
   - Coordinator → マスター・オーケストレーターと統合
   - RAG → ハイブリッド検索と統合
   - Blackboard → 標準化された状態管理

#### Phase 2: Group 10残りエージェントの実装（2-3日）
1. **39. 外部ツールエージェント**
   - Web検索API統合
   - 計算機API
   - コード実行環境

2. **40. グラフ推論エージェント**
   - Neo4j/Neptune統合
   - Cypher/SPARQLクエリ生成
   - 多段階推論実行

3. **41. 仮説生成エージェント**
   - 多様な仮説生成
   - 検証計画策定
   - 仮説統合

4. **42. 自己修正エージェント**
   - 回答の多面的評価
   - 誤り検出と分類
   - 修正戦略の策定

#### Phase 3: 全42エージェント実装（1-2週間）
- Group 1-9の全エージェント実装
- システム全体の統合テスト

---

## 3. all_rag_agent_prompts.md 構造分析

### エージェント定義の標準フォーマット

各エージェントは以下の構造で定義されています:

```markdown
# エージェント番号. エージェント名 (Agent Name)

**役割と責任:**
[エージェントの主要な役割の説明]

**システムプロンプト:**
```
[LLMに渡す実際のシステムプロンプト]

**能力:**
1. [能力1の説明]
2. [能力2の説明]
...

**制約:**
* [制約1]
* [制約2]
...

**出力形式:**
* [出力の構造とフォーマット]

**主要ツール/入力:**
* [使用するツールやAPI]

**協調パターン:**
* [他のエージェントとの連携方法]
```

### 抽出すべき情報

各エージェント定義から以下を抽出:
1. **役割と責任** → クラスのdocstring
2. **システムプロンプト** → LLM呼び出し時のプロンプト
3. **能力** → メソッド定義
4. **制約** → バリデーション・チェック
5. **出力形式** → データクラス定義
6. **協調パターン** → エージェント間通信

---

## 4. 実装計画

### Phase 1.5 実装タスク（優先度: 高）

#### Task 1: クエリ分解エージェント強化
- [ ] `all_rag_agent_prompts.md`からAgent 36の定義を完全抽出
- [ ] 既存`02_query_transformation_agent.py`にシステムプロンプトを統合
- [ ] 協調パターン（マスターオーケストレーター、ハイブリッド検索、グラフ推論）を実装
- [ ] 出力形式をJSON標準化（sub_query_id, query_text, search_intent, dependency_id）

**強化ポイント**:
```python
# システムプロンプトの追加
SYSTEM_PROMPT = """
あなたは、複雑な質問を解決するための「戦略家」です。
あなたの使命は、ユーザーの単一の複雑なクエリを、
それぞれが独立して検索可能で、より正確なコンテキストを
導き出すことができる、複数の単純なサブクエリに分解することです。
"""

# 出力形式の標準化
@dataclass
class DecomposedQuery:
    sub_query_id: str
    query_text: str
    search_intent: str  # "FACTUAL", "DEFINITION", "COMPARISON"
    dependency_id: Optional[str] = None
```

#### Task 2: ステップバックプロンプティングエージェント強化
- [ ] Agent 37の定義を抽出
- [ ] 二重検索（元のクエリ + ステップバック質問）の実装
- [ ] 統合された回答生成ロジックの強化

#### Task 3: RAG-Fusionエージェント強化
- [ ] Agent 38の定義を抽出
- [ ] マルチクエリ生成の強化
- [ ] RRFアルゴリズムの最適化
- [ ] 重複排除と多様性確保の実装

#### Task 4: ハイブリッド検索エージェント強化
- [ ] 既存実装に協調パターンを追加
- [ ] 出力形式の標準化
- [ ] メタデータ管理の強化

#### Task 5: リランキングエージェント強化
- [ ] 協調パターン（マスターオーケストレーター、応答生成）の実装
- [ ] ロギング・トレーシング連携

#### Task 6: RAG Triad評価エージェント強化
- [ ] 評価履歴の永続化
- [ ] アラートエージェントとの連携
- [ ] 詳細レポート生成

### Phase 2 実装タスク（優先度: 中）

#### Task 7: 外部ツールエージェント（新規）
```python
# 実装ファイル: core/rag-enhanced/39_external_tool_agent.py

class ExternalToolAgent:
    """
    外部ツールエージェント

    役割: RAGシステムが内部知識ベースだけでは回答できないクエリを識別し、
         適切な外部ツールを呼び出して結果を統合
    """

    def __init__(self, config: Dict[str, Any]):
        self.tools = {
            'web_search': GoogleSearchAPI(),
            'calculator': CalculatorAPI(),
            'code_executor': CodeExecutorAPI(),
            'weather': WeatherAPI(),
        }

    def identify_tool(self, query: str) -> Tuple[str, Dict]:
        """クエリから適切なツールを識別"""
        # LLMベースのツール選択ロジック
        pass

    def execute_tool(self, tool_name: str, parameters: Dict) -> Dict:
        """ツールを実行して結果を取得"""
        pass

    def integrate_results(self, internal_results: List, external_results: Dict) -> Dict:
        """内部検索結果と外部ツール結果を統合"""
        pass
```

#### Task 8: グラフ推論エージェント（新規）
```python
# 実装ファイル: core/rag-enhanced/40_graph_reasoning_agent.py

class GraphReasoningAgent:
    """
    グラフ推論エージェント

    役割: 知識グラフを利用した多段階推論
    """

    def __init__(self, graph_db_config: Dict):
        self.graph_db = Neo4jClient(graph_db_config)

    def generate_graph_query(self, user_query: str) -> str:
        """ユーザークエリをCypher/SPARQLクエリに変換"""
        pass

    def execute_reasoning(self, graph_query: str) -> Dict:
        """多段階推論を実行"""
        pass

    def format_result(self, reasoning_result: Dict) -> str:
        """推論結果を応答生成用のコンテキストに変換"""
        pass
```

#### Task 9: 仮説生成エージェント（新規）
```python
# 実装ファイル: core/rag-enhanced/41_hypothesis_generation_agent.py

class HypothesisGenerationAgent:
    """
    仮説生成エージェント

    役割: 複数の仮説を生成し、体系的に検証
    """

    def generate_hypotheses(self, query: str, context: List[str]) -> List[Hypothesis]:
        """多様な仮説を生成"""
        pass

    def create_verification_plan(self, hypotheses: List[Hypothesis]) -> VerificationPlan:
        """検証計画を策定"""
        pass

    def verify_hypotheses(self, plan: VerificationPlan) -> List[VerifiedHypothesis]:
        """仮説を検証"""
        pass

    def select_best_hypothesis(self, verified: List[VerifiedHypothesis]) -> FinalAnswer:
        """最良の仮説を選択"""
        pass
```

#### Task 10: 自己修正エージェント（新規）
```python
# 実装ファイル: core/rag-enhanced/42_self_correction_agent.py

class SelfCorrectionAgent:
    """
    自己修正エージェント

    役割: 生成された回答の品質を向上させるための最後の砦
    """

    def evaluate_answer(self, query: str, answer: str, context: List[str]) -> EvaluationResult:
        """回答を多面的に評価"""
        pass

    def detect_errors(self, evaluation: EvaluationResult) -> List[Error]:
        """誤りを検出・分類"""
        pass

    def create_correction_strategy(self, errors: List[Error]) -> CorrectionStrategy:
        """修正戦略を策定"""
        pass

    def execute_correction(self, strategy: CorrectionStrategy) -> CorrectedAnswer:
        """修正を実行"""
        pass
```

---

## 5. 統合における重要ポイント

### 5.1 システムプロンプトの統合

各エージェントの実装ファイルに、`all_rag_agent_prompts.md`から抽出したシステムプロンプトを追加:

```python
class AgentName:
    """エージェントのdocstring"""

    SYSTEM_PROMPT = """
    [all_rag_agent_prompts.mdから抽出したシステムプロンプト]
    """

    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.llm_client = LLMClient(system_prompt=self.SYSTEM_PROMPT)
```

### 5.2 協調パターンの実装

エージェント間の連携を明示的に実装:

```python
def collaborate(self, other_agent: str, input_data: Dict) -> Dict:
    """
    他のエージェントと協調

    協調パターン:
    - マスターオーケストレーターからクエリを受け取る
    - ハイブリッド検索エージェントに検索を依頼
    - 応答生成エージェントに結果を渡す
    """
    if other_agent == 'master_orchestrator':
        return self.receive_task(input_data)
    elif other_agent == 'hybrid_search':
        return self.send_search_request(input_data)
    elif other_agent == 'response_generator':
        return self.send_results(input_data)
```

### 5.3 出力形式の標準化

すべてのエージェントの出力を標準化:

```python
@dataclass
class AgentOutput:
    agent_id: str
    task_id: str
    status: str  # "success", "failed", "partial"
    result: Any
    metadata: Dict[str, Any]
    timestamp: float
    execution_time: float
```

### 5.4 エラーハンドリングの統一

```python
class AgentError(Exception):
    """エージェント共通エラー"""
    pass

class ValidationError(AgentError):
    """入力検証エラー"""
    pass

class ExecutionError(AgentError):
    """実行エラー"""
    pass

class CollaborationError(AgentError):
    """協調エラー"""
    pass
```

---

## 6. テスト計画

### 6.1 ユニットテスト
- 各エージェントの個別機能テスト
- システムプロンプトの検証
- 出力形式の検証

### 6.2 統合テスト
- エージェント間の協調パターンテスト
- エンドツーエンドのフローテスト

### 6.3 性能テスト
- レイテンシ測定
- スループット測定
- コスト測定

---

## 7. ドキュメント更新

### 7.1 更新が必要なドキュメント
- [ ] `claudecode-agents/core/rag-enhanced/README.md`
- [ ] `claudecode-agents/README.md`
- [ ] `PHASE1_COMPLETION_REPORT.md` → `PHASE2_COMPLETION_REPORT.md`

### 7.2 新規作成ドキュメント
- [ ] `AGENT_INTEGRATION_GUIDE.md` - エージェント統合ガイド
- [ ] `COLLABORATION_PATTERNS.md` - 協調パターン詳細
- [ ] `SYSTEM_PROMPTS.md` - 全エージェントのシステムプロンプト集

---

## 8. スケジュール

| Phase | タスク | 期間 | 完了予定日 |
|---|---|---|---|
| **Phase 1.5** | 既存5エージェント強化 | 1-2日 | 2025-11-06 |
| **Phase 2** | Group 10残り4エージェント実装 | 2-3日 | 2025-11-09 |
| **Phase 3** | 全42エージェント実装 | 1-2週間 | 2025-11-23 |
| **Phase 4** | 統合テスト・ドキュメント | 3-5日 | 2025-11-28 |

---

## 9. 成功基準

### 9.1 技術的基準
- ✅ 全42エージェントが`all_rag_agent_prompts.md`の定義に準拠
- ✅ すべてのエージェントがシステムプロンプトを実装
- ✅ 協調パターンが正常に動作
- ✅ 出力形式が統一
- ✅ 全テストが成功

### 9.2 品質基準
- ✅ RAG Triad Score ≥ 0.92
- ✅ レイテンシ ≤ 10秒（エンドツーエンド）
- ✅ 幻覚率 ≤ 5%
- ✅ テストカバレッジ ≥ 80%

### 9.3 ドキュメント基準
- ✅ 全エージェントに詳細なdocstring
- ✅ 使用例とサンプルコード
- ✅ 協調パターンの図解
- ✅ トラブルシューティングガイド

---

## 10. リスクと対策

### リスク1: 統合の複雑性
**対策**: 段階的統合（Phase 1.5 → Phase 2 → Phase 3）

### リスク2: パフォーマンス劣化
**対策**: 各Phase後に性能測定、ボトルネック特定

### リスク3: 後方互換性の喪失
**対策**: 既存APIを維持、新機能は拡張として追加

---

## 次のアクション

**即座に開始**:
1. all_rag_agent_prompts.mdの全エージェント定義を体系的に抽出
2. Phase 1.5 Task 1: クエリ分解エージェント強化から開始
3. システムプロンプト統合テンプレートの作成

**作成者**: Claude Code
**最終更新**: 2025-11-05
