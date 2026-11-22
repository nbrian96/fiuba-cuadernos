import { expect, test } from "@playwright/test";

const VIEWPORTS = [
  { name: "Desktop Full HD (1920x1080)", width: 1920, height: 1080 },
  { name: "Desktop Wide (1440x900)", width: 1440, height: 900 },
  { name: "Desktop Laptop (1280x800)", width: 1280, height: 800 },
  { name: "Tablet (768x1024)", width: 768, height: 1024 },
  { name: "Mobile Portrait (390x844)", width: 390, height: 844 },
  { name: "Mobile Landscape (844x390)", width: 844, height: 390 },
] as const;

const TARGET_ROUTES = [
  "/tda/",
  "/tda/ejercicios/",
  "/tda/ejercicios/tda-ej-77/",
  "/tda/avanzados/",
  "/tda/parciales/",
  "/tda/docs/matriz-parciales/",
  "/tda/materiales/tda-slide-13-programacion-lineal-ii/?page=1",
] as const;

test.describe("Etapa 5 — Matriz Responsive Multi-Dispositivo (6 Viewports × 7 Rutas)", () => {
  for (const vp of VIEWPORTS) {
    test(`cumple layout sin overflow horizontal ni errores en ${vp.name}`, async ({
      page,
    }) => {
      const consoleErrors: string[] = [];
      const failedRequests: string[] = [];

      page.on("pageerror", (err) => {
        consoleErrors.push(err.message);
      });
      page.on("console", (msg) => {
        if (msg.type() === "error") {
          consoleErrors.push(msg.text());
        }
      });
      page.on("response", (res) => {
        if (res.status() >= 400) {
          failedRequests.push(`${res.status()} ${res.url()}`);
        }
      });

      await page.setViewportSize({ width: vp.width, height: vp.height });

      for (const route of TARGET_ROUTES) {
        const response = await page.goto(route);
        expect(response?.status(), `Status en ${route} (${vp.name})`).toBe(200);

        const metrics = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
        }));

        expect(
          metrics.scrollWidth,
          `Overflow horizontal detectado en ${route} bajo ${vp.name}: scrollWidth=${metrics.scrollWidth} > innerWidth=${metrics.innerWidth}`,
        ).toBeLessThanOrEqual(metrics.innerWidth);

        // Verificación de aprovechamiento de ancho en ejercicios en monitores de escritorio
        if (route === "/tda/ejercicios/tda-ej-77/" && vp.width >= 1280) {
          const widthRatio = await page.evaluate(() => {
            const panel = document.querySelector("article.surface-panel");
            const prose = document.querySelector(".prose-academic");
            if (!panel || !prose) return 0;
            const panelRect = panel.getBoundingClientRect();
            const proseRect = prose.getBoundingClientRect();
            return proseRect.width / panelRect.width;
          });
          expect(
            widthRatio,
            `.prose-academic debe aprovechar >= 90% del ancho de article.surface-panel en ${vp.name}`,
          ).toBeGreaterThanOrEqual(0.9);
        }

        // Verificación de TOC móvil vs desktop en /tda/avanzados/
        if (route === "/tda/avanzados/") {
          if (vp.width <= 900) {
            await expect(page.locator("details.doc-toc-mobile")).toBeVisible();
            await expect(page.locator("aside.doc-toc-desktop")).toBeHidden();
          } else {
            await expect(page.locator("aside.doc-toc-desktop")).toBeVisible();
            await expect(page.locator("details.doc-toc-mobile")).toBeHidden();
          }
        }

        // Verificación de scroll interno en tablas anchas en móvil
        if (route === "/tda/docs/matriz-parciales/" && vp.width <= 900) {
          const tableOverflowOk = await page.evaluate(() => {
            const tables = Array.from(
              document.querySelectorAll<HTMLElement>(".prose-academic table"),
            );
            return (
              tables.length > 0 &&
              tables.every(
                (t) =>
                  getComputedStyle(t).overflowX === "auto" &&
                  t.getBoundingClientRect().width <= window.innerWidth,
              )
            );
          });
          expect(tableOverflowOk).toBe(true);
        }
      }

      expect(consoleErrors, `Errores JS en ${vp.name}`).toEqual([]);
      expect(failedRequests, `Errores HTTP >= 400 en ${vp.name}`).toEqual([]);
    });
  }
});
