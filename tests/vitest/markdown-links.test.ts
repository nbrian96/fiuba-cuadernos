import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(process.cwd());
const IGNORED_DIRS = new Set([
  ".git",
  "node_modules",
  ".astro",
  "dist",
  ".venv",
  "venv",
  "coverage",
  "playwright-report",
  "test-results",
]);

function walkFiles(dirAbs: string, extensions: Set<string>): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dirAbs, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      results.push(...walkFiles(path.join(dirAbs, entry.name), extensions));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (extensions.has(ext)) {
        results.push(path.join(dirAbs, entry.name));
      }
    }
  }
  return results;
}

function stripFencedCodeBlocks(markdown: string): string {
  const lines = markdown.split(/\r?\n/);
  const kept: string[] = [];
  let inFence = false;
  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (!inFence) {
      kept.push(line);
    }
  }
  return kept.join("\n");
}

function existsCaseSensitive(targetPath: string): boolean {
  const resolved = path.resolve(targetPath);
  if (!fs.existsSync(resolved)) return false;
  const rel = path.relative(ROOT, resolved);
  if (rel.startsWith("..") || path.isAbsolute(rel)) return false;

  let current = ROOT;
  for (const seg of rel.split(path.sep).filter(Boolean)) {
    const entries = fs.readdirSync(current);
    if (!entries.includes(seg)) {
      return false;
    }
    current = path.join(current, seg);
  }
  return true;
}

describe("Markdown links & conflict markers integrity", () => {
  it("resolves all local relative links in .md files case-sensitively", () => {
    const mdFiles = walkFiles(ROOT, new Set([".md"]));
    expect(mdFiles.length).toBeGreaterThanOrEqual(1);

    const linkRegex = /!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
    const broken: string[] = [];

    for (const mdPath of mdFiles) {
      const raw = fs.readFileSync(mdPath, "utf-8");
      const clean = stripFencedCodeBlocks(raw);
      const mdDir = path.dirname(mdPath);

      for (const match of clean.matchAll(linkRegex)) {
        const rawHref = match[1].trim();
        if (
          !rawHref ||
          rawHref.startsWith("#") ||
          /^(?:https?:|mailto:|tel:|data:|javascript:)/i.test(rawHref)
        ) {
          continue;
        }

        const cleanPath = decodeURIComponent(rawHref.split("#")[0].split("?")[0]);
        if (!cleanPath) continue;

        const targetAbs = cleanPath.startsWith("/")
          ? path.join(ROOT, cleanPath.slice(1))
          : path.resolve(mdDir, cleanPath);

        if (!existsCaseSensitive(targetAbs)) {
          const relSource = path.relative(ROOT, mdPath).replace(/\\/g, "/");
          broken.push(`${relSource} -> ${rawHref}`);
        }
      }
    }

    expect(broken, `Enlaces locales rotos:\n${broken.join("\n")}`).toEqual([]);
  });

  it("contains zero Git merge conflict markers in .md, .mdx and .json files", () => {
    const files = walkFiles(ROOT, new Set([".md", ".mdx", ".json"]));
    const conflictPattern = /^(?:<<<<<<<|=======|>>>>>>>)(?:\s|$)/m;
    const infected: string[] = [];

    for (const filePath of files) {
      const content = fs.readFileSync(filePath, "utf-8");
      if (conflictPattern.test(content)) {
        infected.push(path.relative(ROOT, filePath).replace(/\\/g, "/"));
      }
    }

    expect(infected).toEqual([]);
  });
});
