import { expect, test } from "@playwright/test";

test.describe("Etapa 5 — Flujos funcionales críticos y migración de localStorage", () => {
  test("migra claves legacy tda_* a mc:v1:* sin borrarlas y persiste cambios tras recarga", async ({
    page,
  }) => {
    await page.goto("/tda/");
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem("tda_theme", "dark");
      localStorage.setItem(
        "tda_mastered_exercises",
        JSON.stringify([1, "18", 77]),
      );
      localStorage.setItem(
        "tda_exam_checklist",
        JSON.stringify({ chk_20c98e6a10164095: true }),
      );
      localStorage.setItem("tda_study_mode", "emergency");
    });

    await page.goto("/tda/ejercicios/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.getByTestId("mode-emergency")).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    const storageSnapshot = await page.evaluate(() => ({
      legacyTheme: localStorage.getItem("tda_theme"),
      legacyMastered: localStorage.getItem("tda_mastered_exercises"),
      legacyChecklist: localStorage.getItem("tda_exam_checklist"),
      legacyMode: localStorage.getItem("tda_study_mode"),
      newTheme: localStorage.getItem("mc:v1:global:theme"),
      newMastered: localStorage.getItem("mc:v1:tda:mastered"),
      newChecklist: localStorage.getItem("mc:v1:tda:checklist"),
      newMode: localStorage.getItem("mc:v1:tda:study_mode"),
      sentinel: localStorage.getItem("mc:v1:tda:migrated_from_legacy"),
    }));

    // Preservación no destructiva de claves legacy
    expect(storageSnapshot.legacyTheme).toBe("dark");
    expect(storageSnapshot.legacyMastered).toContain("18");
    expect(storageSnapshot.legacyChecklist).toContain("chk_20c98e6a10164095");
    expect(storageSnapshot.legacyMode).toBe("emergency");

    // Claves namespaced nuevas pobladas
    expect(storageSnapshot.sentinel).toBeTruthy();
    expect(storageSnapshot.newTheme).toBe("dark");
    expect(storageSnapshot.newMastered).toContain("tda-ej-01");
    expect(storageSnapshot.newMastered).toContain("tda-ej-18");
    expect(storageSnapshot.newMastered).toContain("tda-ej-77");
    expect(storageSnapshot.newChecklist).toContain("chk_20c98e6a10164095");
    expect(storageSnapshot.newMode).toContain("emergency");

    // Cambiar a Todos, marcar ejercicio adicional como dominado y verificar persistencia tras reload
    await page.getByTestId("mode-all").click();
    await expect(page.getByTestId("hud-visible-count")).toHaveText("87");
    await expect(page.getByTestId("hud-mastered-count")).toHaveText("3");

    const toggleEj02 = page.getByTestId("mastery-toggle-tda-ej-02");
    await toggleEj02.check();
    await expect(page.getByTestId("hud-mastered-count")).toHaveText("4");

    await page.reload();
    await expect(page.getByTestId("hud-mastered-count")).toHaveText("4");
    await expect(page.getByTestId("mastery-toggle-tda-ej-02")).toBeChecked();

    // Verificar checklist migrado y persistencia
    await page.goto("/tda/docs/checklist-pre-parcial/");
    await expect(page.getByTestId("checklist-counter")).toContainText("1 / 11");
    const firstItem = page.getByTestId("checklist-item-chk_20c98e6a10164095");
    await expect(firstItem).toBeChecked();
  });

  test("filtra catálogo en ExerciseFilterHUD y opera SolutionDrawer en detalle", async ({
    page,
  }) => {
    await page.goto("/tda/ejercicios/", { waitUntil: "networkidle" });
    await expect(page.getByTestId("hud-visible-count")).toHaveText("87");

    await page.getByTestId("filter-only-parcial").check();
    await expect(page.getByTestId("hud-visible-count")).toHaveText("35");

    await page.getByTestId("filter-unit-select").selectOption("greedy");
    await expect(page.getByTestId("hud-visible-count")).toHaveText("5");

    await page.getByTestId("filter-only-parcial").uncheck();
    await expect(page.getByTestId("hud-visible-count")).toHaveText("27");

    // Atajo de teclado '/' enfoca el buscador del HUD
    await expect(page.locator("main h1")).toHaveCount(1);
    await page.locator("main h1").click();
    await page.keyboard.press("/");
    await expect(page.getByTestId("hud-search-input")).toBeFocused();
    await page.getByTestId("hud-search-input").fill("Ruta de Transporte");
    await expect(page.getByTestId("hud-visible-count")).toHaveText("1");
    await page.getByTestId("filter-unit-select").selectOption("all");
    await expect(page.getByTestId("hud-visible-count")).toHaveText("3");

    // Navegar a un ejercicio con Mermaid y abrir SolutionDrawer
    await page.goto("/tda/ejercicios/tda-ej-77/", { waitUntil: "networkidle" });
    const drawer = page.getByTestId("solution-drawer-tda-ej-77");
    await expect(drawer).not.toHaveAttribute("open", "");
    await drawer.locator("summary").click();
    await expect(drawer).toHaveAttribute("open", "");

    const mermaidSvg = drawer.locator(".mermaid-svg-host svg");
    await expect(mermaidSvg).toBeVisible({ timeout: 15_000 });
    const box = await mermaidSvg.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThan(100);
    expect(box?.height ?? 0).toBeGreaterThan(40);
  });

  test("bloquea Ctrl+K cuando CheatsheetDrawer está abierto, busca en Pagefind y abre visor PDF real en ?page=N", async ({
    page,
    request,
  }) => {
    await page.goto("/tda/", { waitUntil: "networkidle" });

    // 1. Abrir CheatsheetDrawer y verificar que Ctrl+K no abre GlobalSearch
    await page.getByTestId("cheatsheet-trigger").click();
    await expect(page.locator("#cheatsheet-drawer")).toBeVisible();
    await page.keyboard.press("Control+k");
    await expect(page.getByTestId("global-search-dialog")).toHaveCount(0);

    // Cerrar CheatsheetDrawer con Escape y abrir GlobalSearch con Ctrl+K
    await page.keyboard.press("Escape");
    await expect(page.locator("#cheatsheet-drawer")).toHaveCount(0);

    await page.keyboard.press("Control+k");
    const searchDialog = page.getByTestId("global-search-dialog");
    await expect(searchDialog).toBeVisible();

    await page.getByTestId("global-search-input").fill("simplex");
    await page.getByTestId("global-search-kind-pdf").click();
    await page
      .getByTestId("global-search-provenance")
      .selectOption("official_source");

    const resultsList = page.getByTestId("global-search-results");
    await expect(resultsList).toBeVisible({ timeout: 15_000 });
    const firstResultLink = resultsList.locator("a").first();
    const targetHref = await firstResultLink.getAttribute("href");
    expect(targetHref).toMatch(/\/tda\/materiales\/[^/?#]+\/\?page=\d+/);

    await firstResultLink.click();
    await expect(page).toHaveURL(/\/tda\/materiales\/[^/?#]+\/\?page=\d+/);

    const iframe = page.locator("iframe.pdf-frame");
    await expect(iframe).toBeVisible();
    const iframeSrc = await iframe.getAttribute("src");
    expect(iframeSrc).toMatch(/^\/materials\/tda\/.+\.pdf#page=\d+$/);

    const pdfUrl = (iframeSrc ?? "").split("#")[0];
    const pdfResponse = await request.get(pdfUrl);
    expect(pdfResponse.status()).toBe(200);
    expect(pdfResponse.headers()["content-type"]).toContain("application/pdf");
  });

  test("interactúa con los 5 simuladores React y actualiza Mermaid ante cambio de tema en /tda/avanzados/", async ({
    page,
  }) => {
    await page.goto("/tda/avanzados/", { waitUntil: "networkidle" });

    // 1. Set Cover
    await page.getByTestId("sim-set-cover").scrollIntoViewIfNeeded();
    await page.waitForLoadState("networkidle");
    await expect(page.getByTestId("sc-step-indicator")).toHaveText(
      "Paso 0 de 4",
    );
    for (let i = 1; i <= 4; i++) {
      await page.getByTestId("sc-next").click();
      await expect(page.getByTestId("sc-step-indicator")).toHaveText(
        `Paso ${i} de 4`,
      );
    }
    await expect(page.getByTestId("sc-next")).toBeDisabled();
    await expect(page.getByTestId("sim-set-cover")).toContainText("4.0");

    // 2. Pricing Method
    await page.getByTestId("sim-pricing-method").scrollIntoViewIfNeeded();
    await page.waitForLoadState("networkidle");
    await expect(page.getByTestId("pr-step-indicator")).toHaveText(
      "Paso 0 de 3",
    );
    for (let i = 1; i <= 3; i++) {
      await page.getByTestId("pr-next").click();
      await expect(page.getByTestId("pr-step-indicator")).toHaveText(
        `Paso ${i} de 3`,
      );
    }
    await expect(page.getByTestId("pr-next")).toBeDisabled();

    // 3. Karger Min-Cut
    await page.getByTestId("sim-karger").scrollIntoViewIfNeeded();
    await page.waitForLoadState("networkidle");
    const kargerStep = page.getByTestId("karger-step");
    await kargerStep.click();
    await expect(page.getByTestId("karger-console")).toContainText(
      "Se eligió la arista",
    );
    await kargerStep.click();
    await expect(kargerStep).toBeDisabled();
    await expect(page.getByTestId("karger-console")).toContainText(
      "Corte resultante:",
    );

    // 4. MAX 3-SAT
    await page.getByTestId("sim-max-3sat").scrollIntoViewIfNeeded();
    await page.waitForLoadState("networkidle");
    await page.getByTestId("sat3-single").click();
    await expect(page.getByTestId("sim-max-3sat")).toContainText("/ 8");
    await page.getByTestId("sat3-multi").click();
    await expect(page.getByTestId("sim-max-3sat")).toContainText("100");

    // 5. Hamlet Streaming
    await page.getByTestId("sim-hamlet").scrollIntoViewIfNeeded();
    await page.waitForLoadState("networkidle");
    await page.getByTestId("hamlet-run").click();
    await expect(page.getByTestId("hamlet-status")).toContainText(
      "Estimación:",
    );

    // Diagrama Mermaid TSP y re-render al alternar tema
    const mermaidFigure = page.getByTestId("mermaid-diagram");
    await mermaidFigure.scrollIntoViewIfNeeded();
    const svg = mermaidFigure.locator(".mermaid-svg-host svg");
    await expect(svg).toBeVisible({ timeout: 15_000 });
    const firstSvgId = await svg.getAttribute("id");

    await page.getByTestId("theme-toggle").click();
    await expect
      .poll(async () => svg.getAttribute("id"), { timeout: 10_000 })
      .not.toBe(firstSvgId);
  });
});
