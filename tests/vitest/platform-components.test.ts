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
import {
  compileCheatsheetSections,
  getCheatsheetSections,
} from "@/data/cheatsheets";
import { getCompiledGdsiExamUnits } from "@/data/gdsiExamPrep";
import { ExamPrepControlBar } from "@/components/platform/ExamPrepControlBar";
import { ActiveRecallCards } from "@/components/platform/ActiveRecallCards";
import { InteractiveMcqDeck } from "@/components/platform/InteractiveMcqDeck";
import { AutomatonSimulator } from "@/components/simulators/tda/AutomatonSimulator";
import { TuringMachineSimulator } from "@/components/simulators/tda/TuringMachineSimulator";
import {
  CheatsheetManifestSchema,
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
import { renderInlineMathTextToHtml, renderMathTokensInsideTrustedHtml } from "@/utils/katexStatic";
import GlobalSearch, {
  renderSafeExcerpt,
  resolveSearchHref,
} from "@/components/platform/GlobalSearch";
import MermaidDiagram from "@/components/platform/MermaidDiagram";
import SetCoverSimulator from "@/components/simulators/tda/SetCoverSimulator";
import PricingMethodSimulator from "@/components/simulators/tda/PricingMethodSimulator";
import KargerMinCutSimulator from "@/components/simulators/tda/KargerMinCutSimulator";
import Max3SatSimulator from "@/components/simulators/tda/Max3SatSimulator";
import HamletStreamingSimulator from "@/components/simulators/tda/HamletStreamingSimulator";
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
    expect(sections).toHaveLength(8);
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

    const redesCheatsheet = CheatsheetManifestSchema.parse(
      JSON.parse(
        fs.readFileSync(
          path.join(ROOT, "src/content/cheatsheets/redes.json"),
          "utf-8",
        ),
      ),
    );
    const redesSections = compileCheatsheetSections(redesCheatsheet.sections);
    expect(redesSections.length).toBeGreaterThanOrEqual(4);
    for (const section of redesSections) {
      if (section.formulaHtml) {
        expect(section.formulaHtml).toContain('class="katex"');
        expect(section.formulaHtml).not.toContain("katex-error");
      }
      for (const item of section.items) {
        expect(item.bodyHtml).not.toContain("katex-error");
        if (item.leadHtml) {
          expect(item.leadHtml).not.toContain("$d$");
          expect(item.leadHtml).not.toContain("$P$");
          expect(item.leadHtml).not.toContain("$N_c$");
          expect(item.leadHtml).not.toContain("katex-error");
        }
      }
    }
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
    expect(catalogCardHtml).toContain('target="_blank"');
    expect(catalogCardHtml).toContain('rel="noopener noreferrer"');
    expect(catalogCardHtml).toContain("se abre en una nueva pestaña");

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

  it("renders Etapa 4 GlobalSearch (XSS-safe excerpts & safe hrefs), MermaidDiagram, trusted-HTML math, and 5 simulators", () => {
    const searchTriggerHtml = renderToStaticMarkup(createElement(GlobalSearch));
    expect(searchTriggerHtml).toContain('data-testid="global-search-trigger"');
    expect(searchTriggerHtml).toContain("Ctrl+K");

    expect(resolveSearchHref("//evil.example.com")).toBe("/");
    expect(resolveSearchHref("/tda/materiales/doc/?page=3")).toBe(
      "/tda/materiales/doc/?page=3",
    );

    const safeExcerptHtml = renderToStaticMarkup(
      createElement(
        "p",
        null,
        renderSafeExcerpt(
          'Texto <mark>simplex</mark> y carga <img src=x onerror="alert(1)"> segura',
        ),
      ),
    );
    expect(safeExcerptHtml).toContain("<mark>simplex</mark>");
    expect(safeExcerptHtml).not.toContain("<img");
    expect(safeExcerptHtml).not.toContain("onerror=");

    const mermaidSsr = renderToStaticMarkup(
      createElement(MermaidDiagram, {
        code: "flowchart LR\nA --> B",
        caption: "Flujo prueba",
      }),
    );
    expect(mermaidSsr).toContain("mermaid-diagram");
    expect(mermaidSsr).toContain("A --&gt; B");
    expect(mermaidSsr).toContain("Flujo prueba");

    const trustedMath = renderMathTokensInsideTrustedHtml(
      "<p>Cota \\(p\\) y $70 \\lt 80$</p><code>$raw$</code>",
    );
    expect(trustedMath).toContain('class="katex"');
    expect(trustedMath).toContain("<code>$raw$</code>");
    expect(trustedMath).not.toContain("\\(p\\)");

    const simulators = [
      createElement(SetCoverSimulator),
      createElement(PricingMethodSimulator),
      createElement(KargerMinCutSimulator),
      createElement(Max3SatSimulator),
      createElement(HamletStreamingSimulator),
      createElement(AutomatonSimulator),
      createElement(TuringMachineSimulator),
    ];
    for (const sim of simulators) {
      const simHtml = renderToStaticMarkup(sim);
      expect(simHtml).toContain("simulator-panel");
    }

    const multiFileViewerHtml = renderToStaticMarkup(
      createElement(PdfSplitViewer, {
        courseId: "tda",
        resourceId: "tda-tp0-entrega-codigo",
        title: "Código y gráfico TP0",
        entityType: "ElaboratedTPSubmission",
        provenance: "elaborated_submission",
        sourceFolder: "TP0",
        unitLabels: ["General"],
        files: [
          {
            path: "tda/TP0/cuartetos.py",
            extension: ".py",
            isPdf: false,
            url: "/materials/tda/TP0/cuartetos.py",
          },
          {
            path: "tda/TP0/grafico_tiempos.png",
            extension: ".png",
            isPdf: false,
            url: "/materials/tda/TP0/grafico_tiempos.png",
          },
        ],
        preservedIntact: true,
        assetUrl: "/materials/tda/TP0/cuartetos.py",
        backToMaterialsHref: "/tda/materiales/",
      }),
    );
    expect(multiFileViewerHtml).toContain('href="/materials/tda/TP0/cuartetos.py"');
    expect(multiFileViewerHtml).toContain('href="/materials/tda/TP0/grafico_tiempos.png"');
  });

  it("compiles all 8 GDSI exam prep units (48 recall + 48 MCQ) with KaTeX and SSR-safe interactive decks", () => {
    const units = getCompiledGdsiExamUnits();
    expect(units).toHaveLength(8);

    let totalRecall = 0;
    let totalMcq = 0;
    let katexCount = 0;

    for (const unit of units) {
      expect(unit.recallItems).toHaveLength(6);
      expect(unit.mcqItems).toHaveLength(6);
      totalRecall += unit.recallItems.length;
      totalMcq += unit.mcqItems.length;

      for (const item of unit.recallItems) {
        const combined = `${item.questionHtml} ${item.answerHtml}`;
        expect(combined).not.toContain("katex-error");
        expect(combined).not.toContain("$");
        if (combined.includes('class="katex"')) katexCount++;
      }

      for (const q of unit.mcqItems) {
        expect(q.options).toHaveLength(4);
        const combined = `${q.promptHtml} ${q.justificationHtml} ${q.options.map((o) => o.html).join(" ")}`;
        expect(combined).not.toContain("katex-error");
        expect(combined).not.toContain("$");
        if (combined.includes('class="katex"')) katexCount++;
      }
    }

    expect(totalRecall).toBe(48);
    expect(totalMcq).toBe(48);
    expect(katexCount).toBeGreaterThan(10);

    const barHtml = renderToStaticMarkup(
      createElement(ExamPrepControlBar, {
        courseId: "gdsi",
        totalRecall: 48,
        totalMcq: 48,
        units: units.map((u) => ({
          id: u.id,
          number: u.number,
          shortTitle: u.shortTitle,
          title: u.title,
          correctKeys: Object.fromEntries(u.mcqItems.map((q) => [q.id, q.correctKey])),
        })),
      }),
    );
    expect(barHtml).toContain("0 / 48 dominadas");
    expect(barHtml).toContain("0 / 48 correctas");

    const recallHtml = renderToStaticMarkup(
      createElement(ActiveRecallCards, {
        courseId: "gdsi",
        unitId: "u1",
        items: units[0].recallItems,
      }),
    );
    expect(recallHtml).toContain("0 / 6 dominadas");

    const mcqHtml = renderToStaticMarkup(
      createElement(InteractiveMcqDeck, {
        courseId: "gdsi",
        unitId: "u1",
        questions: units[0].mcqItems,
      }),
    );
    expect(mcqHtml).toContain("Aciertos: 0 / 6");
  });
});
