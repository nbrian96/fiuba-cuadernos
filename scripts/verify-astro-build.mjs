import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  let rawBase = "/";
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--base" && argv[i + 1]) {
      rawBase = argv[i + 1];
      i++;
    } else if (argv[i].startsWith("--base=")) {
      rawBase = argv[i].slice("--base=".length);
    }
  }
  const stripped = rawBase.trim().replace(/^\/+|\/+$/g, "");
  return stripped ? `/${stripped}/` : "/";
}

function collectHtmlFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectHtmlFiles(full));
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      results.push(full);
    }
  }
  return results;
}

function stripKatexAnnotations(html) {
  return html.replace(/<annotation\b[\s\S]*?<\/annotation>/gi, "");
}

const base = parseArgs(process.argv.slice(2));
const distDir = path.resolve("dist");

assert.ok(fs.existsSync(distDir), "No existe el directorio dist/ tras astro build.");

const expectedPages = [
  "index.html",
  "tda/index.html",
  "tda/ejercicios/tda-ej-18/index.html",
  "tda/ejercicios/tda-adv-aprox-2partition/index.html",
  "tda/docs/checklist-pre-parcial/index.html",
];

for (const relPath of expectedPages) {
  const fullPath = path.join(distDir, relPath);
  assert.ok(fs.existsSync(fullPath), `Falta la página compilada dist/${relPath}`);
  const size = fs.statSync(fullPath).size;
  assert.ok(size > 500, `La página dist/${relPath} es demasiado pequeña (${size} bytes).`);
}

// 1. Verificar isla React hidratable en index.html
const indexHtml = fs.readFileSync(path.join(distDir, "index.html"), "utf-8");
assert.ok(
  indexHtml.includes("<astro-island"),
  "dist/index.html debe incluir la isla React <astro-island>.",
);

// 2. Verificar compilación KaTeX en build-time en las páginas MDX
const mdxPages = [
  "tda/ejercicios/tda-ej-18/index.html",
  "tda/ejercicios/tda-adv-aprox-2partition/index.html",
  "tda/docs/checklist-pre-parcial/index.html",
];

for (const relPath of mdxPages) {
  const html = fs.readFileSync(path.join(distDir, relPath), "utf-8");
  assert.ok(
    html.includes('class="katex"'),
    `[KaTeX] Falta renderizado class="katex" en dist/${relPath}`,
  );
  assert.ok(
    html.includes("<math"),
    `[KaTeX] Falta MathML <math> en dist/${relPath}`,
  );
  assert.ok(
    !html.includes("katex-error"),
    `[KaTeX] Se detectó 'katex-error' en dist/${relPath}`,
  );
  assert.ok(
    !html.includes("auto-render.min.js"),
    `[KaTeX] No debe cargarse auto-render.min.js en páginas pre-renderizadas (${relPath}).`,
  );

  const visibleNoAnnotations = stripKatexAnnotations(
    html.replace(/<script\b[\s\S]*?<\/script>/gi, ""),
  );
  assert.ok(
    !visibleNoAnnotations.includes("$$"),
    `[KaTeX] Delimitador crudo '$$' encontrado en dist/${relPath}`,
  );
  assert.ok(
    !visibleNoAnnotations.includes("\\$"),
    `[KaTeX] Escape '\\$' fugado fuera de KaTeX en dist/${relPath}`,
  );
}

// Verificación específica del Ejercicio 18 (tarifas y comparación)
const ej18Html = fs.readFileSync(
  path.join(distDir, "tda/ejercicios/tda-ej-18/index.html"),
  "utf-8",
);
const ej18Visible = stripKatexAnnotations(
  ej18Html.replace(/<script\b[\s\S]*?<\/script>/gi, ""),
);
assert.ok(
  !ej18Visible.includes("\\dollar"),
  "[Ej 18] Se detectó macro '\\dollar' sin expandir fuera de anotaciones KaTeX.",
);
for (const val of ["10", "20", "5", "6", "11", "$"]) {
  assert.ok(
    ej18Visible.includes(val),
    `[Ej 18] Falta valor esperado '${val}' en el HTML renderizado.`,
  );
}

// 3. Si base != '/', verificar que todo href/src/component-url/renderer-url interno comience con base
const allHtmlFiles = collectHtmlFiles(distDir);
if (base !== "/") {
  const attrRegex = /(?:href|src|component-url|renderer-url)\s*=\s*"(\/(?!\/)[^"]*)"/g;
  for (const file of allHtmlFiles) {
    const rel = path.relative(distDir, file).replace(/\\/g, "/");
    const html = fs.readFileSync(file, "utf-8");
    const cleanHtml = html
      .replace(/<script\b[\s\S]*?<\/script>/gi, "")
      .replace(/<style\b[\s\S]*?<\/style>/gi, "");

    let match;
    while ((match = attrRegex.exec(cleanHtml)) !== null) {
      const target = match[1];
      assert.ok(
        target.startsWith(base) || target === base.slice(0, -1),
        `[Base Prefix] Atributo interno sin prefijo '${base}' en dist/${rel}: '${target}'`,
      );
    }
  }
}

console.log(
  `[verify-astro-build] OK (${allHtmlFiles.length} HTML verificados bajo base='${base}').`,
);
