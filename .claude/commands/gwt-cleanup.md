---
description: tmuxセッションを停止しworktreeを削除
---

**tmux** セッションを停止し、**worktree** を削除します。

## 使用方法

```
/gwt-cleanup
```

## 動作

1. tmux セッション `claude_competition` を停止
2. 全ての worktree を削除
3. `worktrees/` ディレクトリをクリーンアップ

## 実行されるコマンド

```bash
cd $MULTI_AGENT_BASE
./tools/gwt cleanup
```

## 注意

⚠️ **このコマンドは破壊的です**

- 全てのworktreeが削除されます
- 未コミットの変更は失われます
- 必要な変更は事前にコミットしてください

## 安全な使用方法

1. 勝者を統合: `/gwt-merge`
2. 変更を確認: `git log`
3. クリーンアップ: `/gwt-cleanup`
