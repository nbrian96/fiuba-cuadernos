import type { StudyMode } from "@/schemas/academic";

export type ThemeMode = "light" | "dark";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

export interface MasteredRecord {
  version: 1;
  updatedAt: string;
  items: string[];
}

export interface ChecklistRecord {
  version: 1;
  updatedAt: string;
  items: Record<string, boolean>;
}

export interface StudyModeRecord {
  version: 1;
  updatedAt: string;
  mode: StudyMode;
}

export interface LegacyMigrationSentinel {
  version: 1;
  migratedAt: string;
  sourceKeys: string[];
}

export interface CourseProgressState {
  courseId: string;
  mastered: string[];
  checklist: Record<string, boolean>;
  studyMode: StudyMode;
  migratedFromLegacy: boolean;
}

export const THEME_STORAGE_KEY = "mc:v1:global:theme";

export const LEGACY_TDA_KEYS = {
  theme: "tda_theme",
  mastered: "tda_mastered_exercises",
  checklist: "tda_exam_checklist",
  studyMode: "tda_study_mode",
} as const;

const SLUG_RE = /^[a-z0-9-]+$/;
const CHECKLIST_ID_RE = /^chk_[0-9a-f]{16}$/;
const STRICT_INT_RE = /^-?\d+$/;

function assertValidCourseId(courseId: string): void {
  if (!SLUG_RE.test(courseId)) {
    throw new Error(`courseId inválido '${courseId}': debe cumplir ^[a-z0-9-]+$.`);
  }
}

export function getMasteredStorageKey(courseId: string): string {
  assertValidCourseId(courseId);
  return `mc:v1:${courseId}:mastered`;
}

export function getChecklistStorageKey(courseId: string): string {
  assertValidCourseId(courseId);
  return `mc:v1:${courseId}:checklist`;
}

export function getStudyModeStorageKey(courseId: string): string {
  assertValidCourseId(courseId);
  return `mc:v1:${courseId}:study_mode`;
}

export function getMigrationSentinelKey(courseId: string): string {
  assertValidCourseId(courseId);
  return `mc:v1:${courseId}:migrated_from_legacy`;
}

export function toCatalogExerciseId(courseId: string, num: number): string {
  assertValidCourseId(courseId);
  if (!Number.isInteger(num) || num < 1) {
    throw new RangeError(`Número de ejercicio inválido: ${String(num)}`);
  }
  return `${courseId}-ej-${String(num).padStart(2, "0")}`;
}

export function normalizeExerciseId(courseId: string, rawId: string): string | null {
  assertValidCourseId(courseId);
  const trimmed = rawId.trim();
  if (!SLUG_RE.test(trimmed)) {
    return null;
  }
  const prefix = `${courseId}-ej-`;
  if (trimmed.startsWith(prefix)) {
    const numPart = trimmed.slice(prefix.length);
    if (/^\d+$/.test(numPart)) {
      const parsed = Number.parseInt(numPart, 10);
      if (Number.isInteger(parsed) && parsed >= 1) {
        return toCatalogExerciseId(courseId, parsed);
      }
      return null;
    }
  }
  return trimmed;
}

export function isValidChecklistId(id: string): boolean {
  return CHECKLIST_ID_RE.test(id);
}

export function isValidTheme(value: unknown): value is ThemeMode {
  return value === "light" || value === "dark";
}

export function isValidStudyMode(value: unknown): value is StudyMode {
  return value === "emergency" || value === "tactical" || value === "all";
}

interface SafeStorage {
  getItem(key: string): { ok: boolean; value: string | null };
  setItem(key: string, value: string): boolean;
  isMemoryFallbackActive(): boolean;
}

function createSafeStorage(backing?: StorageLike | null): SafeStorage {
  const memory = new Map<string, string>();
  const memoryOverrides = new Set<string>();
  let storageBlocked = backing == null;

  return {
    getItem(key: string): { ok: boolean; value: string | null } {
      if (memoryOverrides.has(key)) {
        return { ok: true, value: memory.get(key) ?? null };
      }
      if (storageBlocked || !backing) {
        return { ok: false, value: memory.get(key) ?? null };
      }
      try {
        return { ok: true, value: backing.getItem(key) };
      } catch {
        storageBlocked = true;
        return { ok: false, value: memory.get(key) ?? null };
      }
    },
    setItem(key: string, value: string): boolean {
      memory.set(key, value);
      if (storageBlocked || !backing) {
        memoryOverrides.add(key);
        return false;
      }
      try {
        backing.setItem(key, value);
        memoryOverrides.delete(key);
        return true;
      } catch {
        memoryOverrides.add(key);
        return false;
      }
    },
    isMemoryFallbackActive(): boolean {
      return storageBlocked || memoryOverrides.size > 0;
    },
  };
}

function getBrowserLocalStorage(): StorageLike | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function parseJsonSafe(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeMasteredItems(courseId: string, rawItems: unknown[]): string[] {
  const normalized = new Set<string>();
  for (const item of rawItems) {
    if (typeof item === "string") {
      const norm = normalizeExerciseId(courseId, item);
      if (norm) normalized.add(norm);
    }
  }
  return Array.from(normalized).sort();
}

function parseMasteredRecord(courseId: string, raw: string | null): MasteredRecord | null {
  const parsed = parseJsonSafe(raw);
  if (!isPlainRecord(parsed)) return null;
  if (parsed.version !== 1 || !Array.isArray(parsed.items)) return null;
  const items = sanitizeMasteredItems(courseId, parsed.items);
  return {
    version: 1,
    updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date(0).toISOString(),
    items,
  };
}

function sanitizeChecklistItems(rawObj: Record<string, unknown>): Record<string, boolean> {
  const cleaned: Record<string, boolean> = {};
  for (const key of Object.keys(rawObj).sort()) {
    if (isValidChecklistId(key) && typeof rawObj[key] === "boolean") {
      cleaned[key] = rawObj[key] as boolean;
    }
  }
  return cleaned;
}

function parseChecklistRecord(raw: string | null): ChecklistRecord | null {
  const parsed = parseJsonSafe(raw);
  if (!isPlainRecord(parsed)) return null;
  if (parsed.version !== 1 || !isPlainRecord(parsed.items)) return null;
  return {
    version: 1,
    updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date(0).toISOString(),
    items: sanitizeChecklistItems(parsed.items),
  };
}

function parseStudyModeRecord(raw: string | null): StudyModeRecord | null {
  const parsed = parseJsonSafe(raw);
  if (!isPlainRecord(parsed)) return null;
  if (parsed.version !== 1 || !isValidStudyMode(parsed.mode)) return null;
  return {
    version: 1,
    updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date(0).toISOString(),
    mode: parsed.mode,
  };
}

function parseMigrationSentinel(raw: string | null): LegacyMigrationSentinel | null {
  const parsed = parseJsonSafe(raw);
  if (!isPlainRecord(parsed)) return null;
  if (parsed.version !== 1 || typeof parsed.migratedAt !== "string") return null;
  return {
    version: 1,
    migratedAt: parsed.migratedAt,
    sourceKeys: Array.isArray(parsed.sourceKeys)
      ? parsed.sourceKeys.filter((k): k is string => typeof k === "string")
      : [],
  };
}

function sanitizeLegacyMasteredArray(courseId: string, raw: string | null): { validArray: boolean; items: string[] } {
  if (!raw) return { validArray: false, items: [] };
  const parsed = parseJsonSafe(raw);
  if (!Array.isArray(parsed)) {
    return { validArray: false, items: [] };
  }
  const normalized = new Set<string>();
  for (const entry of parsed) {
    let n: number | null = null;
    if (typeof entry === "number" && Number.isInteger(entry)) {
      n = entry;
    } else if (typeof entry === "string" && STRICT_INT_RE.test(entry.trim())) {
      n = Number.parseInt(entry.trim(), 10);
    }
    if (n !== null && Number.isInteger(n) && n >= 1 && n <= 85) {
      normalized.add(toCatalogExerciseId(courseId, n));
    }
  }
  return {
    validArray: true,
    items: Array.from(normalized).sort(),
  };
}

function sanitizeLegacyChecklist(raw: string | null): { validObject: boolean; items: Record<string, boolean> } {
  if (!raw) return { validObject: false, items: {} };
  const parsed = parseJsonSafe(raw);
  if (!isPlainRecord(parsed)) {
    return { validObject: false, items: {} };
  }
  return {
    validObject: true,
    items: sanitizeChecklistItems(parsed),
  };
}

export interface ProgressStoreOptions {
  storage?: StorageLike | null;
  now?: () => string;
  systemPrefersDark?: () => boolean;
}

export interface ProgressStore {
  getTheme(): ThemeMode;
  setTheme(theme: ThemeMode): ThemeMode;
  toggleTheme(): ThemeMode;
  applyThemeToDocument(theme?: ThemeMode): ThemeMode;
  migrateLegacyTda(): boolean;
  getCourseState(courseId: string): CourseProgressState;
  isExerciseMastered(courseId: string, exerciseId: string): boolean;
  setExerciseMastered(courseId: string, exerciseId: string, mastered: boolean): string[];
  toggleExerciseMastered(courseId: string, exerciseId: string): boolean;
  getChecklistState(courseId: string): Record<string, boolean>;
  setChecklistItem(courseId: string, checklistId: string, checked: boolean): Record<string, boolean>;
  getStudyMode(courseId: string): StudyMode;
  setStudyMode(courseId: string, mode: StudyMode): StudyMode;
  subscribe(listener: () => void): () => void;
  isUsingMemoryFallback(): boolean;
}

export function createProgressStore(options: ProgressStoreOptions = {}): ProgressStore {
  const storageProvided = "storage" in options;
  let browserStorageAttached = false;
  let safeStorage = createSafeStorage(
    storageProvided ? options.storage : getBrowserLocalStorage(),
  );
  if (!storageProvided && typeof window !== "undefined") {
    browserStorageAttached = true;
  }

  const ensureStorage = (): SafeStorage => {
    if (!storageProvided && !browserStorageAttached && typeof window !== "undefined") {
      browserStorageAttached = true;
      safeStorage = createSafeStorage(getBrowserLocalStorage());
    }
    return safeStorage;
  };

  const nowIso = options.now ?? (() => new Date().toISOString());
  const prefersDark =
    options.systemPrefersDark ??
    (() => {
      if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
        return false;
      }
      try {
        return window.matchMedia("(prefers-color-scheme: dark)").matches;
      } catch {
        return false;
      }
    });

  const listeners = new Set<() => void>();
  const notify = (): void => {
    for (const listener of listeners) {
      listener();
    }
  };

  let storageEventBound = false;
  const bindWindowStorageEvent = (): void => {
    if (storageEventBound || typeof window === "undefined") return;
    storageEventBound = true;
    window.addEventListener("storage", (ev: StorageEvent) => {
      if (!ev.key || ev.key.startsWith("mc:v1:")) {
        if (ev.key === THEME_STORAGE_KEY && isValidTheme(ev.newValue)) {
          applyThemeToDocument(ev.newValue);
        }
        notify();
      }
    });
  };

  const migrateLegacyTda = (): boolean => {
    const store = ensureStorage();
    const sentinelKey = getMigrationSentinelKey("tda");
    const sentinelRead = store.getItem(sentinelKey);
    if (!sentinelRead.ok) {
      return false;
    }
    if (parseMigrationSentinel(sentinelRead.value) !== null) {
      return false;
    }

    const timestamp = nowIso();
    const inspectedSourceKeys: string[] = [];

    // 1. tda_theme -> mc:v1:global:theme (solo si no existe ya un valor válido)
    const legacyThemeRead = store.getItem(LEGACY_TDA_KEYS.theme);
    if (legacyThemeRead.value !== null) {
      inspectedSourceKeys.push(LEGACY_TDA_KEYS.theme);
    }
    const existingTheme = store.getItem(THEME_STORAGE_KEY);
    if (!isValidTheme(existingTheme.value) && isValidTheme(legacyThemeRead.value)) {
      store.setItem(THEME_STORAGE_KEY, legacyThemeRead.value);
    }

    // 2. tda_mastered_exercises -> mc:v1:tda:mastered
    const masteredKey = getMasteredStorageKey("tda");
    const legacyMasteredRead = store.getItem(LEGACY_TDA_KEYS.mastered);
    if (legacyMasteredRead.value !== null) {
      inspectedSourceKeys.push(LEGACY_TDA_KEYS.mastered);
    }
    const existingMastered = parseMasteredRecord("tda", store.getItem(masteredKey).value);
    if (existingMastered === null) {
      const sanitized = sanitizeLegacyMasteredArray("tda", legacyMasteredRead.value);
      if (sanitized.validArray) {
        const record: MasteredRecord = {
          version: 1,
          updatedAt: timestamp,
          items: sanitized.items,
        };
        store.setItem(masteredKey, JSON.stringify(record));
      }
    }

    // 3. tda_exam_checklist -> mc:v1:tda:checklist
    const checklistKey = getChecklistStorageKey("tda");
    const legacyChecklistRead = store.getItem(LEGACY_TDA_KEYS.checklist);
    if (legacyChecklistRead.value !== null) {
      inspectedSourceKeys.push(LEGACY_TDA_KEYS.checklist);
    }
    const existingChecklist = parseChecklistRecord(store.getItem(checklistKey).value);
    if (existingChecklist === null) {
      const sanitized = sanitizeLegacyChecklist(legacyChecklistRead.value);
      if (sanitized.validObject) {
        const record: ChecklistRecord = {
          version: 1,
          updatedAt: timestamp,
          items: sanitized.items,
        };
        store.setItem(checklistKey, JSON.stringify(record));
      }
    }

    // 4. tda_study_mode -> mc:v1:tda:study_mode
    const modeKey = getStudyModeStorageKey("tda");
    const legacyModeRead = store.getItem(LEGACY_TDA_KEYS.studyMode);
    if (legacyModeRead.value !== null) {
      inspectedSourceKeys.push(LEGACY_TDA_KEYS.studyMode);
    }
    const existingMode = parseStudyModeRecord(store.getItem(modeKey).value);
    if (existingMode === null && isValidStudyMode(legacyModeRead.value)) {
      const record: StudyModeRecord = {
        version: 1,
        updatedAt: timestamp,
        mode: legacyModeRead.value,
      };
      store.setItem(modeKey, JSON.stringify(record));
    }

    const sentinel: LegacyMigrationSentinel = {
      version: 1,
      migratedAt: timestamp,
      sourceKeys:
        inspectedSourceKeys.length > 0
          ? inspectedSourceKeys
          : [
              LEGACY_TDA_KEYS.theme,
              LEGACY_TDA_KEYS.mastered,
              LEGACY_TDA_KEYS.checklist,
              LEGACY_TDA_KEYS.studyMode,
            ],
    };
    return store.setItem(sentinelKey, JSON.stringify(sentinel));
  };

  const getTheme = (): ThemeMode => {
    const store = ensureStorage();
    const current = store.getItem(THEME_STORAGE_KEY).value;
    if (isValidTheme(current)) {
      return current;
    }
    const legacy = store.getItem(LEGACY_TDA_KEYS.theme).value;
    if (isValidTheme(legacy)) {
      return legacy;
    }
    return prefersDark() ? "dark" : "light";
  };

  const applyThemeToDocument = (theme?: ThemeMode): ThemeMode => {
    const resolved = theme ?? getTheme();
    if (typeof document !== "undefined" && document.documentElement) {
      document.documentElement.setAttribute("data-theme", resolved);
    }
    return resolved;
  };

  const setTheme = (theme: ThemeMode): ThemeMode => {
    if (!isValidTheme(theme)) {
      throw new Error(`Tema inválido: ${String(theme)}`);
    }
    ensureStorage().setItem(THEME_STORAGE_KEY, theme);
    applyThemeToDocument(theme);
    notify();
    return theme;
  };

  const toggleTheme = (): ThemeMode => {
    const next: ThemeMode = getTheme() === "dark" ? "light" : "dark";
    return setTheme(next);
  };

  const ensureCourseMigrated = (courseId: string): boolean => {
    assertValidCourseId(courseId);
    if (courseId === "tda") {
      migrateLegacyTda();
      return parseMigrationSentinel(ensureStorage().getItem(getMigrationSentinelKey("tda")).value) !== null;
    }
    return false;
  };

  const getCourseState = (courseId: string): CourseProgressState => {
    const migrated = ensureCourseMigrated(courseId);
    const store = ensureStorage();

    const masteredRec = parseMasteredRecord(courseId, store.getItem(getMasteredStorageKey(courseId)).value);
    const checklistRec = parseChecklistRecord(store.getItem(getChecklistStorageKey(courseId)).value);
    const modeRec = parseStudyModeRecord(store.getItem(getStudyModeStorageKey(courseId)).value);

    return {
      courseId,
      mastered: masteredRec?.items ?? [],
      checklist: checklistRec?.items ?? {},
      studyMode: modeRec?.mode ?? "all",
      migratedFromLegacy: migrated,
    };
  };

  const setExerciseMastered = (courseId: string, rawExerciseId: string, mastered: boolean): string[] => {
    ensureCourseMigrated(courseId);
    const normalizedId = normalizeExerciseId(courseId, rawExerciseId);
    if (!normalizedId) {
      throw new Error(`Identificador de ejercicio inválido: '${rawExerciseId}'`);
    }
    const state = getCourseState(courseId);
    const nextSet = new Set(state.mastered);
    if (mastered) {
      nextSet.add(normalizedId);
    } else {
      nextSet.delete(normalizedId);
    }
    const items = Array.from(nextSet).sort();
    const record: MasteredRecord = {
      version: 1,
      updatedAt: nowIso(),
      items,
    };
    ensureStorage().setItem(getMasteredStorageKey(courseId), JSON.stringify(record));
    notify();
    return items;
  };

  const isExerciseMastered = (courseId: string, rawExerciseId: string): boolean => {
    const normalizedId = normalizeExerciseId(courseId, rawExerciseId);
    if (!normalizedId) return false;
    return getCourseState(courseId).mastered.includes(normalizedId);
  };

  const toggleExerciseMastered = (courseId: string, rawExerciseId: string): boolean => {
    const currentlyMastered = isExerciseMastered(courseId, rawExerciseId);
    const nextValue = !currentlyMastered;
    setExerciseMastered(courseId, rawExerciseId, nextValue);
    return nextValue;
  };

  const getChecklistState = (courseId: string): Record<string, boolean> => {
    return getCourseState(courseId).checklist;
  };

  const setChecklistItem = (
    courseId: string,
    checklistId: string,
    checked: boolean,
  ): Record<string, boolean> => {
    if (!isValidChecklistId(checklistId)) {
      throw new Error(`Identificador de checklist inválido: '${checklistId}'`);
    }
    ensureCourseMigrated(courseId);
    const current = getChecklistState(courseId);
    const nextItems: Record<string, boolean> = {
      ...current,
      [checklistId]: Boolean(checked),
    };
    const record: ChecklistRecord = {
      version: 1,
      updatedAt: nowIso(),
      items: nextItems,
    };
    ensureStorage().setItem(getChecklistStorageKey(courseId), JSON.stringify(record));
    notify();
    return nextItems;
  };

  const getStudyMode = (courseId: string): StudyMode => {
    return getCourseState(courseId).studyMode;
  };

  const setStudyMode = (courseId: string, mode: StudyMode): StudyMode => {
    if (!isValidStudyMode(mode)) {
      throw new Error(`Modo de estudio inválido: '${String(mode)}'`);
    }
    ensureCourseMigrated(courseId);
    const record: StudyModeRecord = {
      version: 1,
      updatedAt: nowIso(),
      mode,
    };
    ensureStorage().setItem(getStudyModeStorageKey(courseId), JSON.stringify(record));
    notify();
    return mode;
  };

  const subscribe = (listener: () => void): (() => void) => {
    bindWindowStorageEvent();
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  return {
    getTheme,
    setTheme,
    toggleTheme,
    applyThemeToDocument,
    migrateLegacyTda,
    getCourseState,
    isExerciseMastered,
    setExerciseMastered,
    toggleExerciseMastered,
    getChecklistState,
    setChecklistItem,
    getStudyMode,
    setStudyMode,
    subscribe,
    isUsingMemoryFallback: () => safeStorage.isMemoryFallbackActive(),
  };
}

let singletonStore: ProgressStore | null = null;

export function getProgressStore(): ProgressStore {
  if (!singletonStore) {
    singletonStore = createProgressStore();
  }
  return singletonStore;
}

export const progressStore = getProgressStore();
