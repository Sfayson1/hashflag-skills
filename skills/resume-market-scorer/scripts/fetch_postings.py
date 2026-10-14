#!/usr/bin/env python3
"""Pull live job postings for one lane from keyless public job-board APIs and count skills. Stdlib only.

  python3 fetch_postings.py ai --out postings.json

Lanes: software, data, ml, ai. Boards: Greenhouse, Lever, Ashby (companies in references/companies.json).
A source that fails is reported and skipped; if every source fails, the script exits.
"""
import argparse, hashlib, html, json, os, re, sys, urllib.request
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone

REF = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "references")
LANES = {
    "software": r"software engineer|software developer|backend|frontend|full[- ]?stack",
    "data": r"data engineer|analytics engineer|data platform",
    "ml": r"machine learning engineer|ml engineer|mlops",
    "ai": r"ai engineer|applied ai|llm engineer|genai|generative ai",
}
EXCLUDE = r"manager|director|recruiter"
INTERN = r"interns?|internship"
MAX_AGE_DAYS = 60
COMPANY_CAP = 0.15
LOW_SAMPLE = 30
NEW_TERM_PCT = 5
# Postings that ask for employer pedigree outright. Reported as a recognition signal; never scored.
# A requirement word must sit within four words before the phrase, so "used by the Fortune 500" and "top-tier
# benefits" in company blurbs don't count.
PEDIGREE = re.compile(r"\b(?:experience|background|worked|working|from|ex-|alumni|veterans? of|came from)\W+(?:\w+\W+){0,4}?"
                      r"(?:FAANG|MANGA|big tech|top[- ]tier|tier[- ]1|Fortune ?500|high[- ]growth start-?ups?|"
                      r"leading tech compan(?:y|ies)|name[- ]brand)\b", re.I)
# VWC heuristic: a section whose header matches PREFERRED is preferred; SKIP sections (company boilerplate) are
# not counted; every other section is required.
PREFERRED = re.compile(r"prefer|nice to have|bonus|plus|desired", re.I)
SKIP = re.compile(r"^about\b|who we are|benefits|perks|compensation|pay range|salary|equal (?:employment )?opportunity"
                  r"|diversity|privacy|accommodation|our commitment|recruitment scam", re.I)
BOARDS = {
    "greenhouse": "https://boards-api.greenhouse.io/v1/boards/{}/jobs?content=true",
    "lever": "https://api.lever.co/v0/postings/{}?mode=json",
    "ashby": "https://api.ashbyhq.com/posting-api/job-board/{}",
}


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "resume-market-scorer/2.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def term_re(term, cased=False):
    """Whole word, where C++, C#, Node.js and CI/CD count as words."""
    return re.compile(r"(?<![\w+#.])" + re.escape(term) + r"(?![\w+#]|\.\w)", 0 if cased else re.I)


def matchers(vocab):
    return [(s, [term_re(t) for t in [s["skill"]] * (s["skill"] not in s.get("cased", [])) + s.get("aliases", [])]
             + [term_re(t, True) for t in s.get("cased", [])]) for s in vocab["skills"]]


def lines(raw):
    """HTML → [(is_header, text)]. A header is a short line that is wholly a heading/bold, or ends with ':'."""
    raw = html.unescape(raw or "")
    raw = re.sub(r"<li\b", "\n• <li", raw)
    raw = re.sub(r"(<h[1-6]\b.*?</h[1-6]>)", "\n\\1\n", raw, flags=re.I | re.S)
    raw = re.sub(r"<br\s*/?>|</(?:p|div|li|ul|ol|tr)>", "\n", raw, flags=re.I)
    out = []
    for r in raw.split("\n"):
        text = " ".join(html.unescape(re.sub(r"<[^>]+>", " ", r)).split())
        if not text:
            continue
        m = re.match(r"\s*(?:<[^>]+>\s*)*<(h[1-6]|strong|b)\b[^>]*>(.*?)</\1>", r, re.I | re.S)
        bold = m and " ".join(re.sub(r"<[^>]+>", " ", m.group(2)).split()) == text
        out.append((not text.startswith("•") and len(text) <= 60 and bool(bold or text.endswith(":")), text))
    return out


def split(raw):
    """(required text, preferred text), split by section header. VWC heuristic."""
    req, pref, skip, section = [], [], [], None
    for is_header, text in lines(raw):
        if is_header:
            section = skip if SKIP.search(text) else pref if PREFERRED.search(text) else req
        (section if section is not None else req).append(text)
    return "\n".join(req), "\n".join(pref)


def when(v):
    if v in (None, ""):
        return None
    if isinstance(v, (int, float)):
        return datetime.fromtimestamp(v / 1000, timezone.utc)
    d = datetime.fromisoformat(v.replace("Z", "+00:00"))
    return d if d.tzinfo else d.replace(tzinfo=timezone.utc)


def board(name, co):
    data = get(BOARDS[name].format(co))
    if name == "greenhouse":
        return [dict(title=j["title"], location=(j.get("location") or {}).get("name", ""), url=j["absolute_url"],
                     date=j.get("first_published") or j.get("updated_at"), html=j.get("content", "")) for j in data["jobs"]]
    if name == "lever":
        return [dict(title=j["text"], location=(j.get("categories") or {}).get("location", ""), url=j["hostedUrl"],
                     date=j.get("createdAt"),
                     html=j.get("description", "") + "".join(f"<h3>{l['text']}</h3>{l['content']}" for l in j.get("lists", []))
                     + j.get("additional", "")) for j in data]
    return [dict(title=j["title"], location=j.get("location", ""), url=j["jobUrl"], date=j.get("publishedAt"),
                 html=j.get("descriptionHtml", "")) for j in data["jobs"] if j.get("isListed", True)]


def fetch_all():
    cos = json.load(open(os.path.join(REF, "companies.json")))
    jobs = [(b, c) for b in BOARDS for c in cos[b]]

    def one(bc):
        b, c = bc
        try:
            return b, c, [p | {"company": c, "board": b} for p in board(b, c)], None
        except Exception as e:
            return b, c, [], f"{type(e).__name__}: {e}"

    with ThreadPoolExecutor(16) as ex:
        return list(ex.map(one, jobs))


def cap(posts, share):
    """Largest per-company cap k with k <= share × final sample; keeps each company's newest postings."""
    by = defaultdict(list)
    for p in sorted(posts, key=lambda p: p["_date"] or datetime.min.replace(tzinfo=timezone.utc), reverse=True):
        by[p["company"].lower()].append(p)
    k = max((len(v) for v in by.values()), default=0)
    while k > 1 and k > share * sum(min(len(v), k) for v in by.values()):
        k -= 1
    return [p for v in by.values() for p in v[:k]]


def build(lane, results, vocab, include_intern=False, now=None):
    now = now or datetime.now(timezone.utc)
    title_re = re.compile(rf"\b(?:{LANES[lane]})\b", re.I)
    drop_re = re.compile(rf"\b(?:{EXCLUDE}{'' if include_intern else '|' + INTERN})\b", re.I)
    seen, posts = set(), []
    for _, _, ps, _ in results:
        for p in ps:
            p["_date"] = when(p["date"])
            key = (p["company"].lower(), p["title"].lower().strip(), (p["location"] or "").lower().strip())
            if (not title_re.search(p["title"]) or drop_re.search(p["title"]) or key in seen
                    or (p["_date"] and now - p["_date"] > timedelta(days=MAX_AGE_DAYS))):
                continue
            seen.add(key)
            posts.append(p)
    posts = cap(posts, COMPANY_CAP)
    n = len(posts)

    req, pref, new, new_cos = Counter(), Counter(), Counter(), defaultdict(set)
    known = [rx for _, rxs in matchers(vocab) for rx in rxs]
    pedigree = 0
    for p in posts:
        r, f = split(p["html"])
        pedigree += bool(PEDIGREE.search(r + "\n" + f))
        for s, rxs in matchers(vocab):
            if p["company"].lower() in s.get("vendor", []):
                continue
            if any(rx.search(r) for rx in rxs):
                req[s["skill"]] += 1
            elif any(rx.search(f) for rx in rxs):
                pref[s["skill"]] += 1
        # Auto-discovery: CamelCase tool-like terms (LangSmith, gRPC) not in the vocab. Never scored.
        for t in set(re.findall(r"\b[A-Za-z]*[a-z][A-Z][A-Za-z0-9]*\b", r + "\n" + f)):
            if not any(rx.fullmatch(t) for rx in known):
                new[t] += 1
                new_cos[t].add(p["company"].lower())
    pct = lambda c: round(100 * c / n, 1) if n else 0.0
    skills = sorted(({"skill": s["skill"], "family": s.get("family"), "postings": req[s["skill"]] + pref[s["skill"]],
                      "pct": pct(req[s["skill"]] + pref[s["skill"]]), "required_pct": pct(req[s["skill"]]),
                      "preferred_pct": pct(pref[s["skill"]])} for s in vocab["skills"]), key=lambda x: (-x["pct"], x["skill"]))
    failed = [{"source": f"{b}/{c}", "error": e} for b, c, _, e in results if e]
    out = {
        "fetched_by": "fetch_postings.py", "fetched_at": now.isoformat(timespec="seconds"), "lane": lane,
        "sample_size": n, "companies": len({p["company"].lower() for p in posts}),
        "boards": dict(Counter(p["board"] for p in posts)), "confidence": "LOW" if n < LOW_SAMPLE else "OK",
        "split_rule": "VWC heuristic: sections under a header matching prefer|nice to have|bonus|plus|desired are preferred; "
                      "about/benefits/pay/EEO sections are skipped; the rest is required",
        "failed_sources": failed, "pedigree_pct": pct(pedigree), "skills": skills,
        # 3+ companies so one firm's product names (its own CamelCase brand) don't surface
        "new_terms": sorted(({"term": t, "postings": c, "pct": pct(c)} for t, c in new.items()
                             if pct(c) >= NEW_TERM_PCT and len(new_cos[t]) >= 3), key=lambda x: -x["pct"]),
        "postings": [{"company": p["company"], "title": p["title"], "board": p["board"], "url": p["url"]} for p in posts],
    }
    out["digest"] = digest(out)
    return out


def digest(d):
    """Hash of everything but the digest itself: catches hand edits (not a signature; it can be recomputed)."""
    return hashlib.sha256(json.dumps({k: v for k, v in d.items() if k != "digest"}, sort_keys=True).encode()).hexdigest()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("lane", choices=LANES)
    ap.add_argument("--out", required=True)
    ap.add_argument("--include-intern", action="store_true")
    a = ap.parse_args()
    results = fetch_all()
    for b, c, _, e in results:
        if e:
            print(f"SOURCE FAILED: {b}/{c}: {e}", file=sys.stderr)
    if all(e for *_, e in results):
        sys.exit("FETCH FAILED: every source failed. No fetch, no score.")
    out = build(a.lane, results, json.load(open(os.path.join(REF, "skills_vocab.json"))), a.include_intern)
    with open(a.out, "w") as f:
        json.dump(out, f, indent=1)
    print(f"{a.lane}: {out['sample_size']} postings, {out['companies']} companies, boards {out['boards']}, "
          f"confidence {out['confidence']}, {len(out['failed_sources'])} sources failed -> {a.out}")


if __name__ == "__main__":
    main()
