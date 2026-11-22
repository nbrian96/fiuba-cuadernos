import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  let rawBase = process.env.ASTRO_BASE ?? "/";
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
  "tda/ejercicios/index.html",
  "tda/ejercicios/tda-ej-18/index.html",
  "tda/ejercicios/tda-adv-aprox-2partition/index.html",
  "tda/docs/checklist-pre-parcial/index.html",
  "tda/materiales/index.html",
  "tda/materiales/tda-slide-13-programacion-lineal-ii/index.html",
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

// 3. Verificar atributos internos bajo base y existencia de destinos compilados en dist/
const allHtmlFiles = collectHtmlFiles(distDir);
const attrRegex =
  /(?:href|src|component-url|renderer-url|before-hydration-url)\s*=\s*"(\/(?!\/)[^"]*)"/g;

function resolveCompiledTarget(targetWithQueryOrHash) {
  const withoutSuffix = targetWithQueryOrHash.split(/[?#]/)[0];
  let relPath = withoutSuffix;
  if (base !== "/") {
    if (relPath === base.slice(0, -1) || relPath === base) {
      relPath = "/";
    } else if (relPath.startsWith(base)) {
      relPath = `/${relPath.slice(base.length)}`;
    } else {
      return null;
    }
  }

  let decodedRel = relPath.replace(/^\/+/, "");
  try {
    decodedRel = decodeURIComponent(decodedRel);
  } catch {
    return null;
  }
  const directPath = path.join(distDir, decodedRel);
  if (fs.existsSync(directPath) && fs.statSync(directPath).isFile()) {
    return directPath;
  }
  const indexPath = path.join(distDir, decodedRel, "index.html");
  if (fs.existsSync(indexPath) && fs.statSync(indexPath).isFile()) {
    return indexPath;
  }
  return null;
}

for (const file of allHtmlFiles) {
  const rel = path.relative(distDir, file).replace(/\\/g, "/");
  const html = fs.readFileSync(file, "utf-8");
  const cleanHtml = html
    .replace(/(<script\b[^>]*>)[\s\S]*?(<\/script>)/gi, "$1$2")
    .replace(/(<style\b[^>]*>)[\s\S]*?(<\/style>)/gi, "$1$2");

  let match;
  while ((match = attrRegex.exec(cleanHtml)) !== null) {
    const target = match[1];
    if (base !== "/") {
      assert.ok(
        target.startsWith(base) || target === base.slice(0, -1),
        `[Base Prefix] Atributo interno sin prefijo '${base}' en dist/${rel}: '${target}'`,
      );
    }
    const resolved = resolveCompiledTarget(target);
    assert.ok(
      resolved !== null,
      `[Broken Link] Destino interno inexistente en dist/${rel}: '${target}'`,
    );
    const hashIndex = target.indexOf("#");
    if (hashIndex !== -1 && resolved && resolved.endsWith(".html")) {
      const anchorId = decodeURIComponent(target.slice(hashIndex + 1));
      if (anchorId) {
        const targetHtml = fs.readFileSync(resolved, "utf-8");
        const escapedId = anchorId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const hasId = new RegExp(`\\bid=["']${escapedId}["']`).test(targetHtml);
        assert.ok(
          hasId,
          `[Broken Anchor] Ancla '#${anchorId}' inexistente en destino '${target}' referenciado desde dist/${rel}`,
        );
      }
    }
  }

  // Verificar también anclas intra-página puras href="#id"
  const intraHashRegex = /\bhref=["']#([^"']+)["']/gi;
  const pageIds = new Set(
    Array.from(cleanHtml.matchAll(/\bid=["']([^"']+)["']/gi), (m) => m[1]),
  );
  let hashMatch;
  while ((hashMatch = intraHashRegex.exec(cleanHtml)) !== null) {
    const anchorId = decodeURIComponent(hashMatch[1]);
    if (anchorId) {
      assert.ok(
        pageIds.has(anchorId),
        `[Broken Intra-Page Anchor] Ancla '#${anchorId}' inexistente en dist/${rel}`,
      );
    }
  }
}

// Verificaciones integrales de Etapa 4
const rootDir = process.cwd();
const exercisesIndex = JSON.parse(
  fs.readFileSync(
    path.join(rootDir, "docs/manifests/tda/exercises-index.json"),
    "utf-8",
  ),
);
const courseManifest = JSON.parse(
  fs.readFileSync(path.join(rootDir, "src/content/courses/tda.json"), "utf-8"),
);
const resourcesManifest = JSON.parse(
  fs.readFileSync(
    path.join(rootDir, "src/content/resources/tda-resources.json"),
    "utf-8",
  ),
);

const expectedEtapa4Routes = [
  "tda/parciales/index.html",
  "tda/avanzados/index.html",
  "tda/docs/matriz-parciales/index.html",
  "tda/docs/problema-mochila-y-greedy/index.html",
  ...courseManifest.units
    .filter((u) => u.inCatalog)
    .map((u) => `tda/unidad/${u.slug}/index.html`),
  ...exercisesIndex.catalogExercises.map((e) => `tda/ejercicios/${e.id}/index.html`),
  ...exercisesIndex.advancedExercises.map((e) => `tda/ejercicios/${e.id}/index.html`),
  ...resourcesManifest.resources.map((r) => `tda/materiales/${r.resourceId}/index.html`),
];

for (const relRoute of expectedEtapa4Routes) {
  assert.ok(
    fs.existsSync(path.join(distDir, relRoute)),
    `[Etapa 4 Route] Falta HTML generado: dist/${relRoute}`,
  );
}

// Todos los 96 materiales físicos publicados en dist/materials/tda/
let publishedFiles = 0;
for (const res of resourcesManifest.resources) {
  for (const file of res.files) {
    const cleanPath = String(file.path).replace(/^\/+/, "");
    const publishedRel = cleanPath.startsWith("tda/") ? cleanPath : `tda/${cleanPath}`;
    const dest = path.join(distDir, "materials", publishedRel);
    assert.ok(
      fs.existsSync(dest),
      `[Materials] Falta archivo publicado en dist/materials/${publishedRel}`,
    );
    publishedFiles++;
  }
}
assert.equal(publishedFiles, 96, "Se esperaban exactamente 96 archivos en dist/materials/tda/");

// .nojekyll y los 11 HTML de compatibilidad legacy en dist/
assert.ok(
  fs.existsSync(path.join(distDir, ".nojekyll")),
  "[Pages] Falta dist/.nojekyll para servir _astro/ en GitHub Pages.",
);

const basePrefix = base === "/" ? "" : base.slice(0, -1);
const legacyEntries = Object.entries(courseManifest.legacyRoutes ?? {}).filter(
  ([legacyFile]) => legacyFile !== "index.html",
);
assert.equal(
  legacyEntries.length,
  11,
  "Se esperaban 11 archivos de redirección legacy (excluyendo index.html).",
);

for (const [legacyFile, targetRoute] of legacyEntries) {
  const legacyPath = path.join(distDir, legacyFile);
  assert.ok(
    fs.existsSync(legacyPath),
    `[Legacy Redirect] Falta ruta de compatibilidad dist/${legacyFile}`,
  );
  const legacyHtml = fs.readFileSync(legacyPath, "utf-8");
  const expectedTarget = `${basePrefix}${targetRoute}`;
  assert.ok(
    legacyHtml.includes('data-pagefind-ignore="all"'),
    `[Legacy Redirect] dist/${legacyFile} debe incluir data-pagefind-ignore="all"`,
  );
  assert.ok(
    legacyHtml.includes(`url=${expectedTarget}`),
    `[Legacy Redirect] dist/${legacyFile} debe redirigir a '${expectedTarget}'`,
  );
  assert.ok(
    legacyHtml.includes(`<link rel="canonical" href="${expectedTarget}"`),
    `[Legacy Redirect] dist/${legacyFile} debe declarar canonical '${expectedTarget}'`,
  );
}

// Índice Pagefind generado (sin indexar los 11 redirects legacy)
for (const pfRel of ["pagefind/pagefind.js", "pagefind/pagefind-entry.json"]) {
  assert.ok(
    fs.existsSync(path.join(distDir, pfRel)),
    `[Pagefind] Falta artefacto de índice: dist/${pfRel}`,
  );
}

// 0 errores KaTeX ni delimitadores crudos sin compilar bajo dist/tda/
const tdaHtmlFiles = allHtmlFiles.filter((f) =>
  path.relative(distDir, f).replace(/\\/g, "/").startsWith("tda/"),
);
for (const htmlFile of tdaHtmlFiles) {
  const rel = path.relative(distDir, htmlFile).replace(/\\/g, "/");
  const visibleHtml = fs
    .readFileSync(htmlFile, "utf-8")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<astro-island\b[^>]*>/gi, "")
    .replace(/<annotation\b[^>]*>[\s\S]*?<\/annotation>/gi, "");

  assert.ok(
    !visibleHtml.includes("katex-error"),
    `[KaTeX] Se detectó 'katex-error' en dist/${rel}`,
  );
  assert.ok(
    !visibleHtml.includes("$$"),
    `[KaTeX] Se detectó '$$' sin renderizar en dist/${rel}`,
  );
  assert.ok(
    !visibleHtml.includes("\\dollar"),
    `[KaTeX] Se detectó '\\dollar' literal en dist/${rel}`,
  );
  if (rel === "tda/avanzados/index.html") {
    assert.ok(
      !visibleHtml.includes("\\(") &&
        !visibleHtml.includes("\\)") &&
        !visibleHtml.includes("$70") &&
        !visibleHtml.includes("$Z_{\\text{opt}}") &&
        !visibleHtml.includes("$0 \\le"),
      "[KaTeX] Se detectó delimitador LaTeX crudo en tda/avanzados/index.html",
    );
  }
}

console.log(
  `[verify-astro-build] OK (${allHtmlFiles.length} HTML verificados, ${publishedFiles} materiales, Pagefind OK bajo base='${base}').`,
);
