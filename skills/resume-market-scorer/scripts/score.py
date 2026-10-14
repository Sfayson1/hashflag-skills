#!/usr/bin/env python3
"""Score resume evidence against O*NET occupation data (BLS reported as outlook).

Usage: python3 score.py onet.json resume.json [--out report.json]
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


def coverage(items, weight_fn, label_fn, ev, share):
    """Section score 0-100, plus per-item rows. `impact` is the points the overall
    score would gain if that item were proven, so gaps rank by what they cost."""
    tw = sum(weight_fn(it) for it in items)
    rows, gw = [], 0.0
    for it in items:
        w = weight_fn(it)
        st = ev[it["skill"]]["strength"] if it["skill"] in ev else "none"
        gw += w * STRENGTH[st]
        rows.append({"skill": it["skill"], "weight": w, "strength": st, "flags": label_fn(it),
                     "impact": round(100 * share * w * (1 - STRENGTH[st]) / tw, 2) if tw else 0.0})
    return (100 * gw / tw if tw else 0.0), rows


def score(o, r):
    if not o.get("onet_code"):
        raise ValueError("onet.json needs onet_code")
    for s in r.get("skills", []):
        if s.get("strength") not in STRENGTH:
            raise ValueError(f"resume.json: {s.get('skill')!r} has strength {s.get('strength')!r}; use one of {', '.join(STRENGTH)}")

    # O*NET lists hundreds of tools per occupation; scoring against all of them makes 80+
    # unreachable. Only Hot or In Demand tools are scored; the rest still match.
    all_tech = o.get("tech_skills", [])
    tech = [t for t in all_tech if t.get("hot") or t.get("in_demand")]
    all_core = o.get("core_skills", [])
    core = [c for c in all_core if c.get("importance", 0) >= CORE_MIN_IMPORTANCE]

    # Match against every O*NET item, scored or not, so a skill O*NET lists is never
    # reported as "not in O*NET".
    alias = {}
    for it in all_tech + all_core:
        alias[norm(it["skill"])] = it["skill"]
        for al in it.get("aliases", []):
            alias[norm(al)] = it["skill"]

    ev, unmatched = {}, []
    for s in r.get("skills", []):
        c = alias.get(norm(s["skill"]))
        if c is None:
            unmatched.append(s["skill"]); continue
        if c not in ev or STRENGTH[s["strength"]] > STRENGTH[ev[c]["strength"]]:
            ev[c] = s
    scored = {it["skill"] for it in tech + core}
    not_scored = sorted(c for c in ev if c not in scored)

    tech_w = lambda t: 1 + int(bool(t.get("hot"))) + int(bool(t.get("in_demand")))  # 3 if both, else 2
    tech_score, trows = coverage(tech, tech_w, flags, ev, TECH_SHARE)
    core_score, crows = coverage(core, lambda c: c["importance"], lambda c: f"importance {c['importance']}", ev, CORE_SHARE)
    total = round(TECH_SHARE * tech_score + CORE_SHARE * core_score, 1)
    ranked = sorted(trows + crows, key=lambda x: -x["impact"])

    return {
        "role": o.get("role"), "onet_code": o["onet_code"], "onet_title": o.get("onet_title"),
        "pulled_on": o.get("pulled_on"), "bls": o.get("bls"),
        "score": total, "band": band(total),
        "subscores": {"tech": round(tech_score, 1), "core": round(core_score, 1)},
        "top_gaps": [x for x in ranked if x["strength"] in ("none", "stale")][:5],
        "unproven_claims": [x for x in ranked if x["strength"] == "listed"][:5],
        "strengths": sorted([x for x in trows + crows if x["strength"] == "proven"], key=lambda x: -x["weight"] / (100 if x["flags"].startswith("importance") else 3))[:5],
        "dead_weight": sorted(unmatched),
        "in_onet_not_scored": not_scored,
        "all": ranked,
    }


def money(v, prefix=""):
    return f"{prefix}{v:,}" if isinstance(v, (int, float)) else "n/a"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("onet"); ap.add_argument("resume"); ap.add_argument("--out")
    a = ap.parse_args()
    try:
        rep = score(json.load(open(a.onet)), json.load(open(a.resume)))
    except (ValueError, KeyError) as e:
        sys.exit(f"error: {e}")
    if a.out:
        with open(a.out, "w") as f:
            json.dump(rep, f, indent=2)

    print(f"{rep['role']}: {rep['score']}/100 ({rep['band']}) | O*NET {rep['onet_code']} {rep['onet_title']}")
    print(f"  Subscores: Tech {rep['subscores']['tech']} · Core {rep['subscores']['core']}")
    b = rep["bls"]
    if b:
        print(f"  BLS: {b.get('growth_pct', 'n/a')}% growth, median {money(b.get('median_pay'), '$')}, {money(b.get('annual_openings'))} openings/yr")
    else:
        print("  WARNING: no BLS block")
    for x in rep["top_gaps"]:
        print(f"  GAP   {x['skill']:<28} {x['flags']:<22} resume: {x['strength']:<7} +{x['impact']} pts if proven")
    for x in rep["unproven_claims"]:
        print(f"  PROVE {x['skill']:<28} {x['flags']:<22} resume: listed  +{x['impact']} pts if proven")


if __name__ == "__main__":
    main()
