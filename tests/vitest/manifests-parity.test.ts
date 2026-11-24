import fs from "node:fs";
import path from "node:path";
import { load as loadYaml } from "js-yaml";
import { describe, expect, it } from "vitest";
import {
  AssessmentManifestSchema,
  CheatsheetManifestSchema,
  CourseManifestSchema,
  DocFrontmatterSchema,
  ExerciseFrontmatterSchema,
  ExercisesIndexManifestSchema,
  InteractiveAndNotesManifestSchema,
  QuizManifestSchema,
  ResourceManifestSchema,
} from "@/schemas/academic";

const ROOT = path.resolve(process.cwd());

function readJson(relPath: string): unknown {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relPath), "utf-8"));
}

function parseMdxFrontmatter(relPath: string): Record<string, unknown> {
  const raw = fs.readFileSync(path.join(ROOT, relPath), "utf-8");
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    throw new Error(`Falta frontmatter YAML en ${relPath}`);
  }
  return loadYaml(match[1]) as Record<string, unknown>;
}

function listMdxFiles(dirRelPath: string): string[] {
  const base = path.join(ROOT, dirRelPath);
  const results: string[] = [];
  for (const entry of fs.readdirSync(base, { withFileTypes: true })) {
    const childRel = path.join(dirRelPath, entry.name);
    if (entry.isDirectory()) {
      results.push(...listMdxFiles(childRel));
    } else if (entry.isFile() && entry.name.endsWith(".mdx")) {
      results.push(childRel);
    }
  }
  return results;
}

describe("Etapa 1B manifests & Etapa 2 seed content parity", () => {
  it("validates all 5 JSON manifests in docs/manifests/tda/ against Zod schemas", () => {
    const course = CourseManifestSchema.parse(
      readJson("docs/manifests/tda/course.json"),
    );
    const resources = ResourceManifestSchema.parse(
      readJson("docs/manifests/tda/resources.json"),
    );
    const assessments = AssessmentManifestSchema.parse(
      readJson("docs/manifests/tda/assessments.json"),
    );
    const exercises = ExercisesIndexManifestSchema.parse(
      readJson("docs/manifests/tda/exercises-index.json"),
    );
    const interactive = InteractiveAndNotesManifestSchema.parse(
      readJson("docs/manifests/tda/interactive-and-notes.json"),
    );

    expect(course.id).toBe("tda");
    expect(resources.summary?.totalPhysicalFiles).toBe(96);
    expect(resources.summary?.totalPdfs).toBe(49);
    expect(assessments.exams).toHaveLength(7);
    expect(exercises.catalogExercises).toHaveLength(85);
    expect(exercises.advancedExercises).toHaveLength(2);
    expect(interactive.widgets).toHaveLength(6);
  });

  it("keeps src/content JSON manifests deeply equal to docs/manifests/tda/", () => {
    expect(readJson("src/content/courses/tda.json")).toEqual(
      readJson("docs/manifests/tda/course.json"),
    );
    expect(readJson("src/content/resources/tda-resources.json")).toEqual(
      readJson("docs/manifests/tda/resources.json"),
    );
    expect(readJson("src/content/assessments/tda.json")).toEqual(
      readJson("docs/manifests/tda/assessments.json"),
    );
  });

  it("validates tda-entrenador-30s.yaml with 20 unique questions and valid answers", () => {
    const quizRaw = loadYaml(
      fs.readFileSync(
        path.join(ROOT, "src/content/quizzes/tda-entrenador-30s.yaml"),
        "utf-8",
      ),
    );
    const quiz = QuizManifestSchema.parse(quizRaw);
    expect(quiz.questions).toHaveLength(20);
    const optionKeys = new Set(quiz.options.map((o) => o.key));
    const questionIds = new Set(quiz.questions.map((q) => q.id));
    expect(questionIds.size).toBe(20);
    for (const q of quiz.questions) {
      expect(optionKeys.has(q.answer)).toBe(true);
    }
  });

  it("validates all seed MDX exercise and doc frontmatters against schemas and index", () => {
    const exercisesIndex = ExercisesIndexManifestSchema.parse(
      readJson("docs/manifests/tda/exercises-index.json"),
    );
    const allIndexed = new Map(
      [
        ...exercisesIndex.catalogExercises,
        ...exercisesIndex.advancedExercises,
      ].map((e) => [e.id, e]),
    );

    const exFiles = listMdxFiles("src/content/exercises/tda");
    expect(exFiles.length).toBeGreaterThanOrEqual(2);
    for (const relPath of exFiles) {
      const fm = ExerciseFrontmatterSchema.parse(parseMdxFrontmatter(relPath));
      const indexed = allIndexed.get(fm.id);
      expect(indexed).toBeDefined();
      expect(fm.title).toBe(indexed!.title);
      expect(fm.number).toBe(indexed!.number);
      expect(fm.unit).toBe(indexed!.paradigm);
      expect(fm.entityType).toBe(indexed!.entityType);
      expect(fm.provenance).toBe(indexed!.provenance);
      expect(fm.priority).toBe(indexed!.priority);
      expect(fm.difficulty).toBe(indexed!.difficulty);
      expect(fm.isParcial).toBe(indexed!.isParcial);
      expect(fm.legacyPage).toBe(indexed!.legacyPage);
      expect(fm.legacyAnchor).toBe(indexed!.legacyAnchor);
    }

    const docFiles = listMdxFiles("src/content/docs/tda");
    expect(docFiles.length).toBeGreaterThanOrEqual(1);
    for (const relPath of docFiles) {
      const fm = DocFrontmatterSchema.parse(parseMdxFrontmatter(relPath));
      expect(fm.courseId).toBe("tda");
    }

    const interactive = InteractiveAndNotesManifestSchema.parse(
      readJson("docs/manifests/tda/interactive-and-notes.json"),
    );
    const expectedChecklistIds = (
      interactive.summaries.find((s) => s.checklistItems)?.checklistItems ?? []
    ).map((item) => item.id);
    expect(expectedChecklistIds).toHaveLength(11);
    const checklistMdx = fs.readFileSync(
      path.join(ROOT, "src/content/docs/tda/checklist-pre-parcial.mdx"),
      "utf-8",
    );
    for (const chkId of expectedChecklistIds) {
      expect(checklistMdx).toContain(chkId);
    }
  });
});

describe("Etapa 4 full TDA migration parity", () => {
  it("contains all 85 catalog exercises and 2 advanced theory exercises (87 total, 35 parciales)", () => {
    const idx = ExercisesIndexManifestSchema.parse(
      readJson("docs/manifests/tda/exercises-index.json"),
    );
    const exFiles = listMdxFiles("src/content/exercises/tda");
    expect(exFiles).toHaveLength(87);

    const parsed = exFiles.map((rel) =>
      ExerciseFrontmatterSchema.parse(parseMdxFrontmatter(rel)),
    );
    const catalogParsed = parsed.filter(
      (e) => e.entityType === "CatalogExercise",
    );
    const advancedParsed = parsed.filter(
      (e) => e.entityType === "AdvancedTheoryExercise",
    );

    expect(catalogParsed).toHaveLength(85);
    expect(advancedParsed).toHaveLength(2);
    expect(parsed.filter((e) => e.isParcial)).toHaveLength(35);

    const parsedIds = new Set(parsed.map((e) => e.id));
    for (const expected of [...idx.catalogExercises, ...idx.advancedExercises]) {
      expect(parsedIds.has(expected.id)).toBe(true);
    }
  });

  it("contains all 3 expected docs in src/content/docs/tda/", () => {
    const docFiles = listMdxFiles("src/content/docs/tda");
    expect(docFiles).toHaveLength(3);
    const docIds = new Set(
      docFiles.map((rel) => DocFrontmatterSchema.parse(parseMdxFrontmatter(rel)).docId),
    );
    expect(docIds).toEqual(
      new Set([
        "matriz-parciales",
        "checklist-pre-parcial",
        "problema-mochila-y-greedy",
      ]),
    );
  });

  it("confirms all 96 physical files referenced in tda-resources.json exist on disk", () => {
    const resManifest = readJson("src/content/resources/tda-resources.json") as {
      resources: Array<{ files: Array<{ path: string }> }>;
    };
    const allPaths = resManifest.resources.flatMap((r) =>
      r.files.map((f) => f.path),
    );
    expect(allPaths).toHaveLength(96);
    for (const relPath of allPaths) {
      expect(
        fs.existsSync(path.join(ROOT, relPath)),
        `Archivo físico faltante: ${relPath}`,
      ).toBe(true);
    }
  });

  it("validates extracted advanced theory sections hierarchy, simulators, SVG markers, and Mermaid", () => {
    const sections = readJson("src/data/tdaAdvancedSections.json") as Array<{
      order: number;
      id: string;
      title: string;
      htmlBefore: string;
      htmlAfterMermaid: string;
      mermaidCode: string | null;
      simulator: string | null;
      htmlAfterSimulator: string;
    }>;

    expect(sections).toHaveLength(16);
    const sims: string[] = [];
    const mermaids: string[] = [];

    for (const sec of sections) {
      expect(sec.title.length).toBeGreaterThan(sec.id.length);
      expect(sec.title).not.toBe(sec.id);

      const combined = `${sec.htmlBefore}\n${sec.htmlAfterMermaid}\n${sec.htmlAfterSimulator}`;
      expect(combined).not.toMatch(/<h[1256]\b/i);
      expect(combined).not.toMatch(/<script\b/i);
      expect(combined).not.toMatch(/table-scroll"[^>]*>\s*<div[^>]*class="table-scroll"/i);
      if (combined.includes("url(#arrow)")) {
        expect(combined).toContain('id="arrow"');
      }
      if (sec.simulator) sims.push(sec.simulator);
      if (sec.mermaidCode) mermaids.push(sec.id);
    }

    expect(sims).toEqual([
      "set-cover",
      "pricing-method",
      "karger",
      "max-3sat",
      "hamlet",
    ]);
    expect(mermaids).toEqual(["tsp-aprox"]);
  });
});

describe("Multi-course content integrity", () => {
  it("validates every declared course, its resources, assessments, cheatsheets, quizzes, exercises, docs and cross-references", () => {
    const coursesDir = path.join(ROOT, "src/content/courses");
    const courseFiles = fs
      .readdirSync(coursesDir)
      .filter((f) => f.endsWith(".json"));
    expect(courseFiles.length).toBeGreaterThanOrEqual(1);

    const quizFiles = fs
      .readdirSync(path.join(ROOT, "src/content/quizzes"))
      .filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"));
    const quizzesByCourse = new Map<string, number>();

    for (const qFile of quizFiles) {
      const quiz = QuizManifestSchema.parse(
        loadYaml(
          fs.readFileSync(path.join(ROOT, "src/content/quizzes", qFile), "utf-8"),
        ),
      );
      const optionKeys = new Set(quiz.options.map((o) => o.key));
      const questionIds = new Set(quiz.questions.map((q) => q.id));
      expect(questionIds.size, `[Quiz:${qFile}] IDs duplicados`).toBe(quiz.questions.length);
      for (const q of quiz.questions) {
        expect(optionKeys.has(q.answer), `[Quiz:${qFile}] Respuesta inválida '${q.answer}' en ${q.id}`).toBe(true);
      }
      quizzesByCourse.set(
        quiz.courseId,
        (quizzesByCourse.get(quiz.courseId) ?? 0) + quiz.questions.length,
      );
    }

    for (const file of courseFiles) {
      const course = CourseManifestSchema.parse(
        readJson(`src/content/courses/${file}`),
      );
      const unitSlugs = new Set(course.units.map((u) => u.slug));
      const resourceIds = new Set<string>();

      for (const unit of course.units) {
        expect(
          unit.name,
          `[${course.id}] unit.name '${unit.name}' no debe prefijar el número de orden`,
        ).not.toMatch(/^\d+\.\s/);
      }

      const resRel = `src/content/resources/${course.id}-resources.json`;
      if (fs.existsSync(path.join(ROOT, resRel))) {
        const resManifest = ResourceManifestSchema.parse(readJson(resRel));
        expect(resManifest.courseId).toBe(course.id);
        for (const res of resManifest.resources) {
          resourceIds.add(res.resourceId);
          for (const slug of res.unitSlugs) {
            expect(
              slug === "general" || unitSlugs.has(slug),
              `[${course.id}] Recurso '${res.resourceId}' referencia unitSlug inexistente '${slug}'`,
            ).toBe(true);
          }
          for (const f of res.files) {
            expect(
              fs.existsSync(path.join(ROOT, f.path)),
              `[${course.id}] Archivo físico faltante: ${f.path}`,
            ).toBe(true);
          }
        }
      }

      const cheatsheetRel = `src/content/cheatsheets/${course.id}.json`;
      if (fs.existsSync(path.join(ROOT, cheatsheetRel))) {
        const cheatsheet = CheatsheetManifestSchema.parse(readJson(cheatsheetRel));
        expect(cheatsheet.courseId).toBe(course.id);
      }

      const exDirRel = `src/content/exercises/${course.id}`;
      const exercisesById = new Map<string, ReturnType<typeof ExerciseFrontmatterSchema.parse>>();
      const catalogCountByUnit = new Map<string, number>();
      let catalogCount = 0;
      let parcialCount = 0;
      if (fs.existsSync(path.join(ROOT, exDirRel))) {
        for (const relPath of listMdxFiles(exDirRel)) {
          const fm = ExerciseFrontmatterSchema.parse(parseMdxFrontmatter(relPath));
          expect(fm.courseId).toBe(course.id);
          expect(unitSlugs.has(fm.unit), `[${course.id}] Unidad inexistente '${fm.unit}' en ${relPath}`).toBe(true);
          expect(exercisesById.has(fm.id), `[${course.id}] ID de ejercicio duplicado '${fm.id}'`).toBe(false);
          exercisesById.set(fm.id, fm);
          for (const rid of fm.relatedResourceIds ?? []) {
            expect(
              resourceIds.has(rid),
              `[${course.id}] Ejercicio '${fm.id}' referencia recurso inexistente '${rid}'`,
            ).toBe(true);
          }
          if (fm.entityType === "CatalogExercise") {
            catalogCount++;
            catalogCountByUnit.set(fm.unit, (catalogCountByUnit.get(fm.unit) ?? 0) + 1);
          }
          if (fm.isParcial) {
            parcialCount++;
          }
        }
      }

      for (const unit of course.units) {
        if (unit.inCatalog) {
          expect(
            catalogCountByUnit.get(unit.slug) ?? 0,
            `[${course.id}] exerciseCount desincronizado en unidad '${unit.slug}'`,
          ).toBe(unit.exerciseCount);
        }
      }
      expect(catalogCount, `[${course.id}] stats.catalogExercises desincronizado`).toBe(
        course.stats.catalogExercises,
      );
      expect(parcialCount, `[${course.id}] stats.parcialExercises desincronizado`).toBe(
        course.stats.parcialExercises,
      );

      const assessRel = `src/content/assessments/${course.id}.json`;
      if (fs.existsSync(path.join(ROOT, assessRel))) {
        const assess = AssessmentManifestSchema.parse(readJson(assessRel));
        expect(assess.courseId).toBe(course.id);
        for (const exam of assess.exams) {
          if (exam.pdfResourceId) {
            expect(
              resourceIds.has(exam.pdfResourceId),
              `[${course.id}] Examen '${exam.id}' referencia PDF inexistente '${exam.pdfResourceId}'`,
            ).toBe(true);
          }
          for (const exId of exam.catalogExerciseIds) {
            const ex = exercisesById.get(exId);
            expect(ex, `[${course.id}] Examen '${exam.id}' referencia ejercicio inexistente '${exId}'`).toBeDefined();
            expect(
              (ex!.examIds ?? []).includes(exam.id),
              `[${course.id}] Ejercicio '${exId}' no declara examId '${exam.id}'`,
            ).toBe(true);
          }
        }
      }

      const docDirRel = `src/content/docs/${course.id}`;
      let notesCount = 0;
      let summariesCount = 0;
      if (fs.existsSync(path.join(ROOT, docDirRel))) {
        for (const relPath of listMdxFiles(docDirRel)) {
          const fm = DocFrontmatterSchema.parse(parseMdxFrontmatter(relPath));
          expect(fm.courseId).toBe(course.id);
          for (const rid of fm.relatedResourceIds ?? []) {
            expect(
              resourceIds.has(rid),
              `[${course.id}] Doc '${fm.docId}' referencia recurso inexistente '${rid}'`,
            ).toBe(true);
          }
          if (fm.entityType === "ElaboratedNote") notesCount++;
          if (fm.entityType === "ElaboratedSummary") summariesCount++;
        }
      }
      const expectedNotes = course.id === "tda" ? notesCount + 1 : notesCount;
      expect(expectedNotes, `[${course.id}] stats.elaboratedNotes desincronizado`).toBe(
        course.stats.elaboratedNotes,
      );
      const expectedSummaries = course.id === "tda" ? summariesCount + 1 : summariesCount;
      expect(expectedSummaries, `[${course.id}] stats.elaboratedSummaries desincronizado`).toBe(
        course.stats.elaboratedSummaries,
      );
      expect(
        quizzesByCourse.get(course.id) ?? 0,
        `[${course.id}] stats.trainerQuestions desincronizado`,
      ).toBe(course.stats.trainerQuestions);
    }
  });
});
