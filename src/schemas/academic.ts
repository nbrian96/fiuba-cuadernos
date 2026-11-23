import { z } from "astro/zod";

export const PROVENANCE_VALUES = [
  "official_source",
  "reconstructed_exam_statement",
  "elaborated_submission",
  "exam_prep_and_practice",
  "elaborated_notes",
  "elaborated_summary",
  "elaborated_solution",
  "advanced_theory_example",
  "interactive_widget",
] as const;

export const ProvenanceSchema = z.enum(PROVENANCE_VALUES);
export type Provenance = z.infer<typeof ProvenanceSchema>;

export const ENTITY_TYPE_VALUES = [
  "OfficialSlideDeck",
  "OfficialCodePackage",
  "OfficialGuide",
  "OfficialExamPDF",
  "ReconstructedExamPDF",
  "OfficialTPAssessment",
  "ElaboratedTPSubmission",
  "CodePractice",
  "ElaboratedNote",
  "ElaboratedSummary",
  "CatalogExercise",
  "AdvancedTheoryExercise",
  "InteractiveSimulator",
] as const;

export const EntityTypeSchema = z.enum(ENTITY_TYPE_VALUES);
export type EntityType = z.infer<typeof EntityTypeSchema>;

export const ENTITY_PROVENANCE_MAP: Record<EntityType, readonly Provenance[]> = {
  OfficialSlideDeck: ["official_source"],
  OfficialCodePackage: ["official_source"],
  OfficialGuide: ["official_source"],
  OfficialExamPDF: ["official_source"],
  ReconstructedExamPDF: ["reconstructed_exam_statement"],
  OfficialTPAssessment: ["official_source"],
  ElaboratedTPSubmission: ["elaborated_submission"],
  CodePractice: ["exam_prep_and_practice"],
  ElaboratedNote: ["elaborated_notes"],
  ElaboratedSummary: ["elaborated_summary"],
  CatalogExercise: ["elaborated_solution"],
  AdvancedTheoryExercise: ["advanced_theory_example"],
  InteractiveSimulator: ["interactive_widget"],
};

export const SlugSchema = z
  .string()
  .regex(/^[a-z0-9-]+$/, "Debe ser un slug válido ^[a-z0-9-]+$");

export const SchemaVersionSchema = z.literal("1.0.0");

export const ChecklistIdSchema = z
  .string()
  .regex(/^chk_[0-9a-f]{16}$/, "Debe cumplir el formato determinista chk_<16_hex>");

export const StudyModeSchema = z.enum(["emergency", "tactical", "all"]);
export type StudyMode = z.infer<typeof StudyModeSchema>;

export const TextLayerStatusSchema = z.enum([
  "extractable",
  "sparse",
  "metadata_fallback",
]);

export const PracticeStatusSchema = z.enum(["solved", "todo", "guide"]);

export const PrioritySchema = z.enum(["imprescindible", "importante"]);

export const DifficultySchema = z.number().int().min(1).max(5);

export const UnitDefinitionSchema = z.object({
  slug: SlugSchema,
  name: z.string().min(1),
  order: z.number().int().min(1),
  exerciseCount: z.number().int().min(0),
  inCatalog: z.boolean(),
  legacyRoute: z.string().min(1).optional(),
});

export const ViewDefinitionSchema = z.object({
  slug: SlugSchema,
  name: z.string().min(1),
  exerciseCount: z.number().int().min(0),
  legacyRoute: z.string().min(1).optional(),
  targetRoute: z.string().startsWith("/"),
});

export const CourseStatsSchema = z.object({
  physicalFiles: z.number().int().min(0),
  pdfs: z.number().int().min(0),
  nonPdfs: z.number().int().min(0),
  catalogExercises: z.number().int().min(0),
  parcialExercises: z.number().int().min(0),
  advancedExercises: z.number().int().min(0),
  interactiveWidgets: z.number().int().min(0),
  elaboratedNotes: z.number().int().min(0),
  elaboratedSummaries: z.number().int().min(0),
  checklistItems: z.number().int().min(0),
  trainerQuestions: z.number().int().min(0),
});

export const CourseManifestSchema = z
  .object({
    schemaVersion: SchemaVersionSchema,
    id: SlugSchema,
    title: z.string().min(1),
    shortTitle: z.string().min(1),
    codes: z.array(z.string().min(1)).min(1),
    institution: z.string().min(1),
    chair: z.string().min(1),
    units: z.array(UnitDefinitionSchema).min(1),
    views: z.array(ViewDefinitionSchema).default([]),
    stats: CourseStatsSchema,
    legacyRoutes: z.record(z.string().min(1), z.string().startsWith("/")).default({}),
    legacyStorageKeys: z.array(z.string().min(1)).default([]),
  })
  .superRefine((course, ctx) => {
    const seenSlugs = new Set<string>();
    const seenOrders = new Set<number>();

    for (const [idx, unit] of course.units.entries()) {
      if (seenSlugs.has(unit.slug)) {
        ctx.addIssue({
          code: "custom",
          path: ["units", idx, "slug"],
          message: `Slug de unidad duplicado: '${unit.slug}'`,
        });
      }
      seenSlugs.add(unit.slug);

      if (seenOrders.has(unit.order)) {
        ctx.addIssue({
          code: "custom",
          path: ["units", idx, "order"],
          message: `Orden de unidad duplicado: ${unit.order}`,
        });
      }
      seenOrders.add(unit.order);
    }

    if (course.stats.pdfs + course.stats.nonPdfs !== course.stats.physicalFiles) {
      ctx.addIssue({
        code: "custom",
        path: ["stats", "physicalFiles"],
        message: "stats.pdfs + stats.nonPdfs debe ser igual a stats.physicalFiles",
      });
    }
  });
export type CourseManifest = z.infer<typeof CourseManifestSchema>;

function isSafeRelativeRepoPath(rawPath: string): boolean {
  if (!rawPath || rawPath.startsWith("/") || rawPath.includes("\\")) {
    return false;
  }
  const segments = rawPath.split("/");
  return segments.every((seg) => seg.length > 0 && seg !== "." && seg !== "..");
}

export const ResourceFileSchema = z
  .object({
    path: z
      .string()
      .min(1)
      .refine(isSafeRelativeRepoPath, "Ruta relativa inválida o insegura"),
    extension: z.string().regex(/^\.[a-z0-9]+$/, "Extensión inválida (ej. '.pdf')"),
    isPdf: z.boolean(),
  })
  .superRefine((file, ctx) => {
    if (file.isPdf !== (file.extension === ".pdf")) {
      ctx.addIssue({
        code: "custom",
        path: ["isPdf"],
        message: `isPdf=${String(file.isPdf)} es incoherente con extension='${file.extension}'`,
      });
    }
    if (!file.path.toLowerCase().endsWith(file.extension)) {
      ctx.addIssue({
        code: "custom",
        path: ["extension"],
        message: `La extensión '${file.extension}' no coincide con la ruta '${file.path}'`,
      });
    }
  });

export const PdfMetadataSchema = z
  .object({
    pageCount: z.number().int().min(1),
    textChars: z.number().int().min(0),
    emptyPages: z.number().int().min(0),
    textLayerStatus: TextLayerStatusSchema,
    inPagefindPrototype: z.boolean(),
  })
  .superRefine((meta, ctx) => {
    if (meta.emptyPages > meta.pageCount) {
      ctx.addIssue({
        code: "custom",
        path: ["emptyPages"],
        message: "emptyPages no puede superar a pageCount",
      });
    }
  });

export const ResourceEntrySchema = z
  .object({
    resourceId: SlugSchema,
    courseId: SlugSchema,
    title: z.string().min(1),
    entityType: EntityTypeSchema,
    provenance: ProvenanceSchema,
    sourceFolder: z
      .string()
      .min(1)
      .refine(
        (folder) => !folder.includes("/") && !folder.includes("\\") && folder !== "." && folder !== "..",
        "sourceFolder debe ser una carpeta raíz válida",
      ),
    unitSlugs: z.array(SlugSchema).min(1),
    files: z.array(ResourceFileSchema).min(1),
    pdfMetadata: PdfMetadataSchema.optional(),
    practiceStatus: PracticeStatusSchema.optional(),
    preservedIntact: z.boolean().optional(),
    assessmentId: SlugSchema.optional(),
  })
  .superRefine((res, ctx) => {
    const allowed = ENTITY_PROVENANCE_MAP[res.entityType];
    if (!allowed.includes(res.provenance)) {
      ctx.addIssue({
        code: "custom",
        path: ["provenance"],
        message: `Incompatibilidad entityType='${res.entityType}' con provenance='${res.provenance}'`,
      });
    }

    for (const [idx, file] of res.files.entries()) {
      const expectedPrefixMaterias = `materias/${res.courseId}/${res.sourceFolder}/`;
      const expectedPrefixWithCourse = `${res.courseId}/${res.sourceFolder}/`;
      const expectedPrefixLegacy = `${res.sourceFolder}/`;
      if (
        !file.path.startsWith(expectedPrefixMaterias) &&
        !file.path.startsWith(expectedPrefixWithCourse) &&
        !file.path.startsWith(expectedPrefixLegacy)
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["files", idx, "path"],
          message: `La ruta '${file.path}' debe comenzar con '${expectedPrefixMaterias}', '${expectedPrefixWithCourse}' o '${expectedPrefixLegacy}'`,
        });
      }
    }

    const hasPdf = res.files.some((f) => f.isPdf);
    if (hasPdf && !res.pdfMetadata) {
      ctx.addIssue({
        code: "custom",
        path: ["pdfMetadata"],
        message: "Recurso con PDF debe declarar bloque 'pdfMetadata'",
      });
    }
    if (!hasPdf && res.pdfMetadata !== undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["pdfMetadata"],
        message: "Recurso sin PDFs no debe declarar 'pdfMetadata'",
      });
    }

    if (res.courseId === "tda" && res.sourceFolder === "TP0" && res.preservedIntact !== true) {
      ctx.addIssue({
        code: "custom",
        path: ["preservedIntact"],
        message: "Todo recurso en TP0/ debe declarar preservedIntact: true",
      });
    }
  });
export type ResourceEntry = z.infer<typeof ResourceEntrySchema>;

export const ResourceManifestSummarySchema = z.object({
  totalResources: z.number().int().min(0),
  totalPhysicalFiles: z.number().int().min(0),
  totalPdfs: z.number().int().min(0),
  totalNonPdfs: z.number().int().min(0),
  pagefindPrototypePdfCount: z.number().int().min(0),
  preservedTp0FilesCount: z.number().int().min(0),
});

export const ResourceManifestSchema = z
  .object({
    schemaVersion: SchemaVersionSchema,
    courseId: SlugSchema,
    summary: ResourceManifestSummarySchema.optional(),
    resources: z.array(ResourceEntrySchema).min(1),
  })
  .superRefine((manifest, ctx) => {
    const seenIds = new Set<string>();
    const seenPaths = new Set<string>();
    let totalPdfs = 0;
    let totalNonPdfs = 0;
    let prototypePdfs = 0;
    let preservedTp0Files = 0;

    for (const [rIdx, res] of manifest.resources.entries()) {
      if (res.courseId !== manifest.courseId) {
        ctx.addIssue({
          code: "custom",
          path: ["resources", rIdx, "courseId"],
          message: `courseId '${res.courseId}' no coincide con '${manifest.courseId}'`,
        });
      }
      if (seenIds.has(res.resourceId)) {
        ctx.addIssue({
          code: "custom",
          path: ["resources", rIdx, "resourceId"],
          message: `resourceId duplicado: '${res.resourceId}'`,
        });
      }
      seenIds.add(res.resourceId);

      for (const [fIdx, file] of res.files.entries()) {
        if (seenPaths.has(file.path)) {
          ctx.addIssue({
            code: "custom",
            path: ["resources", rIdx, "files", fIdx, "path"],
            message: `Archivo duplicado en manifiesto: '${file.path}'`,
          });
        }
        seenPaths.add(file.path);

        if (file.isPdf) {
          totalPdfs++;
          if (res.pdfMetadata?.inPagefindPrototype) {
            prototypePdfs++;
          }
        } else {
          totalNonPdfs++;
        }

        if (res.sourceFolder === "TP0" && res.preservedIntact === true) {
          preservedTp0Files++;
        }
      }
    }

    if (manifest.summary) {
      const expected = {
        totalResources: manifest.resources.length,
        totalPhysicalFiles: totalPdfs + totalNonPdfs,
        totalPdfs,
        totalNonPdfs,
        pagefindPrototypePdfCount: prototypePdfs,
        preservedTp0FilesCount: preservedTp0Files,
      };
      for (const key of Object.keys(expected) as (keyof typeof expected)[]) {
        if (manifest.summary[key] !== expected[key]) {
          ctx.addIssue({
            code: "custom",
            path: ["summary", key],
            message: `Resumen inconsistente en '${key}': ${manifest.summary[key]} != ${expected[key]}`,
          });
        }
      }
    }
  });
export type ResourceManifest = z.infer<typeof ResourceManifestSchema>;

export const ExamEntrySchema = z
  .object({
    id: SlugSchema,
    courseId: SlugSchema,
    title: z.string().min(1),
    date: z.string().min(1),
    term: z.string().min(1),
    entityType: z.enum(["OfficialExamPDF", "ReconstructedExamPDF"]),
    provenance: z.enum(["official_source", "reconstructed_exam_statement"]),
    pdfResourceId: SlugSchema,
    catalogExerciseIds: z.array(SlugSchema),
    notes: z.string().min(1),
  })
  .superRefine((exam, ctx) => {
    if (!ENTITY_PROVENANCE_MAP[exam.entityType].includes(exam.provenance)) {
      ctx.addIssue({
        code: "custom",
        path: ["provenance"],
        message: `Incompatibilidad en ExamEntry: '${exam.entityType}' con '${exam.provenance}'`,
      });
    }
  });

export const PracticalWorkEntrySchema = z
  .object({
    id: SlugSchema,
    courseId: SlugSchema,
    title: z.string().min(1),
    entityType: z.enum(["OfficialTPAssessment", "ElaboratedTPSubmission"]),
    provenance: z.enum(["official_source", "elaborated_submission"]),
    preservedIntact: z.boolean(),
    resourceIds: z.array(SlugSchema).min(1),
    notes: z.string().min(1),
  })
  .superRefine((tp, ctx) => {
    if (!ENTITY_PROVENANCE_MAP[tp.entityType].includes(tp.provenance)) {
      ctx.addIssue({
        code: "custom",
        path: ["provenance"],
        message: `Incompatibilidad en PracticalWorkEntry: '${tp.entityType}' con '${tp.provenance}'`,
      });
    }
  });

export const AssessmentManifestSchema = z
  .object({
    schemaVersion: SchemaVersionSchema,
    courseId: SlugSchema,
    exams: z.array(ExamEntrySchema),
    unassignedGenericParcialExerciseIds: z.array(SlugSchema),
    practicalWorks: z.array(PracticalWorkEntrySchema),
  })
  .superRefine((manifest, ctx) => {
    const assessmentIds = new Set<string>();
    const assignedExerciseIds = new Set<string>();

    for (const [idx, exam] of manifest.exams.entries()) {
      if (exam.courseId !== manifest.courseId) {
        ctx.addIssue({
          code: "custom",
          path: ["exams", idx, "courseId"],
          message: `courseId '${exam.courseId}' no coincide con '${manifest.courseId}'`,
        });
      }
      if (assessmentIds.has(exam.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["exams", idx, "id"],
          message: `ID de evaluación duplicado: '${exam.id}'`,
        });
      }
      assessmentIds.add(exam.id);
      for (const exId of exam.catalogExerciseIds) {
        assignedExerciseIds.add(exId);
      }
    }

    const seenUnassigned = new Set<string>();
    for (const [idx, exId] of manifest.unassignedGenericParcialExerciseIds.entries()) {
      if (seenUnassigned.has(exId)) {
        ctx.addIssue({
          code: "custom",
          path: ["unassignedGenericParcialExerciseIds", idx],
          message: `ID duplicado en unassignedGenericParcialExerciseIds: '${exId}'`,
        });
      }
      seenUnassigned.add(exId);
      if (assignedExerciseIds.has(exId)) {
        ctx.addIssue({
          code: "custom",
          path: ["unassignedGenericParcialExerciseIds", idx],
          message: `El ejercicio '${exId}' no puede estar asignado en exams[] y en unassignedGenericParcialExerciseIds simultáneamente`,
        });
      }
    }

    for (const [idx, tp] of manifest.practicalWorks.entries()) {
      if (tp.courseId !== manifest.courseId) {
        ctx.addIssue({
          code: "custom",
          path: ["practicalWorks", idx, "courseId"],
          message: `courseId '${tp.courseId}' no coincide con '${manifest.courseId}'`,
        });
      }
      if (assessmentIds.has(tp.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["practicalWorks", idx, "id"],
          message: `ID de evaluación duplicado: '${tp.id}'`,
        });
      }
      assessmentIds.add(tp.id);
    }
  });
export type AssessmentManifest = z.infer<typeof AssessmentManifestSchema>;

export const QuizOptionSchema = z.object({
  key: SlugSchema,
  label: z.string().min(1),
  icon: z.string().min(1),
});

export const QuizQuestionSchema = z.object({
  id: z.string().min(1),
  prompt: z.string().min(1),
  answer: SlugSchema,
  paradigmName: z.string().min(1),
  trigger: z.string().min(1),
  sourceOrigin: z.string().min(1).optional(),
});

export const QuizManifestSchema = z
  .object({
    schemaVersion: SchemaVersionSchema.optional(),
    quizId: SlugSchema,
    courseId: SlugSchema,
    title: z.string().min(1),
    provenance: z.literal("interactive_widget"),
    timeGoalSeconds: z.number().positive(),
    passThresholdPercent: z.number().min(0).max(100),
    options: z.array(QuizOptionSchema).min(2),
    questions: z.array(QuizQuestionSchema).min(1),
  })
  .superRefine((quiz, ctx) => {
    const optionKeys = new Set<string>();
    for (const [idx, opt] of quiz.options.entries()) {
      if (optionKeys.has(opt.key)) {
        ctx.addIssue({
          code: "custom",
          path: ["options", idx, "key"],
          message: `Clave de opción duplicada: '${opt.key}'`,
        });
      }
      optionKeys.add(opt.key);
    }

    const questionIds = new Set<string>();
    for (const [idx, q] of quiz.questions.entries()) {
      if (questionIds.has(q.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["questions", idx, "id"],
          message: `ID de pregunta duplicado: '${q.id}'`,
        });
      }
      questionIds.add(q.id);

      if (!optionKeys.has(q.answer)) {
        ctx.addIssue({
          code: "custom",
          path: ["questions", idx, "answer"],
          message: `La respuesta '${q.answer}' de '${q.id}' no pertenece a options[].key`,
        });
      }
    }
  });
export type QuizManifest = z.infer<typeof QuizManifestSchema>;

export const ExerciseFrontmatterSchema = z
  .object({
    id: SlugSchema,
    courseId: SlugSchema,
    number: z.number().int().min(1).nullable(),
    title: z.string().min(1),
    unit: SlugSchema,
    entityType: z.enum(["CatalogExercise", "AdvancedTheoryExercise"]),
    provenance: z.enum(["elaborated_solution", "advanced_theory_example"]),
    priority: PrioritySchema,
    difficulty: DifficultySchema,
    origin: z.string().min(1),
    isParcial: z.boolean(),
    examIds: z.array(SlugSchema).optional(),
    relatedResourceIds: z.array(SlugSchema).optional(),
    legacyPage: z.string().min(1).optional(),
    legacyAnchor: z.string().startsWith("#").optional(),
  })
  .superRefine((ex, ctx) => {
    if (!ENTITY_PROVENANCE_MAP[ex.entityType].includes(ex.provenance)) {
      ctx.addIssue({
        code: "custom",
        path: ["provenance"],
        message: `Incompatibilidad entityType='${ex.entityType}' con provenance='${ex.provenance}'`,
      });
    }

    if (ex.entityType === "CatalogExercise" && ex.number === null) {
      ctx.addIssue({
        code: "custom",
        path: ["number"],
        message: "CatalogExercise requiere un entero >= 1 en 'number'",
      });
    }

    if (ex.entityType === "AdvancedTheoryExercise" && ex.number !== null) {
      ctx.addIssue({
        code: "custom",
        path: ["number"],
        message: "AdvancedTheoryExercise debe declarar number: null",
      });
    }

    if (!ex.isParcial && ex.examIds && ex.examIds.length > 0) {
      ctx.addIssue({
        code: "custom",
        path: ["examIds"],
        message: "Un ejercicio con isParcial: false no puede referenciar examIds",
      });
    }
  });
export type ExerciseFrontmatter = z.infer<typeof ExerciseFrontmatterSchema>;

export const DocFrontmatterSchema = z
  .object({
    docId: SlugSchema,
    courseId: SlugSchema,
    title: z.string().min(1),
    order: z.number().int().min(0),
    entityType: z.enum(["ElaboratedNote", "ElaboratedSummary"]),
    provenance: z.enum(["elaborated_notes", "elaborated_summary"]),
    sectionIds: z.array(SlugSchema).optional(),
    relatedResourceIds: z.array(SlugSchema).optional(),
    legacyPage: z.string().min(1).optional(),
  })
  .superRefine((doc, ctx) => {
    if (!ENTITY_PROVENANCE_MAP[doc.entityType].includes(doc.provenance)) {
      ctx.addIssue({
        code: "custom",
        path: ["provenance"],
        message: `Incompatibilidad entityType='${doc.entityType}' con provenance='${doc.provenance}'`,
      });
    }
  });
export type DocFrontmatter = z.infer<typeof DocFrontmatterSchema>;

export const ExerciseIndexEntrySchema = z
  .object({
    id: SlugSchema,
    courseId: SlugSchema,
    number: z.number().int().min(1).nullable(),
    title: z.string().min(1),
    paradigm: SlugSchema,
    sourceModule: z.string().min(1),
    priority: PrioritySchema,
    difficulty: DifficultySchema,
    origin: z.string().min(1),
    isParcial: z.boolean(),
    provenance: z.enum(["elaborated_solution", "advanced_theory_example"]),
    entityType: z.enum(["CatalogExercise", "AdvancedTheoryExercise"]),
    legacyPage: z.string().min(1),
    legacyAnchor: z.string().startsWith("#"),
  })
  .superRefine((entry, ctx) => {
    if (!ENTITY_PROVENANCE_MAP[entry.entityType].includes(entry.provenance)) {
      ctx.addIssue({
        code: "custom",
        path: ["provenance"],
        message: `Incompatibilidad '${entry.entityType}' con '${entry.provenance}'`,
      });
    }
    if (entry.entityType === "CatalogExercise" && entry.number === null) {
      ctx.addIssue({
        code: "custom",
        path: ["number"],
        message: "CatalogExercise requiere número entero",
      });
    }
    if (entry.entityType === "AdvancedTheoryExercise" && entry.number !== null) {
      ctx.addIssue({
        code: "custom",
        path: ["number"],
        message: "AdvancedTheoryExercise requiere number: null",
      });
    }
  });

export const ExercisesIndexManifestSchema = z
  .object({
    schemaVersion: SchemaVersionSchema,
    courseId: SlugSchema,
    summary: z.object({
      catalogCount: z.number().int().min(0),
      parcialCount: z.number().int().min(0),
      imprescindibleCount: z.number().int().min(0),
      importanteCount: z.number().int().min(0),
      advancedCount: z.number().int().min(0),
    }),
    catalogExercises: z.array(ExerciseIndexEntrySchema),
    advancedExercises: z.array(ExerciseIndexEntrySchema),
  })
  .superRefine((manifest, ctx) => {
    const seenIds = new Set<string>();
    const seenNums = new Set<number>();
    let parcialCount = 0;
    let imprescindibleCount = 0;
    let importanteCount = 0;

    for (const [idx, ex] of manifest.catalogExercises.entries()) {
      if (ex.entityType !== "CatalogExercise") {
        ctx.addIssue({
          code: "custom",
          path: ["catalogExercises", idx, "entityType"],
          message: "Debe ser CatalogExercise",
        });
      }
      if (ex.courseId !== manifest.courseId) {
        ctx.addIssue({
          code: "custom",
          path: ["catalogExercises", idx, "courseId"],
          message: "courseId inconsistente",
        });
      }
      if (seenIds.has(ex.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["catalogExercises", idx, "id"],
          message: `ID duplicado: '${ex.id}'`,
        });
      }
      seenIds.add(ex.id);
      if (ex.number !== null) {
        if (seenNums.has(ex.number)) {
          ctx.addIssue({
            code: "custom",
            path: ["catalogExercises", idx, "number"],
            message: `Número duplicado: ${ex.number}`,
          });
        }
        seenNums.add(ex.number);
      }
      if (ex.isParcial) parcialCount++;
      if (ex.priority === "imprescindible") imprescindibleCount++;
      else importanteCount++;
    }

    for (const [idx, adv] of manifest.advancedExercises.entries()) {
      if (adv.entityType !== "AdvancedTheoryExercise") {
        ctx.addIssue({
          code: "custom",
          path: ["advancedExercises", idx, "entityType"],
          message: "Debe ser AdvancedTheoryExercise",
        });
      }
      if (adv.courseId !== manifest.courseId) {
        ctx.addIssue({
          code: "custom",
          path: ["advancedExercises", idx, "courseId"],
          message: "courseId inconsistente",
        });
      }
      if (seenIds.has(adv.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["advancedExercises", idx, "id"],
          message: `ID duplicado: '${adv.id}'`,
        });
      }
      seenIds.add(adv.id);
    }

    if (manifest.summary.catalogCount !== manifest.catalogExercises.length) {
      ctx.addIssue({
        code: "custom",
        path: ["summary", "catalogCount"],
        message: "catalogCount inconsistente",
      });
    }
    if (manifest.summary.parcialCount !== parcialCount) {
      ctx.addIssue({
        code: "custom",
        path: ["summary", "parcialCount"],
        message: "parcialCount inconsistente",
      });
    }
    if (manifest.summary.imprescindibleCount !== imprescindibleCount) {
      ctx.addIssue({
        code: "custom",
        path: ["summary", "imprescindibleCount"],
        message: "imprescindibleCount inconsistente",
      });
    }
    if (manifest.summary.importanteCount !== importanteCount) {
      ctx.addIssue({
        code: "custom",
        path: ["summary", "importanteCount"],
        message: "importanteCount inconsistente",
      });
    }
    if (manifest.summary.advancedCount !== manifest.advancedExercises.length) {
      ctx.addIssue({
        code: "custom",
        path: ["summary", "advancedCount"],
        message: "advancedCount inconsistente",
      });
    }
  });
export type ExercisesIndexManifest = z.infer<typeof ExercisesIndexManifestSchema>;

export const InteractiveAndNotesManifestSchema = z
  .object({
    schemaVersion: SchemaVersionSchema,
    courseId: SlugSchema,
    summary: z.object({
      widgetCount: z.number().int().min(0),
      noteCount: z.number().int().min(0),
      summaryCount: z.number().int().min(0),
      checklistItemCount: z.number().int().min(0),
      trainerQuestionCount: z.number().int().min(0),
    }),
    widgets: z.array(
      z.object({
        id: SlugSchema,
        courseId: SlugSchema,
        title: z.string().min(1),
        entityType: z.literal("InteractiveSimulator"),
        provenance: z.literal("interactive_widget"),
        sourceFiles: z.array(z.string().min(1)).min(1),
        legacyAnchor: z.string().startsWith("#"),
        handlers: z.array(z.string().min(1)).min(1),
        questionCount: z.number().int().min(1).optional(),
        timeGoalSeconds: z.number().positive().optional(),
        passThresholdPercent: z.number().min(0).max(100).optional(),
      }),
    ),
    notes: z.array(
      z.object({
        id: SlugSchema,
        courseId: SlugSchema,
        title: z.string().min(1),
        entityType: z.literal("ElaboratedNote"),
        provenance: z.literal("elaborated_notes"),
        sourceFile: z.string().min(1),
        resourceId: SlugSchema.optional(),
        staticComparisonNote: z.string().min(1).optional(),
        sections: z
          .array(
            z.object({
              id: SlugSchema,
              title: z.string().min(1),
            }),
          )
          .optional(),
      }),
    ),
    summaries: z.array(
      z.object({
        id: SlugSchema,
        courseId: SlugSchema,
        title: z.string().min(1),
        entityType: z.literal("ElaboratedSummary"),
        provenance: z.literal("elaborated_summary"),
        sourceFile: z.string().min(1),
        checklistItems: z
          .array(
            z.object({
              id: ChecklistIdSchema,
              sectionId: SlugSchema,
              itemIndex: z.number().int().min(1),
              label: z.string().min(1),
            }),
          )
          .optional(),
        sections: z.array(z.string().min(1)).optional(),
      }),
    ),
  })
  .superRefine((manifest, ctx) => {
    const seenIds = new Set<string>();
    const checkCourseAndUniqueId = (
      section: "widgets" | "notes" | "summaries",
      idx: number,
      item: { id: string; courseId: string },
    ) => {
      if (item.courseId !== manifest.courseId) {
        ctx.addIssue({
          code: "custom",
          path: [section, idx, "courseId"],
          message: `courseId '${item.courseId}' no coincide con '${manifest.courseId}'`,
        });
      }
      if (seenIds.has(item.id)) {
        ctx.addIssue({
          code: "custom",
          path: [section, idx, "id"],
          message: `ID duplicado en interactive-and-notes: '${item.id}'`,
        });
      }
      seenIds.add(item.id);
    };

    for (const [idx, w] of manifest.widgets.entries()) {
      checkCourseAndUniqueId("widgets", idx, w);
    }
    for (const [idx, n] of manifest.notes.entries()) {
      checkCourseAndUniqueId("notes", idx, n);
    }
    for (const [idx, s] of manifest.summaries.entries()) {
      checkCourseAndUniqueId("summaries", idx, s);
    }

    if (manifest.summary.widgetCount !== manifest.widgets.length) {
      ctx.addIssue({
        code: "custom",
        path: ["summary", "widgetCount"],
        message: "widgetCount inconsistente",
      });
    }
    if (manifest.summary.noteCount !== manifest.notes.length) {
      ctx.addIssue({
        code: "custom",
        path: ["summary", "noteCount"],
        message: "noteCount inconsistente",
      });
    }
    if (manifest.summary.summaryCount !== manifest.summaries.length) {
      ctx.addIssue({
        code: "custom",
        path: ["summary", "summaryCount"],
        message: "summaryCount inconsistente",
      });
    }
    const checklistCount = manifest.summaries.reduce(
      (acc, s) => acc + (s.checklistItems?.length ?? 0),
      0,
    );
    if (manifest.summary.checklistItemCount !== checklistCount) {
      ctx.addIssue({
        code: "custom",
        path: ["summary", "checklistItemCount"],
        message: "checklistItemCount inconsistente",
      });
    }
    const trainerQuestionSum = manifest.widgets.reduce(
      (acc, w) => acc + (w.questionCount ?? 0),
      0,
    );
    if (manifest.summary.trainerQuestionCount !== trainerQuestionSum) {
      ctx.addIssue({
        code: "custom",
        path: ["summary", "trainerQuestionCount"],
        message: "trainerQuestionCount inconsistente con widgets[].questionCount",
      });
    }
  });
export type InteractiveAndNotesManifest = z.infer<
  typeof InteractiveAndNotesManifestSchema
>;

export const CheatsheetItemInputSchema = z.object({
  lead: z.string().min(1).optional(),
  body: z.string().min(1),
});

export const CheatsheetSectionInputSchema = z.object({
  id: SlugSchema,
  title: z.string().min(1),
  variant: z.enum(["default", "warning"]).default("default"),
  formula: z.string().min(1).optional(),
  listType: z.enum(["ul", "ol"]).default("ul"),
  items: z.array(CheatsheetItemInputSchema).min(1),
});

export const CheatsheetManifestSchema = z.object({
  schemaVersion: SchemaVersionSchema,
  courseId: SlugSchema,
  sections: z.array(CheatsheetSectionInputSchema).min(1),
});
export type CheatsheetManifest = z.infer<typeof CheatsheetManifestSchema>;
