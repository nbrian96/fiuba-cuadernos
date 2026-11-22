import type { ExerciseFrontmatter, StudyMode } from "@/schemas/academic";

export interface ExerciseFilterItem {
  id: string;
  courseId: string;
  number: number | null;
  title: string;
  unit: string;
  unitName?: string;
  entityType: ExerciseFrontmatter["entityType"];
  provenance: ExerciseFrontmatter["provenance"];
  priority: ExerciseFrontmatter["priority"];
  difficulty: ExerciseFrontmatter["difficulty"];
  origin: string;
  isParcial: boolean;
  detailHref: string;
  excerpt?: string;
}

export interface ExerciseFilterCriteria {
  mode: StudyMode;
  difficulty: "all" | 1 | 2 | 3 | 4 | 5;
  unit: "all" | string;
  onlyParcial: boolean;
  query: string;
}

export interface ExerciseFilterSummary {
  totalExercises: number;
  visibleCount: number;
  masteredTotalCount: number;
  masteredVisibleCount: number;
  emergencyCount: number;
  tacticalCount: number;
  progressPercent: number;
}

export function matchesStudyMode(
  item: Pick<ExerciseFilterItem, "id" | "priority">,
  mode: StudyMode,
  masteredIds: ReadonlySet<string>,
): boolean {
  if (mode === "emergency") {
    return item.priority === "imprescindible";
  }
  if (mode === "tactical") {
    return !masteredIds.has(item.id) || item.priority === "importante";
  }
  return true;
}

export function matchesExerciseQuery(
  item: ExerciseFilterItem,
  rawQuery: string,
): boolean {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return true;

  const haystack = [
    item.id,
    item.title,
    item.origin,
    item.unit,
    item.unitName ?? "",
    item.excerpt ?? "",
    item.number !== null ? `ej ${item.number}` : "",
    item.number !== null ? `ejercicio ${item.number}` : "",
    item.number !== null ? `#${item.number}` : "",
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

export function filterExercises(
  items: readonly ExerciseFilterItem[],
  criteria: ExerciseFilterCriteria,
  masteredIds: ReadonlySet<string>,
): ExerciseFilterItem[] {
  return items.filter((item) => {
    if (!matchesStudyMode(item, criteria.mode, masteredIds)) {
      return false;
    }
    if (criteria.difficulty !== "all" && item.difficulty !== criteria.difficulty) {
      return false;
    }
    if (criteria.unit !== "all" && item.unit !== criteria.unit) {
      return false;
    }
    if (criteria.onlyParcial && !item.isParcial) {
      return false;
    }
    if (!matchesExerciseQuery(item, criteria.query)) {
      return false;
    }
    return true;
  });
}

export function computeFilterSummary(
  allItems: readonly ExerciseFilterItem[],
  visibleItems: readonly ExerciseFilterItem[],
  masteredIds: ReadonlySet<string>,
): ExerciseFilterSummary {
  let emergencyCount = 0;
  let tacticalCount = 0;
  let masteredTotalCount = 0;

  for (const item of allItems) {
    if (item.priority === "imprescindible") emergencyCount++;
    if (matchesStudyMode(item, "tactical", masteredIds)) tacticalCount++;
    if (masteredIds.has(item.id)) masteredTotalCount++;
  }

  let masteredVisibleCount = 0;
  for (const item of visibleItems) {
    if (masteredIds.has(item.id)) masteredVisibleCount++;
  }

  const visibleCount = visibleItems.length;
  const progressPercent =
    visibleCount > 0 ? Math.round((masteredVisibleCount / visibleCount) * 100) : 0;

  return {
    totalExercises: allItems.length,
    visibleCount,
    masteredTotalCount,
    masteredVisibleCount,
    emergencyCount,
    tacticalCount,
    progressPercent,
  };
}
