#!/usr/bin/env python3
"""Composite resume score against the market for one target lane (VWC definition): live postings plus
O*NET in-demand tech and core skills, with the BLS lane outlook as context.

  python3 score_skills.py postings.json --onet onet.json --checklist      # every skill that will be scored
  python3 score_skills.py postings.json resume.json --onet onet.json --text resume.txt --out report.json

postings.json must come from fetch_postings.py, unedited, under 14 days old. The resume, its text and the
report must live outside any git repo. The formula is fixed; it never changes per person.
"""
import argparse, json, os, re, sys
from datetime import datetime, timezone
from fetch_postings import REF, digest, matchers
import score as onet_scorer

STRENGTH = {"proven": 1.0, "applied": 0.7, "listed": 0.4, "stale": 0.3, "none": 0.0}
TOP = 25
FAMILY_CREDIT = 0.7    # VWC definition: LangGraph proven → LangChain credited 0.7
CUT_PCT = 2
MAX_AGE_DAYS = 14
ONET_MAX_AGE_DAYS = 30
SHOW = 5
BIAS = "No Workday-hosted postings (no keyless API); sample leans tech/startup."
POOL = os.path.join(REF, "pool.json")
MIN_POOL = 20  # scored resumes a lane needs before percentile bands mean anything
# VWC definition: composite = 50% live postings + 50% O*NET market fit (itself 70% tech, 30% core).
W_POSTINGS, W_ONET = 0.5, 0.5
# Words O*NET adds around a tool's name ("Oracle Java", "IBM Terraform", "Amazon Web Services AWS software")
ONET_FILLER = re.compile(r"\b(?:software|oracle|microsoft|google|ibm|apache|framework)\b", re.I)


def refuse(msg):
    sys.exit(f"REFUSED: {msg}")


def age_days(fetched_at, name, script, now=None):
    try:
        at = datetime.fromisoformat(fetched_at)
    except (TypeError, ValueError):
        refuse(f"{name} has no valid fetched_at. Re-run {script}.")
    return ((now or datetime.now(timezone.utc)) - at).days


def check_postings(p, now=None):
    if p.get("fetched_by") != "fetch_postings.py":
        refuse("postings.json was not written by fetch_postings.py. Run it; never hand-write market data.")
    if p.get("digest") != digest(p):
        refuse("postings.json was edited after fetch_postings.py wrote it. Re-run fetch_postings.py.")
    age = age_days(p.get("fetched_at"), "postings.json", "fetch_postings.py", now)
    if age > MAX_AGE_DAYS:
        refuse(f"postings.json is {age} days old (max {MAX_AGE_DAYS}). Re-run fetch_postings.py.")


def check_onet(o):
    if o.get("fetched_by") != "fetch_market.py":
        refuse("onet.json was not written by fetch_market.py. Run it; never hand-write market data.")
    age = age_days(o.get("fetched_at"), "onet.json", "fetch_market.py")
    if age > ONET_MAX_AGE_DAYS:
        refuse(f"onet.json is {age} days old (max {ONET_MAX_AGE_DAYS}). Re-run fetch_market.py.")


def in_git_repo(path):
    d = os.path.dirname(os.path.abspath(path))
    while True:
        if os.path.exists(os.path.join(d, ".git")):
            return d
        parent = os.path.dirname(d)
        if parent == d:
            return None
        d = parent


def quoted(quote, text):
    """True when the quote appears in the text. "..." may stand for skipped words."""
    flat = lambda t: " ".join(t.replace("’", "'").replace("“", '"').replace("”", '"').split()).lower()
    hay, pos = flat(text), 0
    for part in re.split(r"\.\.\.|…", quote):
        part = flat(part)
        if not part:
            continue
        pos = hay.find(part, pos)
        if pos < 0:
            return False
        pos += len(part)
    return True


def checklist(p):
    return [s for s in p["skills"] if s["postings"] > 0][:TOP]


def score(p, resume, vocab, text=None, onet=None):
    entry = {s["skill"]: s for s in vocab["skills"]}
    canon = {t.lower(): s["skill"] for s in vocab["skills"] for t in [s["skill"]] + s.get("aliases", []) + s.get("cased", [])}
    graded = {}
    for e in resume["skills"]:
        name, st = e.get("skill", ""), e.get("strength")
        if st not in STRENGTH:
            raise ValueError(f"{name}: strength {st!r} is not one of {', '.join(STRENGTH)}")
        if st != "none" and not (e.get("evidence") or "").strip():
            raise ValueError(f"{name}: {st} with no evidence quote. No quote means none.")
        if st == "proven" and not re.search(r"[\d%$]", e["evidence"]):
            raise ValueError(f"{name}: proven needs a result with a number, % or $ in the evidence quote. Quote the result, or grade it applied.")
        if text is not None and st != "none" and not quoted(e["evidence"], text):
            raise ValueError(f"{name}: evidence is not on the resume: {e['evidence']!r}")
        graded[canon.get(name.lower(), name)] = e

    top = checklist(p)
    missing = [s["skill"] for s in top if s["skill"] not in graded]
    if missing:
        raise ValueError(f"Missing: {', '.join(missing)}. Grade every --checklist skill, 'none' if absent.")

    rows = []
    for s in top:
        own = STRENGTH[graded[s["skill"]]["strength"]]
        kids = [(FAMILY_CREDIT * STRENGTH[e["strength"]], n) for n, e in graded.items() if entry.get(n, {}).get("family") == s["skill"]]
        fam, via = max(kids, default=(0.0, None))
        rows.append(s | {"weight": s["pct"], "grade": graded[s["skill"]]["strength"], "strength": max(own, fam),
                         "via": via if fam > own else None, "fixable": bool(graded[s["skill"]].get("fixable"))})
    total = sum(r["weight"] for r in rows)
    rx = {v["skill"]: m for v, m in matchers(vocab)}
    for r in rows:
        r["lift"] = round(100 * r["weight"] * (1 - r["strength"]) / total, 1)
        if onet:
            r["onet_pct"] = next((t["posting_pct"] for t in onet["tech_skills"] if any(x.search(t["skill"]) for x in rx[r["skill"]])), None)
    by_lift = lambda xs: sorted(xs, key=lambda r: -r["lift"])[:SHOW]
    demand = {s["skill"]: s["pct"] for s in p["skills"]}
    on_resume = [(n, e) for n, e in graded.items() if e["strength"] != "none"]
    add = by_lift(r for r in rows if r["grade"] == "none")
    for r in add:
        r["tag"] = "resume-fixable" if r["via"] or r["fixable"] else "skill-building"
    return {
        "lane": p["lane"], "fetched_at": p["fetched_at"],
        "sample": {k: p[k] for k in ("sample_size", "companies", "boards", "confidence", "failed_sources")},
        "score": round(100 * sum(r["weight"] * r["strength"] for r in rows) / total, 1),
        "definition": f"VWC definition: top {TOP} skills by share of postings; weight = share; "
                      f"score = 100 x sum(weight x strength) / sum(weight). "
                      f"Family parent credited at {FAMILY_CREDIT} of a child's grade.",
        "strong": sorted((r for r in rows if r["strength"] == 1), key=lambda r: -r["pct"])[:SHOW],
        "prove_it": by_lift(r for r in rows if r["grade"] in ("applied", "listed", "stale")),
        "add": add,
        "cut": sorted(({"skill": n, "pct": demand[n]} for n, e in on_resume if n in demand and demand[n] < CUT_PCT),
                      key=lambda x: x["pct"])[:SHOW],
        "not_in_vocab": sorted(n for n, e in on_resume if n not in entry),
        "new_terms": p["new_terms"][:SHOW],
        "rows": rows, "bias": BIAS, "sources": [x["url"] for x in p["postings"]],
    }


def market_onet(onet, p, vocab):
    """VWC definition: the market prevails. Each O*NET tool the lane's postings track takes the lane's live share
    of postings in place of O*NET's; a tool the market doesn't measure isn't scored. A tool maps only when its
    O*NET name is that skill plus vendor filler, so "Microsoft SQL Server" doesn't borrow SQL's share.
    Core skills are untouched."""
    live = {s["skill"]: s["pct"] for s in p["skills"]}
    out, changed = [], []
    for t in onet["tech_skills"]:
        skill = next((v["skill"] for v, rxs in matchers(vocab)
                      if any(m.search(t["skill"]) for m in rxs)
                      and not ONET_FILLER.sub("", re.sub("|".join(m.pattern for m in rxs), "", t["skill"], flags=re.I)).strip()), None)
        if skill is None or skill not in live:
            continue
        out.append(t | {"posting_pct": live[skill]})
        if live[skill] != t["posting_pct"]:
            changed.append({"tool": t["skill"], "onet_pct": t["posting_pct"], "market_pct": live[skill]})
    return onet | {"tech_skills": out}, changed


def pool_band(score, scores):
    """VWC definition: band = percentile rank in the lane's pool of real scores. Competitive is above the pool
    median, the line NYC Local Law 144 bias audits draw (6 RCNY 5-301). Under MIN_POOL, no band: rank only."""
    below = sum(1 for x in scores if x < score)
    pct = round(100 * below / len(scores)) if scores else None
    band = None if len(scores) < MIN_POOL else "Strong" if pct >= 75 else "Competitive" if pct >= 50 else "Gaps" if pct >= 25 else "Mismatch"
    return {"n": len(scores), "above": below, "percentile": pct, "band": band, "min_pool": MIN_POOL}


def composite(prep, orep, resume, vocab):
    """One score and one ranked list. A skill in both sources gets both lifts, weighted."""
    rx = {v["skill"]: m for v, m in matchers(vocab)}
    fixable = {e.get("skill"): bool(e.get("fixable")) for e in resume["skills"]}
    onet_rows, items = list(orep["all"]), []
    for r in prep["rows"]:
        o = next((x for x in onet_rows if x["section"] == "tech"
                  and any(m.search(n) for n in onet_scorer.STACKS.get(x["skill"], [x["skill"]]) for m in rx[r["skill"]])), None)
        if o:
            onet_rows.remove(o)
        items.append({"skill": r["skill"], "grade": r["grade"], "pct": r["pct"], "onet": o and o["flags"], "via": r["via"],
                      "tag": "resume-fixable" if r["via"] or r["fixable"] else "skill-building",
                      "lift": round(W_POSTINGS * r["lift"] + W_ONET * (o["impact"] if o else 0), 1)})
    for o in onet_rows:  # O*NET-only items: core skills and tools the postings vocabulary doesn't track
        items.append({"skill": o["skill"], "grade": o["strength"], "pct": None, "onet": o["flags"], "via": None,
                      "tag": "resume-fixable" if fixable.get(o["via"]) else "skill-building", "lift": round(W_ONET * o["impact"], 1)})
    total = round(W_POSTINGS * prep["score"] + W_ONET * orep["score"], 1)
    by_lift = lambda xs: sorted(xs, key=lambda x: -x["lift"])[:SHOW]
    return {
        "lane": prep["lane"], "score": total,
        "definition": f"VWC definition: composite = {W_POSTINGS:g} x live-postings score + {W_ONET:g} x O*NET market fit "
                      f"(70% tech, 30% core). Lift = composite points gained if that skill moved to proven.",
        "built_from": {"postings": prep["score"], "onet": orep["score"], "onet_tech": orep["subscores"]["tech"],
                       "onet_core": orep["subscores"]["core"]},
        "sample": prep["sample"], "fetched_at": prep["fetched_at"],
        "onet": {k: orep[k] for k in ("onet_code", "onet_title", "fetched_at")}, "bls": orep["bls"],
        "strong": sorted((x for x in items if x["grade"] == "proven"), key=lambda x: -(x["pct"] or 0))[:SHOW],
        "prove_it": by_lift(x for x in items if x["grade"] in ("applied", "listed", "stale")),
        "add": by_lift(x for x in items if x["grade"] == "none"),
        # CUT only what neither source wants: a skill O*NET scores (Git) is never cut for low posting share
        "cut": [c for c in prep["cut"] if not any(m.search(n) for x in orep["all"] for n in onet_scorer.STACKS.get(x["skill"], [x["skill"]])
                                                  for m in rx.get(c["skill"], []))],
        "new_terms": prep["new_terms"], "ats": orep["ats"],
        "not_scored": sorted(set(prep["not_in_vocab"]) & set(orep["unmatched"])),
        "items": sorted(items, key=lambda x: -x["lift"]), "bias": BIAS,
        "sources": {"postings": prep["sources"], "onet_bls": orep["sources"]},
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("postings"); ap.add_argument("resume", nargs="?")
    ap.add_argument("--checklist", action="store_true")
    ap.add_argument("--text", help="the resume as plain text; every evidence quote must appear in it")
    ap.add_argument("--onet", required=True, help="onet.json from fetch_market.py")
    ap.add_argument("--out")
    ap.add_argument("--add-to-pool", action="store_true", help="record this score in references/pool.json (real resumes only, once per person)")
    a = ap.parse_args()
    p = json.load(open(a.postings))
    check_postings(p)
    onet = json.load(open(a.onet))
    check_onet(onet)
    vocab = json.load(open(os.path.join(REF, "skills_vocab.json")))
    onet_raw = onet
    onet, override = market_onet(onet, p, vocab)

    if a.checklist:
        print(f"Grade every skill below in resume.json ({p['lane']} lane, {p['sample_size']} postings), "
              f"and O*NET {onet['onet_code']} {onet.get('onet_title')}, plus every other skill on the resume:")
        for s in checklist(p):
            print(f"  [postings] {s['skill']:<22} {s['pct']:>5}% of postings (required {s['required_pct']}%, preferred {s['preferred_pct']}%)"
                  + (f"  family: {s['family']}" if s.get("family") else ""))
        for section, name, _, label, _ in onet_scorer.checklist(onet):
            print(f"  [onet {section}] {name}  ({label})")
        print("One entry per skill covers both lists; use onet_name when the resume's term differs from O*NET's "
              "(\"AWS\" -> \"Amazon Web Services AWS software\"). For an 'any of' slot, grade the member(s) used.")
        return
    if not a.resume:
        ap.error("give resume.json, or --checklist")
    for path in [x for x in (a.resume, a.out, a.text) if x]:
        repo = in_git_repo(path)
        if repo:
            refuse(f"{path} is inside the git repo {repo}. Resumes are personal data: use ~/resume-scores/<person>/.")
    try:
        resume = json.load(open(a.resume))
        text = open(a.text).read() if a.text else None
        rep = composite(score(p, resume, vocab, text), onet_scorer.score(onet, resume, text), resume, vocab)
        rep["market_override"] = override
        rep["pedigree_pct"] = p["pedigree_pct"]  # share of postings asking for employer pedigree outright; never scored
        pool = json.load(open(POOL))
        rep["pool"] = pool_band(rep["score"], [x["score"] for x in pool[rep["lane"]]])
        if a.add_to_pool:
            pool[rep["lane"]].append({"score": rep["score"], "scored": rep["fetched_at"][:10]})
            json.dump(pool, open(POOL, "w"), indent=1)
        # Never advise cutting a tool O*NET counts as common (Git), even when this lane's postings take it for granted
        common = [t["skill"] for t in onet_raw["tech_skills"] if t["posting_pct"] >= CUT_PCT]
        rx = {v["skill"]: m for v, m in matchers(vocab)}
        rep["cut"] = [c for c in rep["cut"] if not any(m.search(n) for n in common for m in rx.get(c["skill"], []))]
    except (ValueError, KeyError) as e:
        sys.exit(f"error: {e}")
    if a.out:
        with open(a.out, "w") as f:
            json.dump(rep, f, indent=2)

    best = rep["items"][0]
    s, b, f = rep["sample"], rep["bls"] or {}, rep["built_from"]
    pb = rep["pool"]
    standing = (f"{pb['band']}: above {pb['above']} of {pb['n']} scored {rep['lane']} resumes" if pb["band"] else
                f"pool too small for a band: above {pb['above']} of {pb['n']} scored {rep['lane']} resumes, need {pb['min_pool']}")
    print(f"Composite Score {rep['score']}/100 for {rep['lane']} ({standing}). Biggest lift: {best['skill']} (+{best['lift']} pts).")
    print(f"Built from: live postings {f['postings']} · O*NET market fit {f['onet']} (tech {f['onet_tech']}, core {f['onet_core']}). "
          f"{rep['definition']}")
    print(f"Sample: {s['sample_size']} postings, {s['companies']} companies, boards {s['boards']}, fetched {rep['fetched_at'][:10]}, "
          f"confidence {s['confidence']}" + (f", {len(s['failed_sources'])} sources failed" if s["failed_sources"] else "")
          + f". O*NET {rep['onet']['onet_code']} {rep['onet']['onet_title']}, pulled {rep['onet']['fetched_at'][:10]}.")
    print(f"Lane outlook (BLS {b.get('period')}): {b.get('growth_pct')}% growth, median pay ${b.get('median_wage') or 0:,.0f}, "
          f"{b.get('annual_openings_k')}K openings/yr.")
    print(rep["bias"])
    moved = sorted(override, key=lambda c: -abs(c["market_pct"] - c["onet_pct"]))[:10]  # ponytail: top 10 by size; all in report.json
    if moved:
        print("Market override, live lane share replaces O*NET's (VWC definition): "
              + ", ".join(f"{c['tool']} {c['onet_pct']:g}% -> {c['market_pct']:g}%" for c in moved))
    demand = lambda x: ", ".join(d for d in (x["pct"] is not None and f"{x['pct']}% of postings", x["onet"] and f"O*NET {x['onet']}") if d)
    for title, xs, line in [
        ("STRONG", rep["strong"], demand),
        ("PROVE IT", rep["prove_it"], lambda x: f"resume: {x['grade']}, +{x['lift']} pts if proven; {demand(x)}"),
        ("ADD", rep["add"], lambda x: f"+{x['lift']} pts if proven, {x['tag']}" + (f" (credited via {x['via']})" if x["via"] else "")
                                      + f"; {demand(x)}"),
        ("CUT", rep["cut"], lambda x: f"{x['pct']}% of postings"),
        ("NEW — review", rep["new_terms"], lambda x: f"{x['pct']}% of postings, not in the vocabulary, not scored"),
    ]:
        print(title)
        for x in xs:
            print(f"  {x.get('skill') or x.get('term'):<34} {line(x)}")
    ats = rep["ats"]
    if ats is None:
        print("ATS wording: not checked (pass --text resume.txt)")
    else:
        print(f"ATS wording: {ats['ready']} of {ats['checked']} tools written in every standard form")
        for x in ats["fixes"]:
            print(f"  {x['skill']:<34} missing {', '.join(repr(m) for m in x['missing'])}; write {x['write']!r}")
    print(f"Pedigree (not scored): {rep['pedigree_pct']}% of postings ask for employer pedigree outright (FAANG, big tech, top-tier). "
          "Recruiters still weight employer names when reading; the postings just don't say so.")
    if rep["not_scored"]:
        print(f"Not scored (in neither source): {', '.join(rep['not_scored'])}")

if __name__ == "__main__":
    main()
