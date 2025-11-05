#!/usr/bin/env python3
import argparse, json, os, subprocess, sys, shutil
from pathlib import Path

OUT_DIR = Path("deliverable/reporting")

def run(cmd, cwd=None, ok_codes=(0,)):
    p = subprocess.run(cmd, cwd=cwd, text=True, capture_output=True)
    if p.returncode not in ok_codes:
        return p.returncode, p.stdout, p.stderr
    return 0, p.stdout, p.stderr

def pytest_score(root: Path):
    if not (root / "tests").exists():
        return 0.0, {"passed":0, "failed":0}
    code, out, _ = run(["pytest","-q"], cwd=root)
    passed = out.count("PASSED"); failed = out.count("FAILED")
    total = max(passed+failed, 1)
    return passed/total, {"passed":passed, "failed":failed}

def diff_lines(root: Path, base="HEAD~1"):
    # 変更量の近似として --stat 行数を採用（本番はベースを main に）
    code, out, _ = run(["git","diff","--stat", base, "HEAD"], cwd=root)
    return sum(1 for _ in out.splitlines())

def complexity(root: Path):
    if shutil.which("radon") is None: return 0.5  # 未導入なら中立
    code, out, _ = run(["radon","cc","-s","-a","."], cwd=root)
    # 末尾の "Average complexity: A (1.5)" を拾う簡易実装
    avg = 3.0
    for line in out.splitlines()[::-1]:
        if "Average complexity" in line:
            try: avg = float(line.split("(")[-1].rstrip(")"))
            except: pass
            break
    # 低いほど良い→0..1に正規化（適当な上限5.0）
    return max(0.0, min(1.0, 1.0 - min(avg,5.0)/5.0))

def doc_consistency(root: Path):
    # 簡易：READMEやdocsが変更されたら+（仮）
    changed, out, _ = run(["git","diff","--name-only","HEAD~1","HEAD"], cwd=root)
    names = (out or "").splitlines()
    hit = any(n.lower().startswith(("readme","docs/","documentation/")) for n in names)
    return 1.0 if hit else 0.7

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--roots", nargs="+", required=False, help="worktree paths (defaults: worktrees/try-*)")
    args = ap.parse_args()

    roots = [Path(p) for p in (args.roots or [])]
    if not roots:
        wt = Path("worktrees")
        roots = sorted([p for p in wt.glob("try-*") if p.is_dir()])

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    rows = []
    max_diff = 1
    diffs = []
    for r in roots:
        pass_rate, tf = pytest_score(r)
        d = diff_lines(r)
        diffs.append(d)
        cplx = complexity(r)
        docc = doc_consistency(r)
        rows.append({"id": r.name, "pass": pass_rate, "diff": d, "cplx": cplx, "doc": docc, "tf": tf})
    max_diff = max(diffs or [1])

    # 重み付け：0.5*pass + 0.2*(1-diff_norm) + 0.2*cplx + 0.1*doc
    best = None
    for row in rows:
        diff_norm = row["diff"]/max_diff if max_diff else 0
        score = 0.5*row["pass"] + 0.2*(1-diff_norm) + 0.2*row["cplx"] + 0.1*row["doc"]
        row["score"] = round(score, 6)
        if best is None or score > best["score"]:
            best = row

    with open(OUT_DIR/"scoreboard.json","w") as f:
        json.dump({"evaluated_at": __import__("datetime").datetime.utcnow().isoformat()+"Z",
                   "candidates": rows, "winner": best["id"] if best else None,
                   "decision_rule":"0.5*pass + 0.2*(1-diff) + 0.2*cplx + 0.1*doc"}, f, indent=2)
    with open(OUT_DIR/"winner.txt","w") as f:
        f.write(best["id"] if best else "")
    with open(OUT_DIR/"report.md","w") as f:
        f.write("# Evaluation Report\n\n")
        for r in sorted(rows, key=lambda x: -x["score"]):
            f.write(f"- {r['id']}: score={r['score']} pass={r['pass']:.2f} diff={r['diff']} cplx={r['cplx']:.2f} doc={r['doc']:.2f}\n")
        f.write(f"\n**Winner:** {best['id'] if best else 'N/A'}\n")
    print(f"🏆 Winner: {best['id'] if best else 'N/A'}")

if __name__ == "__main__":
    main()
