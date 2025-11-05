#!/usr/bin/env python3
"""
Claude Multi-Agent System - Main Entry Point
42体マルチエージェントシステムのメインエントリーポイント
"""
import sys
import subprocess
from pathlib import Path

def launch_core_agents():
    """コアエージェントを起動"""
    print("=" * 60)
    print("🚀 Claude Multi-Agent System 起動")
    print("=" * 60)

    agents = [
        ("blackboard", "共有状態管理"),
        ("auth", "認証・権限管理"),
        ("rag", "知識検索"),
        ("coordinator", "全体統括"),
    ]

    for agent, desc in agents:
        print(f"\n📦 {agent.capitalize()} Agent 起動中... ({desc})")
        agent_path = Path(f"claudecode-agents/core/{agent}/main.py")
        if agent_path.exists():
            try:
                result = subprocess.run(
                    [sys.executable, str(agent_path)],
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                if result.stdout:
                    print(result.stdout)
                if result.returncode == 0:
                    print(f"✓ {agent.capitalize()} 起動成功")
            except Exception as e:
                print(f"⚠️  {agent.capitalize()} 起動エラー: {e}")
        else:
            print(f"⚠️  {agent_path} が見つかりません")

    print("\n" + "=" * 60)
    print("✅ コアエージェント起動完了")
    print("=" * 60)

def main():
    """メインエントリーポイント"""
    launch_core_agents()

    print("\n📋 利用可能なコマンド:")
    print("  ./claudecode-agents/tools/gwt init 3    # Worktree環境作成")
    print("  ./claudecode-agents/tools/gwt run all   # 全エージェント起動")
    print("  ./claudecode-agents/tools/gwt status    # 状態確認")
    print("  python3 claudecode-agents/core/evaluator/main.py  # 評価実行")
    print("\n💡 フルオート開発モード:")
    print("  @tmax_full_auto コマンドで一気通貫の自動開発を実行できます")

if __name__ == "__main__":
    main()
