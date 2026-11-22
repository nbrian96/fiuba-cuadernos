import { expect, test } from "@playwright/test";

test.describe("Etapa 5 — Link Checker E2E y Resolución de Recursos Estáticos", () => {
  test("recorre enlaces internos de navegación principal, unidades, parciales, apuntes y materiales sin enlaces rotos", async ({
    page,
    request,
  }) => {
    const seedPages = [
      "/",
      "/tda/",
      "/tda/ejercicios/",
      "/tda/parciales/",
      "/tda/avanzados/",
      "/tda/materiales/",
      "/tda/docs/matriz-parciales/",
      "/tda/docs/checklist-pre-parcial/",
      "/tda/docs/problema-mochila-y-greedy/",
    ];

    const discoveredInternalUrls = new Set<string>();

    for (const seed of seedPages) {
      const res = await page.goto(seed);
      expect(res?.status(), `Seed ${seed}`).toBe(200);

      const links = await page.evaluate(() =>
        Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]")).map(
          (a) => a.getAttribute("href") ?? "",
        ),
      );

      for (const href of links) {
        if (!href || href.startsWith("http://") || href.startsWith("https://") || href.startsWith("mailto:")) {
          continue;
        }
        if (href.startsWith("#")) {
          const id = decodeURIComponent(href.slice(1));
          if (id) {
            const exists = await page.evaluate(
              (targetId) => Boolean(document.getElementById(targetId)),
              id,
            );
            expect(
              exists,
              `Ancla intra-página #${id} inexistente en ${seed}`,
            ).toBe(true);
          }
          continue;
        }
        const resolved = new URL(href, page.url());
        discoveredInternalUrls.add(`${resolved.pathname}${resolved.search}`);
      }
    }

    expect(discoveredInternalUrls.size).toBeGreaterThan(40);

    const urlList = Array.from(discoveredInternalUrls);
    const batchSize = 10;
    for (let i = 0; i < urlList.length; i += batchSize) {
      const batch = urlList.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (targetUrl) => {
          const response = await request.get(targetUrl);
          expect(
            response.status(),
            `Enlace interno roto detectado: ${targetUrl}`,
          ).toBe(200);
        }),
      );
    }
  });
});
