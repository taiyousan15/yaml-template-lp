#!/usr/bin/env python3
"""
ローカルでFlask APIをテストするスクリプト
Google Colabなしで動作確認できます
"""

from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route("/api", methods=["POST"])
def api():
    data = request.json
    return jsonify({"message": "Hello from localhost!", "data": data})

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "Flask API (Local)"})

if __name__ == "__main__":
    print("=" * 60)
    print("🚀 Flask APIサーバー起動中...")
    print("=" * 60)
    print("\n📡 アクセス先: http://localhost:8000")
    print("\nテストコマンド:")
    print("  curl http://localhost:8000/health")
    print("  curl -X POST http://localhost:8000/api -H 'Content-Type: application/json' -d '{\"test\":\"data\"}'")
    print("\n停止するには Ctrl+C を押してください")
    print("=" * 60 + "\n")

    app.run(host='0.0.0.0', port=8000, debug=True)
