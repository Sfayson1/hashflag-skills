# Run: python3 test_skills.py   (synthetic data only; never put a real resume here)
import json, os, subprocess, sys, tempfile
from datetime import datetime, timedelta, timezone
import fetch_postings
from fetch_postings import REF, build, cap, digest, matchers, split, term_re
from score_skills import W_ONET, W_POSTINGS, checklist, composite, market_onet, pool_band, score
import score as onet_scorer

HERE = os.path.dirname(os.path.abspath(__file__))
vocab = json.load(open(os.path.join(REF, "skills_vocab.json")))
now = datetime.now(timezone.utc)

# whole-word matching: Java is not JavaScript, SQL is not PostgreSQL, Go is case-sensitive
assert not term_re("Java").search("JavaScript") and term_re("Java").search("Java/Kotlin")
assert not term_re("SQL").search("PostgreSQL") and term_re("C++").search("C++ and Rust")
assert term_re("Go", True).search("Go or Rust") and not term_re("Go", True).search("go to market")
assert not term_re("Hive", True).search("the hive mind") and not term_re("Great Expectations", True).search("we have great expectations")
assert term_re("A/B testing").search("ran A/B testing") and term_re("Pub/Sub").search("Pub/Sub and Kafka")
agents = next(rxs for v, rxs in matchers(vocab) if v["skill"] == "AI agents")
assert any(r.search("build AI agents") for r in agents) and not any(r.search("customer support agents") for r in agents)

# required vs preferred split, boilerplate skipped (VWC heuristic)
req, pref = split("<h3>Requirements</h3><ul><li>Python</li></ul><p><strong>Nice to have:</strong></p><ul><li>Kafka</li></ul>"
                  "<h3>About us</h3><p>We build agents with Rust</p>")
assert "Python" in req and "Kafka" in pref and "Rust" not in req + pref, (req, pref)


def post(co, title, body, days=1):
    return {"company": co, "title": title, "location": "Remote", "url": f"https://x/{co}/{title}", "board": "greenhouse",
            "date": (now - timedelta(days=days)).isoformat(), "html": body}


AI = "<h3>Requirements</h3><ul><li>Python, LangChain, LangGraph</li><li>Docker</li></ul><h3>Preferred</h3><ul><li>Rust, RAG</li></ul>"
posts = [post(f"co{i}", "AI Engineer", AI) for i in range(50)]
posts += [post("big", f"AI Engineer {i}", "<p>Python, OpenAI</p>") for i in range(40)]           # one company floods
posts += [post("pedco", "AI Engineer", "<p>Python. Experience at FAANG or big tech preferred. Ex-Microsoft welcome.</p>"),
          post("openai", "Applied AI Engineer", "<p>OpenAI API and Python</p>"),                  # vendor's own name
          post("co0", "AI Engineer", AI),                                                         # duplicate
          post("co1", "AI Engineering Manager", AI), post("co2", "AI Engineer Intern", AI),        # excluded titles
          post("co3", "AI Engineer II", AI, days=90), post("co4", "Account Executive", AI)]         # too old, wrong lane
p = build("ai", [("greenhouse", "x", posts, None), ("lever", "y", [], "HTTPError: 404")], vocab)
by = {s["skill"]: s for s in p["skills"]}
assert p["companies"] == 53 and p["failed_sources"] == [{"source": "lever/y", "error": "HTTPError: 404"}]
assert max(sum(1 for x in p["postings"] if x["company"] == c) for c in ("big", "co0")) <= 0.15 * p["sample_size"]
assert by["LangGraph"]["required_pct"] > 0 and by["RAG"]["preferred_pct"] > 0 and by["RAG"]["required_pct"] == 0
assert by["OpenAI API"]["postings"] == sum(1 for x in p["postings"] if x["company"] == "big")  # openai's own posting not counted
assert p["confidence"] == "OK" and p["digest"] == digest(p)
assert cap([{"company": "a", "_date": None}] * 3, 0.15) == [{"company": "a", "_date": None}]  # one company: cap 1
# SmartRecruiters: paged list, one body call per posting but only for titles a lane wants; Workable: one call
calls = []
def fake_get(url):
    calls.append(url)
    if "smartrecruiters.com" in url and "/postings/" in url:
        return {"jobAd": {"sections": {"companyDescription": {"title": "About", "text": "<p>We are big</p>"},
                                       "qualifications": {"title": "Qualifications", "text": "<ul><li>Python</li></ul>"}}}}
    if "smartrecruiters.com" in url:
        page = [{"id": "1", "name": "Data Engineer", "releasedDate": "2026-10-01T00:00:00.000Z", "location": {"city": "Reston", "country": "us"}},
                {"id": "2", "name": "Nurse", "releasedDate": "2026-10-01T00:00:00.000Z", "location": {}}]
        return {"totalFound": 4, "content": page if "offset" not in url else [dict(x, id=x["id"] + "b") for x in page]}
    return {"jobs": [{"title": "ML Engineer", "url": "https://apply.workable.com/x/j/1", "published_on": "2026-10-02",
                      "location": {"city": "Austin"}, "description": "<p>Build models</p>", "requirements": "<ul><li>PyTorch</li></ul>"}]}
fetch_postings.get = fake_get
sr = fetch_postings.board("smartrecruiters", "Acme1")
assert [x["title"] for x in sr] == ["Data Engineer", "Data Engineer"] and sr[0]["location"] == "Reston, us", sr
assert "Qualifications" in sr[0]["html"] and "We are big" not in sr[0]["html"] and sr[0]["url"] == "https://jobs.smartrecruiters.com/Acme1/1"
assert sum("/postings/" in u for u in calls) == 2 and sum("offset=2" in u for u in calls) == 1, calls
wk = fetch_postings.board("workable", "x")
assert wk == [{"title": "ML Engineer", "location": "Austin", "url": "https://apply.workable.com/x/j/1", "date": "2026-10-02",
               "html": "<p>Build models</p><h3>Requirements</h3><ul><li>PyTorch</li></ul>"}], wk
fetch_postings.board = lambda name, co: []  # a 200 with no jobs is reported, not silently counted as a live source
assert fetch_postings.fetch_one("lever", "y") == ("lever", "y", [], "no jobs (dead slug?)")

# scoring
names = [m for s in checklist(p) for m in s["members"]]
ev = lambda st, q="Built it, cut load 40%": {"strength": st, "evidence": "" if st == "none" else q}
grade = lambda g: {"skills": [{"skill": n} | ev(g.get(n, "none")) for n in names]}
assert score(p, grade({n: "proven" for n in names}), vocab)["score"] == 100
assert score(p, grade({}), vocab)["score"] == 0

# family rollup: LangGraph proven, LangChain absent → LangChain credited 0.7, tagged resume-fixable
r = score(p, grade({"LangGraph": "proven", "Python": "listed", "Docker": "applied", "Rust": "stale"}), vocab)
lc = next(x for x in r["rows"] if x["skill"] == "LangChain")
assert lc["strength"] == 0.7 and lc["via"] == "LangGraph"
assert next(x for x in r["add"] if x["skill"] == "LangChain")["tag"] == "resume-fixable"

# PROVE IT and ADD sorted by lift; lifts add up to what's missing
for k in ("prove_it", "add"):
    assert [x["lift"] for x in r[k]] == sorted((x["lift"] for x in r[k]), reverse=True), k
assert {x["skill"] for x in r["prove_it"]} == {"Python", "Docker", "Rust"}
assert abs(r["score"] + sum(x["lift"] for x in r["rows"]) - 100) < 0.5

# rival stacks: one slot per lane, worth its most-requested member; the best member's evidence counts; never CUT
sk = lambda n, v: {"skill": n, "family": None, "postings": int(v > 0), "pct": v, "required_pct": v, "preferred_pct": 0}
sl = dict(p, skills=[sk("Python", 60.0), sk("AWS", 20.0), sk("OpenAI API", 9.0), sk("Azure", 6.0), sk("GCP", 3.0), sk("Gemini API", 1.0), sk("PHP", 1.0), sk("JAX", 0)])
assert [(s["skill"], s["pct"], s["members"]) for s in checklist(sl)] == [
    ("Python", 60.0, ["Python"]), ("Cloud platform", 20.0, ["AWS", "Azure", "GCP"]), ("LLM provider", 9.0, ["OpenAI API", "Gemini API"]), ("PHP", 1.0, ["PHP"])]
azure = {"skills": [{"skill": "Azure"} | ev("proven"), {"skill": "Python"} | ev("none"), {"skill": "Gemini API"} | ev("listed"), {"skill": "PHP"} | ev("listed")]}
sr = score(sl, azure, vocab)
assert sr["score"] == round(100 * (20 + 9 * 0.4 + 1 * 0.4) / 90, 1) and sr["cut"] == [{"skill": "PHP", "pct": 1.0}], (sr["score"], sr["cut"])  # Azure alone fills the slot; Gemini never CUT
try:
    score(sl, {"skills": azure["skills"][1:]}, vocab); raise AssertionError("slot")
except ValueError as e:
    assert "Missing: Cloud platform" in str(e), e

# CUT: on the resume but under 2% demand; unknown skills reported, never scored
low = dict(p, skills=p["skills"] + [{"skill": "PHP", "family": None, "postings": 1, "pct": 1.0, "required_pct": 1.0, "preferred_pct": 0}])
c = score(low, {"skills": grade({})["skills"] + [{"skill": "PHP"} | ev("listed"), {"skill": "Cobol"} | ev("listed")]}, vocab)
assert c["cut"] == [{"skill": "PHP", "pct": 1.0}] and c["not_in_vocab"] == ["Cobol"]

# grading rules
for bad, msg in [({"skills": []}, "Missing:"), ({"skills": [{"skill": "Python", "strength": "proven", "evidence": ""}]}, "no evidence"),
                 ({"skills": [{"skill": "Python", "strength": "expert", "evidence": "x"}]}, "expert"),
                 ({"skills": [{"skill": "Python", "strength": "proven", "evidence": "built the pipeline"}]}, "needs a result")]:
    try:
        score(p, bad, vocab); raise AssertionError(msg)
    except ValueError as e:
        assert msg in str(e), e
score(p, {"skills": grade({})["skills"][1:] + [{"skill": "Python", "strength": "applied", "evidence": "built the pipeline"}]}, vocab)  # no number needed
try:
    score(p, grade({"Python": "proven"}), vocab, "A resume that never says it."); raise AssertionError("quote")
except ValueError as e:
    assert "evidence is not on the resume" in str(e)

# composite: one score from postings + O*NET; a skill in both sources gets both lifts
onet = {"fetched_by": "fetch_market.py", "fetched_at": now.isoformat(), "role": "AI Engineer", "onet_code": "15-1252.00",
        "onet_title": "Software Developers", "bls": {"period": "2024-2034", "growth_pct": 15}, "sources": {},
        "tech_skills": [{"skill": "Python", "posting_pct": 30, "in_demand": True},
                        {"skill": "Amazon Web Services AWS software", "posting_pct": 20, "in_demand": True}],
        "core_skills": [{"skill": "Programming", "importance": 75, "type": "transferable"}]}
both = {"skills": grade({"Python": "listed", "LangGraph": "proven"})["skills"]
        + [{"skill": "AWS", "onet_name": "Amazon Web Services AWS software", "strength": "none", "evidence": ""},
           {"skill": "Programming", "strength": "proven", "evidence": "Built it, cut load 40%"}]}
pr, orp = score(p, both, vocab), onet_scorer.score(onet, both)
cr = composite(pr, orp, both, vocab)
assert cr["score"] == round(W_POSTINGS * pr["score"] + W_ONET * orp["score"], 1)
assert abs(cr["score"] + sum(x["lift"] for x in cr["items"]) - 100) < 1
py = next(x for x in cr["items"] if x["skill"] == "Python")
assert py["onet"] and py["lift"] == round(W_POSTINGS * next(r["lift"] for r in pr["rows"] if r["skill"] == "Python")
                                          + W_ONET * next(r["impact"] for r in orp["all"] if r["skill"] == "Python"), 1)
assert "Programming" in [x["skill"] for x in cr["strong"]] and cr["not_scored"] == []  # O*NET core item, not "unknown"
assert [x["lift"] for x in cr["add"]] == sorted((x["lift"] for x in cr["add"]), reverse=True)
lowpy = dict(p, skills=[x | {"pct": 1.0} if x["skill"] == "Python" else x for x in p["skills"]])  # O*NET still wants Python
assert [c["skill"] for c in score(lowpy, both, vocab)["cut"]] == ["Python"]
assert composite(score(lowpy, both, vocab), orp, both, vocab)["cut"] == []


# market prevails: an O*NET tool the lane's postings track takes the live share; look-alike products don't
mkt = dict(p, skills=[{"skill": n, "pct": v} for n, v in (("Java", 5.0), ("Python", 60.0), ("JavaScript", 17.5), ("SQL", 7.5))])
adj, changed = market_onet(onet | {"tech_skills": [
    {"skill": "Oracle Java", "posting_pct": 25, "in_demand": True}, {"skill": "Python", "posting_pct": 29, "in_demand": True},
    {"skill": "Microsoft SQL Server", "posting_pct": 3, "in_demand": False},
    {"skill": "JavaScript Object Notation JSON", "posting_pct": 4, "in_demand": False},
    {"skill": "Structured query language SQL", "posting_pct": 24, "in_demand": True},
    {"skill": "Jenkins CI", "posting_pct": 8, "in_demand": True}]}, mkt, vocab)
assert {t["skill"]: t["posting_pct"] for t in adj["tech_skills"]} == {  # unmeasured or look-alike tools aren't scored
    "Oracle Java": 5.0, "Python": 60.0, "Structured query language SQL": 7.5}, adj["tech_skills"]
assert changed[0] == {"tool": "Oracle Java", "onet_pct": 25, "market_pct": 5.0}

# pedigree asks are counted from requirement context only ("experience at FAANG"), never scored
assert p["pedigree_pct"] == round(100 / p["sample_size"], 1)
assert "text" not in p["postings"][0]

# bands are percentiles of the lane's pool; Competitive = above the median; no band under MIN_POOL
assert pool_band(60, [])["band"] is None and pool_band(60, [])["above"] == 0
small = pool_band(60, [50, 70])
assert small["band"] is None and small["above"] == 1 and small["percentile"] == 50
pool = list(range(40, 80, 2))  # 20 scores, median between 58 and 60
assert pool_band(59, pool)["band"] == "Competitive" and pool_band(57, pool)["band"] == "Gaps"
assert pool_band(79, pool)["band"] == "Strong" and pool_band(41, pool)["band"] == "Mismatch"
assert pool_band(59, pool)["percentile"] == 50

def run(postings, resume_dir):
    with tempfile.TemporaryDirectory() as t:
        pp = os.path.join(t, "postings.json"); json.dump(postings, open(pp, "w"))
        op = os.path.join(t, "onet.json"); json.dump(onet, open(op, "w"))
        rp = os.path.join(resume_dir, "resume.json"); json.dump(both, open(rp, "w"))
        return subprocess.run([sys.executable, os.path.join(HERE, "score_skills.py"), pp, rp, "--onet", op], capture_output=True, text=True)


with tempfile.TemporaryDirectory() as clean:
    assert run(p, clean).returncode == 0, run(p, clean).stderr
    edited = json.loads(json.dumps(p)); edited["skills"][0]["pct"] = 99.0
    assert "REFUSED: postings.json was edited" in run(edited, clean).stderr
    assert "REFUSED: postings.json was not written by fetch_postings.py" in run(p | {"fetched_by": "me"}, clean).stderr
    old = p | {"fetched_at": (now - timedelta(days=15)).isoformat()}
    assert "days old" in run(old | {"digest": digest(old)}, clean).stderr
    assert "REFUSED: onet.json is 15-1252.00; the ml lane scores against 15-2051.00" in run(p | {"lane": "ml"} | {"digest": digest(p | {"lane": "ml"})}, clean).stderr

with tempfile.TemporaryDirectory() as repo:  # a resume inside a git repo is refused
    os.makedirs(os.path.join(repo, ".git")); os.makedirs(os.path.join(repo, "people"))
    r = run(p, os.path.join(repo, "people"))
    assert r.returncode != 0 and "REFUSED:" in r.stderr and "~/resume-scores/" in r.stderr, r.stderr

print("ok")
