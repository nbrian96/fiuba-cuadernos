import type { McqOptionKey } from "@/data/gdsiExamPrep";

export type RecallStatus = "mastered" | "review";
export type RecallStateMap = Record<string, RecallStatus>;
export type McqStateMap = Record<string, McqOptionKey>;

export const EXAM_PREP_SYNC_EVENT = "mc:exam-prep-sync";

export function getExamRecallKey(courseId: string): string {
  return `mc:v1:${courseId}:exam_recall`;
}

export function getExamMcqKey(courseId: string): string {
  return `mc:v1:${courseId}:exam_mcq`;
}

export function readStoredMap<T extends Record<string, string>>(key: string): T {
  if (typeof window === "undefined") return {} as T;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return {} as T;
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as T;
    }
  } catch {
    // Fallback silencioso si localStorage no está disponible
  }
  return {} as T;
}

export function writeStoredMap(
  courseId: string,
  key: string,
  value: Record<string, string>,
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignorar error de cuota o modo privado
  }
  window.dispatchEvent(
    new CustomEvent(EXAM_PREP_SYNC_EVENT, { detail: { courseId } }),
  );
}

export function clearExamPrepProgress(courseId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(getExamRecallKey(courseId));
    window.localStorage.removeItem(getExamMcqKey(courseId));
  } catch {
    // Ignorar
  }
  window.dispatchEvent(
    new CustomEvent(EXAM_PREP_SYNC_EVENT, { detail: { courseId } }),
  );
}
