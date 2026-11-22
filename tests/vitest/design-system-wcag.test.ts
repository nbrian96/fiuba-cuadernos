import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(process.cwd());
const SRC_DIR = path.join(ROOT, "src");

function collectFiles(dir: string, exts: string[]): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFiles(full, exts));
    } else if (entry.isFile() && exts.some((ext) => entry.name.endsWith(ext))) {
      results.push(full);
    }
  }
  return results;
}

function srgbToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const clean = hex.replace(/^#/, "");
  const r = Number.parseInt(clean.slice(0, 2), 16);
  const g = Number.parseInt(clean.slice(2, 4), 16);
  const b = Number.parseInt(clean.slice(4, 6), 16);
  return (
    0.2126 * srgbToLinear(r) +
    0.7152 * srgbToLinear(g) +
    0.0722 * srgbToLinear(b)
  );
}

function contrastRatio(fgHex: string, bgHex: string): number {
  const l1 = luminance(fgHex);
  const l2 = luminance(bgHex);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function parseHexVars(blockBody: string): Record<string, string> {
  const vars: Record<string, string> = {};
  const re = /(--[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{6})\s*;/g;
  for (const match of blockBody.matchAll(re)) {
    vars[match[1]] = match[2];
  }
  return vars;
}

describe("Design System WCAG 2.1 AA & CSS quality (ADR-002)", () => {
  it("contains zero !important declarations across all source files in src/", () => {
    const sourceFiles = collectFiles(SRC_DIR, [
      ".css",
      ".astro",
      ".ts",
      ".tsx",
      ".mdx",
      ".js",
      ".jsx",
    ]);
    expect(sourceFiles.length).toBeGreaterThan(0);

    const offenders: string[] = [];
    for (const file of sourceFiles) {
      const content = fs.readFileSync(file, "utf-8");
      if (/!important/i.test(content)) {
        offenders.push(path.relative(ROOT, file));
      }
    }
    expect(offenders).toEqual([]);
  });

  it("maintains strictly balanced braces in all stylesheets under src/styles/", () => {
    const cssFiles = collectFiles(path.join(SRC_DIR, "styles"), [".css"]);
    expect(cssFiles).toHaveLength(4);

    for (const file of cssFiles) {
      const raw = fs.readFileSync(file, "utf-8");
      const stripped = raw
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/"(?:\\.|[^"\\])*"/g, '""')
        .replace(/'(?:\\.|[^'\\])*'/g, "''");

      let depth = 0;
      for (const ch of stripped) {
        if (ch === "{") depth++;
        else if (ch === "}") depth--;
        expect(depth).toBeGreaterThanOrEqual(0);
      }
      expect(depth).toBe(0);
    }
  });

  it("defines @layer architecture, focus-visible, disabled, reduced-motion, print and landscape rules", () => {
    const baseCss = fs.readFileSync(path.join(SRC_DIR, "styles/base.css"), "utf-8");
    const compCss = fs.readFileSync(
      path.join(SRC_DIR, "styles/components.css"),
      "utf-8",
    );

    expect(baseCss).toContain(
      "@layer reset, tokens, base, layouts, components, utilities;",
    );
    expect(baseCss).toContain(":focus-visible");
    expect(baseCss).toContain(":disabled");
    expect(baseCss).toContain('[aria-disabled="true"]');
    expect(baseCss).toContain("cursor: not-allowed;");
    expect(baseCss).toContain("@media (prefers-reduced-motion: reduce)");
    expect(baseCss).toContain("@media print");
    expect(baseCss).toContain(':root[data-theme="dark"]');
    expect(compCss).toContain(".btn:disabled");
    expect(compCss).toContain(".filter-chip[aria-pressed=\"true\"]");
    expect(compCss).toContain("@media (max-width: 768px)");
    expect(compCss).toContain(
      "@media (max-height: 550px) and (orientation: landscape)",
    );
  });

  it("verifies WCAG 2.1 AA contrast ratios (>= 4.5:1 text/UI, >= 3.0:1 focus/borders) in Light and Dark tokens", () => {
    const tokensCss = fs.readFileSync(
      path.join(SRC_DIR, "styles/tokens.css"),
      "utf-8",
    );

    const lightMatch = tokensCss.match(/:root\s*\{([^}]*)\}/);
    const darkMatch = tokensCss.match(/:root\[data-theme="dark"\]\s*\{([^}]*)\}/);
    expect(lightMatch).not.toBeNull();
    expect(darkMatch).not.toBeNull();

    const light = parseHexVars(lightMatch![1]);
    const dark = parseHexVars(darkMatch![1]);

    for (const [label, vars] of [
      ["light", light],
      ["dark", dark],
    ] as const) {
      const pairs45: Array<[string, string, string]> = [
        [`${label} primary/canvas`, vars["--text-primary"], vars["--bg-canvas"]],
        [`${label} primary/surface`, vars["--text-primary"], vars["--bg-surface"]],
        [`${label} muted/canvas`, vars["--text-muted"], vars["--bg-canvas"]],
        [`${label} muted/surface`, vars["--text-muted"], vars["--bg-surface"]],
        [`${label} muted/subtle`, vars["--text-muted"], vars["--bg-subtle"]],
        [`${label} heading/canvas`, vars["--text-heading"], vars["--bg-canvas"]],
        [`${label} heading/surface`, vars["--text-heading"], vars["--bg-surface"]],
        [`${label} accent/canvas`, vars["--accent"], vars["--bg-canvas"]],
        [`${label} accent/surface`, vars["--accent"], vars["--bg-surface"]],
        [`${label} accent/soft`, vars["--accent"], vars["--accent-soft"]],
        [
          `${label} btn-primary`,
          vars["--btn-primary-fg"],
          vars["--btn-primary-bg"],
        ],
        [
          `${label} btn-primary-hover`,
          vars["--btn-primary-fg"],
          vars["--btn-primary-hover"],
        ],
        [`${label} danger/bg`, vars["--danger"], vars["--danger-bg"]],
        [`${label} danger/surface`, vars["--danger"], vars["--bg-surface"]],
        [`${label} warning/bg`, vars["--warning"], vars["--warning-bg"]],
        [`${label} warning/surface`, vars["--warning"], vars["--bg-surface"]],
        [`${label} success/bg`, vars["--success"], vars["--success-bg"]],
        [`${label} success/surface`, vars["--success"], vars["--bg-surface"]],
        [`${label} info/bg`, vars["--info"], vars["--info-bg"]],
        [`${label} info/surface`, vars["--info"], vars["--bg-surface"]],
        [`${label} advanced/bg`, vars["--advanced"], vars["--advanced-bg"]],
        [`${label} advanced/surface`, vars["--advanced"], vars["--bg-surface"]],
        [`${label} code`, vars["--text-on-code"], vars["--bg-code"]],
        [`${label} disabled`, vars["--disabled-fg"], vars["--disabled-bg"]],
      ];

      for (const [pairName, fg, bg] of pairs45) {
        expect(fg, `Missing fg for ${pairName}`).toBeDefined();
        expect(bg, `Missing bg for ${pairName}`).toBeDefined();
        const ratio = contrastRatio(fg, bg);
        expect(
          ratio,
          `${pairName} (${fg}/${bg}) ratio ${ratio.toFixed(2)}:1 < 4.5:1`,
        ).toBeGreaterThanOrEqual(4.5);
      }

      const pairs30: Array<[string, string, string]> = [
        [`${label} focus/canvas`, vars["--focus-ring"], vars["--bg-canvas"]],
        [`${label} focus/surface`, vars["--focus-ring"], vars["--bg-surface"]],
        [
          `${label} border-strong/canvas`,
          vars["--border-strong"],
          vars["--bg-canvas"],
        ],
        [
          `${label} border-strong/surface`,
          vars["--border-strong"],
          vars["--bg-surface"],
        ],
      ];

      for (const [pairName, fg, bg] of pairs30) {
        const ratio = contrastRatio(fg, bg);
        expect(
          ratio,
          `${pairName} (${fg}/${bg}) ratio ${ratio.toFixed(2)}:1 < 3.0:1`,
        ).toBeGreaterThanOrEqual(3.0);
      }
    }
  });
});
