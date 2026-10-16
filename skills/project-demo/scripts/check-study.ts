// Case-study gate: five sections in order, every feature cites a code line that exists in the clone,
// every decision and roadmap item names its source, every number has a citation or source on its line.
// Usage: node check-study.ts <case-study.md> --repo <clone dir>
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { parseFrontMatter } from "../../../lib/brand.ts";

export const SECTIONS = ["The problem", "What was built", "Key decisions and trade-offs", "What's next", "How to run it"];
const CITE = /`((?:[\w@.-]+\/)*(?:[\w@.-]+\.[A-Za-z0-9]+|Makefile|Dockerfile|Procfile)):(\d+)(?:-(\d+))?`/g;
const TAG = /\((?:PR #\d+[^)]*|issue #\d+[^)]*|commit [^)]+|from the builder|not stated in the repo)\)/;
const DOCFILE = /\.(md|mdx|rst|txt)$/i;
const NUMBER = /\d/;
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export function sections(body: string) {
  const out: { title: string; lines: string[] }[] = [];
  let fence = false;
  for (const line of body.split("\n")) {
    if (/^```/.test(line)) fence = !fence;
    const h = !fence && line.match(/^## (.+)/);
    if (h) out.push({ title: h[1].trim(), lines: [] });
    else out.at(-1)?.lines.push(line);
  }
  return out;
}

// Lines outside fenced code blocks, with their bullet-ness.
function prose(lines: string[]) {
  const out: { line: string; bullet: boolean }[] = [];
  let fence = false;
  for (const line of lines) {
    if (/^```/.test(line)) { fence = !fence; continue; }
    if (!fence && line.trim()) out.push({ line, bullet: /^\s*[-*]\s+/.test(line) });
  }
  return out;
}

export function check(text: string, repo: string) {
  const errors: string[] = [];
  const { data, body } = parseFrontMatter(text);
  if (!data.title) errors.push("front matter needs a title");
  const secs = sections(body);
  const titles = secs.map((s) => norm(s.title));
  SECTIONS.forEach((want, i) => {
    if (titles[i] !== norm(want)) errors.push(`section ${i + 1} must be "## ${want}"${titles[i] ? `, found "## ${secs[i].title}"` : ", missing"}`);
  });
  if (secs.length > SECTIONS.length) errors.push(`only the ${SECTIONS.length} sections are allowed; remove "## ${secs[SECTIONS.length].title}"`);

  let cites = 0;
  const resolves = (path: string, from: number, to: number, where: string) => {
    const file = join(repo, path);
    if (!existsSync(file) || !resolve(file).startsWith(resolve(repo))) return errors.push(`${where}: \`${path}\` is not in the repo`);
    const n = readFileSync(file, "utf8").replace(/\n$/, "").split("\n").length;
    if (from < 1 || from > n || to < from || to > n) return errors.push(`${where}: \`${path}:${from}${to !== from ? `-${to}` : ""}\` is outside the file (${n} lines)`);
    cites++;
  };

  secs.forEach((sec, i) => {
    const kind = norm(SECTIONS[i] ?? "");
    let anyCode = false;
    for (const { line, bullet } of prose(sec.lines)) {
      const where = `${sec.title}: "${line.trim().slice(0, 60)}"`;
      const found = [...line.matchAll(CITE)];
      for (const m of found) resolves(m[1], Number(m[2]), Number(m[3] ?? m[2]), where);
      const code = found.filter((m) => !DOCFILE.test(m[1]));
      if (code.length) anyCode = true;
      const tagged = TAG.test(line);
      if (bullet && kind === "what was built" && !code.length) errors.push(`${where}: every feature needs a \`path:line\` citation to code, not docs`);
      if (bullet && (kind === "key decisions and trade offs" || kind === "what s next") && !tagged && !found.length)
        errors.push(`${where}: needs a source: (PR #N, name), (commit <sha>, name), (issue #N), a \`path:line\`, (from the builder) or (not stated in the repo)`);
      const bare = line.replace(CITE, "").replace(TAG, "").replace(/`[^`]*`/g, "").replace(/^\s*\d+\.\s/, "");
      if (NUMBER.test(bare) && !found.length && !tagged) errors.push(`${where}: a number without a citation or source on its line`);
    }
    if (kind === "how to run it" && !anyCode) errors.push(`How to run it: cite the script, manifest or CI file the steps come from (\`path:line\`)`);
  });
  return { errors, cites };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: { repo: { type: "string" } } });
  if (!positionals[0] || !values.repo) {
    console.error("usage: node check-study.ts <case-study.md> --repo <clone dir>");
    process.exit(2);
  }
  const { errors, cites } = check(readFileSync(positionals[0], "utf8"), values.repo);
  if (errors.length) {
    console.error(errors.map((e) => `- ${e}`).join("\n"));
    process.exit(1);
  }
  console.log(`ok: ${SECTIONS.length} sections, ${cites} citations resolve in ${values.repo}`);
}
