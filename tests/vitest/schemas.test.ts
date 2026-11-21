import { describe, expect, it } from "vitest";
import {
  AssessmentManifestSchema,
  CourseManifestSchema,
  DocFrontmatterSchema,
  ENTITY_PROVENANCE_MAP,
  ENTITY_TYPE_VALUES,
  ExerciseFrontmatterSchema,
  PROVENANCE_VALUES,
  QuizManifestSchema,
  ResourceManifestSchema,
} from "@/schemas/academic";

describe("academic domain schemas (contracts/domain-schemas.md & ADR-003)", () => {
  it("exposes exact 9 provenance values and 13 entity types with valid mappings", () => {
    expect(PROVENANCE_VALUES).toHaveLength(9);
    expect(ENTITY_TYPE_VALUES).toHaveLength(13);
    for (const etype of ENTITY_TYPE_VALUES) {
      expect(ENTITY_PROVENANCE_MAP[etype].length).toBeGreaterThan(0);
      for (const prov of ENTITY_PROVENANCE_MAP[etype]) {
        expect(PROVENANCE_VALUES).toContain(prov);
      }
    }
  });

  describe("CourseManifestSchema", () => {
    const validCourse = {
      schemaVersion: "1.0.0" as const,
      id: "tda",
      title: "Teoría de Algoritmos",
      shortTitle: "TDA FIUBA",
      codes: ["TB024"],
      institution: "FIUBA",
      chair: "Cátedra Echevarría",
      units: [
        {
          slug: "dyc",
          name: "División y Conquista",
          order: 1,
          exerciseCount: 13,
          inCatalog: true,
          legacyRoute: "dyc.html",
        },
      ],
      views: [
        {
          slug: "todos",
          name: "Todos",
          exerciseCount: 13,
          legacyRoute: "todos.html",
          targetRoute: "/tda/ejercicios/",
        },
      ],
      stats: {
        physicalFiles: 10,
        pdfs: 6,
        nonPdfs: 4,
        catalogExercises: 13,
        parcialExercises: 5,
        advancedExercises: 0,
        interactiveWidgets: 1,
        elaboratedNotes: 1,
        elaboratedSummaries: 1,
        checklistItems: 11,
        trainerQuestions: 20,
      },
      legacyRoutes: { "index.html": "/tda/" },
      legacyStorageKeys: ["tda_theme"],
    };

    it("accepts a valid course manifest and rejects inconsistent stats or duplicate units", () => {
      expect(CourseManifestSchema.safeParse(validCourse).success).toBe(true);

      const badStats = {
        ...validCourse,
        stats: { ...validCourse.stats, physicalFiles: 999 },
      };
      expect(CourseManifestSchema.safeParse(badStats).success).toBe(false);

      const dupUnits = {
        ...validCourse,
        units: [
          validCourse.units[0],
          { ...validCourse.units[0], name: "Otra", order: 2 },
        ],
      };
      expect(CourseManifestSchema.safeParse(dupUnits).success).toBe(false);
    });
  });

  describe("ResourceManifestSchema", () => {
    const validResources = {
      schemaVersion: "1.0.0" as const,
      courseId: "tda",
      summary: {
        totalResources: 2,
        totalPhysicalFiles: 2,
        totalPdfs: 1,
        totalNonPdfs: 1,
        pagefindPrototypePdfCount: 0,
        preservedTp0FilesCount: 1,
      },
      resources: [
        {
          resourceId: "tda-guia-01",
          courseId: "tda",
          title: "Guía 01",
          entityType: "OfficialGuide" as const,
          provenance: "official_source" as const,
          sourceFolder: "Guia-Ejercicios",
          unitSlugs: ["dyc"],
          files: [
            {
              path: "Guia-Ejercicios/01.pdf",
              extension: ".pdf",
              isPdf: true,
            },
          ],
          pdfMetadata: {
            pageCount: 5,
            textChars: 1200,
            emptyPages: 0,
            textLayerStatus: "extractable" as const,
            inPagefindPrototype: false,
          },
        },
        {
          resourceId: "tda-tp0-cuartetos",
          courseId: "tda",
          title: "TP0 Script",
          entityType: "ElaboratedTPSubmission" as const,
          provenance: "elaborated_submission" as const,
          sourceFolder: "TP0",
          unitSlugs: ["general"],
          preservedIntact: true,
          files: [
            {
              path: "TP0/cuartetos.py",
              extension: ".py",
              isPdf: false,
            },
          ],
        },
      ],
    };

    it("accepts valid PDF and TP0 resources", () => {
      expect(ResourceManifestSchema.safeParse(validResources).success).toBe(true);
    });

    it("rejects mismatched entityType/provenance, missing pdfMetadata, extra pdfMetadata, path traversal, and unprotected TP0", () => {
      const badProv = structuredClone(validResources);
      badProv.resources[0].provenance = "elaborated_notes" as never;
      expect(ResourceManifestSchema.safeParse(badProv).success).toBe(false);

      const missingPdfMeta = structuredClone(validResources);
      delete (missingPdfMeta.resources[0] as Record<string, unknown>).pdfMetadata;
      expect(ResourceManifestSchema.safeParse(missingPdfMeta).success).toBe(false);

      const extraPdfMeta = structuredClone(validResources);
      (extraPdfMeta.resources[1] as Record<string, unknown>).pdfMetadata = {
        pageCount: 1,
        textChars: 0,
        emptyPages: 0,
        textLayerStatus: "extractable",
        inPagefindPrototype: false,
      };
      expect(ResourceManifestSchema.safeParse(extraPdfMeta).success).toBe(false);

      const pathTraversal = structuredClone(validResources);
      pathTraversal.resources[0].files[0].path = "Guia-Ejercicios/../secret.pdf";
      expect(ResourceManifestSchema.safeParse(pathTraversal).success).toBe(false);

      const tp0Unprotected = structuredClone(validResources);
      tp0Unprotected.resources[1].preservedIntact = false;
      expect(ResourceManifestSchema.safeParse(tp0Unprotected).success).toBe(false);
    });
  });

  describe("AssessmentManifestSchema", () => {
    const validAssessments = {
      schemaVersion: "1.0.0" as const,
      courseId: "tda",
      exams: [
        {
          id: "tda-parcial-2026-2-1",
          courseId: "tda",
          title: "Parcial 2026-2-1",
          date: "2026-10-01",
          term: "2026-2C",
          entityType: "OfficialExamPDF" as const,
          provenance: "official_source" as const,
          pdfResourceId: "tda-parcial-2026-2-1-pdf",
          catalogExerciseIds: ["tda-ej-18"],
          notes: "Enunciados oficiales",
        },
      ],
      unassignedGenericParcialExerciseIds: ["tda-ej-02"],
      practicalWorks: [
        {
          id: "tda-tp0-official",
          courseId: "tda",
          title: "TP0",
          entityType: "OfficialTPAssessment" as const,
          provenance: "official_source" as const,
          preservedIntact: true,
          resourceIds: ["tda-tp0-enunciado"],
          notes: "Oficial",
        },
      ],
    };

    it("accepts valid assessments and rejects overlapping parcial IDs", () => {
      expect(AssessmentManifestSchema.safeParse(validAssessments).success).toBe(
        true,
      );

      const overlapping = {
        ...validAssessments,
        unassignedGenericParcialExerciseIds: ["tda-ej-18"],
      };
      expect(AssessmentManifestSchema.safeParse(overlapping).success).toBe(false);
    });
  });

  describe("QuizManifestSchema", () => {
    const validQuiz = {
      quizId: "tda-entrenador-30s",
      courseId: "tda",
      title: "Entrenador 30s",
      provenance: "interactive_widget" as const,
      timeGoalSeconds: 30,
      passThresholdPercent: 75,
      options: [
        { key: "dyc", label: "DyC", icon: "🔷" },
        { key: "greedy", label: "Greedy", icon: "🔶" },
      ],
      questions: [
        {
          id: "q-01",
          prompt: "Enunciado",
          answer: "greedy",
          paradigmName: "Greedy",
          trigger: "Señal",
        },
      ],
    };

    it("accepts valid quiz and rejects answers not listed in options", () => {
      expect(QuizManifestSchema.safeParse(validQuiz).success).toBe(true);

      const invalidAnswer = {
        ...validQuiz,
        questions: [{ ...validQuiz.questions[0], answer: "dp" }],
      };
      expect(QuizManifestSchema.safeParse(invalidAnswer).success).toBe(false);
    });
  });

  describe("ExerciseFrontmatterSchema & DocFrontmatterSchema", () => {
    it("validates CatalogExercise vs AdvancedTheoryExercise rules strictly", () => {
      const catalog = {
        id: "tda-ej-18",
        courseId: "tda",
        number: 18,
        title: "Ruta de Transporte",
        unit: "greedy",
        entityType: "CatalogExercise" as const,
        provenance: "elaborated_solution" as const,
        priority: "imprescindible" as const,
        difficulty: 2,
        origin: "Parcial 2026-2-1",
        isParcial: true,
        examIds: ["tda-parcial-2026-2-1"],
        legacyPage: "greedy.html",
        legacyAnchor: "#ej-18",
      };
      expect(ExerciseFrontmatterSchema.safeParse(catalog).success).toBe(true);

      const adv = {
        id: "tda-adv-aprox-2partition",
        courseId: "tda",
        number: null,
        title: "2-Partition",
        unit: "avanzados",
        entityType: "AdvancedTheoryExercise" as const,
        provenance: "advanced_theory_example" as const,
        priority: "importante" as const,
        difficulty: 3,
        origin: "Teoría Avanzada",
        isParcial: false,
        legacyPage: "teoria-avanzados.html",
        legacyAnchor: "#ejercicios-clase",
      };
      expect(ExerciseFrontmatterSchema.safeParse(adv).success).toBe(true);

      expect(
        ExerciseFrontmatterSchema.safeParse({ ...adv, number: 86 }).success,
      ).toBe(false);
      expect(
        ExerciseFrontmatterSchema.safeParse({ ...catalog, number: null }).success,
      ).toBe(false);
      expect(
        ExerciseFrontmatterSchema.safeParse({
          ...catalog,
          isParcial: false,
        }).success,
      ).toBe(false);
    });

    it("validates DocFrontmatter entityType/provenance pairing", () => {
      const validDoc = {
        docId: "checklist-pre-parcial",
        courseId: "tda",
        title: "Checklist",
        order: 1,
        entityType: "ElaboratedSummary" as const,
        provenance: "elaborated_summary" as const,
      };
      expect(DocFrontmatterSchema.safeParse(validDoc).success).toBe(true);
      expect(
        DocFrontmatterSchema.safeParse({
          ...validDoc,
          provenance: "elaborated_notes",
        }).success,
      ).toBe(false);
    });
  });
});
