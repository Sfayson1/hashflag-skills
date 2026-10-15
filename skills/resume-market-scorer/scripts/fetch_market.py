#!/usr/bin/env python3
"""Pull O*NET and BLS data for one occupation, live. Stdlib only.

  python3 fetch_market.py ai --out onet.json                 # lane: software, data, ml or ai
  python3 fetch_market.py --search "software developer"      # look up any other 15-xxxx code
  python3 fetch_market.py 15-1252.00 --role "Senior Software Engineer" --out onet.json

Needs BLS_CONTACT_EMAIL (BLS returns 403 unless the User-Agent carries a contact email).
Any fetch or parse error exits non-zero. Nothing is ever estimated or filled in.
"""
import argparse, csv, html, io, json, os, re, sys, urllib.parse, urllib.request
from datetime import datetime, timezone
from fetch_postings import LANE_ONET

ONET = "https://www.onetonline.org"
BLS_URL = "https://www.bls.gov/emp/tables/occupational-projections-and-characteristics.htm"
CORE_MIN_IMPORTANCE = 50
SCOPE = "15-"  # computer and mathematical occupations; this skill scores software engineering resumes only
CORE_TABLES = [  # (type, url path segment, file prefix)
    ("transferable", "sc", "Transferable_Skills"),
    ("essential", "sb", "Essential_Skills"),
    ("knowledge", "kn", "Knowledge"),
]


def fail(msg):
    sys.exit(f"FETCH FAILED: {msg}")


def get(url, ua):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": ua})
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.read().decode("utf-8", "replace")
    except Exception as e:
        fail(f"{url}: {e}")


def rows(text, url):
    data = list(csv.DictReader(io.StringIO(text)))
    if not data:
        fail(f"{url}: no CSV rows (got {text[:80]!r})")
    return data


def num(v, url, col):
    v = (v or "").strip()
    if v.lower() in ("n/a", ""):
        return 0.0
    try:
        return float(v.replace(",", ""))
    except ValueError:
        fail(f"{url}: {col} is {v!r}, not a number")


def search(term, ua):
    url = f"{ONET}/find/quick?s={urllib.parse.quote_plus(term)}"
    hits = re.findall(r'link/summary/(\d{2}-\d{4}\.\d{2})">([^<]+)', get(url, ua))
    if not hits:
        fail(f"{url}: no occupations found for {term!r}")
    seen = set()
    hits = [(c, html.unescape(t)) for c, t in hits if c.startswith(SCOPE) and not (c in seen or seen.add(c))]
    if not hits:
        fail(f"no software engineering (15-xxxx) occupation matches {term!r}. This skill scores software engineering resumes only.")
    return hits


def cells(tr):
    return [html.unescape(re.sub(r"<[^>]+>", "", c)).strip() for c in re.findall(r"<t[hd][^>]*>(.*?)</t[hd]>", tr, re.S)]


def bls(code, ua):
    page = get(BLS_URL, ua)
    m = re.search(r"Employment change, percent,\s*(\d{4})\s*[–-]\s*(\d{2,4})", html.unescape(page))  # header uses &ndash;
    if not m:
        fail(f"{BLS_URL}: projection period header not found")
    end = m.group(2) if len(m.group(2)) == 4 else m.group(1)[:2] + m.group(2)
    soc = code[:7]
    for tr in re.findall(r"<tr[^>]*>(.*?)</tr>", page, re.S):
        c = cells(tr)
        if len(c) >= 12 and c[1] == soc:
            f = lambda i, col: num(c[i], BLS_URL, col)
            return {
                "title": c[0], "soc": soc, "period": f"{m.group(1)}-{end}",
                "employment_now_k": f(3, "employment"), "employment_future_k": f(4, "employment"),
                "growth_pct": f(8, "percent change"), "annual_openings_k": f(10, "openings"),
                "median_wage": f(11, "median wage"), "source": BLS_URL,
            }
    fail(f"{BLS_URL}: no row for SOC {soc}")


def check_code(code):
    if not re.fullmatch(r"\d{2}-\d{4}\.\d{2}", code):
        fail(f"{code!r} is not an O*NET code like 15-1252.00")
    if not code.startswith(SCOPE):
        fail(f"{code} is outside software engineering (15-xxxx). This skill scores software engineering resumes only.")


def fetch(code, role, email):
    check_code(code)
    ua = f"resume-market-scorer/1.0 (contact: {email})"
    tag = code.replace(".", "-")
    sources = {"summary": f"{ONET}/link/summary/{code}"}

    m = re.search(r"<title>\s*" + re.escape(code) + r"\s*-\s*([^<]+?)\s*</title>", get(sources["summary"], ua))
    if not m:
        fail(f"{sources['summary']}: title not found")
    title = html.unescape(m.group(1))

    sources["hot_tech"] = url = f"{ONET}/link/hot_tech/{code}/Hot_Technology_{tag}.csv?fmt=csv"
    tech = [{"skill": r["Software Skill"].strip(),
             "posting_pct": num(r.get("Percentage"), url, "Percentage"),
             "in_demand": (r.get("In Demand") or "").strip().lower() == "yes"}
            for r in rows(get(url, ua), url)]

    core = []
    for kind, seg, prefix in CORE_TABLES:
        sources[kind] = url = f"{ONET}/link/table/details/{seg}/{code}/{prefix}_{tag}.csv?fmt=csv&s=IM&t=-10"
        data = rows(get(url, ua), url)
        name_col = next((k for k in data[0] if k not in ("Importance",) and not k.endswith("Description")), None)
        if "Importance" not in data[0] or not name_col:
            fail(f"{url}: expected Importance and name columns, got {list(data[0])}")
        for r in data:
            imp = num(r["Importance"], url, "Importance")
            if imp >= CORE_MIN_IMPORTANCE:
                core.append({"skill": r[name_col].strip(), "importance": imp, "type": kind})

    sources["bls"] = BLS_URL
    return {
        "fetched_by": "fetch_market.py",
        "fetched_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "role": role, "onet_code": code, "onet_title": title,
        "sources": sources, "bls": bls(code, ua),
        "tech_skills": tech, "core_skills": core,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("code", nargs="?", help="a lane (software, data, ml, ai) or an O*NET code")
    ap.add_argument("--search")
    ap.add_argument("--role")
    ap.add_argument("--out")
    a = ap.parse_args()
    ua = "resume-market-scorer/1.0"
    if a.search:
        for c, t in search(a.search, ua)[:10]:  # O*NET ranks by relevance; the tail is noise
            print(f"{c}  {t}")
        return
    if a.code in LANE_ONET:
        a.code, a.role = LANE_ONET[a.code], a.role or f"{a.code} engineer"
    if not (a.code and a.role and a.out):
        ap.error("give LANE --out onet.json, --search TERM, or CODE --role ROLE --out onet.json")
    check_code(a.code)
    email = os.environ.get("BLS_CONTACT_EMAIL", "").strip()
    if "@" not in email:
        sys.exit("FETCH FAILED: set BLS_CONTACT_EMAIL to your email. BLS refuses requests without a contact address.")
    data = fetch(a.code, a.role, email)
    with open(a.out, "w") as f:
        json.dump(data, f, indent=2)
    b = data["bls"]
    print(f"{data['onet_code']} {data['onet_title']}: {len(data['tech_skills'])} hot technologies, "
          f"{len(data['core_skills'])} core items >= {CORE_MIN_IMPORTANCE}; BLS {b['period']} {b['growth_pct']}% growth -> {a.out}")


if __name__ == "__main__":
    main()
