# Run: python3 test_score.py
from score import score

tech = [{"skill": f"Tool{i}", "hot": i < 10, "in_demand": i < 5} for i in range(80)] + [{"skill": "Python", "hot": True, "in_demand": True, "aliases": ["py"]}]
core = [{"skill": "Programming", "importance": 75}, {"skill": "Complex Problem Solving", "importance": 72}, {"skill": "Negotiation", "importance": 40}]
onet = {"role": "SWE", "onet_code": "15-1252.00", "tech_skills": tech, "core_skills": core, "bls": {"growth_pct": 15}}
resume = {"skills": [
    {"skill": "py", "strength": "listed"},
    {"skill": "Python", "strength": "proven"},
    {"skill": "Programming", "strength": "proven"},
    {"skill": "Negotiation", "strength": "proven"},
    {"skill": "Rust", "strength": "listed"},
]}
rep = score(onet, resume)

# strongest evidence wins across aliases
assert next(x for x in rep["all"] if x["skill"] == "Python")["strength"] == "proven"
# a skill O*NET lists but doesn't score is not "dead weight"
assert rep["dead_weight"] == ["Rust"], rep["dead_weight"]
assert rep["in_onet_not_scored"] == ["Negotiation"]
# only Hot or In Demand tools are scored (Tool0-9 and Python)
assert len([x for x in rep["all"] if not x["flags"].startswith("importance")]) == 11
plain = score(onet, {"skills": [{"skill": "Tool50", "strength": "proven"}]})
assert plain["in_onet_not_scored"] == ["Tool50"] and plain["dead_weight"] == []
# gaps rank by score impact: one core skill outweighs any single scored tool
assert rep["top_gaps"][0]["skill"] == "Complex Problem Solving", rep["top_gaps"][0]
# impacts add up: proving every gap would reach 100
assert abs(rep["score"] + sum(x["impact"] for x in rep["all"]) - 100) < 0.5
# perfect evidence scores 100
full = score(onet, {"skills": [{"skill": i["skill"], "strength": "proven"} for i in tech + core]})
assert full["score"] == 100 and full["band"] == "Strong"
# bad strength is a clear error, not a KeyError
try:
    score(onet, {"skills": [{"skill": "Python", "strength": "expert"}]})
    raise AssertionError("expected ValueError")
except ValueError as e:
    assert "expert" in str(e)
print("ok")
