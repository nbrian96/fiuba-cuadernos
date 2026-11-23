import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import {
  AssessmentManifestSchema,
  CheatsheetManifestSchema,
  CourseManifestSchema,
  DocFrontmatterSchema,
  ExerciseFrontmatterSchema,
  QuizManifestSchema,
  ResourceManifestSchema,
} from "./schemas/academic";

const courses = defineCollection({
  loader: glob({
    base: "./src/content/courses",
    pattern: "**/*.{json,yaml,yml}",
  }),
  schema: CourseManifestSchema,
});

const resources = defineCollection({
  loader: glob({
    base: "./src/content/resources",
    pattern: "**/*.{json,yaml,yml}",
  }),
  schema: ResourceManifestSchema,
});

const assessments = defineCollection({
  loader: glob({
    base: "./src/content/assessments",
    pattern: "**/*.{json,yaml,yml}",
  }),
  schema: AssessmentManifestSchema,
});

const quizzes = defineCollection({
  loader: glob({
    base: "./src/content/quizzes",
    pattern: "**/*.{json,yaml,yml}",
  }),
  schema: QuizManifestSchema,
});

const exercises = defineCollection({
  loader: glob({
    base: "./src/content/exercises",
    pattern: "**/*.{md,mdx}",
  }),
  schema: ExerciseFrontmatterSchema,
});

const docs = defineCollection({
  loader: glob({
    base: "./src/content/docs",
    pattern: "**/*.{md,mdx}",
  }),
  schema: DocFrontmatterSchema,
});

const cheatsheets = defineCollection({
  loader: glob({
    base: "./src/content/cheatsheets",
    pattern: "**/*.{json,yaml,yml}",
  }),
  schema: CheatsheetManifestSchema,
});

export const collections = {
  courses,
  resources,
  assessments,
  quizzes,
  exercises,
  docs,
  cheatsheets,
};
