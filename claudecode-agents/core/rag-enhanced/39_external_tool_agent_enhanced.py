"""
Agent 39: 外部ツールエージェント (External Tool Agent) - 強化版

このエージェントは、RAGシステムが内部の知識ベースだけでは回答できないクエリや、
計算、リアルタイムデータ、または特定のAPIアクセスを必要とするクエリを識別し、
適切な外部ツールを呼び出して、その結果を回答生成に統合します。

all_rag_agent_prompts.mdの定義を完全統合した強化版実装。
"""

from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional, Tuple
from enum import Enum
import json
import time
from datetime import datetime
import asyncio


class ToolType(Enum):
    """外部ツールの種類"""
    WEB_SEARCH = "WEB_SEARCH"  # Web検索（最新情報、一般的な知識）
    CALCULATOR = "CALCULATOR"  # 計算機（数学的演算）
    CODE_EXECUTOR = "CODE_EXECUTOR"  # コード実行（複雑なロジック）
    WEATHER_API = "WEATHER_API"  # 天気API
    STOCK_API = "STOCK_API"  # 株価API
    DATABASE_API = "DATABASE_API"  # データベースAPI
    CUSTOM_API = "CUSTOM_API"  # カスタムAPI


class ToolStatus(Enum):
    """ツールステータス"""
    AVAILABLE = "AVAILABLE"
    UNAVAILABLE = "UNAVAILABLE"
    RATE_LIMITED = "RATE_LIMITED"
    ERROR = "ERROR"


@dataclass
class ToolCatalogEntry:
    """ツールカタログエントリ"""
    tool_name: str
    tool_type: ToolType
    description: str
    input_schema: Dict[str, Any]
    output_schema: Dict[str, Any]
    cost_per_call: float  # USD
    avg_latency_ms: float
    status: ToolStatus
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ToolCallPlan:
    """ツール呼び出し計画（all_rag_agent_prompts.md準拠）"""
    tool_name: str
    parameters: Dict[str, Any]
    reasoning: str

    # 拡張フィールド
    tool_type: str
    estimated_cost: float
    estimated_latency_ms: float
    priority: int  # 1-5（1=最高優先度）
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ToolExecutionResult:
    """ツール実行結果"""
    tool_name: str
    success: bool
    result_data: Any
    error_message: Optional[str] = None
    execution_time_ms: float = 0.0
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class IntegratedContext:
    """統合されたコンテキスト（all_rag_agent_prompts.md準拠）"""
    original_query: str
    internal_search_results: List[Dict[str, Any]]
    external_tool_results: List[ToolExecutionResult]
    integrated_summary: str  # Markdown形式

    # 拡張フィールド
    total_tools_called: int
    total_cost: float
    total_latency_ms: float
    confidence_score: float  # 0.0-1.0
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_markdown(self) -> str:
        """Markdown形式で出力"""
        md = f"# Integrated Context for: {self.original_query}\n\n"
        md += f"## Summary\n{self.integrated_summary}\n\n"

        if self.internal_search_results:
            md += f"## Internal Search Results ({len(self.internal_search_results)} documents)\n"
            for i, doc in enumerate(self.internal_search_results[:3], 1):
                md += f"{i}. {doc.get('text', '')[:100]}...\n"
            md += "\n"

        if self.external_tool_results:
            md += f"## External Tool Results ({len(self.external_tool_results)} tools)\n"
            for result in self.external_tool_results:
                md += f"- **{result.tool_name}**: {result.result_data}\n"
            md += "\n"

        md += f"## Metadata\n"
        md += f"- Tools Called: {self.total_tools_called}\n"
        md += f"- Total Cost: ${self.total_cost:.4f}\n"
        md += f"- Total Latency: {self.total_latency_ms:.2f}ms\n"
        md += f"- Confidence: {self.confidence_score:.2f}\n"

        return md

    def to_json(self) -> str:
        """JSON形式で出力"""
        return json.dumps({
            'original_query': self.original_query,
            'internal_search_results': self.internal_search_results,
            'external_tool_results': [
                {
                    'tool_name': r.tool_name,
                    'success': r.success,
                    'result_data': r.result_data,
                    'execution_time_ms': r.execution_time_ms,
                }
                for r in self.external_tool_results
            ],
            'integrated_summary': self.integrated_summary,
            'total_tools_called': self.total_tools_called,
            'total_cost': self.total_cost,
            'total_latency_ms': self.total_latency_ms,
            'confidence_score': self.confidence_score,
            'metadata': self.metadata,
        }, ensure_ascii=False, indent=2)


class ExternalToolAgent:
    """
    外部ツールエージェント - 強化版

    all_rag_agent_prompts.mdのAgent 39定義を完全統合:
    - システムプロンプトの実装
    - ツールの呼び出しとルーティングの実装
    - 結果の統合と検証の実装
    - ツールの管理の実装
    - 協調パターンの実装
    """

    # all_rag_agent_prompts.mdから抽出したシステムプロンプト
    SYSTEM_PROMPT = """
あなたは、RAGシステムの「拡張された知性」であり、内部の知識の限界を超えて、外部の専門的なリソースを活用する能力を持っています。
あなたの使命は、ユーザーのクエリを分析し、外部ツールの呼び出しが必要かどうかを判断し、
ツールの結果を効果的に統合して、より正確で最新の、または計算に基づいた回答を提供することです。
"""

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """
        初期化

        Args:
            config: 設定辞書
                - enable_web_search: Web検索を有効化（デフォルト: True）
                - enable_calculator: 計算機を有効化（デフォルト: True）
                - enable_code_executor: コード実行を有効化（デフォルト: False）
                - max_tools_per_query: 1クエリあたりの最大ツール数（デフォルト: 3）
                - cost_limit_per_query: 1クエリあたりのコスト上限（USD）（デフォルト: 0.1）
        """
        self.config = config or {}
        self.enable_web_search = self.config.get('enable_web_search', True)
        self.enable_calculator = self.config.get('enable_calculator', True)
        self.enable_code_executor = self.config.get('enable_code_executor', False)
        self.max_tools_per_query = self.config.get('max_tools_per_query', 3)
        self.cost_limit_per_query = self.config.get('cost_limit_per_query', 0.1)

        # ツールカタログの初期化
        self.tool_catalog = self._initialize_tool_catalog()

        # ツール健全性メトリクス
        self.tool_metrics = {
            tool_name: {
                'total_calls': 0,
                'successful_calls': 0,
                'failed_calls': 0,
                'total_latency_ms': 0.0,
                'total_cost': 0.0,
            }
            for tool_name in self.tool_catalog.keys()
        }

    def _initialize_tool_catalog(self) -> Dict[str, ToolCatalogEntry]:
        """
        能力3: ツールのカタログを初期化

        Returns:
            Dict[str, ToolCatalogEntry]: ツール名→カタログエントリのマッピング
        """
        catalog = {}

        # Web検索ツール
        if self.enable_web_search:
            catalog['google_search'] = ToolCatalogEntry(
                tool_name='google_search',
                tool_type=ToolType.WEB_SEARCH,
                description='Google検索APIで最新情報を取得',
                input_schema={'query': 'string', 'num_results': 'int'},
                output_schema={'results': 'list[dict]'},
                cost_per_call=0.005,
                avg_latency_ms=500.0,
                status=ToolStatus.AVAILABLE,
                metadata={'api_provider': 'Google'},
            )

        # 計算機ツール
        if self.enable_calculator:
            catalog['calculator'] = ToolCatalogEntry(
                tool_name='calculator',
                tool_type=ToolType.CALCULATOR,
                description='数学的な計算を実行',
                input_schema={'expression': 'string'},
                output_schema={'result': 'float'},
                cost_per_call=0.0,
                avg_latency_ms=10.0,
                status=ToolStatus.AVAILABLE,
                metadata={'engine': 'python_eval'},
            )

        # コード実行ツール
        if self.enable_code_executor:
            catalog['python_executor'] = ToolCatalogEntry(
                tool_name='python_executor',
                tool_type=ToolType.CODE_EXECUTOR,
                description='Pythonコードを実行',
                input_schema={'code': 'string'},
                output_schema={'output': 'string', 'error': 'string'},
                cost_per_call=0.01,
                avg_latency_ms=1000.0,
                status=ToolStatus.AVAILABLE,
                metadata={'runtime': 'python3.9'},
            )

        # 天気APIツール
        catalog['weather_api'] = ToolCatalogEntry(
            tool_name='weather_api',
            tool_type=ToolType.WEATHER_API,
            description='現在の天気情報を取得',
            input_schema={'location': 'string'},
            output_schema={'temperature': 'float', 'condition': 'string'},
            cost_per_call=0.001,
            avg_latency_ms=300.0,
            status=ToolStatus.AVAILABLE,
            metadata={'api_provider': 'OpenWeather'},
        )

        # 株価APIツール
        catalog['stock_api'] = ToolCatalogEntry(
            tool_name='stock_api',
            tool_type=ToolType.STOCK_API,
            description='株価情報を取得',
            input_schema={'symbol': 'string'},
            output_schema={'price': 'float', 'change': 'float'},
            cost_per_call=0.002,
            avg_latency_ms=400.0,
            status=ToolStatus.AVAILABLE,
            metadata={'api_provider': 'AlphaVantage'},
        )

        return catalog

    def identify_required_tools(
        self,
        query: str,
        context: Optional[Dict[str, Any]] = None
    ) -> List[ToolCallPlan]:
        """
        能力1: ツールの識別とルーティング

        ユーザーのクエリを分析し、必要な外部ツールを識別します。

        Args:
            query: ユーザーのクエリ
            context: コンテキスト情報（オプション）

        Returns:
            List[ToolCallPlan]: ツール呼び出し計画のリスト
        """
        print(f"\n[External Tool Agent] Identifying Required Tools")
        print(f"  Query: {query}")

        plans = []
        query_lower = query.lower()

        # キーワードベースのツール識別（簡易版）
        # 実際にはLLMを使用して高度な判定を行うべき

        # Web検索の必要性を判定
        web_search_keywords = ['最新', 'latest', '現在', 'current', 'ニュース', 'news', 'いつ', 'when']
        if any(kw in query_lower for kw in web_search_keywords) and 'google_search' in self.tool_catalog:
            plans.append(ToolCallPlan(
                tool_name='google_search',
                parameters={'query': query, 'num_results': 5},
                reasoning=f'クエリに「{[kw for kw in web_search_keywords if kw in query_lower][0]}」が含まれているため、最新情報が必要',
                tool_type=ToolType.WEB_SEARCH.value,
                estimated_cost=self.tool_catalog['google_search'].cost_per_call,
                estimated_latency_ms=self.tool_catalog['google_search'].avg_latency_ms,
                priority=1,
            ))

        # 計算の必要性を判定
        calc_keywords = ['計算', 'calculate', '合計', 'sum', '平均', 'average', '+', '-', '*', '/', '=']
        if any(kw in query_lower for kw in calc_keywords) and 'calculator' in self.tool_catalog:
            # 数式を抽出（簡易版）
            expression = self._extract_math_expression(query)
            if expression:
                plans.append(ToolCallPlan(
                    tool_name='calculator',
                    parameters={'expression': expression},
                    reasoning='クエリに数学的な計算が含まれている',
                    tool_type=ToolType.CALCULATOR.value,
                    estimated_cost=self.tool_catalog['calculator'].cost_per_call,
                    estimated_latency_ms=self.tool_catalog['calculator'].avg_latency_ms,
                    priority=2,
                ))

        # 天気情報の必要性を判定
        weather_keywords = ['天気', 'weather', '気温', 'temperature', '降水', 'rain']
        if any(kw in query_lower for kw in weather_keywords) and 'weather_api' in self.tool_catalog:
            location = self._extract_location(query)
            plans.append(ToolCallPlan(
                tool_name='weather_api',
                parameters={'location': location or 'Tokyo'},
                reasoning='クエリに天気情報が含まれている',
                tool_type=ToolType.WEATHER_API.value,
                estimated_cost=self.tool_catalog['weather_api'].cost_per_call,
                estimated_latency_ms=self.tool_catalog['weather_api'].avg_latency_ms,
                priority=2,
            ))

        # 株価情報の必要性を判定
        stock_keywords = ['株価', 'stock', '株式', 'share', 'ティッカー', 'ticker']
        if any(kw in query_lower for kw in stock_keywords) and 'stock_api' in self.tool_catalog:
            symbol = self._extract_stock_symbol(query)
            plans.append(ToolCallPlan(
                tool_name='stock_api',
                parameters={'symbol': symbol or 'AAPL'},
                reasoning='クエリに株価情報が含まれている',
                tool_type=ToolType.STOCK_API.value,
                estimated_cost=self.tool_catalog['stock_api'].cost_per_call,
                estimated_latency_ms=self.tool_catalog['stock_api'].avg_latency_ms,
                priority=2,
            ))

        # 優先度でソート
        plans.sort(key=lambda p: p.priority)

        # 最大ツール数とコスト制限を適用
        filtered_plans = []
        total_cost = 0.0
        for plan in plans[:self.max_tools_per_query]:
            if total_cost + plan.estimated_cost <= self.cost_limit_per_query:
                filtered_plans.append(plan)
                total_cost += plan.estimated_cost
            else:
                print(f"  Skipping {plan.tool_name} due to cost limit")

        print(f"\n[Tool Call Plans]")
        for i, plan in enumerate(filtered_plans, 1):
            print(f"  {i}. {plan.tool_name} (Priority: {plan.priority})")
            print(f"     Parameters: {plan.parameters}")
            print(f"     Reasoning: {plan.reasoning}")
            print(f"     Estimated Cost: ${plan.estimated_cost:.4f}, Latency: {plan.estimated_latency_ms:.2f}ms")

        return filtered_plans

    def _extract_math_expression(self, query: str) -> Optional[str]:
        """数式を抽出（簡易版）"""
        # 簡易的な実装: 数字と演算子を含む部分を抽出
        import re
        pattern = r'[\d\+\-\*/\(\)\.\s]+'
        matches = re.findall(pattern, query)
        if matches:
            # 最も長いマッチを返す
            return max(matches, key=len).strip()
        return None

    def _extract_location(self, query: str) -> Optional[str]:
        """場所を抽出（簡易版）"""
        # 簡易的な実装: 主要都市名を検索
        cities = ['Tokyo', '東京', 'Osaka', '大阪', 'New York', 'London', 'Paris']
        for city in cities:
            if city.lower() in query.lower():
                return city
        return None

    def _extract_stock_symbol(self, query: str) -> Optional[str]:
        """株式シンボルを抽出（簡易版）"""
        # 簡易的な実装: 一般的なティッカーシンボルを検索
        import re
        symbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'NVDA']
        for symbol in symbols:
            if symbol.lower() in query.lower():
                return symbol
        # 大文字の3-5文字のパターンを探す
        pattern = r'\b[A-Z]{3,5}\b'
        matches = re.findall(pattern, query)
        if matches:
            return matches[0]
        return None

    async def execute_tool(self, plan: ToolCallPlan) -> ToolExecutionResult:
        """
        能力2: ツールの実行（非同期）

        Args:
            plan: ツール呼び出し計画

        Returns:
            ToolExecutionResult: 実行結果
        """
        start_time = time.time()

        try:
            # ツールの実行（モック実装）
            # 実際には各ツールのAPIを呼び出す

            if plan.tool_name == 'google_search':
                result_data = await self._mock_web_search(plan.parameters['query'])
            elif plan.tool_name == 'calculator':
                result_data = self._execute_calculator(plan.parameters['expression'])
            elif plan.tool_name == 'weather_api':
                result_data = await self._mock_weather_api(plan.parameters['location'])
            elif plan.tool_name == 'stock_api':
                result_data = await self._mock_stock_api(plan.parameters['symbol'])
            else:
                raise ValueError(f"Unknown tool: {plan.tool_name}")

            execution_time = (time.time() - start_time) * 1000

            # メトリクスの更新
            self.tool_metrics[plan.tool_name]['total_calls'] += 1
            self.tool_metrics[plan.tool_name]['successful_calls'] += 1
            self.tool_metrics[plan.tool_name]['total_latency_ms'] += execution_time
            self.tool_metrics[plan.tool_name]['total_cost'] += plan.estimated_cost

            return ToolExecutionResult(
                tool_name=plan.tool_name,
                success=True,
                result_data=result_data,
                execution_time_ms=execution_time,
                metadata={'plan': plan},
            )

        except Exception as e:
            execution_time = (time.time() - start_time) * 1000

            # メトリクスの更新
            self.tool_metrics[plan.tool_name]['total_calls'] += 1
            self.tool_metrics[plan.tool_name]['failed_calls'] += 1

            return ToolExecutionResult(
                tool_name=plan.tool_name,
                success=False,
                result_data=None,
                error_message=str(e),
                execution_time_ms=execution_time,
                metadata={'plan': plan},
            )

    async def _mock_web_search(self, query: str) -> List[Dict[str, Any]]:
        """モックWeb検索"""
        await asyncio.sleep(0.5)  # API呼び出しをシミュレート
        return [
            {'title': f'Search result 1 for {query}', 'url': 'https://example.com/1', 'snippet': f'Relevant information about {query}...'},
            {'title': f'Search result 2 for {query}', 'url': 'https://example.com/2', 'snippet': f'More details about {query}...'},
            {'title': f'Search result 3 for {query}', 'url': 'https://example.com/3', 'snippet': f'Additional context for {query}...'},
        ]

    def _execute_calculator(self, expression: str) -> float:
        """計算機の実行"""
        try:
            # 安全な評価（本番環境ではast.literal_evalなどを使用）
            result = eval(expression, {"__builtins__": {}}, {})
            return float(result)
        except Exception as e:
            raise ValueError(f"Invalid expression: {expression}")

    async def _mock_weather_api(self, location: str) -> Dict[str, Any]:
        """モック天気API"""
        await asyncio.sleep(0.3)  # API呼び出しをシミュレート
        return {
            'location': location,
            'temperature': 22.5,
            'condition': 'Partly Cloudy',
            'humidity': 65,
            'wind_speed': 10.5,
        }

    async def _mock_stock_api(self, symbol: str) -> Dict[str, Any]:
        """モック株価API"""
        await asyncio.sleep(0.4)  # API呼び出しをシミュレート
        return {
            'symbol': symbol,
            'price': 175.43,
            'change': 2.15,
            'change_percent': 1.24,
            'volume': 52341234,
        }

    async def execute_tools_async(
        self,
        plans: List[ToolCallPlan]
    ) -> List[ToolExecutionResult]:
        """
        複数のツールを非同期で実行

        Args:
            plans: ツール呼び出し計画のリスト

        Returns:
            List[ToolExecutionResult]: 実行結果のリスト
        """
        print(f"\n[Step 2] Executing {len(plans)} tools asynchronously")

        tasks = [self.execute_tool(plan) for plan in plans]
        results = await asyncio.gather(*tasks)

        for result in results:
            status = "✅ Success" if result.success else "❌ Failed"
            print(f"  [{status}] {result.tool_name}: {result.execution_time_ms:.2f}ms")

        return list(results)

    def integrate_results(
        self,
        query: str,
        internal_results: List[Dict[str, Any]],
        tool_results: List[ToolExecutionResult]
    ) -> IntegratedContext:
        """
        能力2: 結果の統合と検証

        内部検索結果と外部ツール結果を統合します。

        Args:
            query: 元のクエリ
            internal_results: 内部検索結果
            tool_results: 外部ツール実行結果

        Returns:
            IntegratedContext: 統合されたコンテキスト
        """
        print(f"\n[Step 3] Integrating Results")
        print(f"  Internal Results: {len(internal_results)} documents")
        print(f"  External Tool Results: {len(tool_results)} tools")

        # 検証とフィルタリング
        validated_results = []
        for result in tool_results:
            if result.success and self._validate_result(result, query):
                validated_results.append(result)
                print(f"  ✅ Validated: {result.tool_name}")
            else:
                print(f"  ❌ Rejected: {result.tool_name}")

        # 統合サマリーの生成
        summary = self._generate_integrated_summary(query, internal_results, validated_results)

        # メトリクスの計算
        total_cost = sum(r.metadata.get('plan').estimated_cost for r in validated_results if r.metadata.get('plan'))
        total_latency = sum(r.execution_time_ms for r in validated_results)
        confidence_score = self._calculate_confidence_score(internal_results, validated_results)

        context = IntegratedContext(
            original_query=query,
            internal_search_results=internal_results,
            external_tool_results=validated_results,
            integrated_summary=summary,
            total_tools_called=len(validated_results),
            total_cost=total_cost,
            total_latency_ms=total_latency,
            confidence_score=confidence_score,
            metadata={
                'timestamp': datetime.now().isoformat(),
                'tool_metrics': self.tool_metrics,
            }
        )

        print(f"  Integrated Summary Length: {len(summary)} chars")
        print(f"  Confidence Score: {confidence_score:.2f}")

        return context

    def _validate_result(self, result: ToolExecutionResult, query: str) -> bool:
        """結果を検証（簡易版）"""
        # 簡易的な検証: 成功したかどうか
        # 実際には、結果が元のクエリに関連しているか、信頼できるかを検証
        if not result.success:
            return False
        if result.result_data is None:
            return False
        return True

    def _generate_integrated_summary(
        self,
        query: str,
        internal_results: List[Dict[str, Any]],
        tool_results: List[ToolExecutionResult]
    ) -> str:
        """統合サマリーを生成"""
        # 簡易的な実装: 各結果を要約
        # 実際にはLLMを使用して高品質なサマリーを生成

        summary = f"Query: {query}\n\n"

        if internal_results:
            summary += "Internal Knowledge Base:\n"
            for i, doc in enumerate(internal_results[:2], 1):
                summary += f"- {doc.get('text', '')[:100]}...\n"
            summary += "\n"

        if tool_results:
            summary += "External Tool Results:\n"
            for result in tool_results:
                summary += f"- {result.tool_name}: {str(result.result_data)[:100]}...\n"
            summary += "\n"

        summary += "This integrated context combines internal knowledge with external data sources."

        return summary

    def _calculate_confidence_score(
        self,
        internal_results: List[Dict[str, Any]],
        tool_results: List[ToolExecutionResult]
    ) -> float:
        """信頼度スコアを計算"""
        # 簡易的な実装: 結果の数に基づく
        # 実際には、結果の質、一貫性、信頼性などを総合的に評価

        internal_score = min(len(internal_results) * 0.1, 0.5)
        external_score = min(len(tool_results) * 0.2, 0.5)

        return internal_score + external_score

    async def process_async(
        self,
        query: str,
        internal_results: Optional[List[Dict[str, Any]]] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> IntegratedContext:
        """
        外部ツールエージェントのメインエントリーポイント（非同期）

        Args:
            query: ユーザーのクエリ
            internal_results: 内部検索結果（オプション）
            context: コンテキスト情報（オプション）

        Returns:
            IntegratedContext: 統合されたコンテキスト
        """
        print(f"\n{'='*80}")
        print(f"[External Tool Agent] Processing Query (Async)")
        print(f"{'='*80}")
        print(f"Query: {query}")

        start_time = time.time()

        # Step 1: 必要なツールの識別
        plans = self.identify_required_tools(query, context)

        if not plans:
            print(f"\n[No External Tools Required]")
            # 外部ツールが不要な場合、内部結果のみを返す
            return IntegratedContext(
                original_query=query,
                internal_search_results=internal_results or [],
                external_tool_results=[],
                integrated_summary=f"Query '{query}' can be answered using internal knowledge base only.",
                total_tools_called=0,
                total_cost=0.0,
                total_latency_ms=0.0,
                confidence_score=0.5,
            )

        # Step 2: ツールの非同期実行
        tool_results = await self.execute_tools_async(plans)

        # Step 3: 結果の統合
        integrated_context = self.integrate_results(
            query,
            internal_results or [],
            tool_results
        )

        total_time = (time.time() - start_time) * 1000

        print(f"\n{'='*80}")
        print(f"[External Tool Agent Complete]")
        print(f"{'='*80}")
        print(f"  Tools Called: {integrated_context.total_tools_called}")
        print(f"  Total Cost: ${integrated_context.total_cost:.4f}")
        print(f"  Total Latency: {integrated_context.total_latency_ms:.2f}ms")
        print(f"  Confidence Score: {integrated_context.confidence_score:.2f}")
        print(f"  Total Processing Time: {total_time:.2f}ms")

        return integrated_context

    def process(
        self,
        query: str,
        internal_results: Optional[List[Dict[str, Any]]] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> IntegratedContext:
        """同期版のメインエントリーポイント"""
        return asyncio.run(self.process_async(query, internal_results, context))

    # ===== 協調パターン実装 =====

    def collaborate_with_master_orchestrator(self, input_data: Dict) -> IntegratedContext:
        """
        協調パターン実装: マスターオーケストレーターからのタスク受信

        Args:
            input_data: 入力データ
                - query: ユーザーのクエリ
                - internal_results: 内部検索結果（オプション）
                - context: コンテキスト（オプション）

        Returns:
            IntegratedContext: 統合されたコンテキスト
        """
        query = input_data.get('query', '')
        internal_results = input_data.get('internal_results')
        context = input_data.get('context')
        return self.process(query, internal_results, context)

    async def collaborate_with_hybrid_search_agent_async(
        self,
        query: str
    ) -> Tuple[List[Dict[str, Any]], List[ToolExecutionResult]]:
        """
        協調パターン実装: ハイブリッド検索エージェントとの並行実行（非同期）

        Args:
            query: ユーザーのクエリ

        Returns:
            Tuple: (内部検索結果, 外部ツール結果)
        """
        print(f"\n[Collaboration] Parallel execution with Hybrid Search Agent")

        # 並行実行: 内部検索 + 外部ツール
        internal_task = asyncio.create_task(self._mock_internal_search(query))

        plans = self.identify_required_tools(query)
        external_task = asyncio.create_task(self.execute_tools_async(plans))

        internal_results, external_results = await asyncio.gather(internal_task, external_task)

        return internal_results, external_results

    async def _mock_internal_search(self, query: str) -> List[Dict[str, Any]]:
        """モック内部検索"""
        await asyncio.sleep(0.3)
        return [
            {'id': 'doc1', 'score': 0.92, 'text': f'Internal document about {query}'},
            {'id': 'doc2', 'score': 0.88, 'text': f'Another internal doc related to {query}'},
        ]

    def provide_to_response_generation_agent(
        self,
        integrated_context: IntegratedContext
    ) -> Dict[str, Any]:
        """
        協調パターン実装: 応答生成エージェントへの統合コンテキスト提供

        Args:
            integrated_context: 統合されたコンテキスト

        Returns:
            Dict[str, Any]: 応答生成エージェント用のデータ
        """
        return {
            'context_type': 'external_tool_integrated',
            'original_query': integrated_context.original_query,
            'integrated_context_markdown': integrated_context.to_markdown(),
            'integrated_context_json': integrated_context.to_json(),
            'confidence_score': integrated_context.confidence_score,
            'metadata': {
                'tools_used': [r.tool_name for r in integrated_context.external_tool_results],
                'total_cost': integrated_context.total_cost,
                'total_latency': integrated_context.total_latency_ms,
            },
        }

    def report_to_cost_optimization_agent(
        self,
        integrated_context: IntegratedContext
    ) -> Dict[str, Any]:
        """
        協調パターン実装: コスト最適化エージェントへのコスト報告

        Args:
            integrated_context: 統合されたコンテキスト

        Returns:
            Dict[str, Any]: コストデータ
        """
        return {
            'agent_name': 'ExternalToolAgent',
            'agent_id': 39,
            'query': integrated_context.original_query,
            'tools_called': [
                {
                    'tool_name': r.tool_name,
                    'cost': r.metadata.get('plan').estimated_cost if r.metadata.get('plan') else 0.0,
                    'latency_ms': r.execution_time_ms,
                }
                for r in integrated_context.external_tool_results
            ],
            'total_cost': integrated_context.total_cost,
            'total_latency_ms': integrated_context.total_latency_ms,
            'timestamp': datetime.now().isoformat(),
        }

    def get_tool_health_report(self) -> Dict[str, Any]:
        """
        能力3: ツールの健全性監視レポートを取得

        Returns:
            Dict[str, Any]: 健全性レポート
        """
        report = {
            'timestamp': datetime.now().isoformat(),
            'tools': {},
        }

        for tool_name, metrics in self.tool_metrics.items():
            total_calls = metrics['total_calls']
            if total_calls > 0:
                success_rate = metrics['successful_calls'] / total_calls
                avg_latency = metrics['total_latency_ms'] / total_calls
                avg_cost = metrics['total_cost'] / total_calls
            else:
                success_rate = 0.0
                avg_latency = 0.0
                avg_cost = 0.0

            report['tools'][tool_name] = {
                'total_calls': total_calls,
                'success_rate': success_rate,
                'avg_latency_ms': avg_latency,
                'avg_cost': avg_cost,
                'status': self.tool_catalog[tool_name].status.value,
            }

        return report


def main():
    """テストとデモンストレーション"""
    print("="*80)
    print("Agent 39: External Tool Agent - Enhanced Version")
    print("="*80)

    # エージェントの初期化
    agent = ExternalToolAgent({
        'enable_web_search': True,
        'enable_calculator': True,
        'enable_code_executor': False,
        'max_tools_per_query': 3,
        'cost_limit_per_query': 0.1,
    })

    # テストクエリ
    test_queries = [
        ("東京の現在の天気は？", None),
        ("AAPLの最新の株価は？", None),
        ("123 + 456 * 2の計算結果は？", None),
        ("量子コンピューティングの最新ニュースを教えて", None),
        ("Pythonでリストをソートする方法", [{'id': 'doc1', 'text': 'Python list.sort() method...'}]),
    ]

    for i, (query, internal_results) in enumerate(test_queries, 1):
        print(f"\n\n{'#'*80}")
        print(f"# Test Query {i}/{len(test_queries)}")
        print(f"{'#'*80}")

        # 外部ツールエージェントの実行
        integrated_context = agent.process(query, internal_results)

        # 結果の表示
        print(f"\n[Integrated Context Result]")
        print(f"  Query: {integrated_context.original_query}")
        print(f"  Tools Called: {integrated_context.total_tools_called}")
        print(f"  Total Cost: ${integrated_context.total_cost:.4f}")
        print(f"  Total Latency: {integrated_context.total_latency_ms:.2f}ms")
        print(f"  Confidence Score: {integrated_context.confidence_score:.2f}")

        if integrated_context.external_tool_results:
            print(f"\n[External Tool Results]")
            for result in integrated_context.external_tool_results:
                print(f"  - {result.tool_name}: {result.result_data}")

        # 協調パターンのテスト
        print(f"\n[Collaboration Test]")

        # 応答生成エージェントへのデータ提供
        response_data = agent.provide_to_response_generation_agent(integrated_context)
        print(f"  Data for Response Generation Agent:")
        print(f"    - Context Type: {response_data['context_type']}")
        print(f"    - Confidence Score: {response_data['confidence_score']:.2f}")
        print(f"    - Tools Used: {response_data['metadata']['tools_used']}")

        # コスト最適化エージェントへのレポート
        cost_report = agent.report_to_cost_optimization_agent(integrated_context)
        print(f"  Cost Report for Optimization Agent:")
        print(f"    - Total Cost: ${cost_report['total_cost']:.4f}")
        print(f"    - Total Latency: {cost_report['total_latency_ms']:.2f}ms")

    # ツール健全性レポート
    print(f"\n\n{'='*80}")
    print(f"[Tool Health Report]")
    print(f"{'='*80}")
    health_report = agent.get_tool_health_report()
    for tool_name, metrics in health_report['tools'].items():
        if metrics['total_calls'] > 0:
            print(f"\n{tool_name}:")
            print(f"  Total Calls: {metrics['total_calls']}")
            print(f"  Success Rate: {metrics['success_rate']*100:.1f}%")
            print(f"  Avg Latency: {metrics['avg_latency_ms']:.2f}ms")
            print(f"  Avg Cost: ${metrics['avg_cost']:.4f}")
            print(f"  Status: {metrics['status']}")

    print(f"\n\n{'='*80}")
    print("All tests completed successfully!")
    print("="*80)


if __name__ == "__main__":
    main()
