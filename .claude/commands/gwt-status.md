---
description: Multi-Agentシステムのworktreeとtmuxセッションの状態を表示
---

現在の **worktree** と **tmux** セッションの状態を表示します。

## 使用方法

```
/gwt-status
```

## 表示内容

1. **Worktree一覧**
   - 作成済みのworktreeとブランチ

2. **Tmuxセッション**
   - 実行中のセッションとウィンドウ

3. **評価結果**
   - 最新のスコアボード（存在する場合）

## 実行されるコマンド

```bash
cd $MULTI_AGENT_BASE
./tools/gwt status
```

## 例

```
📊 Worktrees:
  try-1 -> worktrees/try-1
  try-2 -> worktrees/try-2
  try-3 -> worktrees/try-3

🔄 Tmux Sessions:
  claude_competition: 3 windows

✅ Latest Evaluation:
  Winner: try-2 (score: 0.92)
```
