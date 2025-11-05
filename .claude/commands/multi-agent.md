---
description: 42体マルチエージェント・システムを起動して、複雑なタスクを協調的に解決します
---

**42体マルチエージェント・システム**を起動して、複雑なタスクを協調的に解決します。

## 使用方法

```
/multi-agent <タスク内容>
```

## 例

```
/multi-agent ログイン機能を実装
/multi-agent RESTful APIのテストを作成
/multi-agent デプロイメントパイプラインを構築
```

## システムの動作

1. **Coordinator** がタスクを分解し、依存関係を解析
2. **Auth** がセキュリティチェック（A-JWT）
3. **RAG** が過去の関連ドキュメントを検索
4. **複数のドメインエージェント** が並列で実装案を作成（Best-of-N）
5. **Evaluator** が自動採点して最良案を選出
6. **Blackboard** に全履歴を記録

## 実行されるコマンド

このコマンドは以下を自動実行します:

```bash
cd $MULTI_AGENT_BASE
python3 main_graph.py --task "<タスク内容>"
```

タスク内容が指定されない場合はデモモードで実行されます。

## オプション: 並列実行

Best-of-N で複数案を競争させる場合:

```
/gwt-init 3        # 3つのworktreeを作成
/gwt-run all       # 並列実行
/evaluate          # 評価
/gwt-merge         # 勝者を統合
```

## 出力先

全ての記録は以下に保存されます:

- `Multi-Agent/deliverable/reporting/blackboard_log.md` - 作業ログ
- `Multi-Agent/deliverable/reporting/blackboard_state.json` - 状態
- `Multi-Agent/deliverable/reporting/scoreboard.json` - 評価結果
