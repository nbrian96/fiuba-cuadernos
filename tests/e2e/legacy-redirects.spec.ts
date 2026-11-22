import { expect, test } from "@playwright/test";

test.describe("Etapa 6 — Compatibilidad de Rutas Legacy y Activos Multi-Archivo", () => {
  test("redirige /dyc.html#ej-80 hacia /tda/unidad/dyc/#ej-80 con tarjeta visible", async ({
    page,
  }) => {
    await page.goto("/dyc.html#ej-80");
    await page.waitForURL("**/tda/unidad/dyc/#ej-80");
    await expect(page.locator("#ej-80")).toBeVisible();
  });

  test("redirige /todos.html#entrenador-30s y /#entrenador-30s hacia /tda/#entrenador-30s", async ({
    page,
  }) => {
    await page.goto("/todos.html#entrenador-30s");
    await page.waitForURL("**/tda/#entrenador-30s");
    await expect(page.locator("#entrenador-30s")).toBeVisible();

    await page.goto("/#entrenador-30s");
    await page.waitForURL("**/tda/#entrenador-30s");
    await expect(page.locator("#entrenador-30s")).toBeVisible();
  });

  test("redirige /parciales.html y /teoria-avanzados.html#set-cover a sus rutas canónicas", async ({
    page,
  }) => {
    await page.goto("/parciales.html");
    await page.waitForURL("**/tda/parciales/");
    await expect(page.locator("h1")).toContainText(/parciales/i);

    await page.goto("/teoria-avanzados.html#set-cover");
    await page.waitForURL("**/tda/avanzados/#set-cover");
    await expect(page.locator("#set-cover")).toBeVisible();
  });

  test("sirve enlaces descargables para todos los archivos de tda-tp0-entrega-archivos y MIME image/png", async ({
    page,
    request,
  }) => {
    await page.goto("/tda/materiales/tda-tp0-entrega-archivos/");

    for (const fname of ["cuartetos.py", "cuartetos_malo.py", "grafico_tiempos.png"]) {
      await expect(
        page.locator(`a[href*="${fname}"]`).first(),
      ).toBeVisible();
    }

    const imgResponse = await request.get(
      "/materials/tda/TP0/grafico_tiempos.png",
    );
    expect(imgResponse.status()).toBe(200);
    expect(imgResponse.headers()["content-type"]).toContain("image/png");
  });
});
