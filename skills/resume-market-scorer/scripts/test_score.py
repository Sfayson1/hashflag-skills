# Run: python3 test_score.py   (synthetic data only; never put a real resume here)
import json, os, subprocess, sys, tempfile
from datetime import datetime, timedelta, timezone
from score import checklist, score

HERE = os.path.dirname(os.path.abspath(__file__))
now = datetime.now(timezone.utc).isoformat(timespec="seconds")
tech = [{"skill": f"Tool{i}", "posting_pct": 30 - i, "in_demand": i < 3} for i in range(20)]
core = [
    {"skill": "Programming", "importance": 75, "type": "transferable"},
    {"skill": "Computers and Electronics", "importance": 94, "type": "knowledge"},
    {"skill": "Critical Thinking", "importance": 72, "type": "essential"},
    {"skill": "Mathematics", "importance": 55, "type": "knowledge"},
]
onet = {"fetched_by": "fetch_market.py", "fetched_at": now, "role": "SWE", "onet_code": "15-1252.00",
        "onet_title": "Software Developers", "bls": {"period": "2024-2034", "growth_pct": 15}, "tech_skills": tech, "core_skills": core}


def graded(strengths, extra=()):
    skills = [{"skill": name, "strength": strengths.get(name, "none"), "evidence": "" if strengths.get(name, "none") == "none" else "quoted line"}
              for _, name, _, _ in checklist(onet)]
    return {"skills": skills + list(extra)}


# checklist: top 15 tools by posting share; essential skills excluded
items = checklist(onet)
assert [n for s, n, _, _ in items if s == "tech"] == [f"Tool{i}" for i in range(15)]
assert "Critical Thinking" not in [n for _, n, _, _ in items]
assert dict((n, w) for _, n, w, _ in items)["Tool0"] == 30 * 1.25  # In Demand boost

# perfect evidence scores 100; nothing scores 0
assert score(onet, graded({n: "proven" for _, n, _, _ in items}))["score"] == 100
assert score(onet, graded({}))["score"] == 0

# impacts add up to what's missing; the top gap is the biggest one
rep = score(onet, graded({"Tool0": "proven", "Programming": "listed"}, [{"skill": "Rust", "strength": "listed", "evidence": "Rust"},
                                                                       {"skill": "Tool 19", "onet_name": "Tool19", "strength": "proven", "evidence": "x"}]))
assert abs(rep["score"] + sum(x["impact"] for x in rep["all"]) - 100) < 0.5
assert rep["top_gaps"][0]["skill"] == "Computers and Electronics"
assert rep["unproven_claims"][0]["skill"] == "Programming"
assert rep["unmatched"] == ["Rust"] and rep["in_onet_not_scored"] == ["Tool19"]  # onet_name maps resume terms
assert rep["bands_calibrated"] is False

# grading rules
no_evidence = graded({})
no_evidence["skills"][0] = {"skill": "Tool0", "strength": "proven", "evidence": ""}
for bad, msg in [({"skills": []}, "Missing: Tool0"),
                 (no_evidence, "no evidence"),
                 ({"skills": [{"skill": "Tool0", "strength": "expert", "evidence": "x"}]}, "expert")]:
    try:
        score(onet, bad)
        raise AssertionError(f"expected ValueError for {msg}")
    except ValueError as e:
        assert msg in str(e), e


def run(o, resume_dir):
    with tempfile.TemporaryDirectory() as t:
        op = os.path.join(t, "onet.json"); json.dump(o, open(op, "w"))
        rp = os.path.join(resume_dir, "resume.json"); json.dump(graded({}), open(rp, "w"))
        return subprocess.run([sys.executable, os.path.join(HERE, "score.py"), op, rp], capture_output=True, text=True)


with tempfile.TemporaryDirectory() as clean:
    r = run(onet, clean)
    assert r.returncode == 0, r.stderr
    # hand-edited or stale market data is refused
    assert "REFUSED: onet.json was not written by fetch_market.py" in run(onet | {"fetched_by": "me"}, clean).stderr
    assert "REFUSED: onet.json has no fetched_at" in run({k: v for k, v in onet.items() if k != "fetched_at"}, clean).stderr
    old = (datetime.now(timezone.utc) - timedelta(days=31)).isoformat()
    assert "days old" in run(onet | {"fetched_at": old}, clean).stderr

# a resume inside a git repo is refused
with tempfile.TemporaryDirectory() as repo:
    os.makedirs(os.path.join(repo, ".git"))
    os.makedirs(os.path.join(repo, "people"))
    r = run(onet, os.path.join(repo, "people"))
    assert r.returncode != 0 and "REFUSED:" in r.stderr and "~/resume-scores/" in r.stderr, r.stderr

print("ok")
