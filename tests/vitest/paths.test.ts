import { describe, expect, it } from "vitest";
import {
  buildMaterialViewerUrl,
  normalizeBase,
  stripBase,
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
      expect(normalizeBase("tda-2C2026-material")).toBe("/tda-2C2026-material/");
      expect(normalizeBase("/tda-2C2026-material")).toBe("/tda-2C2026-material/");
      expect(normalizeBase("///tda-2C2026-material///")).toBe("/tda-2C2026-material/");
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
      const base = "/tda-2C2026-material/";
      expect(withBase("/", base)).toBe("/tda-2C2026-material/");
      expect(withBase("", base)).toBe("/tda-2C2026-material/");
      expect(withBase("/tda/", base)).toBe("/tda-2C2026-material/tda/");
      expect(withBase("tda/ejercicios/", base)).toBe(
        "/tda-2C2026-material/tda/ejercicios/",
      );
      expect(withBase("/?tab=resumen#top", base)).toBe(
        "/tda-2C2026-material/?tab=resumen#top",
      );
      expect(withBase("/tda/ejercicios/#ej-18", base)).toBe(
        "/tda-2C2026-material/tda/ejercicios/#ej-18",
      );
    });

    it("is strictly idempotent and rejects deceptive partial prefix collisions", () => {
      const base = "/tda-2C2026-material/";
      const once = withBase("/tda/parciales/", base);
      expect(once).toBe("/tda-2C2026-material/tda/parciales/");
      expect(withBase(once, base)).toBe(once);
      expect(withBase("/tda-2C2026-material", base)).toBe("/tda-2C2026-material");
      expect(withBase("/tda-2C2026-material/", base)).toBe(
        "/tda-2C2026-material/",
      );

      // Must NOT confuse /tda-2C2026-material-v2/ with /tda-2C2026-material/
      expect(withBase("/tda-2C2026-material-v2/docs/", base)).toBe(
        "/tda-2C2026-material/tda-2C2026-material-v2/docs/",
      );
    });

    it("preserves external schemes, protocol-relative URLs, pure hashes, and pure queries", () => {
      const base = "/tda-2C2026-material/";
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
      const base = "/tda-2C2026-material/";
      expect(stripBase("/tda-2C2026-material/", base)).toBe("/");
      expect(stripBase("/tda-2C2026-material", base)).toBe("/");
      expect(stripBase("/tda-2C2026-material/tda/docs/?page=2#sec", base)).toBe(
        "/tda/docs/?page=2#sec",
      );
      expect(stripBase("/tda-2C2026-material-v2/foo", base)).toBe(
        "/tda-2C2026-material-v2/foo",
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
          "/tda-2C2026-material/",
        ),
      ).toBe(
        "/tda-2C2026-material/tda/materiales/tda-slide-13-programacion-lineal-ii?page=12",
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
});
