#!/usr/bin/env python3
import os, time, hmac, json, base64, hashlib, sys

SECRET = os.getenv("AUTH_SECRET","change-me")

def b64(x: bytes) -> str:
    return base64.urlsafe_b64encode(x).decode().rstrip("=")

def sign(claims: dict) -> str:
    header = {"alg":"HS256","typ":"JWT"}
    data = f"{b64(json.dumps(header).encode())}.{b64(json.dumps(claims).encode())}".encode()
    sig = hmac.new(SECRET.encode(), data, hashlib.sha256).digest()
    return data.decode()+"."+b64(sig)

def verify(token: str, intent: str, path: str, scope: str):
    try:
        h, c, s = token.split(".")
        payload = json.loads(base64.urlsafe_b64decode(c+"=="))
        if payload.get("exp",0) < int(time.time()): return False, "expired"
        if payload.get("intent") != intent: return False, "intent-mismatch"
        if scope not in payload.get("scope",""): return False, "scope-mismatch"
        if path != payload.get("path"): return False, "path-mismatch"
        # 署名検証省略（実運用は必須）
        return True, "ok"
    except Exception as e:
        return False, str(e)

if __name__ == "__main__":
    # デモ：発行→検証
    claims = {"sub":"orchestrator","iat":int(time.time()),"exp":int(time.time())+60,
              "intent":"run","scope":"git tmux pytest","nonce":os.urandom(8).hex(),
              "path":"worktrees/try-1"}
    tok = sign(claims)
    ok, why = verify(tok, "run", "worktrees/try-1", "git")
    print("auth:", ok, why)
