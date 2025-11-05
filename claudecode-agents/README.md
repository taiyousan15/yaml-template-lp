# Claude Code 42体マルチエージェントシステム

## 概要

このシステムは、42体のAIエージェントが協調・競合しながら、自動的にソフトウェア開発を行うフルオートシステムです。

## システム構成

```
全体イメージ
┌──────────────────────────────┐
│ main/                         │
│   ├─ worktrees/                │
│   │   ├─ build_env/ (builder)  │
│   │   ├─ qa_env/ (qa/tester)   │
│   │   ├─ deploy_env/ (deployer)│
│   │   └─ monitor_env/ (logs)   │
│   └─ orchestrator/ (coordinator)│
└──────────────────────────────┘
```

### コアエージェント（5体）

1. **Coordinator** - 全体統括、タスク分解、エージェント派遣
2. **Auth** - A-JWT認証、権限管理、セキュリティ
3. **RAG** - 知識検索、根拠提供
4. **Blackboard** - 共有状態管理、ログ記録
5. **Evaluator** - Best-of-N評価、勝者選出

## クイックスタート

### 1. システム起動

```bash
cd /Users/matsumototoshihiko/div/YAMLテンプレートLP/my-project
python3 claudecode-agents/main_graph.py
```

### 2. Worktree環境作成（3並列開発環境）

```bash
./claudecode-agents/tools/gwt init 3
```

これで以下の環境が作成されます:
- `worktrees/try-1` - 実装案1
- `worktrees/try-2` - 実装案2
- `worktrees/try-3` - 実装案3

### 3. 全エージェント並列起動

```bash
./claudecode-agents/tools/gwt run all
```

tmuxセッションで各エージェントが並列実行されます。

### 4. 進行状況を確認

```bash
./claudecode-agents/tools/gwt attach
```

tmuxセッションに接続して、各エージェントの動作を確認できます。

### 5. 評価実行

```bash
python3 claudecode-agents/core/evaluator/main.py
```

各実装を採点し、最良の実装を選出します。

### 6. 勝者をmainにマージ

```bash
./claudecode-agents/tools/gwt merge
```

### 7. クリーンアップ

```bash
./claudecode-agents/tools/gwt cleanup
```

## フルオート開発モード

Claude Code内で以下のコマンドを実行:

```
/full-auto
```

これで一気通貫の自動開発が開始されます。

## ディレクトリ構造

```
claudecode-agents/
├── core/
│   ├── coordinator/    # 全体統括
│   ├── auth/           # 認証・権限
│   ├── rag/            # 知識検索
│   ├── blackboard/     # 共有状態
│   └── evaluator/      # 評価システム
├── domain/
│   ├── requirements/   # 要件定義
│   ├── implementation/ # 実装
│   ├── testing/        # テスト
│   ├── devops/         # 運用
│   └── documentation/  # ドキュメント
├── tools/
│   └── gwt             # Worktree+tmux管理ツール
├── deliverable/
│   ├── packaging/      # パッケージング
│   └── reporting/      # レポート出力
│       ├── blackboard_state.json
│       ├── blackboard_log.md
│       ├── blackboard_events.jsonl
│       ├── scoreboard.json
│       ├── winner.txt
│       └── report.md
├── main_graph.py       # エントリーポイント
├── claude-agent-sdk.yaml
└── .env.example
```

## 評価指標

Evaluatorは以下の指標で実装を評価します:

- **test_pass_rate** (50%): テスト合格率
- **code_length_diff** (20%): コード変更量（少ない方が良い）
- **complexity** (20%): コード複雑度（低い方が良い）
- **doc_consistency** (10%): ドキュメント一貫性

計算式: `0.5*pass + 0.2*(1-diff) + 0.2*(1-cplx) + 0.1*doc`

## セキュリティ

### ホワイトリスト（許可されるコマンド）
- `git worktree*`
- `tmux*`
- `pytest*`
- `python*`

### ブラックリスト（禁止されるコマンド）
- `rm -rf*`
- `curl*`
- `scp*`
- `wget*`

すべてのコマンド実行はAuth(A-JWT)で検証されます。

## 出力ファイル

### blackboard_state.json
エージェントの現在状態、タスク、進捗を記録

### blackboard_log.md
実行ログを自然言語で記録

### blackboard_events.jsonl
イベント時系列をJSONL形式で記録

### scoreboard.json
評価結果とスコア

### winner.txt
勝者エージェントのID

### report.md
詳細レポート

## トラブルシューティング

### tmuxセッションが見つからない

```bash
./claudecode-agents/tools/gwt status
```

で状態を確認してください。

### Worktreeが作成できない

gitリポジトリであることを確認:

```bash
git status
```

### 評価が実行できない

worktreeが作成されていることを確認:

```bash
git worktree list
```

## ライセンス

MIT License

## サポート

問題が発生した場合は、`deliverable/reporting/blackboard_log.md` を確認してください。
