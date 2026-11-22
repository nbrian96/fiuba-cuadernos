import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { InteractiveAndNotesManifestSchema } from "@/schemas/academic";
import {
  createProgressStore,
  getChecklistStorageKey,
  getMasteredStorageKey,
  getMigrationSentinelKey,
  getStudyModeStorageKey,
  LEGACY_TDA_KEYS,
  normalizeExerciseId,
  THEME_STORAGE_KEY,
  toCatalogExerciseId,
  type StorageLike,
} from "@/stores/progressStore";

function createMemoryStorage(initial: Record<string, string> = {}) {
  const map = new Map<string, string>(Object.entries(initial));
  const storage: StorageLike = {
    getItem(key) {
      return map.has(key) ? map.get(key)! : null;
    },
    setItem(key, value) {
      map.set(key, value);
    },
    removeItem(key) {
      map.delete(key);
    },
  };
  return { storage, map };
}

describe("progressStore (local-storage-migration.md contract)", () => {
  it("migrates valid tda_* keys into mc:v1:* non-destructively and writes sentinel", () => {
    const { storage, map } = createMemoryStorage({
      [LEGACY_TDA_KEYS.theme]: "dark",
      [LEGACY_TDA_KEYS.mastered]: "[1, 18, 80]",
      [LEGACY_TDA_KEYS.studyMode]: "emergency",
      [LEGACY_TDA_KEYS.checklist]: '{"chk_20c98e6a10164095":true}',
    });

    const store = createProgressStore({
      storage,
      now: () => "2026-11-21T19:00:00.000Z",
    });

    const state = store.getCourseState("tda");
    expect(store.getTheme()).toBe("dark");
    expect(map.get(THEME_STORAGE_KEY)).toBe("dark");
    expect(state.mastered).toEqual(["tda-ej-01", "tda-ej-18", "tda-ej-80"]);
    expect(state.studyMode).toBe("emergency");
    expect(state.checklist).toEqual({ chk_20c98e6a10164095: true });
    expect(state.migratedFromLegacy).toBe(true);

    // Non-destructive: legacy keys remain completely intact
    expect(map.get(LEGACY_TDA_KEYS.theme)).toBe("dark");
    expect(map.get(LEGACY_TDA_KEYS.mastered)).toBe("[1, 18, 80]");
    expect(map.get(LEGACY_TDA_KEYS.studyMode)).toBe("emergency");
    expect(map.get(LEGACY_TDA_KEYS.checklist)).toBe('{"chk_20c98e6a10164095":true}');
    expect(map.has(getMigrationSentinelKey("tda"))).toBe(true);
  });

  it("is strictly idempotent and never overwrites existing valid mc:v1:* keys", () => {
    const existingMastered = JSON.stringify({
      version: 1,
      updatedAt: "2026-11-20T00:00:00.000Z",
      items: ["tda-ej-05"],
    });
    const { storage, map } = createMemoryStorage({
      [THEME_STORAGE_KEY]: "light",
      [getMasteredStorageKey("tda")]: existingMastered,
      [LEGACY_TDA_KEYS.theme]: "dark",
      [LEGACY_TDA_KEYS.mastered]: "[1]",
    });

    const store = createProgressStore({
      storage,
      now: () => "2026-11-21T19:00:00.000Z",
    });

    const state1 = store.getCourseState("tda");
    expect(store.getTheme()).toBe("light");
    expect(state1.mastered).toEqual(["tda-ej-05"]);

    // Second invocation with sentinel already written ignores legacy keys
    map.set(LEGACY_TDA_KEYS.mastered, "[2, 3]");
    const state2 = store.getCourseState("tda");
    expect(state2.mastered).toEqual(["tda-ej-05"]);
  });

  it("discards corrupted JSON in one legacy key without aborting remaining keys", () => {
    const { storage } = createMemoryStorage({
      [LEGACY_TDA_KEYS.mastered]: "{roto",
      [LEGACY_TDA_KEYS.studyMode]: "tactical",
    });

    const store = createProgressStore({ storage });
    const state = store.getCourseState("tda");
    expect(state.mastered).toEqual([]);
    expect(state.studyMode).toBe("tactical");
  });

  it("filters out-of-range, non-numeric and duplicate legacy exercise IDs", () => {
    const { storage } = createMemoryStorage({
      [LEGACY_TDA_KEYS.mastered]: '[0, -5, 1, 1, 85, 86, "x", 1.5, null]',
    });

    const store = createProgressStore({ storage });
    const state = store.getCourseState("tda");
    expect(state.mastered).toEqual(["tda-ej-01", "tda-ej-85"]);
  });

  it("filters pre-1A.2 checklist IDs and preserves all 11 deterministic chk_<16_hex> IDs", () => {
    const manifestPath = path.resolve(
      process.cwd(),
      "docs/manifests/tda/interactive-and-notes.json",
    );
    const manifest = InteractiveAndNotesManifestSchema.parse(
      JSON.parse(fs.readFileSync(manifestPath, "utf-8")),
    );
    const realChecklistItems =
      manifest.summaries.find((s) => s.checklistItems)?.checklistItems ?? [];
    expect(realChecklistItems).toHaveLength(11);

    const legacyObj: Record<string, unknown> = {
      chk_12345: true,
      bad: "yes",
    };
    for (const item of realChecklistItems) {
      legacyObj[item.id] = true;
    }

    const { storage } = createMemoryStorage({
      [LEGACY_TDA_KEYS.checklist]: JSON.stringify(legacyObj),
    });

    const store = createProgressStore({ storage });
    const checklist = store.getChecklistState("tda");

    expect("chk_12345" in checklist).toBe(false);
    expect("bad" in checklist).toBe(false);
    expect(Object.keys(checklist)).toHaveLength(11);
    for (const item of realChecklistItems) {
      expect(checklist[item.id]).toBe(true);
    }
  });

  it("degrades safely to an in-memory Map on SecurityError and QuotaExceededError", () => {
    const securityBlockedStorage: StorageLike = {
      getItem() {
        throw new Error("SecurityError: storage blocked");
      },
      setItem() {
        throw new Error("SecurityError: storage blocked");
      },
    };

    const storeBlocked = createProgressStore({ storage: securityBlockedStorage });
    expect(() => storeBlocked.getCourseState("tda")).not.toThrow();
    expect(storeBlocked.isUsingMemoryFallback()).toBe(true);
    expect(storeBlocked.setTheme("dark")).toBe("dark");
    expect(storeBlocked.getTheme()).toBe("dark");
    expect(storeBlocked.setExerciseMastered("tda", "tda-ej-18", true)).toEqual([
      "tda-ej-18",
    ]);
    expect(storeBlocked.isExerciseMastered("tda", "tda-ej-18")).toBe(true);

    const quotaStorage: StorageLike = {
      getItem() {
        return null;
      },
      setItem() {
        throw new Error("QuotaExceededError");
      },
    };
    const storeQuota = createProgressStore({ storage: quotaStorage });
    expect(() => storeQuota.setChecklistItem("tda", "chk_20c98e6a10164095", true)).not.toThrow();
    expect(storeQuota.getChecklistState("tda")).toEqual({
      chk_20c98e6a10164095: true,
    });
    expect(storeQuota.isUsingMemoryFallback()).toBe(true);
  });

  it("isolates multiple courses so tda_* keys are never migrated into other courses", () => {
    const { storage, map } = createMemoryStorage({
      [LEGACY_TDA_KEYS.mastered]: "[1, 18, 80]",
      [LEGACY_TDA_KEYS.studyMode]: "emergency",
      [LEGACY_TDA_KEYS.checklist]: '{"chk_20c98e6a10164095":true}',
    });

    const store = createProgressStore({ storage });
    const algo2 = store.getCourseState("algo2");
    expect(algo2.mastered).toEqual([]);
    expect(algo2.studyMode).toBe("all");
    expect(algo2.checklist).toEqual({});
    expect(algo2.migratedFromLegacy).toBe(false);
    expect(map.has(getMasteredStorageKey("algo2"))).toBe(false);
    expect(map.has(getChecklistStorageKey("algo2"))).toBe(false);
    expect(map.has(getStudyModeStorageKey("algo2"))).toBe(false);
  });

  it("normalizes padded/unpadded IDs, keeps advanced IDs, and notifies subscribers", () => {
    expect(toCatalogExerciseId("tda", 1)).toBe("tda-ej-01");
    expect(toCatalogExerciseId("tda", 85)).toBe("tda-ej-85");
    expect(normalizeExerciseId("tda", "tda-ej-1")).toBe("tda-ej-01");
    expect(normalizeExerciseId("tda", "tda-adv-aprox-2partition")).toBe(
      "tda-adv-aprox-2partition",
    );
    expect(normalizeExerciseId("tda", "../bad")).toBeNull();

    const { storage } = createMemoryStorage();
    const store = createProgressStore({ storage });
    const listener = vi.fn();
    const unsub = store.subscribe(listener);

    expect(store.toggleExerciseMastered("tda", "tda-ej-1")).toBe(true);
    expect(store.isExerciseMastered("tda", "tda-ej-01")).toBe(true);
    expect(store.toggleTheme()).toBe("dark");
    expect(listener).toHaveBeenCalledTimes(2);

    unsub();
    store.setStudyMode("tda", "tactical");
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("ignores invalid legacy theme/study_mode, recovers from corrupt preexisting mc:v1:* keys, and throws on invalid IDs", () => {
    const { storage } = createMemoryStorage({
      [LEGACY_TDA_KEYS.theme]: "sepia",
      [LEGACY_TDA_KEYS.studyMode]: "invalid-mode",
      [getMasteredStorageKey("tda")]: "{corrupt-json",
      [getChecklistStorageKey("tda")]: "[]",
    });

    const store = createProgressStore({
      storage,
      systemPrefersDark: () => false,
    });
    expect(store.getTheme()).toBe("light");
    const state = store.getCourseState("tda");
    expect(state.studyMode).toBe("all");
    expect(state.mastered).toEqual([]);
    expect(state.checklist).toEqual({});

    expect(() => toCatalogExerciseId("tda", 0)).toThrow(RangeError);
    expect(() =>
      store.setChecklistItem("tda", "chk_12345", true),
    ).toThrow();
  });
});
