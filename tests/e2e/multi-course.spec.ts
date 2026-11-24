import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

test.describe("Extensibilidad Multi-Materia (redes + tda)", () => {
  test("Hub muestra ambas materias y recorrido completo de redes (dashboard, cheatsheet, doc analítico con Mermaid y visor PDF)", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page.locator("main h1")).toHaveCount(1);
    await expect(page.getByText("Teoría de Algoritmos")).toBeVisible();
    await expect(page.getByText("Redes", { exact: true })).toBeVisible();
    await expect(page.getByText("Núcleo Astro + Islas React activo")).toHaveCount(0);

    // Verificar alineación y altura simétrica de cards del Hub + footer pegado al pie del viewport
    const hubGeometry = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll("section.card-grid > article"));
      const footer = document.querySelector("footer.site-footer");
      return {
        cardRects: cards.map((c) => {
          const r = c.getBoundingClientRect();
          const btn = c.querySelector(".course-card-actions a")?.getBoundingClientRect();
          return { top: r.top, height: r.height, btnTop: btn?.top ?? null };
        }),
        footerBottom: footer?.getBoundingClientRect().bottom ?? 0,
        innerHeight: window.innerHeight,
      };
    });
    expect(hubGeometry.cardRects).toHaveLength(2);
    expect(Math.abs(hubGeometry.cardRects[0].top - hubGeometry.cardRects[1].top)).toBeLessThanOrEqual(1);
    expect(Math.abs(hubGeometry.cardRects[0].height - hubGeometry.cardRects[1].height)).toBeLessThanOrEqual(1);
    expect(
      Math.abs((hubGeometry.cardRects[0].btnTop ?? 0) - (hubGeometry.cardRects[1].btnTop ?? 0)),
    ).toBeLessThanOrEqual(1);
    expect(hubGeometry.footerBottom).toBeGreaterThanOrEqual(hubGeometry.innerHeight - 2);

    await page.goto("/redes/", { waitUntil: "networkidle" });
    await expect(page.locator("main h1")).toHaveCount(1);
    await expect(page.locator("main h1")).toContainText("Redes");
    await expect(page.locator("main")).not.toContainText("1. 1.");

    // Abrir CheatsheetDrawer declarativo cargado desde src/content/cheatsheets/redes.json
    await page.getByTestId("cheatsheet-trigger").click();
    const drawer = page.locator("#cheatsheet-drawer");
    await expect(drawer).toBeVisible();
    await expect(drawer).toContainText("Capacidad de Canal y Límites Físicos");
    await expect(drawer.locator(".katex").first()).toBeVisible();
    await expect(drawer).not.toContainText("$d$");
    await expect(drawer).not.toContainText("$P$");
    await expect(drawer).not.toContainText("$N_c$");
    await page.keyboard.press("Escape");
    await expect(drawer).toHaveCount(0);

    // Apunte MDX del Programa Analítico con bloques explicativos y diagrama Mermaid
    await page.goto("/redes/docs/programa-analitico/", { waitUntil: "networkidle" });
    await expect(page.locator("main h1")).toHaveCount(1);
    await expect(page.locator("main h1")).toContainText("Programa Analítico");
    await expect(page.locator(".academic-block--important").first()).toBeVisible();
    await expect(
      page.getByTestId("mermaid-diagram").locator(".mermaid-svg-host svg").first(),
    ).toBeVisible({
      timeout: 15_000,
    });

    // Apuntes consolidados del Primer Parcial (Teórico Completo + Resumen Activo)
    await page.goto("/redes/docs/apunte-teorico-primer-parcial/", { waitUntil: "networkidle" });
    await expect(page.locator("main h1")).toHaveCount(1);
    await expect(page.locator("main h1")).toContainText("Apunte Teórico Completo");
    await expect(page.locator("main")).not.toContainText("ElaboratedNote");
    await expect(page.locator('[mathcolor="#cc0000"]')).toHaveCount(0);

    await page.goto("/redes/docs/resumen-activo-primer-parcial/", { waitUntil: "networkidle" });
    await expect(page.locator("main h1")).toHaveCount(1);
    await expect(page.locator("main h1")).toContainText("Resumen Activo");
    await expect(page.locator("main")).not.toContainText("ElaboratedSummary");

    // Ejercicios y SolutionDrawer de Redes (sin LaTeX crudo)
    await page.goto("/redes/ejercicios/", { waitUntil: "networkidle" });
    await expect(page.getByTestId("hud-visible-count")).toHaveText("38");
    await page.goto("/redes/ejercicios/redes-ej-17/", { waitUntil: "networkidle" });
    await page.getByTestId("solution-drawer-redes-ej-17").locator("summary").click();
    await expect(page.locator("main")).not.toContainText("$\\to$");

    // Unidad 1 debe listar materiales PDF vinculados (slug oficial u01-intro-telecom)
    await page.goto("/redes/unidad/u01-intro-telecom/", { waitUntil: "networkidle" });
    await expect(page.locator("main")).toContainText("1 ejercicio");
    await expect(page.locator('a[href*="/redes/materiales/redes-presentacion-01"]').first()).toBeVisible();

    // Visor PDF y descarga HTTP 200 de presentación de cátedra + paneles alineados
    await page.goto("/redes/materiales/redes-presentacion-01/?page=1", {
      waitUntil: "networkidle",
    });
    const pdfPanelTopDiff = await page.evaluate(() => {
      const panels = Array.from(document.querySelectorAll(".pdf-split-grid > .surface-panel"));
      if (panels.length < 2) return 999;
      return Math.abs(
        panels[0].getBoundingClientRect().top - panels[1].getBoundingClientRect().top,
      );
    });
    expect(pdfPanelTopDiff).toBeLessThanOrEqual(1);
    const iframe = page.locator("iframe.pdf-frame");
    await expect(iframe).toBeVisible();
    const iframeSrc = await iframe.getAttribute("src");
    expect(iframeSrc).toMatch(/^\/materials\/redes\/.+\.pdf#page=1$/);
    const pdfUrl = (iframeSrc ?? "").split("#")[0];
    const pdfRes = await page.request.get(pdfUrl);
    expect(pdfRes.status()).toBe(200);
    expect(pdfRes.headers()["content-type"]).toContain("application/pdf");

    expect(errors).toEqual([]);
  });

  test("GlobalSearch filtra por materia redes y localStorage aísla mc:v1:redes:* de mc:v1:tda:*", async ({
    page,
  }) => {
    await page.goto("/redes/docs/programa-analitico/", { waitUntil: "networkidle" });
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem("mc:v1:tda:mastered", JSON.stringify(["tda-ej-18"]));
      localStorage.setItem("mc:v1:redes:theme", "dark");
    });
    await page.reload({ waitUntil: "networkidle" });

    const storage = await page.evaluate(() => ({
      redesTheme: localStorage.getItem("mc:v1:redes:theme"),
      tda: localStorage.getItem("mc:v1:tda:mastered"),
      legacy: localStorage.getItem("tda_mastered_exercises"),
    }));
    expect(storage.tda).toBe(JSON.stringify(["tda-ej-18"]));
    expect(storage.legacy).toBeNull();

    // GlobalSearch filtrando exclusivamente por redes
    await page.getByTestId("global-search-trigger").click();
    const courseSelect = page.getByTestId("global-search-course");
    await expect(courseSelect).toBeVisible();
    await courseSelect.selectOption("redes");
    await page.getByTestId("global-search-input").fill("Telecomunicaciones");

    const results = page.getByTestId("global-search-results");
    await expect(results).toBeVisible({ timeout: 10_000 });
    const hrefs = await results
      .locator("a[href]")
      .evaluateAll((els) => els.map((a) => a.getAttribute("href") ?? ""));
    expect(hrefs.length).toBeGreaterThanOrEqual(1);
    for (const href of hrefs) {
      expect(href).toContain("/redes/");
      expect(href).not.toContain("/tda/");
    }
  });

  test("redes cumple WCAG 2.1 AA en Light/Dark y 0 overflow horizontal en viewports clave", async ({
    page,
  }) => {
    const routes = [
      "/redes/",
      "/redes/docs/programa-analitico/",
      "/redes/docs/apunte-teorico-primer-parcial/",
      "/redes/docs/resumen-activo-primer-parcial/",
      "/redes/ejercicios/",
      "/redes/materiales/redes-presentacion-01/",
    ] as const;

    for (const theme of ["light", "dark"] as const) {
      await page.goto("/redes/");
      await page.evaluate((t) => {
        localStorage.setItem("mc:v1:global:theme", t);
        document.documentElement.setAttribute("data-theme", t);
      }, theme);

      for (const route of routes) {
        await page.goto(route, { waitUntil: "networkidle" });
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
        expect(results.violations, `WCAG en ${route} (${theme})`).toEqual([]);
      }
    }

    for (const vp of [
      { width: 1440, height: 900 },
      { width: 390, height: 844 },
      { width: 844, height: 390 },
    ]) {
      await page.setViewportSize(vp);
      await page.goto("/redes/", { waitUntil: "networkidle" });
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      );
      expect(overflow, `Overflow horizontal en /redes/ (${vp.width}x${vp.height})`).toBe(false);
    }
  });
});
