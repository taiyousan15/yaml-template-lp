---
description: Evaluatorが選出した勝者の実装をmainブランチにマージ
---

**Evaluator** が選出した勝者の実装を main ブランチにマージします。

## 使用方法

```
/gwt-merge [ID]
```

- `ID`: 統合するworktreeのID（省略時は winner.txt から自動取得）

## 例

```
/gwt-merge           # winner.txtから自動取得
/gwt-merge try-2     # try-2を強制マージ
```

## 動作

1. `deliverable/reporting/winner.txt` から勝者IDを読み取る
2. 勝者のブランチを main にマージ
3. コンフリクトがあれば警告

## 実行されるコマンド

```bash
cd $MULTI_AGENT_BASE
./tools/gwt merge
```

## 後処理

統合後、worktreeをクリーンアップ:

```
/gwt-cleanup
```
