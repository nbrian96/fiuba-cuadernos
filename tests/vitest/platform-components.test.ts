import fs from "node:fs";
import path from "node:path";
import { load as loadYaml } from "js-yaml";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import AcademicBlock from "@/components/platform/AcademicBlock";
import CheatsheetDrawer from "@/components/platform/CheatsheetDrawer";
import ExerciseCard from "@/components/platform/ExerciseCard";
import ExerciseFilterHUD from "@/components/platform/ExerciseFilterHUD";
import InteractiveChecklist from "@/components/platform/InteractiveChecklist";
import PdfSplitViewer from "@/components/platform/PdfSplitViewer";
import ProvenanceBadge from "@/components/platform/ProvenanceBadge";
import QuickRecognitionTrainer from "@/components/platform/QuickRecognitionTrainer";
import SolutionDrawer from "@/components/platform/SolutionDrawer";
import ThemeToggle from "@/components/platform/ThemeToggle";
import { getCheatsheetSections } from "@/data/cheatsheets";
import {
  InteractiveAndNotesManifestSchema,
  PROVENANCE_VALUES,
  ENTITY_TYPE_VALUES,
  QuizManifestSchema,
} from "@/schemas/academic";
import {
  computeFilterSummary,
  filterExercises,
  type ExerciseFilterItem,
} from "@/utils/exerciseFilters";
import { renderInlineMathTextToHtml } from "@/utils/katexStatic";
import {
  buildPdfEmbedUrl,
  buildUpdatedPageSearch,
  clampPdfPage,
  parsePageFromSearch,
} from "@/utils/pdfViewerState";
import { getEntityTypeLabel, getProvenanceMeta } from "@/utils/provenance";
import {
  advanceQuiz,
  computeQuizPercent,
  createInitialQuizState,
  isQuizPassed,
  submitQuizAnswer,
} from "@/utils/quizEngine";

const ROOT = path.resolve(process.cwd());

const SAMPLE_EXERCISES: ExerciseFilterItem[] = [
  {
    id: "tda-ej-18",
    courseId: "tda",
    number: 18,
    title: "Ruta de Transporte con Estaciones",
    unit: "greedy",
    unitName: "Algoritmos Greedy / Voraces",
    entityType: "CatalogExercise",
    provenance: "elaborated_solution",
    priority: "imprescindible",
    difficulty: 2,
    origin: "Parcial 2026-2-1, Ejercicio 4",
    isParcial: true,
    detailHref: "/tda/ejercicios/tda-ej-18/",
  },
  {
    id: "tda-adv-aprox-2partition",
    courseId: "tda",
    number: null,
    title: "2-Partition Problem (Demostración de 2-Aproximación)",
    unit: "avanzados",
    unitName: "Paradigmas Avanzados",
    entityType: "AdvancedTheoryExercise",
    provenance: "advanced_theory_example",
    priority: "importante",
    difficulty: 3,
    origin: "Teoría Avanzada — Sección 16",
    isParcial: false,
    detailHref: "/tda/ejercicios/tda-adv-aprox-2partition/",
  },
];

describe("Platform pure utilities and SSR component rendering (Etapa 3)", () => {
  it("covers all 9 provenances and 13 entityTypes", () => {
    for (const p of PROVENANCE_VALUES) {
      const meta = getProvenanceMeta(p);
      expect(meta.label.length).toBeGreaterThan(3);
      const html = renderToStaticMarkup(createElement(ProvenanceBadge, { provenance: p }));
      expect(html).toContain(meta.shortLabel);
    }
    for (const e of ENTITY_TYPE_VALUES) {
      expect(getEntityTypeLabel(e).length).toBeGreaterThan(3);
    }
  });

  it("filters exercises by mode, difficulty, unit, parcial flag, and search query", () => {
    const mastered = new Set<string>(["tda-ej-18"]);

    const emergency = filterExercises(
      SAMPLE_EXERCISES,
      { mode: "emergency", difficulty: "all", unit: "all", onlyParcial: false, query: "" },
      mastered,
    );
    expect(emergency.map((e) => e.id)).toEqual(["tda-ej-18"]);

    const tactical = filterExercises(
      SAMPLE_EXERCISES,
      { mode: "tactical", difficulty: "all", unit: "all", onlyParcial: false, query: "" },
      mastered,
    );
    expect(tactical.map((e) => e.id)).toEqual(["tda-adv-aprox-2partition"]);

    const byQuery = filterExercises(
      SAMPLE_EXERCISES,
      { mode: "all", difficulty: 2, unit: "greedy", onlyParcial: true, query: "ej 18" },
      mastered,
    );
    expect(byQuery.map((e) => e.id)).toEqual(["tda-ej-18"]);

    const summary = computeFilterSummary(SAMPLE_EXERCISES, emergency, mastered);
    expect(summary.totalExercises).toBe(2);
    expect(summary.visibleCount).toBe(1);
    expect(summary.masteredVisibleCount).toBe(1);
    expect(summary.progressPercent).toBe(100);
  });

  it("runs the full 20-question quiz engine over tda-entrenador-30s.yaml", () => {
    const quiz = QuizManifestSchema.parse(
      loadYaml(
        fs.readFileSync(
          path.join(ROOT, "src/content/quizzes/tda-entrenador-30s.yaml"),
          "utf-8",
        ),
      ),
    );

    let state = createInitialQuizState();
    for (const q of quiz.questions) {
      state = submitQuizAnswer(state, quiz, q.answer);
      state = advanceQuiz(state, quiz);
    }

    expect(state.completed).toBe(true);
    expect(state.score).toBe(20);
    expect(computeQuizPercent(state, quiz)).toBe(100);
    expect(isQuizPassed(state, quiz)).toBe(true);
  });

  it("validates PDF viewer URL state helpers", () => {
    expect(clampPdfPage(0, 49)).toBe(1);
    expect(clampPdfPage(99, 49)).toBe(49);
    expect(parsePageFromSearch("?page=12&view=split", 49)).toBe(12);
    expect(parsePageFromSearch("?page=abc", 49)).toBe(1);
    expect(buildUpdatedPageSearch("?view=split", 5, 49)).toBe("?view=split&page=5");
    expect(buildPdfEmbedUrl("/materials/tda/a.pdf#page=1", 7, 49)).toBe(
      "/materials/tda/a.pdf#page=7",
    );
  });

  it("escapes unsafe HTML outside KaTeX and builds TDA cheatsheet without katex-error", () => {
    const rendered = renderInlineMathTextToHtml(
      'Complejidad <script>alert(1)</script> es $O(n \\log n)$',
    );
    expect(rendered).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(rendered).not.toContain("<script>");
    expect(rendered).toContain('class="katex"');

    const sections = getCheatsheetSections("tda");
    expect(sections).toHaveLength(6);
    for (const section of sections) {
      if (section.formulaHtml) {
        expect(section.formulaHtml).toContain('class="katex"');
        expect(section.formulaHtml).not.toContain("katex-error");
      }
      for (const item of section.items) {
        expect(item.bodyHtml).not.toContain("katex-error");
      }
    }
    expect(getCheatsheetSections("otra-materia")).toEqual([]);
  });

  it("renders all platform UI components cleanly via SSR without hydration traps", () => {
    const toggleHtml = renderToStaticMarkup(createElement(ThemeToggle));
    expect(toggleHtml).toContain("Tema oscuro");

    for (const kind of [
      "statement",
      "theorem",
      "definition",
      "proof",
      "complexity",
      "trap",
      "example",
      "note",
    ] as const) {
      const blockHtml = renderToStaticMarkup(
        createElement(AcademicBlock, { kind }, "Contenido de prueba"),
      );
      expect(blockHtml).toContain(`academic-block--${kind}`);
    }

    const drawerHtml = renderToStaticMarkup(
      createElement(SolutionDrawer, { exerciseId: "tda-ej-18" }, "Solución"),
    );
    expect(drawerHtml).toContain("solution-drawer");
    expect(drawerHtml).toContain("Active Recall");

    const catalogCardHtml = renderToStaticMarkup(
      createElement(ExerciseCard, { exercise: SAMPLE_EXERCISES[0] }),
    );
    expect(catalogCardHtml).toContain("EJ 18");
    expect(catalogCardHtml).toContain("Parcial real");

    const advCardHtml = renderToStaticMarkup(
      createElement(ExerciseCard, { exercise: SAMPLE_EXERCISES[1] }),
    );
    expect(advCardHtml).toContain("Teoría avanzada");

    const hudHtml = renderToStaticMarkup(
      createElement(ExerciseFilterHUD, {
        courseId: "tda",
        exercises: SAMPLE_EXERCISES,
        units: [{ slug: "greedy", name: "Greedy" }],
      }),
    );
    expect(hudHtml).toContain("Emergencia (1)");
    expect(hudHtml).toContain("Todos (2)");

    const quiz = QuizManifestSchema.parse(
      loadYaml(
        fs.readFileSync(
          path.join(ROOT, "src/content/quizzes/tda-entrenador-30s.yaml"),
          "utf-8",
        ),
      ),
    );
    const trainerHtml = renderToStaticMarkup(
      createElement(QuickRecognitionTrainer, { quiz }),
    );
    expect(trainerHtml).toContain("Caso 1 de 20");

    const cheatsheetHtml = renderToStaticMarkup(
      createElement(CheatsheetDrawer, {
        courseTitle: "Teoría de Algoritmos",
        sections: getCheatsheetSections("tda"),
      }),
    );
    expect(cheatsheetHtml).toContain("Fórmulas");

    const pdfPendingHtml = renderToStaticMarkup(
      createElement(PdfSplitViewer, {
        courseId: "tda",
        resourceId: "tda-tp0-entrega",
        title: "Entrega TP0",
        entityType: "ElaboratedTPSubmission",
        provenance: "elaborated_submission",
        sourceFolder: "TP0",
        unitLabels: ["División y Conquista"],
        files: [{ path: "TP0/TP0_Nelson_Avila_100244.pdf", extension: ".pdf", isPdf: true }],
        pdfMetadata: {
          pageCount: 7,
          textChars: 11326,
          emptyPages: 0,
          textLayerStatus: "extractable",
        },
        preservedIntact: true,
        assetUrl: null,
        backToMaterialsHref: "/tda/materiales/",
      }),
    );
    expect(pdfPendingHtml).toContain("Preservado íntegro");
    expect(pdfPendingHtml).toContain('data-testid="pdf-asset-pending"');

    const pdfIframeHtml = renderToStaticMarkup(
      createElement(PdfSplitViewer, {
        courseId: "tda",
        resourceId: "tda-slide-13",
        title: "13 - Programación Lineal II",
        entityType: "OfficialSlideDeck",
        provenance: "official_source",
        sourceFolder: "DIapositivas",
        unitLabels: ["Programación Lineal"],
        files: [{ path: "DIapositivas/13 - Programación Lineal II.pdf", extension: ".pdf", isPdf: true }],
        pdfMetadata: {
          pageCount: 49,
          textChars: 9354,
          emptyPages: 5,
          textLayerStatus: "extractable",
        },
        assetUrl: "/materials/tda/slide13.pdf",
        backToMaterialsHref: "/tda/materiales/",
      }),
    );
    expect(pdfIframeHtml).toContain("<iframe");
    expect(pdfIframeHtml).toContain("/materials/tda/slide13.pdf#page=1");

    const interactiveManifest = InteractiveAndNotesManifestSchema.parse(
      JSON.parse(
        fs.readFileSync(
          path.join(ROOT, "docs/manifests/tda/interactive-and-notes.json"),
          "utf-8",
        ),
      ),
    );
    const checklistItems = (
      interactiveManifest.summaries.find((s) => s.checklistItems)?.checklistItems ?? []
    ).map((item) => ({
      ...item,
      labelHtml: renderInlineMathTextToHtml(item.label),
    }));
    const checklistHtml = renderToStaticMarkup(
      createElement(InteractiveChecklist, { courseId: "tda", items: checklistItems }),
    );
    expect(checklistHtml).toContain("<strong>0</strong> / 11");
    expect(checklistHtml).toContain('class="katex"');
  });
});
