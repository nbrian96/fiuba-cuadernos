import type { McqOptionKey } from "@/data/gdsiExamPrep";

export type RecallStatus = "mastered" | "review";
export type RecallStateMap = Record<string, RecallStatus>;
export type McqStateMap = Record<string, McqOptionKey>;

export const EXAM_PREP_SYNC_EVENT = "mc:exam-prep-sync";

function normalizeScope(storageScope?: string): string {
  return storageScope ? `${storageScope}:` : "";
}

export function getExamRecallKey(courseId: string, storageScope?: string): string {
  return `mc:v1:${courseId}:${normalizeScope(storageScope)}exam_recall`;
}

export function getExamMcqKey(courseId: string, storageScope?: string): string {
  return `mc:v1:${courseId}:${normalizeScope(storageScope)}exam_mcq`;
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
  storageScope?: string,
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignorar error de cuota o modo privado
  }
  window.dispatchEvent(
    new CustomEvent(EXAM_PREP_SYNC_EVENT, { detail: { courseId, storageScope } }),
  );
}

export function clearExamPrepProgress(courseId: string, storageScope?: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(getExamRecallKey(courseId, storageScope));
    window.localStorage.removeItem(getExamMcqKey(courseId, storageScope));
  } catch {
    // Ignorar
  }
  window.dispatchEvent(
    new CustomEvent(EXAM_PREP_SYNC_EVENT, { detail: { courseId, storageScope } }),
  );
}
