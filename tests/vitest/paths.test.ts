import { describe, expect, it } from "vitest";
import {
  buildMaterialViewerUrl,
  normalizeBase,
  stripBase,
  toPublishedMaterialRelPath,
  withBase,
} from "@/utils/paths";

describe("paths utility (ADR-001 / ADR-004)", () => {
  describe("normalizeBase", () => {
    it("normalizes empty and root values to '/'", () => {
      expect(normalizeBase(undefined)).toBe("/");
      expect(normalizeBase("")).toBe("/");
      expect(normalizeBase("   ")).toBe("/");
      expect(normalizeBase("/")).toBe("/");
      expect(normalizeBase("///")).toBe("/");
    });

    it("normalizes repository subpaths with single leading and trailing slash", () => {
      expect(normalizeBase("fiuba-cuadernos")).toBe("/fiuba-cuadernos/");
      expect(normalizeBase("/fiuba-cuadernos")).toBe("/fiuba-cuadernos/");
      expect(normalizeBase("///fiuba-cuadernos///")).toBe("/fiuba-cuadernos/");
      expect(normalizeBase("/org//repo/")).toBe("/org/repo/");
    });
  });

  describe("withBase", () => {
    it("resolves internal routes under root '/' base", () => {
      expect(withBase("/", "/")).toBe("/");
      expect(withBase("", "/")).toBe("/");
      expect(withBase("/tda/", "/")).toBe("/tda/");
      expect(withBase("tda/ejercicios/", "/")).toBe("/tda/ejercicios/");
      expect(withBase("///tda//parciales/", "/")).toBe("/tda/parciales/");
    });

    it("resolves internal routes under GitHub Pages subpath", () => {
      const base = "/fiuba-cuadernos/";
      expect(withBase("/", base)).toBe("/fiuba-cuadernos/");
      expect(withBase("", base)).toBe("/fiuba-cuadernos/");
      expect(withBase("/tda/", base)).toBe("/fiuba-cuadernos/tda/");
      expect(withBase("tda/ejercicios/", base)).toBe(
        "/fiuba-cuadernos/tda/ejercicios/",
      );
      expect(withBase("/?tab=resumen#top", base)).toBe(
        "/fiuba-cuadernos/?tab=resumen#top",
      );
      expect(withBase("/tda/ejercicios/#ej-18", base)).toBe(
        "/fiuba-cuadernos/tda/ejercicios/#ej-18",
      );
    });

    it("is strictly idempotent and rejects deceptive partial prefix collisions", () => {
      const base = "/fiuba-cuadernos/";
      const once = withBase("/tda/parciales/", base);
      expect(once).toBe("/fiuba-cuadernos/tda/parciales/");
      expect(withBase(once, base)).toBe(once);
      expect(withBase("/fiuba-cuadernos", base)).toBe("/fiuba-cuadernos");
      expect(withBase("/fiuba-cuadernos/", base)).toBe(
        "/fiuba-cuadernos/",
      );

      // Must NOT confuse /fiuba-cuadernos-v2/ with /fiuba-cuadernos/
      expect(withBase("/fiuba-cuadernos-v2/docs/", base)).toBe(
        "/fiuba-cuadernos/fiuba-cuadernos-v2/docs/",
      );
    });

    it("preserves external schemes, protocol-relative URLs, pure hashes, and pure queries", () => {
      const base = "/fiuba-cuadernos/";
      expect(withBase("https://nbrian96.github.io/x", base)).toBe(
        "https://nbrian96.github.io/x",
      );
      expect(withBase("http://localhost:4321/", base)).toBe(
        "http://localhost:4321/",
      );
      expect(withBase("mailto:docencia@fi.uba.ar", base)).toBe(
        "mailto:docencia@fi.uba.ar",
      );
      expect(withBase("//cdn.jsdelivr.net/npm/katex", base)).toBe(
        "//cdn.jsdelivr.net/npm/katex",
      );
      expect(withBase("#ej-18", base)).toBe("#ej-18");
      expect(withBase("?page=3", base)).toBe("?page=3");
    });
  });

  describe("stripBase", () => {
    it("strips configured base cleanly without affecting non-matching paths", () => {
      const base = "/fiuba-cuadernos/";
      expect(stripBase("/fiuba-cuadernos/", base)).toBe("/");
      expect(stripBase("/fiuba-cuadernos", base)).toBe("/");
      expect(stripBase("/fiuba-cuadernos/tda/docs/?page=2#sec", base)).toBe(
        "/tda/docs/?page=2#sec",
      );
      expect(stripBase("/fiuba-cuadernos-v2/foo", base)).toBe(
        "/fiuba-cuadernos-v2/foo",
      );
      expect(stripBase("/tda/", "/")).toBe("/tda/");
    });
  });

  describe("buildMaterialViewerUrl", () => {
    it("builds canonical ADR-004 material viewer URLs with optional page", () => {
      expect(
        buildMaterialViewerUrl(
          "tda",
          "tda-slide-13-programacion-lineal-ii",
          12,
          "/fiuba-cuadernos/",
        ),
      ).toBe(
        "/fiuba-cuadernos/tda/materiales/tda-slide-13-programacion-lineal-ii?page=12",
      );
      expect(
        buildMaterialViewerUrl("tda", "tda-guia-completa-v1", undefined, "/"),
      ).toBe("/tda/materiales/tda-guia-completa-v1");
    });

    it("rejects invalid slugs, path traversal, and non-positive or non-integer page numbers", () => {
      expect(() => buildMaterialViewerUrl("TDA_BAD", "ok-id")).toThrow();
      expect(() => buildMaterialViewerUrl("tda", "bad/id")).toThrow();
      expect(() => buildMaterialViewerUrl("tda", "../etc")).toThrow();
      expect(() => buildMaterialViewerUrl("../tda", "ok-id")).toThrow();
      expect(() => buildMaterialViewerUrl("tda", "ok-id", 0)).toThrow(RangeError);
      expect(() => buildMaterialViewerUrl("tda", "ok-id", -1)).toThrow(RangeError);
      expect(() => buildMaterialViewerUrl("tda", "ok-id", 1.5)).toThrow(RangeError);
      expect(() => buildMaterialViewerUrl("tda", "ok-id", Number.NaN)).toThrow(
        RangeError,
      );
    });
  });

  describe("toPublishedMaterialRelPath", () => {
    it("avoids duplicating courseId prefix whether source path is rooted or under courseId/", () => {
      expect(toPublishedMaterialRelPath("tda", "DIapositivas/a.pdf")).toBe(
        "tda/DIapositivas/a.pdf",
      );
      expect(toPublishedMaterialRelPath("tda", "tda/DIapositivas/a.pdf")).toBe(
        "tda/DIapositivas/a.pdf",
      );
      expect(toPublishedMaterialRelPath("tda", "/tda/TP0/cuartetos.py")).toBe(
        "tda/TP0/cuartetos.py",
      );
      expect(
        toPublishedMaterialRelPath("tda", "materias/tda/TP0/cuartetos.py"),
      ).toBe("tda/TP0/cuartetos.py");
    });
  });
});
