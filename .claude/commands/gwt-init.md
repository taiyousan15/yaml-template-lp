---
description: git worktreeを使って並列実行環境を作成
---

**git worktree** を使って並列実行環境を作成します。

## 使用方法

```
/gwt-init [N]
```

- `N`: 作成するworktreeの数（デフォルト: 3）

## 例

```
/gwt-init 3    # 3つのworktreeを作成
/gwt-init 5    # 5つのworktreeを作成
```

## 動作

以下のworktreeが作成されます:

```
worktrees/
├── try-1/    # ブランチ: try-1
├── try-2/    # ブランチ: try-2
└── try-3/    # ブランチ: try-3
```

各worktreeは独立した作業ディレクトリで、同時に異なる実装を試せます。

## 実行されるコマンド

```bash
cd $MULTI_AGENT_BASE
./tools/gwt init 3
```

## 次のステップ

worktree作成後、並列実行:

```
/gwt-run all
```
