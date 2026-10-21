// project-demo ingest: a local repo or a GitHub URL in; a shallow clone, repo.json and a budgeted
// source-brief.md out. The brief is the only thing the case study may be written from.
// Usage: node ingest.ts <path | https://github.com/<owner>/<repo>> [--out <dir>] [--commits 20]
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, extname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { outDir, slugify } from "../../../lib/paths.ts";

// Character budgets per excerpt. The agent reads the brief, not the repo, so the brief stays small.
const BUDGET = { readme: 8000, manifest: 2000, run: 1500, doc: 2500, code: 3500 };
const MAX_CODE_FILES = 8;
const MAX_LIST = 20;
const BIG_DIR = 100; // a folder with more files than this directly in it is data (VetsAI's job-code dumps): listed once, never read
const DEPTH = 50; // commits to clone; enough history for decisions, small enough for a 1,400-commit repo

export const NOISE =
  /(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|npm-shrinkwrap\.json|go\.sum|Cargo\.lock|composer\.lock|Gemfile\.lock|poetry\.lock)$|\.(min\.(js|css)|map|snap)$|(^|\/)(dist|build|out|vendor|node_modules|\.next|coverage|__pycache__)\//;
export const BINARY =
  /\.(png|jpe?g|gif|webp|svg|ico|pdf|docx?|xlsx?|pptx?|zip|gz|tgz|tar|7z|woff2?|ttf|otf|eot|mp[34]|wav|mov|bin|pkl|onnx|pt|h5|parquet|ipynb|lock)$/i;
const IMAGE = /\.(png|jpe?g|gif|webp)$/i;
const MANIFEST = /^(package\.json|pyproject\.toml|requirements[^/]*\.txt|setup\.py|Cargo\.toml|go\.mod|Gemfile|composer\.json|pom\.xml|build\.gradle(\.kts)?)$/;
const RUN = /^(Makefile|Dockerfile|docker-compose[^/]*\.ya?ml|Procfile|[^/]+\.sh|\.github\/workflows\/[^/]+\.ya?ml|\.nvmrc|\.python-version|\.streamlit\/config\.toml)$/;
const DOC = /^(ROADMAP|TODO|CHANGELOG|CONTRIBUTING|ARCHITECTURE|DECISIONS)\.md$|^docs\/(adr|decisions)\/[^/]+\.md$/i;
const ENTRY = /^(src\/|app\/|lib\/)?((index|main|app|cli|server|streamlit_app|lib)\.(m?[jt]sx?|py|go|rs|rb)|(pages|app)\/(index|_app|page|layout)\.[jt]sx?)$/;
const SOURCE = /\.(m?[jt]sx?|py|go|rs|rb|java|kt|swift|cc?|cpp|h|cs|php|exs?|sql|vue|svelte)$/;
const TEST = /(^|\/)(tests?|__tests__|spec)\/|\.(test|spec)\.\w+$|^test_|_test\.\w+$/;
const TOOLING = /(^|\/)[\w.-]*\.config\.\w+$|(^|\/)(scripts|tools|bin|\.storybook|\.github)\//; // config and maintenance scripts aren't the product
const MAX_BODY = 600; // chars of a commit body; long generated bodies otherwise swamp the brief
const BOT = /\[bot\]$|^(dependabot|renovate|github-actions)/i; // dependency bumps say nothing about the project

export type Commit = { sha: string; author: string; subject: string; body: string };
export type Github = {
  description: string | null; license: string | null; homepage: string | null; topics: string[]; stars: number; created_at: string; pushed_at: string;
  contributors: { login: string; name: string | null; contributions: number }[];
  pulls: { number: number; title: string; author: string; merged_at: string; body: string }[];
  issues: { number: number; title: string }[];
};

const sh = (cmd: string, args: string[], cwd?: string) => execFileSync(cmd, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

export function parseTarget(input: string) {
  const m = input.match(/^https?:\/\/github\.com\/([^/\s]+)\/([^/\s#?]+?)(?:\.git)?\/?$/);
  if (m) return { url: input, owner: m[1], repo: m[2], slug: slugify(`${m[1]}-${m[2]}`), local: null };
  const local = resolve(input);
  if (!existsSync(join(local, ".git"))) throw new Error(`${input} is neither a GitHub URL nor a local git repo`);
  let owner: string | null = null, repo: string | null = null;
  try {
    const o = sh("git", ["-C", local, "remote", "get-url", "origin"]).match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?$/);
    if (o) [owner, repo] = [o[1], o[2]];
  } catch {}
  return { url: null, owner, repo, slug: slugify(basename(local)), local };
}

// A fresh shallow clone every run, so the brief always matches the recorded sha.
export function clone(target: ReturnType<typeof parseTarget>, dir: string) {
  const repo = join(dir, "repo");
  rmSync(repo, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  sh("git", ["clone", "--quiet", "--depth", String(DEPTH), target.url ?? pathToFileURL(target.local!).href, repo]);
  return { repo, sha: sh("git", ["rev-parse", "HEAD"], repo), branch: sh("git", ["rev-parse", "--abbrev-ref", "HEAD"], repo) };
}

export function inventory(repo: string) {
  const all = sh("git", ["ls-files"], repo).split("\n").filter(Boolean);
  // Direct children only: a folder holding BIG_DIR+ files itself is a data dump; a tree that adds up to that is a codebase.
  const perDir = new Map<string, number>();
  for (const f of all) {
    const d = f.includes("/") ? f.slice(0, f.lastIndexOf("/")) : "";
    if (d) perDir.set(d, (perDir.get(d) ?? 0) + 1);
  }
  const big = [...perDir].filter(([, n]) => n > BIG_DIR).map(([d]) => d);
  const inBig = (f: string) => big.some((d) => f.startsWith(d + "/"));
  const kept = all.filter((f) => !NOISE.test(f) && !BINARY.test(f) && !inBig(f));
  const images = all.filter((f) => IMAGE.test(f) && !NOISE.test(f) && !inBig(f)).slice(0, MAX_LIST);
  const byExt = new Map<string, number>();
  for (const f of kept) byExt.set(extname(f) || basename(f), (byExt.get(extname(f) || basename(f)) ?? 0) + 1);
  const languages = [...byExt].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const top = [...new Set(all.map((f) => (f.includes("/") ? f.split("/")[0] + "/" : f)))].sort();
  return { all, kept, big: big.map((d) => ({ dir: d, files: perDir.get(d)! })), images, languages, top };
}

const DEFINITION = /^\s*(export\s+(default\s+)?)?(async\s+)?(def|class|function\*?|fn|func|struct|impl|interface|type|enum)\s+[\w$]+|^\s*(export\s+)?(const|let)\s+[\w$]+\s*=\s*(async\s*)?(\(|[\w$]+\s*=>)/;

export function excerpt(repo: string, path: string, budget: number, numbered = false) {
  const lines = readFileSync(join(repo, path), "utf8").split("\n");
  const out: string[] = [];
  let used = 0;
  for (let i = 0; i < lines.length; i++) {
    const l = numbered ? `${String(i + 1).padStart(4)}| ${lines[i]}` : lines[i];
    if (used + l.length > budget) {
      out.push(`…(truncated: ${lines.length - i} more lines; ${path} has ${lines.length} lines)`);
      // The rest as an outline, so a 500-line file with a big header still shows where its logic is.
      const defs = lines.map((t, j) => [j + 1, t] as const).filter(([j, t]) => j > i && DEFINITION.test(t));
      if (numbered && defs.length) out.push(`Definitions after the cut:`, ...defs.map(([j, t]) => `${String(j).padStart(4)}| ${t.trim().slice(0, 100)}`));
      break;
    }
    out.push(l);
    used += l.length + 1;
  }
  return out.join("\n");
}

export function pickCode(repo: string, kept: string[]) {
  const code = kept.filter((f) => SOURCE.test(f) && !TEST.test(f));
  const entries = code.filter((f) => ENTRY.test(f));
  // Then the biggest product source files, app code (src/, lib/, app/) before tooling and scripts.
  const rank = (f: string) => (TOOLING.test(f) ? 2 : /^(src|lib|app)\//.test(f) ? 0 : 1);
  const rest = code.filter((f) => !ENTRY.test(f)).sort((a, b) => rank(a) - rank(b) || statSync(join(repo, b)).size - statSync(join(repo, a)).size);
  return [...entries, ...rest].slice(0, MAX_CODE_FILES);
}

export function commits(repo: string, n: number): Commit[] {
  const raw = sh("git", ["log", `-${n * 2}`, "--format=%h%x1f%an%x1f%s%x1f%b%x1e"], repo);
  return raw.split("\x1e").map((r) => r.trim()).filter(Boolean).map((r) => {
    const [sha, author, subject, body] = r.split("\x1f");
    const b = (body ?? "").trim();
    return { sha, author, subject, body: b.length > MAX_BODY ? b.slice(0, MAX_BODY).replace(/\s+\S*$/, "") + " …" : b };
  }).filter((c) => !BOT.test(c.author)).slice(0, n);
}

export function todos(repo: string, kept: string[]) {
  try {
    return sh("git", ["grep", "-n", "-I", "-E", "\\b(TODO|FIXME|HACK)\\b", "--", ...kept.filter((f) => SOURCE.test(f))], repo).split("\n").slice(0, MAX_LIST);
  } catch {
    return []; // git grep exits 1 on no match
  }
}

function ghOk() {
  try {
    execFileSync("gh", ["auth", "status", "--active"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}
const api = (path: string) => JSON.parse(sh("gh", ["api", path]));

// About 15 REST calls. Bare `gh auth status` false-fails on multi-account keyrings, hence --active.
export function github(owner: string, repo: string): Github | null {
  if (!ghOk()) return null;
  const r = api(`repos/${owner}/${repo}`);
  const contributors = (api(`repos/${owner}/${repo}/contributors?per_page=10`) as any[]).map((c) => {
    let name: string | null = null;
    try { name = api(`users/${c.login}`).name ?? null; } catch {}
    return { login: c.login, name, contributions: c.contributions };
  });
  const pulls = (api(`repos/${owner}/${repo}/pulls?state=closed&per_page=30`) as any[])
    .filter((p) => p.merged_at && !BOT.test(p.user.login))
    .slice(0, 15)
    .map((p) => ({ number: p.number, title: p.title, author: p.user.login, merged_at: p.merged_at, body: (p.body ?? "").trim().slice(0, 1500) }));
  const issues = (api(`repos/${owner}/${repo}/issues?state=open&per_page=15`) as any[]).filter((i) => !i.pull_request).map((i) => ({ number: i.number, title: i.title }));
  return { description: r.description, license: r.license?.spdx_id ?? null, homepage: r.homepage || null, topics: r.topics ?? [], stars: r.stargazers_count, created_at: r.created_at, pushed_at: r.pushed_at, contributors, pulls, issues };
}

export function ingest(input: string, opts: { out?: string; commits?: number } = {}) {
  const target = parseTarget(input);
  const dir = opts.out ?? outDir("project-demo", target.slug);
  const { repo, sha, branch } = clone(target, dir);
  const inv = inventory(repo);
  const find = (re: RegExp) => inv.kept.filter((f) => re.test(f));
  const readme = inv.kept.find((f) => /^readme(\.md|\.rst|\.txt)?$/i.test(f)) ?? null;
  const code = pickCode(repo, inv.kept);
  const gh = target.owner && target.repo ? github(target.owner, target.repo) : null;
  const log = commits(repo, opts.commits ?? 20);
  const facts = {
    input, url: target.url ?? (target.owner ? `https://github.com/${target.owner}/${target.repo}` : null), local: target.local, owner: target.owner, repo: target.repo,
    sha, branch, ingested_at: new Date().toISOString(), files: inv.all.length, read: inv.kept.length, top: inv.top, skipped_dirs: inv.big, images: inv.images,
    languages: inv.languages, readme, manifests: find(MANIFEST), run: find(RUN), docs: find(DOC), code, tests: find(TEST).slice(0, MAX_LIST), todos: todos(repo, inv.kept), commits: log, github: gh,
  };
  writeFileSync(join(dir, "repo.json"), JSON.stringify(facts, null, 2));
  writeFileSync(join(dir, "source-brief.md"), brief(repo, facts));
  return { dir, facts };
}

export function brief(repo: string, f: ReturnType<typeof ingest>["facts"]) {
  const h = (t: string) => `\n## ${t}\n`;
  const files = (paths: string[], budget: number, numbered: boolean) =>
    paths.map((p) => `\n### ${p}\n\n\`\`\`\n${excerpt(repo, p, budget, numbered)}\n\`\`\``).join("\n") || "\n(none found)";
  const g = f.github;
  const out = [
    `# Source brief: ${f.repo ?? basename(f.local ?? f.input)}`,
    ``,
    `Repo: ${f.url ?? f.local} · sha ${f.sha} · branch ${f.branch} · ingested ${f.ingested_at.slice(0, 10)}`,
    ``,
    `Everything below comes from the repository at that sha${g ? " or the GitHub API" : ""}. Nothing else is known about this project.`,
    `Cite code as \`path:line\` using the line numbers printed here. README text describes claims; only the code sections prove them.`,
    h("Facts"),
    g
      ? `- Description: ${g.description ?? "(none)"}\n- License: ${g.license ?? "none"}\n- Homepage: ${g.homepage ?? "(none)"}\n- Topics: ${g.topics.join(", ") || "(none)"}\n- Stars: ${g.stars} · created ${g.created_at.slice(0, 10)} · last push ${g.pushed_at.slice(0, 10)}`
      : `- GitHub metadata not fetched (${f.owner ? "gh is not signed in: run `gh auth login`" : "no GitHub origin"}). Decisions and roadmap must come from commits, docs or the builder.`,
    `- ${f.files} tracked files, ${f.read} read. Languages by file count: ${f.languages.map(([e, n]) => `${e} ${n}`).join(", ")}`,
    f.skipped_dirs.length ? `- Skipped as data (not read): ${f.skipped_dirs.map((d) => `${d.dir}/ (${d.files} files)`).join(", ")}` : "",
    `- Top level: ${f.top.join(", ")}`,
    h(`README${f.readme ? ` (${f.readme})` : ""}`),
    f.readme ? `\`\`\`\n${excerpt(repo, f.readme, BUDGET.readme, true)}\n\`\`\`` : "(no README)",
    h("Manifests"), files(f.manifests, BUDGET.manifest, true),
    h("Run scripts and CI"), files(f.run, BUDGET.run, true),
    h("Entry points and main source (line-numbered)"), files(f.code, BUDGET.code, true),
    h("Tests"), f.tests.map((t) => `- ${t}`).join("\n") || "(none found)",
    h("TODO and FIXME lines"), f.todos.map((t) => `- ${t}`).join("\n") || "(none)",
    h("Roadmap, changelog and decision docs"), files(f.docs, BUDGET.doc, true),
    h("Images in the repo (listed, not read)"), f.images.map((i) => `- ${i}`).join("\n") || "(none)",
    h(`Commits (last ${f.commits.length}, newest first)`),
    f.commits.map((c) => `- ${c.sha} ${c.author}: ${c.subject}${c.body ? `\n${c.body.split("\n").map((l) => `    ${l}`).join("\n")}` : ""}`).join("\n"),
    h("Merged pull requests (newest first)"),
    g ? g.pulls.map((p) => `- #${p.number} ${p.title} — ${p.author}, merged ${p.merged_at.slice(0, 10)}${p.body ? `\n${p.body.split("\n").map((l) => `    ${l}`).join("\n")}` : ""}`).join("\n") || "(none)" : "(not fetched)",
    h("Open issues"), g ? g.issues.map((i) => `- #${i.number} ${i.title}`).join("\n") || "(none)" : "(not fetched)",
    h("Contributors"), g ? g.contributors.map((c) => `- ${c.name ?? c.login} (${c.login}), ${c.contributions} commits`).join("\n") : "(not fetched)",
  ];
  return out.filter((l) => l !== "").join("\n") + "\n";
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: { out: { type: "string" }, commits: { type: "string" } } });
  if (!positionals[0]) {
    console.error("usage: node ingest.ts <path | https://github.com/<owner>/<repo>> [--out <dir>] [--commits 20]");
    process.exit(2);
  }
  const { dir, facts } = ingest(positionals[0], { out: values.out, commits: values.commits ? Number(values.commits) : undefined });
  console.log(`${facts.url ?? facts.local} @ ${facts.sha.slice(0, 7)}: ${facts.files} files, ${facts.read} read, ${facts.code.length} source files excerpted, ${facts.commits.length} commits${facts.github ? `, ${facts.github.pulls.length} merged PRs, ${facts.github.issues.length} open issues` : ", GitHub metadata not fetched"}`);
  console.log(`${join(dir, "source-brief.md")}\n${join(dir, "repo.json")}`);
}
