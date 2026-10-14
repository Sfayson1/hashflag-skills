#!/usr/bin/env python3
"""Score resume evidence against live O*NET data (BLS reported as outlook only).

  python3 score.py onet.json --checklist                 # every item that will be scored
  python3 score.py onet.json resume.json --out report.json

onet.json must come from fetch_market.py and be under 30 days old. The resume and the
report must live outside any git repo. The formula is fixed; it never changes per person.
"""
import argparse, json, os, re, sys
from datetime import datetime, timezone

STRENGTH = {"proven": 1.0, "applied": 0.7, "listed": 0.4, "stale": 0.3, "none": 0.0}
TECH_SHARE, CORE_SHARE = 0.70, 0.30
TECH_TOP = 15
IN_DEMAND_BOOST = 1.25
CORE_MIN_IMPORTANCE = 50
CORE_TYPES = ("transferable", "knowledge")  # essential skills (reading, listening) aren't evidenced by resumes
MAX_AGE_DAYS = 30
BANDS_CALIBRATED = False  # flip after 3-5 real resumes have been scored and reviewed

# Alternatives scored as one slot: the best evidence among members counts, and the slot is
# worth its most-requested member. Nobody loses points for not using a competing stack.
# Members use O*NET's names; members O*NET doesn't list (Google Cloud) still earn credit.
STACKS = {
    "Java or C#": ["Oracle Java", "C#"],
    "Cloud platform": ["Amazon Web Services AWS software", "Microsoft Azure software", "Google Cloud software"],
    "Front-end framework": ["React", "Google Angular", "Vue.js"],
    "JavaScript or TypeScript": ["JavaScript", "TypeScript"],  # TypeScript is a JavaScript superset
}
SLOT_OF = {m: slot for slot, ms in STACKS.items() for m in ms}

# ATS wording. Don't assume an ATS maps "GCP" to "Google Cloud": a skill is ATS-safe only
# when the resume text carries every standard form below (full name and abbreviation).
# Tools not listed need their O*NET name as written. Case-insensitive, whole words.
ATS_FORMS = {
    "Amazon Web Services AWS software": ["Amazon Web Services", "AWS"],
    "Microsoft Azure software": ["Azure"],
    "Google Cloud software": ["Google Cloud", "GCP"],
    "Structured query language SQL": ["SQL"],
    "Oracle Java": ["Java"],
    "Google Angular": ["Angular"],
    "Vue.js": ["Vue"],
    "Cascading style sheets CSS": ["CSS"],
    "Hypertext markup language HTML": ["HTML"],
    "Microsoft .NET Framework": [".NET"],
}


def has_term(term, text):
    """Whole-word, case-insensitive literal match, the way a keyword filter sees it."""
    return re.search(r"(?<![\w.#+])" + re.escape(term) + r"(?![\w#+])", text, re.I) is not None


def quoted(quote, text):
    """True when the quote appears in the text. "..." may stand for skipped words."""
    flat = lambda t: " ".join(t.replace("\u2019", "'").replace("\u201c", '"').replace("\u201d", '"').split()).lower()
    hay, pos = flat(text), 0
    for part in re.split(r"\.\.\.|\u2026", quote):
        part = flat(part)
        if not part:
            continue
        pos = hay.find(part, pos)
        if pos < 0:
            return False
        pos += len(part)
    return True


def ats_check(rows, text):
    """For each scored tool the person has, which standard forms the resume text is missing."""
    out = []
    for x in rows:
        if x["section"] != "tech" or x["strength"] == "none":
            continue
        forms = ATS_FORMS.get(x["via_onet"], [x["via_onet"]])
        missing = [f for f in forms if not has_term(f, text)]
        out.append({"skill": x["via_onet"], "forms": forms, "missing": missing,
                    "write": f"{forms[0]} ({forms[1]})" if len(forms) == 2 else forms[0]})
    return {"checked": len(out), "ready": sum(1 for a in out if not a["missing"]), "fixes": [a for a in out if a["missing"]]}


def refuse(msg):
    sys.exit(f"REFUSED: {msg}")


def norm(s):
    return " ".join(s.lower().replace("-", " ").replace(".", "").split())


def band(x):
    return "Strong" if x >= 80 else "Competitive" if x >= 65 else "Gaps" if x >= 50 else "Mismatch"


def in_git_repo(path):
    d = os.path.dirname(os.path.abspath(path))
    while True:
        if os.path.exists(os.path.join(d, ".git")):
            return d
        parent = os.path.dirname(d)
        if parent == d:
            return None
        d = parent


def check_onet(o, now=None):
    if o.get("fetched_by") != "fetch_market.py":
        refuse("onet.json was not written by fetch_market.py. Run fetch_market.py; never hand-write or edit market data.")
    if not o.get("fetched_at"):
        refuse("onet.json has no fetched_at. Re-run fetch_market.py.")
    try:
        at = datetime.fromisoformat(o["fetched_at"])
    except ValueError:
        refuse(f"onet.json fetched_at {o['fetched_at']!r} is not a timestamp. Re-run fetch_market.py.")
    age = ((now or datetime.now(timezone.utc)) - at).days
    if age > MAX_AGE_DAYS:
        refuse(f"onet.json is {age} days old (max {MAX_AGE_DAYS}). Re-run fetch_market.py.")


def checklist(o):
    """The fixed set of scored items: (section, item, weight, label, members).
    Tech is the top 15 Hot Technologies, with stack alternatives merged into one slot."""
    tech = sorted(o.get("tech_skills", []), key=lambda t: -t["posting_pct"])[:TECH_TOP]
    items, slots = [], {}
    for t in tech:
        w = t["posting_pct"] * (IN_DEMAND_BOOST if t["in_demand"] else 1)
        label = f"{t['posting_pct']:g}% of postings" + (", In Demand" if t["in_demand"] else "")
        slot = SLOT_OF.get(t["skill"])
        if slot is None:
            items.append(("tech", t["skill"], w, label, [t["skill"]]))
        elif slot not in slots:  # tech is sorted, so the first member seen carries the highest weight
            slots[slot] = len(items)
            items.append(("tech", slot, w, f"any of: {', '.join(STACKS[slot])}; top member {label}", STACKS[slot]))
    core = [c for c in o.get("core_skills", []) if c["type"] in CORE_TYPES and c["importance"] >= CORE_MIN_IMPORTANCE]
    items += [("core", c["skill"], c["importance"], f"{c['type']}, importance {c['importance']:g}", [c["skill"]]) for c in core]
    return items


def score(o, r, text=None):
    items = checklist(o)
    known = {norm(t["skill"]): t["skill"] for t in o.get("tech_skills", []) + o.get("core_skills", [])}
    known.update({norm(m): m for m in SLOT_OF})

    ev, unmatched = {}, []
    for s in r.get("skills", []):
        st = s.get("strength")
        if st not in STRENGTH:
            raise ValueError(f"{s.get('skill')!r} has strength {st!r}; use one of {', '.join(STRENGTH)}")
        if st != "none" and not (s.get("evidence") or "").strip():
            raise ValueError(f"{s.get('skill')!r} is graded {st} with no evidence line. Quote the resume, or grade it none.")
        if st != "none" and text is not None and not quoted(s["evidence"], text):
            raise ValueError(f"{s.get('skill')!r}: evidence is not on the resume. Quote it exactly (use ... for skipped words): {s['evidence'][:80]!r}")
        name = known.get(norm(s.get("onet_name") or s["skill"]))
        if name is None:
            unmatched.append(s["skill"]); continue
        if name not in ev or STRENGTH[st] > STRENGTH[ev[name]["strength"]]:
            ev[name] = s

    missing = [i for _, i, _, _, members in items if not any(m in ev for m in members)]
    if missing:
        raise ValueError(f"resume.json must grade every checklist item (use strength none when absent). Missing: {', '.join(missing)}")

    rows, sub = [], {}
    for section, share in (("tech", TECH_SHARE), ("core", CORE_SHARE)):
        sec = [x for x in items if x[0] == section]
        tw = sum(x[2] for x in sec)
        got = 0.0
        for _, name, w, label, members in sec:
            best = max((ev[m] for m in members if m in ev), key=lambda e: STRENGTH[e["strength"]])
            st = best["strength"]
            got += w * STRENGTH[st]
            value = 100 * share * w / tw if tw else 0.0  # points this item is worth when proven
            via = known.get(norm(best.get("onet_name") or best["skill"]), name)
            rows.append({"section": section, "skill": name, "via_onet": via, "weight": round(w, 2), "flags": label, "strength": st,
                         "evidence": best.get("evidence", ""), "via": best.get("onet_name") or best["skill"], "value": round(value, 2),
                         "impact": round(value * (1 - STRENGTH[st]), 2)})  # points gained if proven; gaps rank by it
        sub[section] = 100 * got / tw if tw else 0.0
    total = round(TECH_SHARE * sub["tech"] + CORE_SHARE * sub["core"], 1)
    scored = {m for *_, members in items for m in members}
    ranked = sorted(rows, key=lambda x: -x["impact"])

    return {
        "role": o.get("role"), "onet_code": o["onet_code"], "onet_title": o.get("onet_title"),
        "fetched_at": o["fetched_at"], "bls": o.get("bls"), "sources": o.get("sources", {}),
        "score": total, "band": band(total), "bands_calibrated": BANDS_CALIBRATED,
        "subscores": {k: round(v, 1) for k, v in sub.items()},
        "top_gaps": [x for x in ranked if x["strength"] in ("none", "stale")][:5],
        "unproven_claims": [x for x in ranked if x["strength"] == "listed"][:5],
        "strengths": sorted([x for x in rows if x["strength"] == "proven"], key=lambda x: -x["value"])[:5],
        "in_onet_not_scored": sorted(n for n in ev if n not in scored),
        "unmatched": sorted(unmatched),  # Claude labels each: alternate stack, not yet in O*NET, or dead weight
        "ats": ats_check(rows, text) if text is not None else None,
        "all": ranked,
    }


JD_WEIGHT = {"required": 2, "preferred": 1}


def jd_score(jd, jd_text, r, text=None):
    """Score the resume against one job posting. Every posting skill carries a verbatim quote
    from the posting, so nothing in the checklist is invented."""
    items = jd.get("skills", [])
    if not items:
        raise ValueError("jd.json has no skills. Read the posting and list every skill it asks for.")
    for it in items:
        if it.get("level") not in JD_WEIGHT:
            raise ValueError(f"jd.json: {it.get('skill')!r} level must be required or preferred")
        if not it.get("quote") or not quoted(it["quote"], jd_text):
            refuse(f"jd.json: the quote for {it.get('skill')!r} is not in the posting. Every posting skill must quote the posting verbatim.")

    grades = {}
    for s in r.get("skills", []):
        for key in (s["skill"], s.get("onet_name")):
            if key and (norm(key) not in grades or STRENGTH[s["strength"]] > STRENGTH[grades[norm(key)]["strength"]]):
                grades[norm(key)] = s
    rows, missing = [], []
    for it in items:
        terms = it.get("any_of") or [it["skill"]]
        found = [(t, grades[norm(t)]) for t in terms if norm(t) in grades]
        if not found:
            missing.append(it["skill"]); continue
        term, best = max(found, key=lambda f: STRENGTH[f[1]["strength"]])
        rows.append({"skill": it["skill"], "level": it["level"], "weight": JD_WEIGHT[it["level"]], "term": term,
                     "strength": best["strength"], "evidence": best.get("evidence", "")})
    if missing:
        raise ValueError(f"resume.json must grade every posting skill (use strength none when absent). Missing: {', '.join(missing)}")

    tw = sum(x["weight"] for x in rows)
    for x in rows:
        x["impact"] = round(100 * x["weight"] * (1 - STRENGTH[x["strength"]]) / tw, 2)
    total = round(100 * sum(x["weight"] * STRENGTH[x["strength"]] for x in rows) / tw, 1)
    # The posting's own words are what its ATS filters on.
    ats = None
    if text is not None:
        have = [x for x in rows if x["strength"] != "none"]
        fixes = [{"skill": x["skill"], "write": x["term"]} for x in have if not has_term(x["term"], text)]
        ats = {"checked": len(have), "ready": len(have) - len(fixes), "fixes": fixes}
    req = [x for x in rows if x["level"] == "required"]
    return {
        "title": jd.get("title"), "company": jd.get("company"), "score": total, "band": band(total),
        "required_shown": sum(1 for x in req if x["strength"] != "none"), "required_total": len(req),
        "gaps": sorted([x for x in rows if x["strength"] != "proven"], key=lambda x: -x["impact"]),
        "ats": ats, "all": rows,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("onet"); ap.add_argument("resume", nargs="?"); ap.add_argument("--out")
    ap.add_argument("--checklist", action="store_true")
    ap.add_argument("--text", help="the resume as plain text, for the ATS wording check")
    ap.add_argument("--jd", help="jd.json: the target posting's skills, each with a verbatim quote")
    ap.add_argument("--jd-text", help="the target posting as plain text")
    a = ap.parse_args()
    if bool(a.jd) != bool(a.jd_text):
        ap.error("--jd and --jd-text go together")
    o = json.load(open(a.onet))
    check_onet(o)

    if a.checklist:
        print(f"Grade every item below in resume.json ({o['onet_code']} {o.get('onet_title')}):")
        for section, name, w, label, _ in checklist(o):
            print(f"  [{section}] {name}  ({label})")
        print("For an 'any of' slot, grade the member(s) the person uses; the best one counts.")
        if a.jd:
            jd = json.load(open(a.jd))
            print(f"\nAlso grade every skill from the posting ({jd.get('title')}, {jd.get('company')}):")
            for it in jd.get("skills", []):
                print(f"  [{it.get('level')}] {it.get('skill')}" + (f"  (any of: {', '.join(it['any_of'])})" if it.get("any_of") else ""))
        return
    if not a.resume:
        ap.error("give resume.json, or --checklist")
    for path in [a.resume] + [p for p in (a.out, a.text, a.jd, a.jd_text) if p]:
        repo = in_git_repo(path)
        if repo:
            refuse(f"{path} is inside the git repo {repo}. Resumes are personal data: move working files to ~/resume-scores/<person>/.")

    try:
        resume = json.load(open(a.resume))
        text = open(a.text).read() if a.text else None
        rep = score(o, resume, text)
        if a.jd:
            rep["job"] = jd_score(json.load(open(a.jd)), open(a.jd_text).read(), resume, text)
    except (ValueError, KeyError) as e:
        sys.exit(f"error: {e}")
    if a.out:
        with open(a.out, "w") as f:
            json.dump(rep, f, indent=2)

    print(f"{rep['role']}: {rep['score']}/100 ({rep['band']}{'' if BANDS_CALIBRATED else ', bands uncalibrated'}) | O*NET {rep['onet_code']} {rep['onet_title']}, pulled {rep['fetched_at'][:10]}")
    print(f"  Subscores: Tech {rep['subscores']['tech']} · Core {rep['subscores']['core']}")
    b = rep["bls"] or {}
    print(f"  BLS {b.get('period')}: {b.get('growth_pct')}% growth, median ${b.get('median_wage') or 0:,.0f}, {b.get('annual_openings_k')}K openings/yr")
    for x in rep["top_gaps"]:
        print(f"  GAP   {x['skill']:<34} {x['flags']:<30} resume: {x['strength']:<6} +{x['impact']} pts if proven")
    for x in rep["unproven_claims"]:
        print(f"  PROVE {x['skill']:<34} {x['flags']:<30} resume: listed +{x['impact']} pts if proven")
    ats = rep["ats"]
    if ats is None:
        print("  ATS wording: not checked (pass --text resume.txt)")
    else:
        print(f"  ATS wording: {ats['ready']} of {ats['checked']} tools written in every standard form")
        for f in ats["fixes"]:
            print(f"  ATS   {f['skill']:<34} missing {', '.join(repr(m) for m in f['missing'])}; write {f['write']!r}")
    if rep["unmatched"]:
        print(f"  Not scored for this occupation (label each): {', '.join(rep['unmatched'])}")
    j = rep.get("job")
    if j:
        print(f"\nJob match: {j['score']}/100 ({j['band']}, bands uncalibrated) | {j['title']} at {j['company']}")
        print(f"  Required skills shown: {j['required_shown']} of {j['required_total']}")
        for x in j["gaps"][:8]:
            print(f"  {'GAP' if x['strength'] in ('none', 'stale') else 'PROVE':<5} {x['skill']:<34} {x['level']:<9} resume: {x['strength']:<7} +{x['impact']} pts if proven")
        if j["ats"]:
            print(f"  ATS wording (posting's terms): {j['ats']['ready']} of {j['ats']['checked']} present")
            for f in j["ats"]["fixes"]:
                print(f"  ATS   {f['skill']:<34} the posting says {f['write']!r}; use that exact term")


if __name__ == "__main__":
    main()
