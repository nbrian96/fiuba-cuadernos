import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

test.describe("Extensibilidad Multi-Materia (redes + tda)", () => {
  test("Hub muestra ambas materias y recorrido completo de redes (dashboard, cheatsheet, doc analítico con Mermaid y visor PDF)", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page.getByText("Teoría de Algoritmos")).toBeVisible();
    await expect(page.getByText("Redes", { exact: true })).toBeVisible();

    await page.goto("/redes/", { waitUntil: "networkidle" });
    await expect(page.locator("h1")).toContainText("Redes");

    // Abrir CheatsheetDrawer declarativo cargado desde src/content/cheatsheets/redes.json
    await page.getByTestId("cheatsheet-trigger").click();
    const drawer = page.locator("#cheatsheet-drawer");
    await expect(drawer).toBeVisible();
    await expect(drawer).toContainText("Capacidad de Canal y Límites Físicos");
    await expect(drawer.locator(".katex").first()).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(drawer).toHaveCount(0);

    // Apunte MDX del Programa Analítico con bloques explicativos y diagrama Mermaid
    await page.goto("/redes/docs/programa-analitico/", { waitUntil: "networkidle" });
    await expect(page.locator("h1").first()).toContainText("Programa Analítico");
    await expect(page.locator(".academic-block--important").first()).toBeVisible();
    await expect(
      page.getByTestId("mermaid-diagram").locator(".mermaid-svg-host svg").first(),
    ).toBeVisible({
      timeout: 15_000,
    });

    // Visor PDF y descarga HTTP 200 de presentación de cátedra
    await page.goto("/redes/materiales/redes-presentacion-01/?page=1", {
      waitUntil: "networkidle",
    });
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
