// Default locations (docs/contracts.md, "Paths"). XDG says relative values must be ignored.
import { homedir } from "node:os";
import { join, isAbsolute } from "node:path";

const xdg = (name: string, fallback: string) => {
  const v = process.env[name];
  return v && isAbsolute(v) ? v : join(homedir(), fallback);
};

export const outDir = (skill: string, slug: string) => join(xdg("XDG_CACHE_HOME", ".cache"), "hashflag", skill, slug);
export const brandDir = (slug: string) => join(xdg("XDG_CONFIG_HOME", ".config"), "hashflag", "brands", slug);

// Slugs end up in file paths and storage keys, so keep them to a safe charset.
export function slugify(s: string): string {
  const slug = s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
  if (!slug) throw new Error(`Cannot make a slug from ${JSON.stringify(s)}`);
  return slug;
}
