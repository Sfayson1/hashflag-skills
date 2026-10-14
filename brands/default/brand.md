---
schema: hashflag-brand/0
name: "Default"
mission: "A neutral starting pack. Copy it, then make it yours."
colors:
  ink: "#1B2430"
  canvas: "#F2F4F1"
  accent: "#B4501A"
  accent2: "#0B6E77"
fonts:
  heading: { family: "Inter", license: "OFL-1.1", source: "https://github.com/rsms/inter", files: ["fonts/Inter-400.woff2", "fonts/Inter-700.woff2"] }
  body: { family: "Inter", license: "OFL-1.1", source: "https://github.com/rsms/inter", files: ["fonts/Inter-400.woff2", "fonts/Inter-700.woff2"] }
  mono: { family: "JetBrains Mono", license: "OFL-1.1", source: "https://github.com/JetBrains/JetBrainsMono", files: ["fonts/JetBrainsMono-400.woff2", "fonts/JetBrainsMono-700.woff2"] }
voice:
  adjectives: ["plain", "direct", "specific"]
  examples:
    - "Here is what changed, and why it matters to you."
copy_rules:
  - { rule: "Calls to action name the literal action.", ban: "\\b(learn more|click here|find out more)\\b", use: "the action itself, like Book, Apply or Donate" }
  - { rule: "Claims are numbers with a source, not adjectives.", ban: "\\b(revolutionary|life-changing|world-class|game-changing)\\b", use: "a number or a concrete mechanism" }
  - { rule: "Every number names where it came from." }
ctas:
  primary: { label: "Visit", url: "https://example.com" }
video:
  ground: "canvas"
  caption_case: "none"
  story: ["Hook: the question or tension, in one line", "Claim: the one thing to remember", "Mechanism: how it works", "Proof: sourced numbers only", "End card: the literal call to action and the name or logo"]
---

# Default brand pack

A neutral pack for anyone without a brand yet. Inter for headings and body, JetBrains Mono for labels, a cool off-white ground, ink text, a rust accent and a teal second accent.

The fonts are under the SIL Open Font License; their license texts are in `fonts/`.

To make your own pack, run the `brand-pack` skill, or copy this folder to `~/.config/hashflag/brands/<your-slug>/` and edit `brand.md`.
