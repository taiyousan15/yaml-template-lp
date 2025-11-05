---
description: 実行中のtmuxセッションに接続してリアルタイムで進捗確認
---

実行中の **tmux** セッションに接続して、リアルタイムで進捗を確認します。

## 使用方法

```
/gwt-attach
```

## 動作

tmuxセッション `claude_competition` に接続します。

## tmux 操作方法

接続後、以下のキーで操作できます:

- `Ctrl+b` → `n` : 次のウィンドウへ移動
- `Ctrl+b` → `p` : 前のウィンドウへ移動
- `Ctrl+b` → `0-9` : 指定番号のウィンドウへ移動
- `Ctrl+b` → `d` : セッションからデタッチ（終了せずに抜ける）

## 実行されるコマンド

```bash
tmux attach-session -t claude_competition
```

## 注意

⚠️ このコマンドは**対話的**です。

- tmuxセッションに入ると、ClaudeCodeの制御が一時停止します
- `Ctrl+b d` でデタッチしてClaudeCodeに戻ってください

## 代替案

対話なしで状況を確認したい場合:

```
/gwt-status
```
