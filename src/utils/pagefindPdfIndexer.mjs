import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const PROTOTYPE_PDF_RESOURCE_IDS = Object.freeze([
  "tda-slide-13-programacion-lineal-ii",
  "tda-guia-completa-v1",
  "tda-parcial-2026-2-2-pdf",
  "tda-tp0-entrega-informe",
]);

export const MIN_PAGE_TEXT_CHARS = 20;
export const MIN_DOC_TEXT_CHARS = 80;

export function normalizePdfText(rawText) {
  if (!rawText) return "";
  return String(rawText)
    .replace(/\u0000/g, " ")
    .replace(/[\r\n\t\f\v]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function computeFileSha256(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(buf).digest("hex");
}

export function loadPdfCache(cachePath) {
  try {
    if (!cachePath || !fs.existsSync(cachePath)) {
      return { schemaVersion: 1, files: {} };
    }
    const parsed = JSON.parse(fs.readFileSync(cachePath, "utf-8"));
    if (parsed && typeof parsed === "object" && parsed.files && typeof parsed.files === "object") {
      return { schemaVersion: 1, files: parsed.files };
    }
  } catch {
    // Si la caché está corrupta, se reconstruye limpiamente
  }
  return { schemaVersion: 1, files: {} };
}

export function savePdfCache(cachePath, cacheData) {
  if (!cachePath) return;
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  fs.writeFileSync(cachePath, JSON.stringify(cacheData, null, 2), "utf-8");
}

export async function extractPdfPages(pdfPath) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const buffer = fs.readFileSync(pdfPath);
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
    verbosity: 0,
  });

  let doc = null;
  try {
    doc = await loadingTask.promise;
    const pages = [];
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
      const page = await doc.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const raw = textContent.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ");
      pages.push({
        pageNumber,
        text: normalizePdfText(raw),
      });
    }
    return pages;
  } finally {
    try {
      await doc?.cleanup?.();
    } catch {
      // Ignorar limpieza secundaria
    }
    try {
      await loadingTask.destroy?.();
    } catch {
      // Ignorar limpieza secundaria
    }
  }
}

export function normalizeBasePrefix(rawBase = "/") {
  const stripped = String(rawBase ?? "/").trim().replace(/^\/+|\/+$/g, "");
  return stripped ? `/${stripped}` : "";
}

export function buildPdfPageUrl(courseId, resourceId, pageNumber, rawBase = "/") {
  const prefix = normalizeBasePrefix(rawBase);
  return `${prefix}/${courseId}/materiales/${resourceId}/?page=${pageNumber}`;
}

function buildFallbackRecord(courseId, resource, primaryFile, rawBase) {
  const units = Array.isArray(resource.unitSlugs)
    ? resource.unitSlugs.join(", ")
    : "";
  const description = resource.description ?? "";
  const filePath = primaryFile?.path ?? "";
  const content = normalizePdfText(
    [
      resource.title,
      description,
      `Unidades: ${units}`,
      `Procedencia: ${resource.provenance}`,
      `Archivo: ${filePath}`,
    ]
      .filter(Boolean)
      .join(". "),
  );

  return {
    url: buildPdfPageUrl(courseId, resource.resourceId, 1, rawBase),
    content,
    language: "es",
    filters: {
      course: [courseId],
      provenance: [resource.provenance],
      kind: ["pdf"],
      ...(Array.isArray(resource.unitSlugs) && resource.unitSlugs.length > 0
        ? { unit: resource.unitSlugs }
        : {}),
      ...(resource.entityType ? { entityType: [resource.entityType] } : {}),
    },
    meta: {
      title: `${resource.title} (Ficha PDF)`,
      provenance: resource.provenance,
      kind: "pdf",
      resourceId: resource.resourceId,
      page: "1",
      fallback: "true",
    },
  };
}

/**
 * @param {object} options
 * @param {string} options.courseId
 * @param {Array<any>} options.resources
 * @param {string} options.repoRoot
 * @param {string} [options.scope]
 * @param {string | null} [options.cachePath]
 * @param {string} [options.basePath]
 * @param {(absPath: string) => Promise<Array<{ pageNumber: number, text: string }>>} [options.extractFn]
 * @param {(absPath: string) => string} [options.hashFn]
 */
export async function buildPdfIndexRecords({
  courseId,
  resources,
  repoRoot,
  scope = "all",
  cachePath = null,
  basePath = "/",
  extractFn = extractPdfPages,
  hashFn = computeFileSha256,
}) {
  const startedAt = Date.now();
  const normalizedScope =
    scope === "prototype" || scope === "none" ? scope : "all";

  const stats = {
    scope: normalizedScope,
    pdfsSelected: 0,
    pdfsProcessed: 0,
    pagesExtracted: 0,
    pagesIndexed: 0,
    pagesSkipped: 0,
    fallbacks: 0,
    cacheHits: 0,
    cacheWrites: 0,
    elapsedMs: 0,
  };

  if (normalizedScope === "none") {
    return { records: [], stats };
  }

  const prototypeSet = new Set(PROTOTYPE_PDF_RESOURCE_IDS);
  const targetResources = resources.filter((res) => {
    const hasPdf =
      Array.isArray(res.files) && res.files.some((file) => Boolean(file.isPdf));
    if (!hasPdf) return false;
    if (normalizedScope === "prototype") {
      return (
        res.pdfMetadata?.inPagefindPrototype === true ||
        (res.pdfMetadata?.inPagefindPrototype === undefined &&
          prototypeSet.has(res.resourceId))
      );
    }
    return true;
  });

  stats.pdfsSelected = targetResources.length;

  const cache = cachePath ? loadPdfCache(cachePath) : { schemaVersion: 1, files: {} };
  let cacheDirty = false;
  const records = [];

  for (const resource of targetResources) {
    const primaryPdf = resource.files.find((file) => Boolean(file.isPdf));
    if (!primaryPdf) continue;

    stats.pdfsProcessed++;
    const resolvedRoot = path.resolve(repoRoot);
    const absPath = path.resolve(resolvedRoot, primaryPdf.path);
    const relCheck = path.relative(resolvedRoot, absPath);
    if (
      relCheck.startsWith("..") ||
      path.isAbsolute(relCheck) ||
      !fs.existsSync(absPath)
    ) {
      records.push(buildFallbackRecord(courseId, resource, primaryPdf, basePath));
      stats.fallbacks++;
      continue;
    }

    let pages = null;
    try {
      const sha256 = hashFn(absPath);
      const cached = cache.files[primaryPdf.path];
      if (cached && cached.sha256 === sha256 && Array.isArray(cached.pages)) {
        pages = cached.pages;
        stats.cacheHits++;
      } else {
        pages = await extractFn(absPath);
        cache.files[primaryPdf.path] = { sha256, pages };
        cacheDirty = true;
        stats.cacheWrites++;
      }
    } catch {
      records.push(buildFallbackRecord(courseId, resource, primaryPdf, basePath));
      stats.fallbacks++;
      continue;
    }

    stats.pagesExtracted += pages.length;

    const validPages = [];
    for (const page of pages) {
      const cleaned = normalizePdfText(page.text);
      if (cleaned.length < MIN_PAGE_TEXT_CHARS) {
        stats.pagesSkipped++;
        continue;
      }
      validPages.push({
        pageNumber: page.pageNumber,
        text: cleaned,
      });
    }

    const totalUsefulChars = validPages.reduce(
      (sum, item) => sum + item.text.length,
      0,
    );

    if (totalUsefulChars < MIN_DOC_TEXT_CHARS || validPages.length === 0) {
      records.push(buildFallbackRecord(courseId, resource, primaryPdf, basePath));
      stats.fallbacks++;
      continue;
    }

    for (const validPage of validPages) {
      records.push({
        url: buildPdfPageUrl(courseId, resource.resourceId, validPage.pageNumber, basePath),
        content: `${resource.title} — Página ${validPage.pageNumber}\n${validPage.text}`,
        language: "es",
        filters: {
          course: [courseId],
          provenance: [resource.provenance],
          kind: ["pdf"],
          ...(Array.isArray(resource.unitSlugs) && resource.unitSlugs.length > 0
            ? { unit: resource.unitSlugs }
            : {}),
          ...(resource.entityType
            ? { entityType: [resource.entityType] }
            : {}),
        },
        meta: {
          title: `${resource.title} (Pág. ${validPage.pageNumber})`,
          provenance: resource.provenance,
          kind: "pdf",
          resourceId: resource.resourceId,
          page: String(validPage.pageNumber),
          fallback: "false",
        },
      });
      stats.pagesIndexed++;
    }
  }

  if (cachePath) {
    const resolvedRoot = path.resolve(repoRoot);
    for (const key of Object.keys(cache.files)) {
      const candidateAbs = path.resolve(resolvedRoot, key);
      const relCheck = path.relative(resolvedRoot, candidateAbs);
      if (
        relCheck.startsWith("..") ||
        path.isAbsolute(relCheck) ||
        !fs.existsSync(candidateAbs)
      ) {
        delete cache.files[key];
        cacheDirty = true;
      }
    }
    if (cacheDirty) {
      savePdfCache(cachePath, cache);
    }
  }

  stats.elapsedMs = Date.now() - startedAt;
  return { records, stats };
}
