import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { load as loadYaml } from "js-yaml";
import { describe, expect, it } from "vitest";
import {
  AssessmentManifestSchema,
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

  it("validates tda-entrenador-30s.yaml and verifies 20/20 parity against assets/js/app.js", () => {
    const quizRaw = loadYaml(
      fs.readFileSync(
        path.join(ROOT, "src/content/quizzes/tda-entrenador-30s.yaml"),
        "utf-8",
      ),
    );
    const quiz = QuizManifestSchema.parse(quizRaw);
    expect(quiz.questions).toHaveLength(20);

    const appJsCode = fs.readFileSync(
      path.join(ROOT, "assets/js/app.js"),
      "utf-8",
    );
    const sandbox: Record<string, unknown> = {
      window: { addEventListener() {}, pageYOffset: 0 },
      document: { addEventListener() {}, documentElement: { scrollTop: 0 } },
      console,
    };
    vm.runInNewContext(
      `${appJsCode}\n;globalThis.__TRAINER_QUESTIONS__ = TRAINER_QUESTIONS;`,
      sandbox,
    );
    const legacyQuestions = sandbox.__TRAINER_QUESTIONS__ as Array<{
      prompt: string;
      answer: string;
      paradigmName: string;
      trigger: string;
    }>;

    expect(legacyQuestions).toHaveLength(20);
    for (let i = 0; i < 20; i++) {
      expect(quiz.questions[i].prompt).toBe(legacyQuestions[i].prompt);
      expect(quiz.questions[i].answer).toBe(legacyQuestions[i].answer);
      expect(quiz.questions[i].paradigmName).toBe(
        legacyQuestions[i].paradigmName,
      );
      expect(quiz.questions[i].trigger).toBe(legacyQuestions[i].trigger);
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

    const exFiles = listMdxFiles("src/content/exercises");
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

    const docFiles = listMdxFiles("src/content/docs");
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
    const exFiles = listMdxFiles("src/content/exercises");
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
    const docFiles = listMdxFiles("src/content/docs");
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
