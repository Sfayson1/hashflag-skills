# #9 [Task]: Add fictional sample content for testing every skill: context

Written for the newcomer who picks up #9, and for the owner and later agents. Each fact carries its source in parentheses. "Inference:" marks my own reasoning, "Recommendation:" marks advice, and "Tested:" marks a command I ran on 2026-09-29 on macOS 26.7 with `file-5.41`, BSD grep 2.6.0-FreeBSD (`/usr/bin/grep`) and Node 20.19.4.

**The job in one paragraph.** You write six Markdown files, a README and a CC0 LICENSE describing two made-up organizations: a nonprofit and a small business. The skills in #2, #3, #5, #6, #7 and #8 use these files as test input. Three of the files hide a deliberate "trap" that a correct skill must catch, and the owner may ask for three more in the blog post (decision 12). The task needs no code, no API keys and no images (#9 body).

**The owner has to settle three things before assigning #9:**
- **Decision 1.** Push an initial commit to `main`. No PR can land until that exists.
- **Decision 6, blocking both brand.md files.** Pick the brand.md format. [issue-1.md](issue-1.md), [issue-2.md](issue-2.md) and [issue-3.md](issue-3.md) propose three different shapes, and a fourth (headings only, no YAML) was also considered.
- **Decision 12, blocking blog-post.md and the README trap table.** Decide whether the blog post carries #8's three traps.

Decision 13 (who owns #4's fixture) doesn't block #9, but the owner should record it on #1 so [issue-1.md](issue-1.md), [issue-4.md](issue-4.md) and this document agree.

## What exists today

**The target repo**
- Vets-Who-Code/hashflag-skills is private and empty:
  - `/commits` returns HTTP 409 "Git Repository is empty".
  - GraphQL gives `isEmpty: true` and `defaultBranchRef: null`, and `license` is null.
  - The default-branch setting still says `main`.
  (gh api and GraphQL, re-checked 2026-09-29.)
- Tested: `git ls-remote https://github.com/Vets-Who-Code/hashflag-skills.git` prints nothing and exits 0.
- With no commits, the repo has no `fixtures/` folder, README, CI, CODEOWNERS, issue or PR templates, or commitlint (same calls).
- #9 isn't linked to epic #1: `issue(9).parent` is null, and #1's sub-issues are #2–#8. #9 has no assignee (GraphQL, 2026-09-29).
- Forking is allowed (`allow_forking: true`), and the org sets `members_can_fork_private_repositories: true` (gh api, 2026-09-29). Only people who can already read a private repo can fork it (general GitHub knowledge).
- Title: "[Task]: Add fictional sample content for testing every skill". Labels: `documentation` and `good first issue`. Created 2026-09-29T14:25:33Z, no comments (gh issue view 9).

**What each fixture feeds**

| File | Used by | What the skill does with it | What the skill must not do |
|---|---|---|---|
| `nonprofit/brand.md`, `small-business/brand.md` | #3: the brand pack, with one script rendered in both brands (#9 tip). #2 reads the same file for image style and TTS settings ([issue-2.md](issue-2.md), decision 3). Inference: #5, #6, #7 and #8 read CTA and copy rules from it | Builds a brand pack: colors, fonts, voice, copy gate | Invent colors or fonts; use licensed fonts |
| `nonprofit/blog-post.md` | #2 and #8 (#9 AC) | Hero image, alt text and audio overview. #8 adds a LinkedIn post and a newsletter blurb (#8 AC) | Add facts that aren't in the post. #8 also asks for three traps of its own here (decision 12) |
| `nonprofit/impact-report.md` | #5 | 60–90 s video, audio, 3–5 social images | Repeat the unsourced number as fact |
| `nonprofit/donor-notes.md` | #6 | Markdown and HTML email, audio, one image per story | Fill in details for the thin story |
| `small-business/service-page.md` | #7 | 45–90 s explainer video and audio | Invent prices or guarantees |

(#9 AC; #2, #3, #5, #6, #7 and #8 AC.) #9 has no file for #4 (#9 lists "#2, #3, #5, #6, #7 and #8"), and who ships #4's fictional repo is still open (decision 13).

**What the other dossiers expect from these files** (the sibling documents in docs/context/, 2026-09-29; decision numbers refer to those documents)
- **#1** ([issue-1.md](issue-1.md)), decision 5: brand.md in #9's field set, plus a machine-readable `brand.json` and a `frame.md` generated once. Decision 16: "add a small fictional repo fixture for #4", with no owner named.
- **#2** ([issue-2.md](issue-2.md)), decision 3: one brand.md with YAML front matter. #2 reads `image.style`, `image.palette`, `image.size`/`aspectRatio` and `voice.tts.{provider, model, voice, style}` from it. Build step 4 tests the loader on "a fictional post with `date` in place of `postedAt`".
- **#3** ([issue-3.md](issue-3.md)), decisions 1, 2, 5 and 9:
  - `brand/brand.md` has YAML front matter with #9's fields plus video extensions.
  - `voice` is keyed by TTS provider, and a separate `tone` field holds the writing voice.
  - #3's own example ships an SVG wordmark, which does not go in `fixtures/`.
- **#4** ([issue-4.md](issue-4.md)), decision 4: #4 ships `fixtures/project/`, "a tiny fictional repo" under #9's rules. Decision 14: #4 keeps `date` and maps it to `postedAt` for VWC.
- **#5** ([issue-5.md](issue-5.md)): "at least 6 figures with exactly one unsourced". Its parser handles spelled-out numbers such as "twenty-eight percent" (build steps 1 and 3).
- **#7** ([issue-7.md](issue-7.md)): its eval runs `grep -iE '\$|free|guarantee'` on outputs and fails on anything the source doesn't contain (build step 9).
- **#8** ([issue-8.md](issue-8.md)), decision 14: plant "one hypothetical example number, one unsourced general stat and one past deadline in `nonprofit/blog-post.md`". Keep `date`, and have #2's reader accept `date` or `postedAt`.

**Examples to read (don't copy them)**
- **VWC post front matter.** `vets-who-code-app/src/data/blogs/high-success-low-adoption.md:1-18` has title, postedAt, author, description, image{src,alt}, category, tags and is_featured, all quoted. #9 asks for a smaller set: `title, date, author, description, tags` (#9 AC).
- **Front-matter keys.** All 39 VWC posts use `postedAt`, and none uses `date` (Tested: `grep -L '^postedAt:'` and `grep -l '^date:'` over `src/data/blogs/*.md` both return 0 files). VWC calls `blogData.tags.map`, so tags must be a YAML list, not a comma string (`src/lib/blog.ts:72`).
- **Length.** VWC's 39 posts have a median of 772 body words and a mean of 844 (research word count, 2026-09-29), so "about 800" is realistic.
- **Traceable numbers.** `src/data/outcomes.ts` gives each stat a value, display, qualifier, source and asOf (:21-33). `__tests__/data/outcomes.test.ts:83-152` scans pages for stray copies of those numbers, using a number regex plus a keyword window of ±40 characters (`near()`, :111-112). Inference: a #5 checker will probably work the same way.
- **Enforceable copy rules.** `~/.claude/skills/vwc-faceless-explainer/scripts/check-copy.mjs:20-37` stores each rule as `[pattern, what to use instead]`, for example `get started` → "Apply" and `support us` → "Donate".
- **A finished brand pack.** `~/.claude/skills/vwc-faceless-explainer/brand/frame.md` has YAML front matter with a `colors:` map of 18 named keys, every hex in double quotes (:13-31), and typography roles (research). #3 builds a pack like this from a brand.md. It exists only on the owner's machine, next to commercial font files in `brand/fonts/`, so copy nothing from that folder (research, skill inventory; #3 AC).
- **Fictional-fixture prior art.** brag's `examples/` holds "fake product sites used as a benchmark suite" (`~/.claude/plugins/cache/brag/brag/0.2.2/README.md:90`). Their rule: "The product is real until proven otherwise" (`examples/bicycles-for-snakes/PRODUCT.md:26`). Write yours as seriously, but realistic rather than absurd (#9: "realistic, fictional").
- **Open-font files.** `~/.claude/skills/hyperframes-creative/frame-presets/code-editorial/fonts/` has OFL woff2 files plus license texts for Inter, EB Garamond and JetBrains Mono (ls, 2026-09-29). You only name fonts; you don't ship these.

## How it works now

#9 has no pipeline of its own: it's a writing task. What matters is how the skills will parse your files. None of them exist yet, so the steps below describe how the VWC code they will port parses content today.

1. **Blog post, image half (#2).**
   - The title comes from the first line matching `/^title:\s*["']?(.+?)["']?\s*$/m` (`scripts/generate-blog-image.ts:26`).
   - The front matter is stripped with `/^---[\s\S]*?---\n?/` (:28), and the whole body goes to `gemini-3.1-pro-preview` (research).
   - Tested: a folded title (`title: >`) comes out as ">".
   - Tested: a file that starts with a UTF-8 BOM keeps its front matter, because `^---` doesn't match. The YAML block then goes into the prompt.
2. **Blog post, audio half (#2).**
   - The body is matched with `/---\n[\s\S]*?\n---\n([\s\S]*)/` (`scripts/generate-single-blog-audio.ts:186`). Tested: a CRLF file returns null.
   - Text is split into 1,700-word chunks (:303), so an 800-word post is one TTS call (inference).
   - The cleaner removes images, `#` headings, `**`, `*`, link syntax, HTML tags and `-`/`*`/`+` list markers (:327-337). It leaves code fences, tables, blockquotes, numbered-list markers and HTML entities.
3. **Front-matter types.**
   - VWC parses front matter with gray-matter 4.0.3 (`package.json:73`). An unquoted date becomes a Date object, and a quoted one stays a string (`src/lib/blog.ts:137-145`).
   - Tested with the js-yaml 4.3.2 CLI: `date: 2025-03-01` prints as `"2025-03-01T00:00:00.000Z"`, and `date: "2025-03-01"` prints as `"2025-03-01"`.
   - Tested: `ink: #1F2A2E` parses as `ink: null`, because a space followed by `#` starts a YAML comment. `ink: "#1F2A2E"` parses correctly. gray-matter gives the same result.
   - Tested: gray-matter strips a BOM (it requires `strip-bom-string`, `node_modules/gray-matter/lib/utils.js:3`) and parses CRLF front matter. So the gray-matter loader #2 plans ([issue-2.md](issue-2.md), build step 4) tolerates what VWC's regexes don't. The quoting rules still apply.
4. **Brand colors (#3).** `semanticColors()` assigns roles like this (`~/.claude/skills/faceless-explainer/scripts/lib/tokens.mjs:142-167`):
   - **ink** is the first key matching whole-segment `ink`, or `black`, `charcoal`, `text`, `outline` or `noir` (:149-152).
   - **canvas** is the first key matching `cream`, `paper`, `canvas`, `white`, `bg`, `ground`, `surface`, `base`, `sand`, `parchment`, `off-white` or `bone` (:153-156).
   - **accents** are the remaining colors, minus any key whose name contains a status segment (`success`, `error`, `warning`, `danger`, `info`, `good`, `bad`, `up`, `down`, `neutral`, `alert`, …) (:57). They are **sorted by chroma** (:165), so the most saturated color becomes the first accent whatever its key is called.
   - If no key name matches, ink falls back to the darkest color and canvas to the lightest (:149-156).
5. **Brand fonts (#3).**
   - **Bundled.** 18 families are pre-bundled "as local data URIs with no network fetch" (`~/.claude/skills/hyperframes-creative/references/typography.md:19`). They are the canonical entries of `FONT_ALIAS_MAP` in hyperframes 0.8.91 (npm tarball, `dist/chunk-HBBJFK6I.js:33-52`).
   - **Other Google fonts** are fetched at build time. They trip a `font_family_without_font_face` lint warning, and in "distributed/cloud renders" they fail closed: the render errors if Google is unreachable (typography.md:3).
   - **Locally installed fonts** are captured only in local renders. "Distributed/cloud (Lambda) renders disable system-font capture" (:3). That caveat covers installed fonts, not the bundled 18.
   - **Aliases.** Helvetica and Arial map to Inter, Futura to Montserrat, and Garamond to EB Garamond (:44). 0.8.91 also maps Avenir, Optima, Verdana and Calibri to Inter; Georgia, Times, Palatino and Cambria to EB Garamond; and Menlo and Consolas to JetBrains Mono (`chunk-HBBJFK6I.js:53-109`).
   - **Taste rules** (not render limits). 9 of the 18 are on HyperFrames' "monoculture" list and "render fine but read as generic" (:46, :52). Its guardrail: "Don't pair two sans-serifs" (:60).
   - **Version caveat.** The local typography.md is dated 2026-09-20 (ls). Inference: a later release could change the list.
6. **Contrast (#3).** `hyperframes check` audits WCAG contrast (`~/.claude/skills/hyperframes-cli/SKILL.md:54`). The thresholds are "4.5:1 for normal text, 3:1 for large text (24px+, or 19px+ bold)" (`hyperframes-cli/references/lint-validate-inspect.md:72`). VWC's frame.md sets 4.5:1 as the floor (`frame.md:190-201`).
7. **#5, #6, #7 and #8.** Not built yet. Their only contract with your files is their issue AC and the sibling dossiers above.

**Format rules that follow from 1–6** (inference):
- UTF-8 **without a BOM**, and LF line endings.
- `---` YAML front matter:
  - one-line, double-quoted strings;
  - a quoted `"YYYY-MM-DD"` date;
  - every hex color quoted;
  - `tags` as a YAML list.
- Plain Markdown: headings, paragraphs, bullet lists, links.
- No tables, code blocks or raw HTML, unless the owner wants parser tests (decision 14).
- In impact-report.md, write every count, amount and percentage in digits, so the step 5 grep and reviewers see them all. #5 handles words too, but that's #5's test, not yours.

## Lessons already paid for

1. **Numbers without sources drift.** VWC's outcome numbers were hard-coded on at least nine surfaces with conflicting values (97% vs 90%, 300+ vs "over 500"). An unsourced 4.9/5.0 rating and the 40%/80% donate tiles were removed because nobody could source them (PR #1418, via research). That's where #5's rule comes from (#5 implementation notes).
2. **An unplanned trap is as bad as a missing one.** Real VWC posts contain numbers that look like facts:
   - hypothetical resume examples: "$40M in equipment at 98% operational readiness" (`src/data/blogs/labor-day-sprint-10-days-to-proof-of-work.md:67`) and "reduced route incidents by 22% over 90 days" (:74);
   - a named but unlinked industry stat: "around 28% more, according to Lightcast data" (:31).
   Inference: if your blog post or donor notes contain a number that isn't a listed trap and isn't sourced in the report, the skills get tested against a trap nobody wrote down. These are the same three categories #8 wants planted on purpose (decision 12).
3. **Marketing templates model invented claims.** product-launch-video's script bank includes "Twelve thousand teams. 4.9 stars. 99.98% uptime." (`~/.claude/skills/product-launch-video/references/story-design.md:349`) and "Try it free. No credit card. relay.app." (:385). The copywriting skill cites conversion stats with no source (`copywriting/references/copy-frameworks.md:422-431`, via research). Don't borrow their phrasing: "Try it free" in service-page.md would break the no-prices trap.
4. **Dates go stale.** labor-day-sprint, posted 2026-08-22 (:3), says "be legible by September 8th" (:117), and that date has passed. Set the report year and the donor-notes month in the past. Avoid "by &lt;date&gt;" deadlines, except the one planted for #8 if decision 12 says yes.
5. **Test files in a live content folder become real pages.** `getSlugs` returns every entry in `src/data/blogs` (`src/lib/util.ts:18-20`). An `audio/` subdirectory there broke the Vercel build (commit d7157a61, message: "Vercel failed collecting page data for /blogs/[slug]"). VWC's image tests still write `src/data/blogs/test-post.md` (`__tests__/scripts/generate-blog-image.test.ts:9-20`).
   - Inference: skill tests should read fixtures by exact path and write output elsewhere.
   - `nonprofit/` holds four `.md` files, but only `blog-post.md` is a post. The README should say so.
6. **Regex parsers break on unusual front matter.** Folded titles, CRLF endings and a leading BOM each break a VWC regex (How it works 1–2, tested).
7. **Licensed fonts leak easily.** The public, AGPL-licensed vets-who-code-app repo tracks 128 files under `public/fonts`, including 30 in `gilroy/`, 56 in `gotham/` and 10 in `fontAwesomePro/` (Tested: `git ls-files public/fonts` at b7c19088). The local VWC skill holds byte-identical copies in `brand/fonts/` (sha1 match, research). URL capture also downloads a site's web fonts (`videos/vets-who-code-reel/capture/extracted/asset-descriptions.md`, via research). Don't copy, link or name any of these.
8. **Binaries slip into commits.** VWC's render folders had to be added to `.gitignore` (`.gitignore:105-106`, #1390), and `videos/` is ignored only locally (`.git/info/exclude:19-21`). Stage files by explicit path.
9. **Color key names change the video, but only partly.** Key names decide ink and canvas. Accent order is decided by chroma, not by name (tokens.mjs:149-156, 165). Recommendation:
   - use `ink` and `canvas` for the text and background colors;
   - use `accent` and `accent-2` for the rest, and make `accent` the more saturated one, so the names match what renders;
   - don't use status words in key names (:57).
10. **On-brand colors can fail contrast.** VWC's cream-hint on navy measures 3.84:1, and slate on cream 4.0:1. Both fail 4.5:1 (`frame.md:190-201`).
11. **Adjectives don't define a brand.** The auto-generated frame spec couldn't express VWC's brand ("the navy never landed, and it had no two-font split"), so VWC's frame.md is hand-written (#3 body). Give exact hex values and exact family names and weights.
12. **"Voice" means two things, and the key name collides.** #9 means writing tone ("3–5 adjectives plus 2 example sentences"). #2 means a TTS speaker ("voice `Kore`") (#2 and #9 bodies). The draft schemas already use `voice` for TTS: #2 as `voice.tts.*` and #3 as `voice` keyed by provider, with the writing voice under `tone` ([issue-2.md](issue-2.md), decision 3; [issue-3.md](issue-3.md), decision 5). Recommendation: store the AC's "voice" under `tone` (decision 6).
13. **YAML silently drops unquoted hex colors.** `ink: #1F2A2E` parses as null, with no error (Tested, How it works 3). VWC's own frame.md quotes every hex (`frame.md:13-31`).
14. **Don't trust an AI summary of a web page.** An LLM page summarizer misreported caniemail's support data (research, 2026-09-29). Read name-search results yourself. Inference: AI drafting tools tend to suggest names that already exist.

## Dependencies

- **Issues:**
  - The #9 body says it "doesn't depend on any other open issue".
  - In practice, owner decisions 1, 6 and 12 gate it (inference).
  - Downstream, #2, #3, #5, #6, #7 and #8 all use it as test input (#9 body). [issue-5.md](issue-5.md), [issue-6.md](issue-6.md) and [issue-7.md](issue-7.md) list it as a precondition.
  - #4's relationship is open (decision 13).
- **Blocker:** the repo has no branch, and a PR needs a base branch (repo state above; inference from how GitHub PRs work).
- **Access:** the repo is private, so the newcomer needs org membership or collaborator access (general GitHub knowledge).
- **Schema (blocking brand.md):** decision 6. #1, #2 and #3 assume different brand.md shapes ([issue-1.md](issue-1.md), [issue-2.md](issue-2.md), [issue-3.md](issue-3.md)).
- **Tools, required:**
  - git and a GitHub account with access;
  - a text editor that saves UTF-8 without a BOM and with LF endings.
  - Own knowledge, not tested: on Windows, `git config core.autocrlf input` stops Git from writing CRLF.
- **Tools for the self-checks** (optional but recommended):
  - **POSIX shell tools:** `grep`, `awk`, `wc`, `head`, `find` and `file`. All are in `/usr/bin` on macOS (verified here). The commands use only POSIX ERE and the flags `-r -n -o -i -w -l -v -E`, which GNU grep also supports (own knowledge; Linux not tested).
  - **`curl`** for the font and CC0 checks (`/usr/bin/curl` on macOS).
  - **`dig`** for the domain check. It's `/usr/bin/dig` on macOS. On Debian/Ubuntu it comes from the dnsutils package (own knowledge).
  - **Node with `npx`**, for the YAML parse only. Tested with js-yaml 4.3.2's own CLI, which reads stdin (`node_modules/js-yaml/bin/js-yaml.js:53-61`), under Node 20.19.4. `npx --yes js-yaml` downloads it from npm on first use, so it needs network. I did not run the npx wrapper itself.
  - **`gh`** (optional): only for `gh search` name checks and the repo check. It isn't preinstalled (installed via Homebrew here) and needs `gh auth login`. The GitHub web UI replaces every `gh` step, and the font check uses `curl` instead.
  - **Not researched:** whether `file` and `dig` exist under Windows Git Bash or WSL.
- **Keys, accounts, system requirements:** none.

## Cost

- **Building #9: $0.** No API calls (#9: "It needs no code").
- **Running the fixtures later.** For the owner and skill builders; this is a sum of estimates:

  | Item | Math | Cost | Source |
  |---|---|---|---|
  | #2 audio, 800-word post | 800 ÷ 187 wpm = 4.28 min = 257 s; × 25 audio tokens/s = 6,417 tokens | | 187 wpm from PR #1266's audit (via research) |
  | …on `gemini-2.5-flash-preview-tts` | 6,417 × $10.00/1M | **$0.064** | pricing page, via research |
  | …on `gemini-3.8-flash-tts` ([issue-2.md](issue-2.md) decision 4 default) | 6,417 × $9.00/1M | **$0.058** to 2026-12-31, then $0.115 | pricing page, via research |
  | …on 3.8 Flash-Lite TTS | 6,417 × $6.00/1M | **$0.039** | pricing page, via research |
  | #2 image | $0.134 per 1K/2K image from `gemini-3-pro-image`, plus the `gemini-3.1-pro-preview` analysis and text check | **≥$0.145** for 1 attempt, **≥$0.421** for 3, before thinking tokens | research |
  | One #2 run | the two lines above added (2.5 TTS) | **about $0.21–$0.50 minimum** | inference |
  | Narration for #3, #5, #7 (HeyGen Enterprise Starfish) | 0.000333 credits/s × $0.50/credit × 90 s | **about $0.015** | inference from arithmetic |
  | Narration, local Kokoro | | **$0** | research |

  - Every TTS model is free on the free tier (research). Neither image model has a free tier (pricing page).
  - At VWC's measured 157–203 wpm, the 2.5 audio line is $0.059–$0.076. Text input adds about $0.0005 (inference).
  - HeyGen's self-serve TTS rate is login-gated and unverified (research).
  - **Not researched:** the whole-skill run cost for #5, #6, #7 and #8.
- **Privacy upside:** free-tier Gemini traffic is marked "Used to improve our products: Yes" (pricing page, via research). Fully fictional fixtures are safe to send there. Real donor notes would not be.

## Acceptance criteria, mapped

| #9 criterion | Exists today | Missing | Risk |
|---|---|---|---|
| Folder layout: README, LICENSE, nonprofit/ ×4, small-business/ ×2 | Nothing; the repo is empty | All 8 files | No base branch (decision 1). Inference: skill tests will hard-code these paths, so rename nothing |
| brand.md: name, one-sentence mission, 3–5 hex colors, heading and body font, voice (3–5 adjectives + 2 sentences), 3–5 copy rules | frame.md shows the full pack #3 builds | Both files | **Schema undecided and in conflict across #1, #2 and #3 (decision 6, blocking).** Unquoted hex parses as null. Key names pick ink and canvas, and chroma picks the accent. Contrast. Font licensing |
| blog-post.md: ~800 words; front matter title, date, author, description, tags | VWC post shape; 772-word median | The file | `date` isn't VWC's `postedAt` (decision 4). An unquoted date parses as a Date object. Tags must be a list. No `image` key, so #2 has to generate the hero image and alt text, which is intended. #8's traps are pending (decision 12) |
| impact-report.md: ≥6 numbers, each naming an internal source | outcomes.ts pattern | The file | The AC contradicts itself: "each number names its source", yet "exactly one" has none (decision 3). "A number" isn't defined for years and dates |
| donor-notes.md: one month, 3–5 stories, messy, plus links | None | The file | Photos can't ship (no binaries), so reference them by filename (decision 9). A typo inside a fact makes that fact ambiguous |
| service-page.md: services, hours, FAQ ≥5 | None | The file | Hours contain numbers, which is fine. Phone numbers must be fictional. "Free", "feel free" and "affordable" muddy #7's `free` check |
| Trap: exactly one unsourced number in impact-report | None | The trap | A second, accidental unsourced number. The blog post repeating the trap number |
| Trap: no prices anywhere, one "call for a quote" answer | None | The trap | `$`, "free estimates", "starting at", guarantee language |
| Trap: one donor story with no link, no photo, thin detail | None | The trap | A thin story that reads like a truncated file or a TODO |
| README: says "fictional" at the top, maps files to issues, lists every trap | None | The file | The trap table must match the files exactly: 3 rows, or 6 if decision 12 says yes. Reviewers will compare them |
| Hard rules: fictional; example.org/.com links; original writing; CC0; OFL fonts; no binaries | None | Compliance checks (build plan step 11) | Real-name collisions; copied text; real names suggested by AI tools |

### Trap design: good vs bad

A good trap is:
- **realistic:** same tone as the rest of the file;
- **unambiguous:** any two reviewers agree it's the trap;
- **single:** the README table lists every trap in the folder;
- **checkable:** you can state the correct skill behavior in one line.

These criteria are my recommendation.

**Impact report (for #5)**
- **Good sourced line:** "We served 1,240 households this year, according to our intake log."
- **Good trap:** "Families told us they now skip 3 fewer meals a week."
  - It's confident, uses the same tone, and sits in a paragraph full of sourced numbers.
  - No source appears anywhere in its sentence or paragraph.
  - Expected behavior: #5 flags it and keeps it out of the video, audio and images as fact (#5 AC).
- **Bad:** "about a zillion volunteers". It's obviously fake and tests nothing.
- **Bad:** "(unsourced) 40% of families…". The label hands the skill the answer.
- **Bad:** a percentage derived from two sourced numbers ("62% were new households"). Reviewers will argue over whether it counts as sourced. If you need one, show the math and the source: "762 of 1,240 households, from our intake log".
- **Bad:** a vague source such as "we estimate" or "roughly". Nobody can say whether that counts as a source.
- **Bad:** the trap in a footnote or table. That tests the parser, not the rule.
- **Recommendation:** in the README, define "a number" as a count, amount, percentage or dollar figure about the organization's work. Years, dates and times don't count.

**Service page (for #7)**
- **Good:** FAQ "How much does a full tune-up cost?" answered with "It depends on the bike. Call for a quote." The question invites a price, and the page never gives one.
- **Bad:** "Tune-ups from $…" anywhere, including hours or footnotes.
- **Bad:** "free estimates", "try it free", "affordable", "best prices in town", "starting at". These are price claims by another name.
- **Bad:** "feel free to call". Inference: it puts "free" in the source, which weakens #7's `free` check ([issue-7.md](issue-7.md), build step 9).
- **Bad:** "satisfaction guaranteed" or "lifetime warranty". #7 must not invent guarantees either (#7 AC). Inference: if the page makes one, nobody can tell whether a guarantee in the output was copied or invented. Leave guarantees out.

**Donor notes (for #6)**
- **Good thin story:** `- tues pantry: older guy said thx for the apples. thats all i got`.
  - It has no link, no photo, no number and no name.
  - Expected behavior: #6 keeps it thin or asks. It adds no name, age, quote or place.
  - Any image is abstract, not a picture of "him" (#6 AC). Research warns that generated images can invent visual facts.
- **Bad:** a story that stops mid-sentence (`- mrs k came by and`). It looks like a broken file.
- **Bad:** `TODO: ask Dana about the thing`. That isn't a story, and a skill can reasonably skip it.
- **Bad:** a thin story with a photo. The AC requires no link **and** no photo.
- **Bad:** mess inside the facts, such as "1,2400 lbs", a name spelled two ways, or a broken link. Then "only provided facts" has no clear answer.
- **Recommendation:** put the mess in the prose (fragments, lowercase, abbreviations) and keep numbers, names and links clean. Give the other stories 3–6 lines each, with an example.org link and a photo filename.

**Blog post (for #8; only if decision 12 says yes)**
- **Hypothetical example number.**
  - Good: "Picture a family of four with $40 left for groceries after rent." "Picture" marks it as a scenario. Expected: #8 leaves it out of the LinkedIn post and newsletter, or keeps it framed as hypothetical, and lists it as a flag ([issue-8.md](issue-8.md), decision 8).
  - Bad: a hypothetical figure that also appears in the impact report, where it becomes a sourced fact.
- **Unsourced general stat.**
  - Good: "Across the region, 31% of families skip a meal in a typical month." It's a claim about the world, not the org, with no source. Invent it; don't look up a real statistic. Expected: #8 leaves it out and flags it ([issue-8.md](issue-8.md), decision 8).
  - Bad: "according to the county health survey". That's an unlinked *named* source, a different category in #8's policy, and it makes the trap ambiguous.
  - It must not appear in impact-report.md. There it would be a second unsourced number and break #5's "exactly one".
- **Past deadline.**
  - Good: post `date: "2025-02-24"` and the line "Sign up for the spring sort by March 10." Expected: #8 warns in its review step ([issue-8.md](issue-8.md), decision 11).
  - Bad: "by next Friday". It can't be checked.
  - Inference: #8's 90-day age warning will fire on the fixture anyway once it's old, so the explicit deadline is what tests the deadline path.
- List all three as README rows 4–6: file `blog-post.md`, skill #8.

### CC0 1.0

- Get the text with `curl -s https://creativecommons.org/publicdomain/zero/1.0/legalcode.txt > fixtures/LICENSE`, and don't edit it.
  - Tested: it's 121 lines of us-ascii with LF endings and no URLs.
  - Line 1 is "Creative Commons Legal Code", line 2 is blank, and line 3 is "CC0 1.0 Universal".
- CC0 gives away rights you hold, so it only works for writing that is yours. No copying or light rewording of real reports or pages (#9 hard rules).
- CC0 §4(a): "No trademark or patent rights held by Affirmer are waived…" (legalcode.txt:104). Inference: one more reason never to use a real organization's name.
- The repo-wide license isn't decided yet. The repo's `license` is null, and [issue-1.md](issue-1.md) (decision 1) proposes AGPL-3.0 for code and CC0 for `fixtures/`. Recommendation: one line in the README saying `fixtures/LICENSE` covers `fixtures/` only.

### Open-licensed fonts

- Name fonts in brand.md, and ship no font files (#9: no binary files).
- **Recommendation:** pick both families from the 18 bundled ones. They are embedded data URIs, so no render (local or cloud) needs a network fetch (typography.md:19, :3). They are:
  - sans: Inter, Roboto, Open Sans, Lato, Nunito, Montserrat, Poppins, Outfit, Oswald
  - display: League Gothic (400 only), Archivo Black (400 only)
  - serif: Playfair Display, EB Garamond
  - mono: Space Mono, IBM Plex Mono, JetBrains Mono, Source Code Pro
  - CJK: Noto Sans JP
  (typography.md:21-42.) Request only the weights the table lists.
- **Licenses.** All 18 have `ofl/<family>/OFL.txt` in google/fonts (Tested: `curl` returned 200 for each; `gilroy` and `georgia` returned 404). That confirms the license, not render behavior.
- **HyperFrames' taste rules** (they don't affect rendering):
  - Inter, Roboto, Open Sans, Lato, Nunito, Poppins, Outfit, Playfair Display and EB Garamond "render fine but read as generic" (:46).
  - The other 9 are Montserrat, Oswald, League Gothic, Archivo Black, Space Mono, IBM Plex Mono, JetBrains Mono, Source Code Pro and Noto Sans JP (:46).
  - "Don't pair two sans-serifs": use serif + sans, or sans + mono (:60).
  - Inference from the table: the non-generic 9 contain no serif, and Montserrat is their only body-weight sans. League Gothic and Archivo Black are 400-only display faces (:42).
- **Recommendation:** make the brands visibly different (#9 tip).
  - One brand can pair a display sans with a mono from the non-generic 9, for example a bike shop with Oswald and IBM Plex Mono.
  - The other can take Playfair Display or EB Garamond as a serif heading. That accepts "generic" in exchange for no cloud-render fetch.
  - A non-bundled OFL serif from Google Fonts also works, but it carries the lint warning and can fail closed in cloud renders (:3).
- The OFL allows fonts to be "bundled, embedded, redistributed and/or sold with any software" but forbids selling the font "by itself" (openfontlicense.org official text, fetched 2026-09-29).
- **Names to avoid.** Never use Gilroy, Gotham or Gotham Pro (#9). Don't write system names the renderer silently remaps, such as Helvetica, Arial, Futura, Garamond, Avenir, Verdana, Georgia, Times or Menlo (typography.md:44; `chunk-HBBJFK6I.js:53-109`). The brand you describe would not be the brand that renders. The step 9 `curl` check rejects them anyway.

## Open decisions for the owner

1. **Bootstrap `main` before assigning #9.** Default: the owner pushes one initial commit with a README stub and a `.gitignore` covering `brag-output*/` and `videos/`, then protects `main`. Why: no PR can land without a base branch (repo state). [issue-1.md](issue-1.md) and [issue-2.md](issue-2.md) propose the same bootstrap with more files (#1 decision 15; #2 decision 18).
2. **Newcomer access.** Default: add them as a collaborator with Write on this repo only. They branch in the repo and open a PR to `main`. Why: forking a private repo still needs read access. Inference: fork PRs also make CI secrets harder later.
3. **Number count in the impact report.** Default: at least 6 sourced numbers plus exactly 1 unsourced, so 7 or more in total. Why: this satisfies both readings of the AC.
4. **`date` vs `postedAt`.** Default: keep `date`, as #9 says. Why:
   - `date` is the documented key in Hugo ("The date associated with the page", https://gohugo.io/content-management/front-matter/), Jekyll ("A date here overrides the date from the name of the post", https://jekyllrb.com/docs/front-matter/) and Eleventy (https://www.11ty.dev/docs/dates/), all fetched 2026-09-29.
   - #2 must handle "common static-site formats" (#2 AC).
   - [issue-4.md](issue-4.md) and [issue-8.md](issue-8.md) both keep `date` and map it for VWC (#4 decision 14; #8 decision 14).
   - VWC's 39 posts already cover `postedAt`.
5. **Date format.** Default: quoted `"YYYY-MM-DD"`. Why:
   - Quoted, it stays a string; unquoted, it becomes a Date (`src/lib/blog.ts:137-145`; tested).
   - Hugo types `date` as a string.
   - Eleventy accepts quoted ISO strings, and it warns that an unquoted YAML date "assumes midnight in UTC", which can display a day off (11ty docs).
   - Not verified: how Jekyll treats a quoted date string.
6. **brand.md shape. BLOCKING: decide before anyone writes brand.md.** Four proposals exist:
   - (a) [issue-2.md](issue-2.md), decision 3: YAML front matter; #2 reads `image.*` and `voice.tts.*`, and #3 extends the file.
   - (b) [issue-3.md](issue-3.md), decisions 1, 2 and 5: YAML front matter with #9's fields plus `video`, `voice` keyed by provider, and `tone` for writing voice.
   - (c) [issue-1.md](issue-1.md), decision 5: brand.md plus a machine-readable `brand.json`.
   - (d) an alternative considered for this document: `##` headings with `ink: #hex` lines and no YAML.

   **Default:** YAML front matter that holds only #9's AC fields, under keys the owner fixes now. The Markdown body is optional prose. #2 and #3 add their own keys later, and (inference) must fall back to defaults when those keys are missing. Proposed keys:
   ```yaml
   ---
   name: "<Org name>"
   mission: "<One sentence.>"
   colors:                # 3-5 entries; every hex in double quotes
     ink: "#RRGGBB"       # text
     canvas: "#RRGGBB"    # background
     accent: "#RRGGBB"    # the most saturated color
     accent-2: "#RRGGBB"  # optional
   fonts:
     heading: { family: "<Google Fonts family>", weight: 700 }
     body: { family: "<Google Fonts family>", weight: 400 }
   tone:                  # the AC's "voice": writing tone, not a TTS speaker
     adjectives: ["<adj>", "<adj>", "<adj>"]
     examples:
       - "<Example sentence one.>"
       - "<Example sentence two.>"
   copy_rules:            # 3-5; phrase as "Never write X; write Y" where possible
     - "Calls to action are one literal verb: Donate, Volunteer."
   logo: "<Text description of a wordmark; no file>"
   ---
   ```
   **Why:**
   - Two of the three skill dossiers (#2 and #3) already assume YAML front matter.
   - One parseable file makes #1's separate `brand.json` optional (inference).
   - gray-matter already parses it, and step 9's check can too.
   - `tone` avoids the `voice` collision between #2 and #3 (lesson 12).
   - `ink` and `canvas` match tokens.mjs's role names (:149-156).
   - "Never X; write Y" mirrors check-copy.mjs's rule pairs (:20-37).

   **Risk:** the newcomer writes an unquoted hex (lesson 13), and step 9 catches it. #3 may still rename keys, but fixing them now limits the churn to one PR.

   **If this isn't settled when the content files are done:** write brand.md in this shape and flag it in the PR. Inference: converting to another shape is a mechanical edit.

   Record the answer as a comment on #9 and #3. That's visible to others, so the owner posts it.
7. **Logo.** Default: the `logo` field holds a one-line description of a text wordmark (the name set in the heading font and a named color), with no file. Why: #9 bans logos and binaries. #3's own example ships its SVG wordmark outside `fixtures/` ([issue-3.md](issue-3.md), decision 9).
8. **TTS speaker in brand.md.** Default: leave it out, and don't write a `voice` key. Why: speaker IDs are provider-specific (Kore on Gemini, Orson on HeyGen, am_michael on Kokoro; research). #2 and #3 own that key (lesson 12).
9. **Photos in donor notes.** Default: filenames marked "(not in repo)". Why: #6's input is "notes plus optional links and photos", and filenames show which stories have photos without shipping binaries.
10. **Per-file "fictional" marker.** Default: in the README only, as the AC says. Why (inference): a note in a post body would be narrated or rendered by #2 and #8.
11. **AI-assisted drafting.** Default: allowed, but every name goes through the collision check, and there is no AI attribution in commits, PRs or docs (owner rule). Why: "original writing" is about copying real text. Inference: AI drafts can reproduce real names.
12. **#8's traps in blog-post.md. BLOCKING for blog-post.md and the README trap table.** [issue-8.md](issue-8.md) (decision 14) asks #9 to plant a hypothetical example number, an unsourced general stat and a past deadline. #8 must run "end to end on a post from an organization other than VWC" (#8 AC), and blog-post.md is the only such post planned (#9 layout).
    - **Default:** yes. The owner adds one checkbox to #9's AC before assigning it. The good and bad examples are under Trap design.
    - **Why:**
      - It's three sentences. Inference: under 30 minutes, which keeps #9 inside its 3–4 hour estimate.
      - Adding them later means reopening a reviewed post and the README table.
      - Without them, #8's facts and staleness checks (#8 decisions 8 and 11) have no non-VWC input.
    - **Alternative:** #8 plants them in its own copy of the post when it's built, which is last in the build order. The risk is two posts drifting apart.
    - **If the AC isn't edited**, the newcomer shouldn't add them. Traps outside the AC and README would be unplanned (lesson 2).
13. **Who ships #4's fictional repo fixture.**
    - [issue-1.md](issue-1.md) says "add a small fictional repo fixture for #4" without an owner (decision 16).
    - [issue-4.md](issue-4.md) says #4 ships `fixtures/project/` (decision 4).
    - The two also disagree on #4's real test repos: #1 decision 17 says VetsAI plus the fixture, while #4 decision 2 says VetsAI plus vets-who-code-app.
    - **Default:** #4 owns it and builds it with #4. **Why:** the fixture contains code, and #9 "needs no code" (#9 body). Its trap (a feature claimed only in the README) is defined by #4's extractor. #9 is sized as a good first issue.
    - **Effect on #9:** none, except that the README's file and trap tables should be plain lists #4 can add rows to. `fixtures/LICENSE` would also cover `fixtures/project/` (inference).
    - Record the call on #1 so [issue-1.md](issue-1.md), [issue-4.md](issue-4.md) and this document agree.
14. **Parser-stress posts** (CRLF, BOM, TOML, tables, code fences). Default: not in #9; file a follow-up. Why: #9's AC doesn't ask for them. #2 already plans its own loader tests in temp dirs, including CRLF, TOML and a block-scalar title ([issue-2.md](issue-2.md), build step 4).
15. **Link #9 under #1.** Default: yes. Why: #1's "All sub-issues below are done" could otherwise be met before any fixtures exist (GraphQL; #1 AC).
16. **Commit an answer key listing every number and its source?** Default: no. Why: it isn't in the AC, and the README trap table already serves as the key for the traps.

## Suggested build plan

brand.md comes after the content files, because it waits on decision 6. Every check below was tested against a planted-bad folder: each caught its case and printed nothing on the real CC0 text. Three pitfalls the step 11 checks avoid:
- `file fixtures/*` reports the two subfolders as "directory", so the check fails on a correct folder (tested).
- `head -2` of the CC0 text prints only the first title line and a blank line (tested).
- The `utf-8 text` pattern depends on the `file` version's wording (own knowledge: older `file` releases print "UTF-8 Unicode text"; not tested).

1. **Get access and a base branch** (decisions 1 and 2).
   Verify: `git ls-remote https://github.com/Vets-Who-Code/hashflag-skills.git` prints a line ending in `refs/heads/main`. Today it prints nothing.
2. **Create a branch:** `git switch -c documentation/<your-username>/9-sample-fixtures`. This follows VWC's pattern, `<label>/<github-username>/<issue-number>-<short-description>` (`vets-who-code-app/contributing.md:104-111`).
   Verify: `git branch --show-current`.
3. **Pick names and run the name checks below** for both orgs, every full personal name and any branded service name.
   Verify: a log of each query and its result, ready to paste into the PR.
4. **Write a private fact sheet (not committed):** org names, the report year, the notes month, every number with its source, your three #9 traps, and #8's three if decision 12 says yes.
   Verify: every number in steps 5–8 appears on the sheet.
5. **Write impact-report.md**, with numbers in digits.
   Verify: in `grep -noE '[0-9][0-9,.%]*' fixtures/nonprofit/impact-report.md`, every hit is a year or date, or has its source in the same sentence, except exactly one.
6. **Write blog-post.md.** Use only numbers the report sources, plus #8's three traps if decision 12 says yes.
   Verify:
   - `awk '/^---$/{c++; next} c>=2' fixtures/nonprofit/blog-post.md | wc -w` gives about 800 (700–900 is reasonable).
   - `awk '/^---$/{c++; next} c==1' fixtures/nonprofit/blog-post.md | npx --yes js-yaml` prints title, date, author, description and a tags array. The date must print as `"YYYY-MM-DD"`; a `T00:00:00.000Z` timestamp means it's unquoted (tested with the local js-yaml bin).
   - The impact report's trap number does not appear.
   - Any #8 traps match the fact sheet exactly.
7. **Write donor-notes.md.**
   Verify: 3–5 stories. Exactly one has no link and no photo filename. Every link is on example.org.
8. **Write service-page.md.**
   Verify:
   - `grep -niE '\$|usd|dollar|free|price|cost|cheap|afford|discount|% off|starting at|guarantee|warranty' fixtures/small-business/service-page.md` matches only the FAQ question and the "call for a quote" answer;
   - the FAQ has 5 or more entries;
   - hours are listed.
9. **Write both brand.md files** in the shape decision 6 picks.
   Verify:
   - For each family, `curl -sfo /dev/null https://raw.githubusercontent.com/google/fonts/main/ofl/<familylowercasenospaces>/OFL.txt && echo ok` prints `ok`. Tested: 200 for all 18 bundled families; Gilroy and Georgia fail.
   - If YAML: `awk '/^---$/{c++; next} c==1' fixtures/nonprofit/brand.md | npx --yes js-yaml` shows every color as a `"#RRGGBB"` string. `null` means an unquoted hex (tested).
   - Every text/background pair reaches at least 4.5:1 (https://webaim.org/resources/contrastchecker/, which responds with HTTP 200; its use is from my own knowledge).
   - The counts are 3–5 colors, 3–5 adjectives, 2 sentences and 3–5 rules.
   - The example sentences contain no numbers. Recommendation: this keeps brand.md from becoming a source of claims.
10. **Write the README and LICENSE.**
    Verify:
    - the first line says everything is fictional;
    - the file table covers all 6 content files and says only `blog-post.md` is a post;
    - the trap table has 3 rows (or 6 with decision 12) that match steps 5–8;
    - `head -3 fixtures/LICENSE` prints "Creative Commons Legal Code", a blank line and "CC0 1.0 Universal" (tested).
11. **Check the whole folder.** Run from the repo root. Each command must print nothing:
    ```sh
    # text files only: every file is us-ascii or utf-8 (a binary shows as "binary")
    find fixtures -type f -exec file --no-pad --mime-encoding {} + | grep -vE ': (us-ascii|utf-8)$'
    # no byte-order mark, no CRLF line endings
    find fixtures -type f -exec file {} + | grep -E 'BOM|CRLF|CR line'
    # no domain except example.org / example.com (covers links and email addresses)
    grep -rnoiE '[a-z0-9.-]+\.(org|com|net|edu|gov|io|co|us|info|biz|app|dev|ai)([^a-z0-9]|$)' fixtures | grep -viE '(^|[^a-z0-9-])([a-z0-9-]+\.)*example\.(org|com)([^a-z0-9]|$)'
    # no phone number outside 555-0100..555-0199 (checks 7-digit and 10-digit forms)
    grep -rnoE '(^|[^0-9])[0-9]{3}[-. ][0-9]{4}([^0-9]|$)' fixtures | grep -vE '555[-. ]01[0-9]{2}([^0-9]|$)'
    # no licensed or silently remapped font names (whole words)
    grep -rniwE 'gilroy|gotham|helvetica|arial|futura|avenir|verdana|calibri|segoe|georgia|times new roman|palatino|cambria|menlo|consolas' fixtures
    ```
    Tested: each command caught a planted case: a PNG header, a BOM, a CRLF file, `realbank.org`, `gmail.com`, `867-5309` and `Georgia`. Each passed on `hi@example.org`, `shop.example.com`, `(412) 555-0142`, `2024-2025`, "secretarial" and "three times".
    Verify: all five print nothing. `git status --porcelain` shows only paths under `fixtures/`.
12. **Commit and open the PR.**
    - Run `git add fixtures/` (an explicit path), then `git commit -m "docs(fixtures): Add fictional sample content for skill tests"`.
    - The subject is 61 characters, in sentence case, with no trailing period and type `docs`. VWC's rules cap the header at 72 characters and require sentence case (`contributing.md:179-182`; VWC commitlint via research).
    - The PR body says "Closes #9", ticks each AC box and includes the name-check log.
    Verify: `git show --stat HEAD` lists only the 8 files, and the PR diff shows no binary files.

### How to check that a name isn't real

Run these steps for each org name, full personal name, branded service name and place.
1. **Web search.** Exact phrase `"<Name>"`, then `"<Name>" food bank` or `"<Name>" bike shop`. Read the results yourself (lesson 14).
2. **Nonprofit registries.**
   - ProPublica Nonprofit Explorer: `https://projects.propublica.org/nonprofits/search?q=%22<Name>%22`. It works: "Second Harvest" returned 35 organizations on 2026-09-29.
   - IRS Tax Exempt Organization Search: `https://apps.irs.gov/app/eos/`. The URL is from my own knowledge, and it returned 403 to an automated fetch.
3. **Businesses.** Search USPTO trademarks at `https://tmsearch.uspto.gov/` (the page exists, fetched 2026-09-29) and business or map listings (own knowledge).
4. **Domains.** Run `dig +short <namenospaces>.org` and `.com`. Inference: any answer means someone owns the domain, which suggests a real org.
5. **GitHub.** `gh search repos "<Name>"` and `gh search users "<Name>"`, or the same searches at github.com/search.
6. **People.** Use first names only for clients and donors, which is also how staff actually write notes (recommendation). For a full author name, search `"First Last" food bank` and drop the name if anything matches.
7. **Places.** No street addresses (#9 bans real addresses). Inference: "the north side" is safer than an invented town name, which may exist.
8. **Contact details.**
   - Phones use only line numbers 555-0100 to 555-0199. Sources (Wikipedia, "555 (North American Numbering Plan)", attributing the decisions to NANPA and the INC; fetched 2026-09-29):
     - That block was already treated as fictitious in 1994, when NANPA "began accepting applications for nationwide 555-numbers (outside the fictitious 555-01XX range)".
     - As of September 2016, it's the only 555 block still reserved: "Only 555-0100 through 555-0199 are now specifically reserved for fictional use".
   - Inference: the reservation is on the line number, so any area code can go in front of it. Use one area code consistently.
   - Emails and links only on example.org or example.com, which are reserved for documentation (RFC 2606 §3).

**Bad pick:** "Second Harvest Food Bank", with 35 ProPublica matches. Names built on "Feeding ___" are also risky, because they echo Feeding America's network naming (own knowledge). A name is good only after it clears every step, so record the steps in the PR.

### How the PR will be reviewed

Inference: the repo has no CI, CODEOWNERS, templates or written review rules (it's empty), so the owner will review by hand against #9's checklist. Expect:
- every AC box ticked, each pointing to the file that satisfies it;
- the name-check log;
- exactly the traps in the README table (3, or 6 with decision 12), and no unplanned ones (lesson 2);
- numbers that agree across files (#9 tip);
- brand.md in the shape decision 6 picks;
- the step 11 checks passing, the CC0 text unedited, and OFL fonts whose text pairs reach 4.5:1;
- a Conventional Commit message. No hook enforces it in the empty repo, so check it yourself (VWC `commitlint.config.js`, via research);
- the owner's repo rules: a branch per change, no direct commits to `main`, no `--no-verify` (owner rule).

Expect one round of requested changes on names and numbers. That's normal.

## Sources

**hashflag-skills (GitHub, read 2026-09-29)**
- Issues #1, #4, #8 and #9 (`gh issue view -R Vets-Who-Code/hashflag-skills`, re-read 2026-09-29); #2, #3, #5, #6 and #7 (research)
- `gh api repos/Vets-Who-Code/hashflag-skills` (private, size 0, license null, default_branch main, allow_forking true)
- `gh api repos/Vets-Who-Code/hashflag-skills/commits` (409 empty)
- `git ls-remote https://github.com/Vets-Who-Code/hashflag-skills.git` (no refs)
- GraphQL: `isEmpty`, `defaultBranchRef`, `issue(9).parent`, `issue(9).assignees`, `issue(1).subIssues`
- `gh api orgs/Vets-Who-Code` (`members_can_fork_private_repositories: true`)

**Sibling dossiers** ([issue-1.md](issue-1.md) to [issue-8.md](issue-8.md), 2026-09-29)
- #1: decisions 1, 5, 15, 16, 17
- #2: decision 3, decision 4, decision 18, build step 4
- #3: decisions 1, 2, 5, 9
- #4: decisions 2, 4, 14
- #5: build steps 1–3; #6: preconditions; #7: build step 9
- #8: decisions 8, 11, 14

**vets-who-code-app (local checkout, b7c19088)**
- `src/data/blogs/high-success-low-adoption.md:1-18`; all 39 `src/data/blogs/*.md` (front-matter keys)
- `src/data/blogs/labor-day-sprint-10-days-to-proof-of-work.md:3, 31, 67, 74, 117`
- `src/data/outcomes.ts:21-33`; `__tests__/data/outcomes.test.ts:83-152, 111-112`
- `scripts/generate-blog-image.ts:24-28`; `scripts/generate-single-blog-audio.ts:186, 303, 327-337`
- `src/lib/blog.ts:72, 137-145`; `src/lib/util.ts:18-20`
- `__tests__/scripts/generate-blog-image.test.ts:9-20`
- `contributing.md:104-111, 179-182`
- `.gitignore:105-106` (#1390); `.git/info/exclude:19-21`
- `git ls-files public/fonts` (128 files: gilroy 30, gotham 56, fontAwesomePro 10)
- `package.json:73` (gray-matter ^4.0.3); `node_modules/gray-matter/lib/utils.js:3`
- `node_modules/js-yaml/package.json:3, 38-40` (4.3.2, bin); `node_modules/js-yaml/bin/js-yaml.js:53-61` (stdin)
- Commit d7157a61 (build broken by a subdirectory in `src/data/blogs`); commit 1fa1bfa7 (#1266)
- PR #1418 and PR #1266 (via research)

**Local skills, plugins and packages**
- `~/.claude/skills/vwc-faceless-explainer/brand/frame.md:13-31, 190-201`
- `~/.claude/skills/vwc-faceless-explainer/scripts/check-copy.mjs:20-37`
- `~/.claude/skills/faceless-explainer/scripts/lib/tokens.mjs:57, 142-167`
- `~/.claude/skills/hyperframes-creative/references/typography.md:3, 19, 21-42, 44, 46, 52, 60`
- `~/.claude/skills/hyperframes-creative/frame-presets/code-editorial/fonts/`
- `~/.claude/skills/hyperframes-cli/SKILL.md:54`; `~/.claude/skills/hyperframes-cli/references/lint-validate-inspect.md:72`
- hyperframes@0.8.91 npm tarball, `dist/chunk-HBBJFK6I.js:33-109` (FONT_ALIAS_MAP); `dist/chunk-U24VGXGA.js:9537-9550` (`font_family_without_font_face`)
- `~/.claude/skills/product-launch-video/references/story-design.md:349, 385`
- `~/.claude/skills/copywriting/references/copy-frameworks.md:422-431` (via research)
- `~/.claude/plugins/cache/brag/brag/0.2.2/README.md:90`; `examples/bicycles-for-snakes/PRODUCT.md:26`

**URLs (read 2026-09-29)**
- https://creativecommons.org/publicdomain/zero/1.0/legalcode.txt (121 lines, us-ascii, §4(a) at line 104)
- https://openfontlicense.org/open-font-license-official-text/
- https://www.rfc-editor.org/rfc/rfc2606
- https://en.wikipedia.org/wiki/555_(North_American_Numbering_Plan)
- https://gohugo.io/content-management/front-matter/
- https://jekyllrb.com/docs/front-matter/
- https://www.11ty.dev/docs/dates/
- https://raw.githubusercontent.com/google/fonts/main/ofl/&lt;family&gt;/OFL.txt for all 18 bundled families (200), plus gilroy and georgia (404)
- https://projects.propublica.org/nonprofits/search?q=%22Second+Harvest%22
- https://tmsearch.uspto.gov/
- https://apps.irs.gov/app/eos/ (returned 403 to an automated fetch)
- https://ai.google.dev/gemini-api/docs/pricing (via research)
- https://webaim.org/resources/contrastchecker/ (HTTP 200; its use is from my own knowledge)

**Tested locally (2026-09-29, macOS 26.7):** `file-5.41` output strings; BSD grep 2.6.0-FreeBSD with every step 11 command; js-yaml 4.3.2's CLI on dates, hex and stdin; gray-matter 4.0.3 on BOM, CRLF and hex; VWC's image and audio regexes on BOM, CRLF and a folded title.

**Not researched**
- Per-run cost of #5, #6, #7 and #8 as whole skills
- HeyGen self-serve TTS pricing
- Whether a name clears state business registries (varies by state)
- Jekyll's handling of a quoted date string
- The step 11 commands under GNU grep (Linux), Windows Git Bash or WSL, and under `file` versions before 5.41
- The `npx --yes js-yaml` wrapper itself (the local js-yaml bin was tested instead)