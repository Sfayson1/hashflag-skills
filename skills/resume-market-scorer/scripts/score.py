#!/usr/bin/env python3
"""Score resume evidence against O*NET occupation data (BLS reported as outlook).

Usage: python score.py onet.json resume.json [--out report.json]
"""
import argparse, json, sys

STRENGTH = {"proven": 1.0, "applied": 0.7, "listed": 0.4, "stale": 0.3, "none": 0.0}
TECH_SHARE, CORE_SHARE = 0.70, 0.30
CORE_MIN_IMPORTANCE = 50


def norm(s):
    return " ".join(s.lower().replace("-", " ").replace(".", "").split())


def band(x):
    return "Strong" if x >= 80 else "Competitive" if x >= 65 else "Gaps" if x >= 50 else "Mismatch"


def flags(t):
    f = [n for n, k in (("Hot Tech", "hot"), ("In Demand", "in_demand")) if t.get(k)]
    return ", ".join(f) or "Listed"


def coverage(items, weight_fn, ev):
    rows, tw, gw = [], 0.0, 0.0
    for it in items:
        w = weight_fn(it)
        e = ev.get(it["skill"])
        st = e["strength"] if e else "none"
        tw += w
        gw += w * STRENGTH[st]
        rows.append({"skill": it["skill"], "weight": w, "strength": st,
                     "flags": flags(it) if "hot" in it or "in_demand" in it else f"importance {it.get('importance')}",
                     "gap_weight": round(w * (1 - STRENGTH[st]), 2)})
    return (100 * gw / tw if tw else 0.0), rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("onet"); ap.add_argument("resume"); ap.add_argument("--out")
    a = ap.parse_args()
    o, r = json.load(open(a.onet)), json.load(open(a.resume))
    if not o.get("onet_code"):
        sys.exit("onet.json needs onet_code")

    tech = o.get("tech_skills", [])
    core = [c for c in o.get("core_skills", []) if c.get("importance", 0) >= CORE_MIN_IMPORTANCE]

    alias = {}
    for it in tech + core:
        alias[norm(it["skill"])] = it["skill"]
        for al in it.get("aliases", []):
            alias[norm(al)] = it["skill"]

    ev, unmatched = {}, []
    for s in r["skills"]:
        c = alias.get(norm(s["skill"]))
        if c is None:
            unmatched.append(s["skill"]); continue
        if c not in ev or STRENGTH[s["strength"]] > STRENGTH[ev[c]["strength"]]:
            ev[c] = s

    tw = lambda t: 1 + int(bool(t.get("hot"))) + int(bool(t.get("in_demand")))
    tech_score, trows = coverage(tech, tw, ev)
    core_score, crows = coverage(core, lambda c: c["importance"], ev)
    score = round(TECH_SHARE * tech_score + CORE_SHARE * core_score, 1)

    # put tech (max weight 3) and core (max importance 100) on one 0-1 scale for ranking
    for x in trows:
        x["scale"] = 3
    for x in crows:
        x["scale"] = 100
    ranked = sorted(trows + crows, key=lambda x: -x["gap_weight"] / x["scale"])

    rep = {
        "role": o.get("role"), "onet_code": o["onet_code"], "onet_title": o.get("onet_title"),
        "pulled_on": o.get("pulled_on"), "bls": o.get("bls"),
        "score": score, "band": band(score),
        "subscores": {"tech": round(tech_score, 1), "core": round(core_score, 1)},
        "top_gaps": [x for x in ranked if x["strength"] in ("none", "stale")][:5],
        "unproven_claims": [x for x in ranked if x["strength"] == "listed"][:5],
        "strengths": sorted([x for x in trows + crows if x["strength"] == "proven"], key=lambda x: -x["weight"] / x["scale"])[:5],
        "dead_weight": sorted(unmatched),
        "all": ranked,
    }
    out = json.dumps(rep, indent=2)
    if a.out:
        open(a.out, "w").write(out)

    print(f"{rep['role']}: {score}/100 ({rep['band']}) | O*NET {rep['onet_code']} {rep['onet_title']}")
    print(f"  Subscores: Tech {rep['subscores']['tech']} · Core {rep['subscores']['core']}")
    b = rep["bls"]
    if b:
        print(f"  BLS: {b.get('growth_pct')}% growth, median ${b.get('median_pay'):,}, {b.get('annual_openings'):,} openings/yr")
    else:
        print("  WARNING: no BLS block")
    for x in rep["top_gaps"]:
        print(f"  GAP   {x['skill']:<28} {x['flags']:<22} resume: {x['strength']}")
    for x in rep["unproven_claims"]:
        print(f"  PROVE {x['skill']:<28} {x['flags']:<22} resume: listed")


if __name__ == "__main__":
    main()
