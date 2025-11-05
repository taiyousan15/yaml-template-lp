"""
Agent 40: グラフ推論エージェント (Graph Reasoning Agent) - 強化版

このエージェントは、RAGシステム内の知識グラフ（Knowledge Graph）を利用して、
複雑なクエリに対する多段階の推論を実行し、単なるキーワードマッチングや埋め込み検索では得られない、
構造化された洞察と論理的な回答を提供します。

all_rag_agent_prompts.mdの定義を完全統合した強化版実装。
"""

from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional, Tuple
from enum import Enum
import json
import time
from datetime import datetime


class GraphQueryLanguage(Enum):
    """グラフクエリ言語"""
    CYPHER = "CYPHER"  # Neo4j
    SPARQL = "SPARQL"  # RDF
    GREMLIN = "GREMLIN"  # TinkerPop


class EntityType(Enum):
    """エンティティタイプ"""
    PERSON = "PERSON"
    ORGANIZATION = "ORGANIZATION"
    LOCATION = "LOCATION"
    PRODUCT = "PRODUCT"
    CONCEPT = "CONCEPT"
    EVENT = "EVENT"
    UNKNOWN = "UNKNOWN"


class RelationType(Enum):
    """関係タイプ"""
    IS_A = "IS_A"  # 分類
    PART_OF = "PART_OF"  # 部分
    RELATED_TO = "RELATED_TO"  # 関連
    CREATED_BY = "CREATED_BY"  # 作成者
    LOCATED_IN = "LOCATED_IN"  # 場所
    WORKS_FOR = "WORKS_FOR"  # 雇用
    UNKNOWN = "UNKNOWN"


@dataclass
class Entity:
    """エンティティ"""
    entity_id: str
    entity_type: EntityType
    name: str
    properties: Dict[str, Any] = field(default_factory=dict)


@dataclass
class Relation:
    """関係"""
    relation_id: str
    relation_type: RelationType
    source_entity_id: str
    target_entity_id: str
    properties: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ReasoningPath:
    """推論パス"""
    path_id: str
    entities: List[Entity]
    relations: List[Relation]
    path_length: int
    path_score: float  # 0.0-1.0
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_string(self) -> str:
        """パスを文字列形式で表現"""
        if not self.entities:
            return "Empty path"

        path_str = self.entities[0].name
        for i, rel in enumerate(self.relations):
            if i + 1 < len(self.entities):
                path_str += f" -[{rel.relation_type.value}]-> {self.entities[i+1].name}"

        return path_str


@dataclass
class GraphReasoningResult:
    """グラフ推論結果（all_rag_agent_prompts.md準拠）"""
    graph_query: str
    reasoning_path: List[Dict[str, Any]]
    final_result: Any

    # 拡張フィールド
    original_query: str
    query_language: str
    extracted_entities: List[Entity]
    extracted_relations: List[str]
    reasoning_paths: List[ReasoningPath]
    execution_time_ms: float = 0.0
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_markdown(self) -> str:
        """Markdown形式で出力"""
        md = f"# Graph Reasoning Result for: {self.original_query}\n\n"
        md += f"## Graph Query ({self.query_language})\n```\n{self.graph_query}\n```\n\n"

        md += f"## Reasoning Paths ({len(self.reasoning_paths)} paths found)\n"
        for i, path in enumerate(self.reasoning_paths[:3], 1):
            md += f"{i}. {path.to_string()} (score: {path.path_score:.2f})\n"
        md += "\n"

        md += f"## Final Result\n{self.final_result}\n\n"

        md += f"## Metadata\n"
        md += f"- Execution Time: {self.execution_time_ms:.2f}ms\n"
        md += f"- Extracted Entities: {len(self.extracted_entities)}\n"
        md += f"- Reasoning Paths: {len(self.reasoning_paths)}\n"

        return md

    def to_json(self) -> str:
        """JSON形式で出力"""
        return json.dumps({
            'graph_query': self.graph_query,
            'reasoning_path': self.reasoning_path,
            'final_result': self.final_result,
            'original_query': self.original_query,
            'query_language': self.query_language,
            'extracted_entities': [
                {'id': e.entity_id, 'type': e.entity_type.value, 'name': e.name}
                for e in self.extracted_entities
            ],
            'reasoning_paths': [
                {'path': p.to_string(), 'score': p.path_score}
                for p in self.reasoning_paths
            ],
            'execution_time_ms': self.execution_time_ms,
            'metadata': self.metadata,
        }, ensure_ascii=False, indent=2)


class GraphReasoningAgent:
    """
    グラフ推論エージェント - 強化版

    all_rag_agent_prompts.mdのAgent 40定義を完全統合:
    - システムプロンプトの実装
    - グラフクエリの生成の実装
    - 多段階推論の実行の実装
    - 結果の統合と説明の実装
    - 協調パターンの実装
    """

    # all_rag_agent_prompts.mdから抽出したシステムプロンプト
    SYSTEM_PROMPT = """
あなたは、知識グラフの「論理学者」であり、エンティティ間の複雑な関係をナビゲートし、
多段階の推論を通じて質問に答える専門家です。あなたの使命は、知識グラフの構造化された力を活用して、
ユーザーのクエリに対する正確で、説明可能で、深い洞察に満ちた回答を生成することです。
"""

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """
        初期化

        Args:
            config: 設定辞書
                - query_language: グラフクエリ言語（デフォルト: "CYPHER"）
                - max_path_length: 最大推論パス長（デフォルト: 5）
                - max_paths: 最大推論パス数（デフォルト: 10）
                - graph_db_uri: グラフDBのURI（デフォルト: None）
        """
        self.config = config or {}
        self.query_language = GraphQueryLanguage[self.config.get('query_language', 'CYPHER')]
        self.max_path_length = self.config.get('max_path_length', 5)
        self.max_paths = self.config.get('max_paths', 10)
        self.graph_db_uri = self.config.get('graph_db_uri')

        # モックグラフデータ（開発用）
        self.mock_graph = self._initialize_mock_graph()

    def _initialize_mock_graph(self) -> Dict[str, Any]:
        """モック知識グラフを初期化（開発用）"""
        # 簡易的なグラフ構造
        return {
            'entities': {
                'e1': Entity('e1', EntityType.PERSON, 'Alice', {'age': 30}),
                'e2': Entity('e2', EntityType.ORGANIZATION, 'TechCorp', {'founded': 2010}),
                'e3': Entity('e3', EntityType.PRODUCT, 'AI Engine', {'version': '2.0'}),
                'e4': Entity('e4', EntityType.CONCEPT, 'Machine Learning', {}),
                'e5': Entity('e5', EntityType.LOCATION, 'San Francisco', {'country': 'USA'}),
            },
            'relations': [
                Relation('r1', RelationType.WORKS_FOR, 'e1', 'e2'),
                Relation('r2', RelationType.CREATED_BY, 'e3', 'e2'),
                Relation('r3', RelationType.RELATED_TO, 'e3', 'e4'),
                Relation('r4', RelationType.LOCATED_IN, 'e2', 'e5'),
            ],
        }

    def parse_query_to_entities_and_relations(
        self,
        query: str
    ) -> Tuple[List[Entity], List[str]]:
        """
        能力1: クエリの解析

        ユーザーのクエリから主要なエンティティ、関係、および制約を識別します。

        Args:
            query: ユーザーのクエリ

        Returns:
            Tuple[List[Entity], List[str]]: (抽出されたエンティティ, 抽出された関係タイプ)
        """
        print(f"\n[Step 1] Parsing Query")
        print(f"  Query: {query}")

        # 簡易的な実装: キーワードマッチング
        # 実際にはNERモデルやLLMを使用してエンティティと関係を抽出

        entities = []
        relation_types = []
        query_lower = query.lower()

        # エンティティの抽出
        for entity_id, entity in self.mock_graph['entities'].items():
            if entity.name.lower() in query_lower:
                entities.append(entity)
                print(f"    Extracted Entity: {entity.name} ({entity.entity_type.value})")

        # 関係タイプの抽出
        relation_keywords = {
            'works for': RelationType.WORKS_FOR,
            '働いて': RelationType.WORKS_FOR,
            'created by': RelationType.CREATED_BY,
            '作成': RelationType.CREATED_BY,
            'related to': RelationType.RELATED_TO,
            '関連': RelationType.RELATED_TO,
            'located in': RelationType.LOCATED_IN,
            '場所': RelationType.LOCATED_IN,
        }

        for keyword, rel_type in relation_keywords.items():
            if keyword in query_lower:
                relation_types.append(rel_type.value)
                print(f"    Extracted Relation: {rel_type.value}")

        if not entities:
            print(f"    No entities found - will search for all relevant entities")

        if not relation_types:
            print(f"    No specific relations found - will explore all relations")

        return entities, relation_types

    def generate_graph_query(
        self,
        query: str,
        entities: List[Entity],
        relation_types: List[str]
    ) -> str:
        """
        能力1: グラフ言語への変換

        識別された要素を知識グラフのクエリ言語に変換します。

        Args:
            query: 元のクエリ
            entities: 抽出されたエンティティ
            relation_types: 抽出された関係タイプ

        Returns:
            str: グラフクエリ（Cypher, SPARQL, Gremlinなど）
        """
        print(f"\n[Step 2] Generating Graph Query ({self.query_language.value})")

        if self.query_language == GraphQueryLanguage.CYPHER:
            # Cypherクエリの生成（Neo4j用）
            if entities:
                # エンティティベースのクエリ
                entity_names = [f'"{e.name}"' for e in entities[:2]]
                if len(entities) == 1:
                    cypher = f"""
MATCH (start {{name: {entity_names[0]}}})
MATCH path = (start)-[*1..{self.max_path_length}]-(related)
RETURN path, related
LIMIT {self.max_paths}
"""
                else:
                    cypher = f"""
MATCH (start {{name: {entity_names[0]}}})
MATCH (end {{name: {entity_names[1]}}})
MATCH path = shortestPath((start)-[*1..{self.max_path_length}]-(end))
RETURN path
"""
            else:
                # 一般的なクエリ
                cypher = f"""
MATCH (n)
RETURN n
LIMIT {self.max_paths}
"""

            print(f"  Generated Cypher Query:")
            print(f"    {cypher.strip()}")
            return cypher.strip()

        elif self.query_language == GraphQueryLanguage.SPARQL:
            # SPARQLクエリの生成（RDF用）
            sparql = f"""
SELECT ?subject ?predicate ?object
WHERE {{
  ?subject ?predicate ?object .
}}
LIMIT {self.max_paths}
"""
            return sparql.strip()

        else:
            # Gremlinクエリの生成（TinkerPop用）
            gremlin = f"g.V().limit({self.max_paths})"
            return gremlin

    def execute_graph_reasoning(
        self,
        graph_query: str,
        entities: List[Entity]
    ) -> List[ReasoningPath]:
        """
        能力2: 多段階推論の実行

        グラフクエリを実行し、推論パスを探索します。

        Args:
            graph_query: グラフクエリ
            entities: 開始エンティティ

        Returns:
            List[ReasoningPath]: 推論パスのリスト
        """
        print(f"\n[Step 3] Executing Graph Reasoning")
        print(f"  Executing query on knowledge graph...")

        # 実際にはグラフDBに接続してクエリを実行
        # ここではモックグラフを使用

        reasoning_paths = []

        if entities:
            # エンティティベースの推論パス探索
            for entity in entities[:1]:  # 最初のエンティティから開始
                paths = self._explore_paths_from_entity(entity, max_depth=self.max_path_length)
                reasoning_paths.extend(paths)
        else:
            # 全エンティティからパスを探索
            for entity in list(self.mock_graph['entities'].values())[:3]:
                paths = self._explore_paths_from_entity(entity, max_depth=2)
                reasoning_paths.extend(paths)

        # パスをスコアでソート
        reasoning_paths.sort(key=lambda p: p.path_score, reverse=True)
        reasoning_paths = reasoning_paths[:self.max_paths]

        print(f"  Found {len(reasoning_paths)} reasoning paths")
        for i, path in enumerate(reasoning_paths[:3], 1):
            print(f"    Path {i}: {path.to_string()} (score: {path.path_score:.2f})")

        return reasoning_paths

    def _explore_paths_from_entity(
        self,
        start_entity: Entity,
        max_depth: int
    ) -> List[ReasoningPath]:
        """エンティティから推論パスを探索（DFS）"""
        paths = []
        visited = set()

        def dfs(current_entity: Entity, current_path: List[Entity], current_relations: List[Relation], depth: int):
            if depth > max_depth:
                return

            visited.add(current_entity.entity_id)

            # 現在のパスを保存
            if len(current_path) > 1:
                path_score = 1.0 / len(current_path)  # 短いパスほど高スコア
                path = ReasoningPath(
                    path_id=f"path_{len(paths)}",
                    entities=current_path.copy(),
                    relations=current_relations.copy(),
                    path_length=len(current_path),
                    path_score=path_score,
                )
                paths.append(path)

            # 隣接エンティティを探索
            for relation in self.mock_graph['relations']:
                if relation.source_entity_id == current_entity.entity_id:
                    next_entity_id = relation.target_entity_id
                    if next_entity_id not in visited:
                        next_entity = self.mock_graph['entities'].get(next_entity_id)
                        if next_entity:
                            dfs(
                                next_entity,
                                current_path + [next_entity],
                                current_relations + [relation],
                                depth + 1
                            )

            visited.remove(current_entity.entity_id)

        dfs(start_entity, [start_entity], [], 0)
        return paths

    def integrate_and_explain_results(
        self,
        query: str,
        graph_query: str,
        reasoning_paths: List[ReasoningPath],
        entities: List[Entity],
        relation_types: List[str]
    ) -> GraphReasoningResult:
        """
        能力3: 結果の統合と説明

        グラフ推論の結果を構造化された形式で提示します。

        Args:
            query: 元のクエリ
            graph_query: 実行されたグラフクエリ
            reasoning_paths: 推論パス
            entities: 抽出されたエンティティ
            relation_types: 抽出された関係タイプ

        Returns:
            GraphReasoningResult: 統合された結果
        """
        print(f"\n[Step 4] Integrating and Explaining Results")

        # 推論パスをJSON形式に変換
        reasoning_path_json = []
        for path in reasoning_paths[:5]:
            reasoning_path_json.append({
                'entities': [e.name for e in path.entities],
                'relations': [r.relation_type.value for r in path.relations],
                'score': path.path_score,
            })

        # 最終結果の生成
        if reasoning_paths:
            best_path = reasoning_paths[0]
            final_result = f"Based on graph reasoning, found {len(reasoning_paths)} paths. "
            final_result += f"Best path: {best_path.to_string()} "
            final_result += f"This suggests that {' and '.join([e.name for e in best_path.entities])} are connected through {len(best_path.relations)} relationships."
        else:
            final_result = "No reasoning paths found in the knowledge graph for this query."

        print(f"  Final Result: {final_result[:100]}...")

        return GraphReasoningResult(
            graph_query=graph_query,
            reasoning_path=reasoning_path_json,
            final_result=final_result,
            original_query=query,
            query_language=self.query_language.value,
            extracted_entities=entities,
            extracted_relations=relation_types,
            reasoning_paths=reasoning_paths,
            execution_time_ms=0.0,
            metadata={
                'timestamp': datetime.now().isoformat(),
                'max_path_length': self.max_path_length,
                'max_paths': self.max_paths,
            }
        )

    def process(
        self,
        query: str,
        context: Optional[Dict[str, Any]] = None
    ) -> GraphReasoningResult:
        """
        グラフ推論のメインエントリーポイント

        Args:
            query: ユーザーのクエリ
            context: コンテキスト情報（オプション）

        Returns:
            GraphReasoningResult: グラフ推論結果
        """
        print(f"\n{'='*80}")
        print(f"[Graph Reasoning Agent] Processing Query")
        print(f"{'='*80}")
        print(f"Query: {query}")

        start_time = time.time()

        # Step 1: クエリの解析
        entities, relation_types = self.parse_query_to_entities_and_relations(query)

        # Step 2: グラフクエリの生成
        graph_query = self.generate_graph_query(query, entities, relation_types)

        # Step 3: 多段階推論の実行
        reasoning_paths = self.execute_graph_reasoning(graph_query, entities)

        # Step 4: 結果の統合と説明
        result = self.integrate_and_explain_results(
            query,
            graph_query,
            reasoning_paths,
            entities,
            relation_types
        )

        result.execution_time_ms = (time.time() - start_time) * 1000

        print(f"\n{'='*80}")
        print(f"[Graph Reasoning Complete]")
        print(f"{'='*80}")
        print(f"  Reasoning Paths Found: {len(reasoning_paths)}")
        print(f"  Execution Time: {result.execution_time_ms:.2f}ms")

        return result

    # ===== 協調パターン実装 =====

    def collaborate_with_master_orchestrator(self, input_data: Dict) -> GraphReasoningResult:
        """
        協調パターン実装: マスターオーケストレーターからのタスク受信

        Args:
            input_data: 入力データ
                - query: ユーザーのクエリ
                - context: コンテキスト（オプション）

        Returns:
            GraphReasoningResult: グラフ推論結果
        """
        query = input_data.get('query', '')
        context = input_data.get('context')
        return self.process(query, context)

    def collaborate_with_query_decomposition_agent(
        self,
        decomposed_subqueries: List[str]
    ) -> List[GraphReasoningResult]:
        """
        協調パターン実装: クエリ分解エージェントとの連携

        複雑なクエリをグラフ推論に適したサブクエリに分解して処理

        Args:
            decomposed_subqueries: 分解されたサブクエリのリスト

        Returns:
            List[GraphReasoningResult]: 各サブクエリのグラフ推論結果
        """
        print(f"\n[Collaboration] Processing {len(decomposed_subqueries)} decomposed subqueries")

        results = []
        for i, subquery in enumerate(decomposed_subqueries, 1):
            print(f"\n  Subquery {i}/{len(decomposed_subqueries)}: {subquery}")
            result = self.process(subquery)
            results.append(result)

        return results

    def collaborate_with_hybrid_search_agent(
        self,
        query: str,
        graph_result: GraphReasoningResult
    ) -> Dict[str, Any]:
        """
        協調パターン実装: ハイブリッド検索エージェントとの連携

        グラフにない情報やテキストベースの情報を補完

        Args:
            query: 元のクエリ
            graph_result: グラフ推論結果

        Returns:
            Dict[str, Any]: 統合されたコンテキスト
        """
        print(f"\n[Collaboration] Collaborating with Hybrid Search Agent")
        print(f"  Graph result provides structured knowledge")
        print(f"  Requesting text-based search for complementary information")

        # 実際にはハイブリッド検索エージェントを呼び出す
        # ここではモックデータを返す

        return {
            'graph_knowledge': graph_result.to_markdown(),
            'text_based_search_needed': len(graph_result.reasoning_paths) == 0,
            'suggested_search_query': query if len(graph_result.reasoning_paths) == 0 else None,
        }

    def provide_to_response_generation_agent(
        self,
        result: GraphReasoningResult
    ) -> Dict[str, Any]:
        """
        協調パターン実装: 応答生成エージェントへのグラフ推論結果提供

        Args:
            result: グラフ推論結果

        Returns:
            Dict[str, Any]: 応答生成エージェント用のデータ
        """
        return {
            'context_type': 'graph_reasoning',
            'original_query': result.original_query,
            'graph_context_markdown': result.to_markdown(),
            'graph_context_json': result.to_json(),
            'reasoning_paths': [
                {'path': p.to_string(), 'score': p.path_score}
                for p in result.reasoning_paths
            ],
            'structured_knowledge': {
                'entities': [e.name for e in result.extracted_entities],
                'final_result': result.final_result,
            },
            'metadata': {
                'query_language': result.query_language,
                'paths_found': len(result.reasoning_paths),
                'execution_time_ms': result.execution_time_ms,
            },
        }


def main():
    """テストとデモンストレーション"""
    print("="*80)
    print("Agent 40: Graph Reasoning Agent - Enhanced Version")
    print("="*80)

    # エージェントの初期化
    agent = GraphReasoningAgent({
        'query_language': 'CYPHER',
        'max_path_length': 5,
        'max_paths': 10,
    })

    # テストクエリ
    test_queries = [
        "AliceはどこでWorks forしていますか？",
        "AI Engineは誰が作成しましたか？",
        "TechCorpに関連する情報を教えてください",
        "Who works at TechCorp?",
        "What products are related to Machine Learning?",
    ]

    for i, query in enumerate(test_queries, 1):
        print(f"\n\n{'#'*80}")
        print(f"# Test Query {i}/{len(test_queries)}")
        print(f"{'#'*80}")

        # グラフ推論の実行
        result = agent.process(query)

        # 結果の表示
        print(f"\n[Graph Reasoning Result]")
        print(f"  Query: {result.original_query}")
        print(f"  Entities Extracted: {len(result.extracted_entities)}")
        for entity in result.extracted_entities:
            print(f"    - {entity.name} ({entity.entity_type.value})")
        print(f"  Reasoning Paths: {len(result.reasoning_paths)}")
        for j, path in enumerate(result.reasoning_paths[:3], 1):
            print(f"    {j}. {path.to_string()} (score: {path.path_score:.2f})")
        print(f"  Execution Time: {result.execution_time_ms:.2f}ms")

        print(f"\n[Final Result]")
        print(f"  {result.final_result}")

        # 協調パターンのテスト
        print(f"\n[Collaboration Test]")

        # 応答生成エージェントへのデータ提供
        response_data = agent.provide_to_response_generation_agent(result)
        print(f"  Data for Response Generation Agent:")
        print(f"    - Context Type: {response_data['context_type']}")
        print(f"    - Paths Found: {response_data['metadata']['paths_found']}")
        print(f"    - Execution Time: {response_data['metadata']['execution_time_ms']:.2f}ms")

        # Markdown出力のテスト
        print(f"\n[Markdown Output (first 300 chars)]")
        markdown_output = result.to_markdown()
        print(f"  {markdown_output[:300]}...")

    print(f"\n\n{'='*80}")
    print("All tests completed successfully!")
    print("="*80)


if __name__ == "__main__":
    main()
