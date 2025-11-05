#!/usr/bin/env python3
"""
Blackboard Agent - 共有状態管理・ログ記録
"""
import json
from pathlib import Path
from datetime import datetime

class Blackboard:
    def __init__(self, base_path="deliverable/reporting"):
        self.base = Path(base_path)
        self.base.mkdir(parents=True, exist_ok=True)
        self.state_file = self.base / "blackboard_state.json"
        self.log_file = self.base / "blackboard_log.md"
        self.events_file = self.base / "blackboard_events.jsonl"

    def init_state(self):
        """初期状態を設定"""
        if not self.state_file.exists():
            state = {
                "version": "1.0",
                "agents": {
                    "coordinator": "idle",
                    "auth": "idle",
                    "rag": "idle",
                    "evaluator": "idle"
                },
                "tasks": [],
                "created_at": datetime.utcnow().isoformat()
            }
            self.write_state(state)

    def write_state(self, state):
        """状態を書き込み"""
        with open(self.state_file, 'w') as f:
            json.dump(state, f, indent=2)

    def read_state(self):
        """状態を読み込み"""
        if self.state_file.exists():
            with open(self.state_file, 'r') as f:
                return json.load(f)
        return None

    def log_event(self, agent, event_type, message):
        """イベントをJSONL形式で記録"""
        event = {
            "timestamp": datetime.utcnow().isoformat(),
            "agent": agent,
            "type": event_type,
            "message": message
        }
        with open(self.events_file, 'a') as f:
            f.write(json.dumps(event) + "\n")

    def write_log(self, message):
        """自然言語ログを追記"""
        with open(self.log_file, 'a') as f:
            timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
            f.write(f"\n## [{timestamp}]\n{message}\n")

def main():
    print("🗂️  Blackboard Agent: 起動完了")
    bb = Blackboard()
    bb.init_state()
    bb.log_event("blackboard", "startup", "Blackboard initialized")
    bb.write_log("Blackboard Agent起動 - 共有状態管理を開始")
    print("役割: 状態管理、イベント記録、エージェント間通信")
    print("Blackboard準備完了 - 記録待機中...")

if __name__ == "__main__":
    main()
