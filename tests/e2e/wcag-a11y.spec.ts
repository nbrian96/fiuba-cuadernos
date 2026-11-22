import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

const AUDIT_ROUTES = [
  "/",
  "/tda/",
  "/tda/ejercicios/",
  "/tda/ejercicios/tda-ej-77/",
  "/tda/parciales/",
  "/tda/unidad/greedy/",
  "/tda/avanzados/",
  "/tda/docs/matriz-parciales/",
  "/tda/docs/checklist-pre-parcial/",
  "/tda/materiales/",
  "/tda/materiales/tda-slide-13-programacion-lineal-ii/?page=1",
] as const;

test.describe("Etapa 5 — Auditoría WCAG 2.1 AA (@axe-core/playwright) y Estilos Computados", () => {
  for (const theme of ["light", "dark"] as const) {
    test(`pasa auditoría axe-core WCAG 2.1 AA con 0 violaciones en tema '${theme}'`, async ({
      page,
    }) => {
      await page.goto("/");
      await page.evaluate((targetTheme) => {
        localStorage.setItem("mc:v1:global:theme", targetTheme);
        document.documentElement.setAttribute("data-theme", targetTheme);
      }, theme);

      for (const route of AUDIT_ROUTES) {
        await page.goto(route);
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);

        if (route === "/tda/ejercicios/tda-ej-77/") {
          await page
            .getByTestId("solution-drawer-tda-ej-77")
            .locator("summary")
            .click();
        }

        const results = await new AxeBuilder({ page })
          .withTags(WCAG_TAGS)
          // El contenido interno del visor PDF nativo del navegador dentro de <iframe> no forma parte del DOM de la aplicación
          .exclude("iframe.pdf-frame")
          .analyze();

        expect(
          results.violations.map((v) => ({
            id: v.id,
            impact: v.impact,
            description: v.description,
            nodes: v.nodes.map((n) => n.html.slice(0, 120)),
          })),
          `Violaciones WCAG 2.1 AA en ${route} (tema ${theme})`,
        ).toEqual([]);
      }
    });
  }

  test("verifica modales abiertos (GlobalSearch y CheatsheetDrawer) con axe-core y estilos computados (:focus-visible, :disabled, inert)", async ({
    page,
  }) => {
    await page.goto("/tda/avanzados/");

    // 1. Verificar estado :disabled computado en botones iniciales de simuladores
    const disabledCursor = await page
      .getByTestId("sc-prev")
      .evaluate((el) => window.getComputedStyle(el).cursor);
    expect(disabledCursor).toBe("not-allowed");

    // 2. Verificar :focus-visible por teclado en el botón Buscar
    const searchTrigger = page.getByTestId("global-search-trigger");
    await searchTrigger.focus();
    const outlineStyle = await searchTrigger.evaluate(
      (el) => window.getComputedStyle(el).outlineStyle,
    );
    expect(outlineStyle).not.toBe("none");

    // 3. Abrir GlobalSearch, verificar atributo inert en el fondo y auditar diálogo con axe-core
    await searchTrigger.click();
    await expect(page.getByTestId("global-search-dialog")).toBeVisible();
    const mainHasInert = await page
      .locator("main#main-content")
      .evaluate((el) => Boolean(el.closest("[inert]")));
    expect(mainHasInert).toBe(true);

    const searchAxe = await new AxeBuilder({ page })
      .include('[data-testid="global-search-dialog"]')
      .withTags(WCAG_TAGS)
      .analyze();
    expect(searchAxe.violations).toEqual([]);

    await page.keyboard.press("Escape");
    await expect(page.getByTestId("global-search-dialog")).toHaveCount(0);

    // 4. Abrir CheatsheetDrawer y auditar con axe-core
    await page.getByTestId("cheatsheet-trigger").click();
    await expect(page.locator("#cheatsheet-drawer")).toBeVisible();

    const drawerAxe = await new AxeBuilder({ page })
      .include("#cheatsheet-drawer")
      .withTags(WCAG_TAGS)
      .analyze();
    expect(drawerAxe.violations).toEqual([]);

    await page.keyboard.press("Escape");
    await expect(page.locator("#cheatsheet-drawer")).toHaveCount(0);
  });
});
