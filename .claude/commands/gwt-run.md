---
description: tmuxを使って複数のworktreeで並列実行
---

**tmux** を使って複数のworktreeで同時に処理を実行します。

## 使用方法

```
/gwt-run <target>
```

- `all`: 全てのworktreeを並列実行
- `try-1`: 特定のworktreeのみ実行

## 例

```
/gwt-run all      # 全worktreeを並列実行
/gwt-run try-1    # try-1のみ実行
```

## 動作

1. tmuxセッション `claude_competition` を作成
2. 各worktreeに対して個別のウィンドウを作成
3. 同時にタスクを実行

## 実行中の確認

tmuxセッションに接続して進捗確認:

```
/gwt-attach
```

または、ステータス確認:

```
/gwt-status
```

## 実行されるコマンド

```bash
cd $MULTI_AGENT_BASE
./tools/gwt run all
```

## 次のステップ

実行完了後、評価:

```
/evaluate
```
