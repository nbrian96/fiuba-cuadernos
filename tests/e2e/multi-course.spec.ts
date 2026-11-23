import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

test.describe("Etapa 7 — Extensibilidad Multi-Materia (algo2 + tda)", () => {
  test("Hub muestra ambas materias y recorrido completo de algo2 (dashboard, entrenador, cheatsheet, ejercicios, doc Mermaid y PDF)", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page.getByText("Teoría de Algoritmos")).toBeVisible();
    await expect(page.getByText("Algoritmos y Estructuras de Datos")).toBeVisible();

    await page.goto("/algo2/", { waitUntil: "networkidle" });
    await expect(page.locator("h1")).toContainText("Algoritmos y Estructuras de Datos");
    await expect(page.getByTestId("trainer-prompt")).toBeVisible();

    // Responder una pregunta en el entrenador rápido de algo2
    await page.getByTestId("trainer-option-pila").click();
    await expect(page.getByTestId("trainer-feedback-region")).toContainText("Pila (LIFO)");

    // Abrir CheatsheetDrawer declarativo cargado desde src/content/cheatsheets/algo2.json
    await page.getByTestId("cheatsheet-trigger").click();
    const drawer = page.locator("#cheatsheet-drawer");
    await expect(drawer).toBeVisible();
    await expect(drawer).toContainText("Complejidades de Árboles y Heaps");
    await expect(drawer.locator(".katex").first()).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(drawer).toHaveCount(0);

    // Catálogo de ejercicios de algo2 + filtro + detalle + SolutionDrawer
    await page.goto("/algo2/ejercicios/", { waitUntil: "networkidle" });
    await expect(page.getByTestId("hud-visible-count")).toHaveText("2");
    await page.getByTestId("filter-only-parcial").check();
    await expect(page.getByTestId("hud-visible-count")).toHaveText("1");

    await page.goto("/algo2/ejercicios/algo2-ej-01/", { waitUntil: "networkidle" });
    await page.getByTestId("solution-drawer-algo2-ej-01").locator("summary").click();
    await expect(page.locator(".katex").first()).toBeVisible();
    expect(await page.locator(".katex-error").count()).toBe(0);

    // Apunte MDX con tabla KaTeX y Mermaid
    await page.goto("/algo2/docs/complejidad-estructuras/", { waitUntil: "networkidle" });
    await expect(page.locator(".katex").first()).toBeVisible();
    expect(await page.locator(".katex-error").count()).toBe(0);
    await expect(page.getByTestId("mermaid-diagram").locator(".mermaid-svg-host svg").first()).toBeVisible({
      timeout: 15_000,
    });

    // Visor PDF y descarga HTTP 200
    await page.goto("/algo2/materiales/algo2-guia-01-estructuras/?page=1", {
      waitUntil: "networkidle",
    });
    const iframe = page.locator("iframe.pdf-frame");
    await expect(iframe).toBeVisible();
    const iframeSrc = await iframe.getAttribute("src");
    expect(iframeSrc).toMatch(/^\/materials\/algo2\/.+\.pdf#page=1$/);
    const pdfUrl = (iframeSrc ?? "").split("#")[0];
    const pdfRes = await page.request.get(pdfUrl);
    expect(pdfRes.status()).toBe(200);
    expect(pdfRes.headers()["content-type"]).toContain("application/pdf");

    expect(errors).toEqual([]);
  });

  test("GlobalSearch filtra por materia algo2 y localStorage aísla mc:v1:algo2:* de mc:v1:tda:*", async ({
    page,
  }) => {
    await page.goto("/algo2/ejercicios/", { waitUntil: "networkidle" });
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem("mc:v1:tda:mastered", JSON.stringify(["tda-ej-18"]));
    });
    await page.reload({ waitUntil: "networkidle" });

    // Marcar algo2-ej-01 como dominado y comprobar aislamiento estricto
    await page.getByTestId("mastery-toggle-algo2-ej-01").check();
    const storage = await page.evaluate(() => ({
      algo2: localStorage.getItem("mc:v1:algo2:mastered"),
      tda: localStorage.getItem("mc:v1:tda:mastered"),
      legacy: localStorage.getItem("tda_mastered_exercises"),
    }));
    expect(storage.algo2).toContain("algo2-ej-01");
    expect(storage.tda).toBe(JSON.stringify(["tda-ej-18"]));
    expect(storage.legacy).toBeNull();

    // GlobalSearch filtrando exclusivamente por algo2
    await page.getByTestId("global-search-trigger").click();
    const courseSelect = page.getByTestId("global-search-course");
    await expect(courseSelect).toBeVisible();
    await courseSelect.selectOption("algo2");
    await page.getByTestId("global-search-input").fill("AVL");

    const results = page.getByTestId("global-search-results");
    await expect(results).toBeVisible({ timeout: 10_000 });
    const hrefs = await results
      .locator("a[href]")
      .evaluateAll((els) => els.map((a) => a.getAttribute("href") ?? ""));
    expect(hrefs.length).toBeGreaterThanOrEqual(1);
    for (const href of hrefs) {
      expect(href).toContain("/algo2/");
      expect(href).not.toContain("/tda/");
    }
  });

  test("algo2 cumple WCAG 2.1 AA en Light/Dark y 0 overflow horizontal en viewports clave", async ({
    page,
  }) => {
    const routes = [
      "/algo2/",
      "/algo2/ejercicios/algo2-ej-01/",
      "/algo2/docs/complejidad-estructuras/",
    ] as const;

    for (const theme of ["light", "dark"] as const) {
      await page.goto("/algo2/");
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
      await page.goto("/algo2/", { waitUntil: "networkidle" });
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      );
      expect(overflow, `Overflow horizontal en /algo2/ (${vp.width}x${vp.height})`).toBe(false);
    }
  });
});
