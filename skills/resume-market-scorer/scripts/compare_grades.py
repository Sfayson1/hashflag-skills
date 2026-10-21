#!/usr/bin/env python3
"""Compare several gradings of the same resume: per-skill agreement and composite score spread.

  python3 compare_grades.py g1/report.json g2/report.json g3/report.json

Each report.json comes from score_skills.py --out. The scripts are deterministic; this measures the grading step.
"""
import json, sys
from itertools import combinations

TARGET = 2.0  # points: the spread a resume's score may move between two grading sessions


def compare(reports):
    grades = [{x["skill"]: x["grade"] for x in r["items"]} for r in reports]
    skills = sorted(set().union(*grades))
    split = {s: [g.get(s, "-") for g in grades] for s in skills if len({g.get(s) for g in grades}) > 1}
    pairs = list(combinations(grades, 2))
    pairwise = sum(a.get(s) == b.get(s) for a, b in pairs for s in skills) / (len(pairs) * len(skills))
    scores = [r["score"] for r in reports]
    return {"skills": len(skills), "split": split, "unanimous": 1 - len(split) / len(skills), "pairwise": pairwise,
            "scores": scores, "spread": round(max(scores) - min(scores), 1)}


def main():
    reports = [json.load(open(p)) for p in sys.argv[1:]]
    if len(reports) < 2:
        sys.exit("give two or more report.json files")
    c = compare(reports)
    print(f"{len(reports)} gradings, {c['skills']} scored skills: unanimous on {c['unanimous']:.0%}, pairwise agreement {c['pairwise']:.0%}")
    for s, gs in sorted(c["split"].items()):
        print(f"  {s:<30} {' / '.join(gs)}")
    print(f"scores {c['scores']}  spread {c['spread']} pts  target ±{TARGET:g} ({'met' if c['spread'] <= 2 * TARGET else 'MISSED'})")


if __name__ == "__main__":
    main()
