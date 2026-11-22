import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  PROTOTYPE_PDF_RESOURCE_IDS,
  buildPdfIndexRecords,
  buildPdfPageUrl,
  extractPdfPages,
  normalizePdfText,
} from "../../src/utils/pagefindPdfIndexer.mjs";

const tempDirs: string[] = [];

function makeTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pf-pdf-test-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir && fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe("pagefindPdfIndexer (ADR-004)", () => {
  it("normalizes whitespace and builds canonical ?page= URLs", () => {
    expect(normalizePdfText("  Hola\t\tmundo\r\n\u0000simplex  ")).toBe(
      "Hola mundo simplex",
    );
    expect(buildPdfPageUrl("tda", "tda-guia-completa-v1", 7, "/")).toBe(
      "/tda/materiales/tda-guia-completa-v1/?page=7",
    );
    expect(
      buildPdfPageUrl("tda", "tda-guia-completa-v1", 3, "/fiuba-cuadernos/"),
    ).toBe("/fiuba-cuadernos/tda/materiales/tda-guia-completa-v1/?page=3");
  });

  it("selects strictly the 4 prototype PDFs in scope='prototype' and caches extraction", async () => {
    const root = makeTempDir();
    const cachePath = path.join(root, ".astro", "pdf-text-cache.json");

    const resources = [
      ...PROTOTYPE_PDF_RESOURCE_IDS.map((rid, idx) => {
        const rel = `pdfs/proto-${idx}.pdf`;
        const abs = path.join(root, rel);
        fs.mkdirSync(path.dirname(abs), { recursive: true });
        fs.writeFileSync(abs, `dummy-pdf-${idx}`);
        return {
          resourceId: rid,
          title: `Recurso ${rid}`,
          provenance: "official_source",
          unitSlugs: ["pl"],
          files: [{ path: rel, extension: ".pdf", isPdf: true }],
        };
      }),
      {
        resourceId: "extra-non-proto",
        title: "Extra no prototipo",
        provenance: "official_source",
        unitSlugs: ["dyc"],
        files: [{ path: "pdfs/extra.pdf", extension: ".pdf", isPdf: true }],
      },
    ];
    fs.writeFileSync(path.join(root, "pdfs/extra.pdf"), "extra-pdf");

    let extractCalls = 0;
    const extractStub = async () => {
      extractCalls++;
      return [
        { pageNumber: 1, text: "corto" }, // < 20 chars -> descartada
        {
          pageNumber: 2,
          text: "Programación lineal dualidad simplex tabla canónica completa para el parcial.",
        },
        {
          pageNumber: 3,
          text: "Teorema de dualidad fuerte y holgura complementaria con cotas exactas en grafos.",
        },
      ];
    };

    const firstRun = await buildPdfIndexRecords({
      courseId: "tda",
      resources,
      repoRoot: root,
      scope: "prototype",
      cachePath,
      extractFn: extractStub,
    });

    expect(extractCalls).toBe(4);
    expect(firstRun.stats.pdfsSelected).toBe(4);
    expect(firstRun.stats.pagesIndexed).toBe(8); // 2 páginas válidas * 4 PDFs
    expect(firstRun.stats.pagesSkipped).toBe(4); // pág 1 corta * 4 PDFs
    expect(firstRun.stats.fallbacks).toBe(0);
    expect(fs.existsSync(cachePath)).toBe(true);

    // Segunda corrida debe leer completamente desde caché SHA-256 sin llamar a extractStub
    const secondRun = await buildPdfIndexRecords({
      courseId: "tda",
      resources,
      repoRoot: root,
      scope: "prototype",
      cachePath,
      extractFn: extractStub,
    });
    expect(extractCalls).toBe(4);
    expect(secondRun.stats.cacheHits).toBe(4);
    expect(secondRun.records).toEqual(firstRun.records);
  });

  it("emits metadata_fallback when total extracted chars < 80 or extraction throws", async () => {
    const root = makeTempDir();
    fs.mkdirSync(path.join(root, "pdfs"), { recursive: true });
    fs.writeFileSync(path.join(root, "pdfs/scanned.pdf"), "scan");
    fs.writeFileSync(path.join(root, "pdfs/broken.pdf"), "broken");

    const resources = [
      {
        resourceId: "scanned-pdf",
        title: "Escaneado sin OCR",
        description: "Apunte escaneado de flujo",
        provenance: "reconstructed_exam_statement",
        unitSlugs: ["flujo"],
        files: [{ path: "pdfs/scanned.pdf", extension: ".pdf", isPdf: true }],
      },
      {
        resourceId: "broken-pdf",
        title: "PDF ilegible",
        provenance: "official_source",
        unitSlugs: ["dp"],
        files: [{ path: "pdfs/broken.pdf", extension: ".pdf", isPdf: true }],
      },
    ];

    const res = await buildPdfIndexRecords({
      courseId: "tda",
      resources,
      repoRoot: root,
      scope: "all",
      extractFn: async (absPath) => {
        if (absPath.endsWith("broken.pdf")) {
          throw new Error("corrupt pdf");
        }
        return [{ pageNumber: 1, text: "Solo 25 caracteres aqui..." }]; // >=20 pero total < 80
      },
    });

    expect(res.stats.pdfsProcessed).toBe(2);
    expect(res.stats.pagesIndexed).toBe(0);
    expect(res.stats.fallbacks).toBe(2);
    expect(res.records).toHaveLength(2);
    expect(res.records[0].meta.fallback).toBe("true");
    expect(res.records[0].url).toBe("/tda/materiales/scanned-pdf/?page=1");
    expect(res.records[1].meta.fallback).toBe("true");
  });

  it("skips all PDF processing when scope='none'", async () => {
    const res = await buildPdfIndexRecords({
      courseId: "tda",
      resources: [
        {
          resourceId: "r1",
          title: "PDF",
          provenance: "official_source",
          unitSlugs: ["dyc"],
          files: [{ path: "x.pdf", extension: ".pdf", isPdf: true }],
        },
      ],
      repoRoot: process.cwd(),
      scope: "none",
    });
    expect(res.records).toHaveLength(0);
    expect(res.stats.pdfsProcessed).toBe(0);
  });

  it("extracts real text from TP0 PDF via pdfjs-dist and includes unit/entityType filters", async () => {
    const repoRoot = process.cwd();
    const tp0Path = path.join(repoRoot, "materias", "tda", "TP0", "TP0_Nelson_Avila_100244.pdf");
    const pages = await extractPdfPages(tp0Path);
    expect(pages.length).toBeGreaterThanOrEqual(5);
    expect(pages[0].text.length).toBeGreaterThan(150);

    const indexed = await buildPdfIndexRecords({
      courseId: "tda",
      resources: [
        {
          resourceId: "tda-tp0-entrega-informe",
          title: "Informe TP0",
          entityType: "ElaboratedTPSubmission",
          provenance: "elaborated_submission",
          unitSlugs: ["general"],
          files: [
            {
              path: "materias/tda/TP0/TP0_Nelson_Avila_100244.pdf",
              extension: ".pdf",
              isPdf: true,
            },
          ],
        },
      ],
      repoRoot,
      scope: "prototype",
    });

    expect(indexed.stats.pagesIndexed).toBeGreaterThanOrEqual(5);
    expect(indexed.records[0].filters.unit).toEqual(["general"]);
    expect(indexed.records[0].filters.entityType).toEqual([
      "ElaboratedTPSubmission",
    ]);
  });
});
