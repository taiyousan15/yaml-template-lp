---
description: Best-of-N評価を実行して複数の実装案を自動採点し最良案を選出
---

**Evaluator** エージェントを起動して、複数の実装案を自動採点し、最良案を選出します。

## 使用方法

```
/evaluate
```

## 評価基準

以下の4つの指標で採点します:

1. **テスト合格率** (50%) - pytest の成功率
2. **コード変更量** (20%) - git diff の行数（少ないほど良い）
3. **複雑度** (20%) - radon 循環的複雑度（低いほど良い）
4. **ドキュメント一貫性** (10%) - README/docs の更新有無

## 評価対象

git worktree で作成された複数のブランチ:

- `worktrees/try-1/`
- `worktrees/try-2/`
- `worktrees/try-3/`

## 出力

評価結果は以下に保存されます:

- `Multi-Agent/deliverable/reporting/scoreboard.json` - 全案の採点結果
- `Multi-Agent/deliverable/reporting/winner.txt` - 勝者のID
- `Multi-Agent/deliverable/reporting/report.md` - 詳細レポート

## 実行されるコマンド

```bash
cd $MULTI_AGENT_BASE
python3 core/evaluator/main.py
```

## 次のステップ

評価後、勝者を統合:

```
/gwt-merge
```
