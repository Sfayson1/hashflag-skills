import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { check, sections } from "./check-study.ts";
import { BINARY, NOISE, ingest, parseTarget } from "./ingest.ts";

const ROOT = join(import.meta.dirname, "../../..");
const env = { ...process.env, GIT_AUTHOR_NAME: "Mara Quill", GIT_AUTHOR_EMAIL: "mara@example.com", GIT_COMMITTER_NAME: "Mara Quill", GIT_COMMITTER_EMAIL: "mara@example.com" };
const git = (cwd: string, ...args: string[]) => execFileSync("git", ["-c", "commit.gpgsign=false", ...args], { cwd, env, encoding: "utf8" }).trim();

// Replays the fixture as a repo with history, since the trade-off lives in a commit body, as in real repos.
function fixtureRepo() {
  const dir = mkdtempSync(join(tmpdir(), "trail-counter-"));
  cpSync(join(ROOT, "fixtures/project"), dir, { recursive: true });
  git(dir, "init", "-q", "-b", "main");
  git(dir, "add", "package.json", "src");
  git(dir, "commit", "-q", "-m", "feat: Record and list readings", "-m",
    "Readings live in one JSON file instead of SQLite. One dependency fewer, and the parks volunteers can open the file in a text editor. The ceiling is a few thousand readings per file.");
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "-m", "docs: Add the README, roadmap and CI smoke test");
  return dir;
}

test("noise and binaries are excluded from reading", () => {
  for (const p of ["package-lock.json", "a/dist/x.js", "node_modules/y/index.js", "app.min.js", "src/x.map"]) assert.ok(NOISE.test(p), p);
  for (const p of ["img/a.png", "docs/spec.pdf", "model.onnx", "fonts/x.woff2"]) assert.ok(BINARY.test(p), p);
  for (const p of ["src/cli.js", "README.md", "package.json", ".github/workflows/ci.yml"]) assert.ok(!NOISE.test(p) && !BINARY.test(p), p);
});

test("a GitHub URL or a local repo is accepted; anything else is refused", () => {
  assert.deepEqual(parseTarget("https://github.com/Vets-Who-Code/VetsAI"), { url: "https://github.com/Vets-Who-Code/VetsAI", owner: "Vets-Who-Code", repo: "VetsAI", slug: "vets-who-code-vetsai", local: null });
  assert.equal(parseTarget("https://github.com/o/r.git/").repo, "r");
  assert.throws(() => parseTarget(tmpdir()), /neither a GitHub URL nor a local git repo/);
});

const repo = fixtureRepo();
const out = mkdtempSync(join(tmpdir(), "project-demo-"));
const { dir, facts } = ingest(repo, { out });
const brief = readFileSync(join(dir, "source-brief.md"), "utf8");

test("ingest clones at the recorded sha and writes a brief with line-numbered code", () => {
  assert.equal(facts.sha, git(repo, "rev-parse", "HEAD"));
  assert.equal(JSON.parse(readFileSync(join(dir, "repo.json"), "utf8")).sha, facts.sha);
  assert.match(brief, /^# Source brief: trail-counter-/m);
  assert.match(brief, /GitHub metadata not fetched \(no GitHub origin\)/);
  assert.match(brief, /Export a monthly PDF report for the parks board/); // README claims are in the brief, to be checked, not believed
  assert.match(brief, /^### src\/cli\.js$/m);
  assert.match(brief, /^\s+10\| {3}report <month>/m); // numbered, so the case study can cite src/cli.js:10
  assert.deepEqual(facts.manifests, ["package.json"]);
  assert.deepEqual(facts.run, [".github/workflows/ci.yml"]);
  assert.deepEqual(facts.docs, ["ROADMAP.md"]);
  assert.deepEqual(facts.code, ["src/cli.js", "src/store.js"]);
  assert.equal(facts.tests.length, 0);
});

test("commit bodies reach the brief, because that is where trade-offs live", () => {
  assert.equal(facts.commits.length, 2);
  assert.match(brief, /Mara Quill: feat: Record and list readings\n {4}Readings live in one JSON file instead of SQLite/);
});

const study = readFileSync(join(ROOT, "skills/project-demo/example/case-study.md"), "utf8");
const clone = join(dir, "repo");

test("the example case study passes the gate against the clone", () => {
  const r = check(study, clone);
  assert.deepEqual(r.errors, []);
  assert.equal(r.cites, 17);
  assert.equal(sections(study).length, 5);
});

test("a feature without a code citation fails", () => {
  const bad = study.replace(" (`src/cli.js:20-24`)", "");
  assert.match(check(bad, clone).errors.join("\n"), /every feature needs a `path:line` citation to code/);
});

test("a feature cited only to the README fails", () => {
  const bad = study.replace("(`src/cli.js:20-24`)", "(`README.md:9`)");
  assert.match(check(bad, clone).errors.join("\n"), /citation to code, not docs/);
});

test("a citation outside the file or outside the repo fails", () => {
  assert.match(check(study.replace("`src/cli.js:20-24`", "`src/cli.js:20-99`"), clone).errors.join("\n"), /src\/cli\.js:20-99` is outside the file \(38 lines\)/);
  assert.match(check(study.replace("`src/cli.js:20-24`", "`src/nope.js:1`"), clone).errors.join("\n"), /`src\/nope\.js` is not in the repo/);
});

test("a decision or roadmap item without a source fails", () => {
  const bad = study.replace(' (commit "Record and list readings", Mara Quill)', "");
  assert.match(check(bad, clone).errors.join("\n"), /Key decisions and trade-offs: .* needs a source/);
});

test("a number without a citation on its line fails", () => {
  const bad = study.replace("## The problem\n", "## The problem\n\nAbout 40 volunteers use it every weekend.\n");
  assert.match(check(bad, clone).errors.join("\n"), /"About 40 volunteers.*": a number without a citation or source/);
});

test("the five sections must be present, in order, and nothing else", () => {
  assert.match(check(study.replace("## What's next", "## Roadmap"), clone).errors.join("\n"), /section 4 must be "## What's next", found "## Roadmap"/);
  assert.match(check(study + "\n## Thanks\n\nTo everyone.\n", clone).errors.join("\n"), /only the 5 sections are allowed; remove "## Thanks"/);
  assert.match(check(study.replace(/^title:.*\n/m, ""), clone).errors.join("\n"), /front matter needs a title/);
});
