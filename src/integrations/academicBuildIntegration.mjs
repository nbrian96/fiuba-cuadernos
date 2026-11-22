import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildPdfIndexRecords } from "../utils/pagefindPdfIndexer.mjs";

const MIME_BY_EXT = new Map([
  [".pdf", "application/pdf"],
  [".html", "text/html; charset=utf-8"],
  [".js", "application/javascript; charset=utf-8"],
  [".mjs", "application/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".wasm", "application/wasm"],
  [".pf_meta", "application/octet-stream"],
  [".pf_fragment", "application/octet-stream"],
  [".pf_index", "application/octet-stream"],
  [".pf_filter", "application/octet-stream"],
  [".pagefind", "application/octet-stream"],
  [".py", "text/plain; charset=utf-8"],
  [".ltx", "text/plain; charset=utf-8"],
  [".lp", "text/plain; charset=utf-8"],
  [".txt", "text/plain; charset=utf-8"],
  [".md", "text/markdown; charset=utf-8"],
  [".csv", "text/csv; charset=utf-8"],
  [
    ".xlsx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".gif", "image/gif"],
]);

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_BY_EXT.get(ext) ?? "application/octet-stream";
}

function loadAllResourceManifests(repoRoot) {
  const resDir = path.join(repoRoot, "src", "content", "resources");
  if (!fs.existsSync(resDir)) return [];

  const manifests = [];
  for (const entry of fs.readdirSync(resDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    const abs = path.join(resDir, entry.name);
    const data = JSON.parse(fs.readFileSync(abs, "utf-8"));
    if (data && data.courseId && Array.isArray(data.resources)) {
      manifests.push(data);
    }
  }
  return manifests;
}

function buildAllowedMaterialsMap(repoRoot, manifests) {
  const allowed = new Map();
  for (const manifest of manifests) {
    const courseId = manifest.courseId;
    for (const resource of manifest.resources) {
      for (const file of resource.files ?? []) {
        const rawRel = String(file.path).replace(/^\/+/, "");
        const cleanPath = rawRel.replace(/^materias\//, "");
        const posixRel = cleanPath.startsWith(`${courseId}/`)
          ? cleanPath
          : `${courseId}/${cleanPath}`;
        const absSource = path.resolve(repoRoot, rawRel);
        // Asegurar que no escape del repositorio raíz
        const relCheck = path.relative(repoRoot, absSource);
        if (!relCheck.startsWith("..") && !path.isAbsolute(relCheck)) {
          allowed.set(posixRel, absSource);
        }
      }
    }
  }
  return allowed;
}

function loadAllCourseManifests(repoRoot) {
  const coursesDir = path.join(repoRoot, "src", "content", "courses");
  if (!fs.existsSync(coursesDir)) return [];

  const manifests = [];
  for (const entry of fs.readdirSync(coursesDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    const abs = path.join(coursesDir, entry.name);
    const data = JSON.parse(fs.readFileSync(abs, "utf-8"));
    if (data && data.id && data.legacyRoutes && typeof data.legacyRoutes === "object") {
      manifests.push(data);
    }
  }
  return manifests;
}

function escapeHtmlAttr(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function resolveWithPrefix(urlBasePrefix, route) {
  const cleanRoute = route.startsWith("/") ? route : `/${route}`;
  return urlBasePrefix ? `${urlBasePrefix}${cleanRoute}` : cleanRoute;
}

function buildLegacyRedirectHtml(legacyFile, courseId, targetRoute, urlBasePrefix) {
  const resolvedTarget = resolveWithPrefix(urlBasePrefix, targetRoute);
  const courseHome = resolveWithPrefix(urlBasePrefix, `/${courseId}/`);
  const escapedTarget = escapeHtmlAttr(resolvedTarget);
  const escapedTitle = escapeHtmlAttr(`Redirigiendo desde ${legacyFile}`);

  return `<!doctype html>
<html lang="es" data-pagefind-ignore="all">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex" />
    <title>${escapedTitle}</title>
    <link rel="canonical" href="${escapedTarget}" />
    <meta http-equiv="refresh" content="0; url=${escapedTarget}" />
    <script>
      (function () {
        var target = ${JSON.stringify(resolvedTarget)};
        var courseHome = ${JSON.stringify(courseHome)};
        var legacyFile = ${JSON.stringify(legacyFile)};
        var hash = window.location.hash || "";
        var search = window.location.search || "";
        var dest = legacyFile === "todos.html" && hash === "#entrenador-30s"
          ? courseHome + search + hash
          : target + search + hash;
        window.location.replace(dest);
      })();
    </script>
  </head>
  <body>
    <main>
      <p>Redirigiendo a <a href="${escapedTarget}">${escapedTarget}</a>…</p>
    </main>
  </body>
</html>
`;
}

function buildLegacyRedirectMap(courseManifests, urlBasePrefix) {
  const redirects = new Map();
  for (const course of courseManifests) {
    for (const [legacyFile, targetRoute] of Object.entries(course.legacyRoutes ?? {})) {
      if (legacyFile === "index.html") continue;
      redirects.set(
        legacyFile,
        buildLegacyRedirectHtml(legacyFile, course.id, targetRoute, urlBasePrefix),
      );
    }
  }
  return redirects;
}

function normalizeUrlBase(rawBase = "/") {
  const stripped = String(rawBase ?? "/").trim().replace(/^\/+|\/+$/g, "");
  return stripped ? `/${stripped}` : "";
}

function safeDecodeRelativePath(rawPathname) {
  const segments = rawPathname.split("/").filter(Boolean);
  const decoded = [];
  for (const seg of segments) {
    let val;
    try {
      val = decodeURIComponent(seg);
    } catch {
      return null;
    }
    if (val === ".." || val === "." || val.includes("/") || val.includes("\\") || val.includes("\0")) {
      return null;
    }
    decoded.push(val);
  }
  return decoded.join("/");
}

function isRealPathInside(baseDir, candidatePath) {
  try {
    const realBase = fs.realpathSync(baseDir);
    const realTarget = fs.realpathSync(candidatePath);
    const rel = path.relative(realBase, realTarget);
    return !rel.startsWith("..") && !path.isAbsolute(rel);
  } catch {
    return false;
  }
}

function streamStaticFile(res, absFilePath) {
  const stream = fs.createReadStream(absFilePath);
  res.on("close", () => {
    if (!stream.destroyed) {
      stream.destroy();
    }
  });
  stream.on("open", () => {
    if (!res.headersSent) {
      res.statusCode = 200;
      res.setHeader("Content-Type", getMimeType(absFilePath));
      res.setHeader("Cache-Control", "no-cache");
    }
  });
  stream.on("error", () => {
    if (!res.headersSent) {
      res.statusCode = 500;
    }
    res.end();
  });
  stream.pipe(res);
}

export default function academicBuildIntegration() {
  let repoRoot = process.cwd();
  let urlBasePrefix = "";

  return {
    name: "academic-build-integration",
    hooks: {
      "astro:config:done": ({ config }) => {
        repoRoot = fileURLToPath(config.root);
        urlBasePrefix = normalizeUrlBase(config.base);
      },

      "astro:server:setup": ({ server }) => {
        const manifests = loadAllResourceManifests(repoRoot);
        const allowed = buildAllowedMaterialsMap(repoRoot, manifests);
        const courseManifests = loadAllCourseManifests(repoRoot);
        const legacyRedirects = buildLegacyRedirectMap(courseManifests, urlBasePrefix);

        server.middlewares.use((req, res, next) => {
          const reqUrl = req.url ?? "";
          const rawPath = reqUrl.split("?")[0].split("#")[0];
          const pathWithoutBase =
            urlBasePrefix && rawPath.startsWith(urlBasePrefix)
              ? rawPath.slice(urlBasePrefix.length) || "/"
              : rawPath;

          const legacyCandidate = pathWithoutBase.replace(/^\/+/, "");
          if (legacyRedirects.has(legacyCandidate)) {
            res.statusCode = 200;
            res.setHeader("Content-Type", "text/html; charset=utf-8");
            res.setHeader("Cache-Control", "no-cache");
            res.end(legacyRedirects.get(legacyCandidate));
            return;
          }

          if (pathWithoutBase.startsWith("/materials/")) {
            const relPart = pathWithoutBase.slice("/materials/".length);
            const safeKey = safeDecodeRelativePath(relPart);
            if (!safeKey) {
              res.statusCode = 400;
              res.end("Invalid path");
              return;
            }
            const absSource = allowed.get(safeKey);
            if (
              absSource &&
              fs.existsSync(absSource) &&
              fs.statSync(absSource).isFile() &&
              isRealPathInside(repoRoot, absSource)
            ) {
              streamStaticFile(res, absSource);
              return;
            }
          }

          if (pathWithoutBase.startsWith("/pagefind/")) {
            const relPart = pathWithoutBase.slice("/pagefind/".length);
            const safeRel = safeDecodeRelativePath(relPart);
            if (!safeRel) {
              res.statusCode = 400;
              res.end("Invalid path");
              return;
            }
            const distPagefindRoot = path.resolve(repoRoot, "dist", "pagefind");
            const candidate = path.resolve(distPagefindRoot, safeRel);
            const check = path.relative(distPagefindRoot, candidate);
            if (
              !check.startsWith("..") &&
              !path.isAbsolute(check) &&
              fs.existsSync(candidate) &&
              fs.statSync(candidate).isFile() &&
              isRealPathInside(distPagefindRoot, candidate)
            ) {
              streamStaticFile(res, candidate);
              return;
            }
          }

          next();
        });
      },

      "astro:build:done": async ({ dir, logger }) => {
        const distDir = fileURLToPath(dir);
        const manifests = loadAllResourceManifests(repoRoot);
        const allowed = buildAllowedMaterialsMap(repoRoot, manifests);

        let copiedCount = 0;
        let copiedBytes = 0;
        for (const [relTarget, absSource] of allowed.entries()) {
          if (!fs.existsSync(absSource)) {
            throw new Error(
              `[academicBuildIntegration] Falta archivo fuente del manifiesto: ${absSource}`,
            );
          }
          const destPath = path.join(distDir, "materials", relTarget);
          fs.mkdirSync(path.dirname(destPath), { recursive: true });
          fs.copyFileSync(absSource, destPath);
          copiedCount++;
          copiedBytes += fs.statSync(absSource).size;
        }

        const totalMb = (copiedBytes / (1024 * 1024)).toFixed(2);
        logger.info(
          `Materiales publicados en dist/materials/: ${copiedCount} archivos (${totalMb} MB)`,
        );

        const scope = (process.env.PAGEFIND_PDF_SCOPE ?? "all").trim().toLowerCase();
        const pagefind = await import("pagefind");
        const cachePath = path.join(repoRoot, ".astro", "pdf-text-cache.json");

        const { index, errors } = await pagefind.createIndex({
          rootSelector: "main",
        });
        if (errors?.length) {
          logger.warn(`Pagefind createIndex warnings: ${errors.join("; ")}`);
        }

        try {
          const dirResult = await index.addDirectory({ path: distDir });
          logger.info(
            `Pagefind HTML indexado: ${dirResult.page_count ?? "?"} páginas desde ${distDir}`,
          );

          for (const manifest of manifests) {
            const { records, stats } = await buildPdfIndexRecords({
              courseId: manifest.courseId,
              resources: manifest.resources,
              repoRoot,
              scope,
              cachePath,
              basePath: "/",
            });

            for (const record of records) {
              await index.addCustomRecord(record);
            }

            logger.info(
              `Pagefind PDFs [${manifest.courseId}] scope=${stats.scope}: ` +
                `seleccionados=${stats.pdfsSelected}, procesados=${stats.pdfsProcessed}, ` +
                `páginas_indexadas=${stats.pagesIndexed}, omitidas=${stats.pagesSkipped}, ` +
                `fallbacks=${stats.fallbacks}, cache_hits=${stats.cacheHits}, tiempo=${stats.elapsedMs}ms`,
            );
          }

          const outPagefindDir = path.join(distDir, "pagefind");
          const writeRes = await index.writeFiles({ outputPath: outPagefindDir });
          if (writeRes?.errors?.length) {
            throw new Error(
              `Pagefind writeFiles errors: ${writeRes.errors.join("; ")}`,
            );
          }
          logger.info(`Índice Pagefind escrito en ${outPagefindDir}`);
        } finally {
          await pagefind.close();
        }

        const courseManifests = loadAllCourseManifests(repoRoot);
        const legacyRedirects = buildLegacyRedirectMap(courseManifests, urlBasePrefix);
        for (const [legacyFile, htmlContent] of legacyRedirects.entries()) {
          const destHtml = path.join(distDir, legacyFile);
          fs.writeFileSync(destHtml, htmlContent, "utf-8");
        }
        fs.writeFileSync(path.join(distDir, ".nojekyll"), "", "utf-8");
        logger.info(
          `Rutas legacy de compatibilidad (${legacyRedirects.size}) y .nojekyll generados en ${distDir}`,
        );
      },
    },
  };
}
