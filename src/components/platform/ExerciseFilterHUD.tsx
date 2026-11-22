import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { StudyMode } from "@/schemas/academic";
import { progressStore } from "@/stores/progressStore";
import {
  computeFilterSummary,
  filterExercises,
  type ExerciseFilterCriteria,
  type ExerciseFilterItem,
} from "@/utils/exerciseFilters";
import ExerciseCard from "./ExerciseCard";
import { SOLUTIONS_TOGGLE_EVENT } from "./SolutionDrawer";

export interface UnitFilterOption {
  slug: string;
  name: string;
}

export interface ExerciseFilterHUDProps {
  courseId: string;
  exercises: ExerciseFilterItem[];
  units: UnitFilterOption[];
  initialUnit?: string;
  initialOnlyParcial?: boolean;
  showSolutionsToggle?: boolean;
}

export function ExerciseFilterHUD({
  courseId,
  exercises,
  units,
  initialUnit = "all",
  initialOnlyParcial = false,
  showSolutionsToggle = false,
}: ExerciseFilterHUDProps) {
  const [mode, setMode] = useState<StudyMode>("all");
  const [difficulty, setDifficulty] = useState<"all" | 1 | 2 | 3 | 4 | 5>("all");
  const [unit, setUnit] = useState<string>(initialUnit);
  const [onlyParcial, setOnlyParcial] = useState<boolean>(initialOnlyParcial);
  const [query, setQuery] = useState<string>("");
  const [masteredIds, setMasteredIds] = useState<Set<string>>(() => new Set());
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [solutionsExpanded, setSolutionsExpanded] = useState(false);

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const resetToolbarBtnRef = useRef<HTMLButtonElement | null>(null);
  const searchInputId = useId();
  const unitSelectId = useId();

  useEffect(() => {
    const syncFromStore = () => {
      const state = progressStore.getCourseState(courseId);
      setMode(state.studyMode);
      setMasteredIds(new Set(state.mastered));
    };
    syncFromStore();
    return progressStore.subscribe(syncFromStore);
  }, [courseId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName ?? "";
      const isTyping = ["INPUT", "TEXTAREA", "SELECT"].includes(activeTag);
      if (isTyping) return;
      if (event.key === "/" || (event.ctrlKey && event.key.toLowerCase() === "k")) {
        event.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const criteria: ExerciseFilterCriteria = useMemo(
    () => ({
      mode,
      difficulty,
      unit,
      onlyParcial,
      query,
    }),
    [mode, difficulty, unit, onlyParcial, query],
  );

  const visibleExercises = useMemo(
    () => filterExercises(exercises, criteria, masteredIds),
    [exercises, criteria, masteredIds],
  );

  const summary = useMemo(
    () => computeFilterSummary(exercises, visibleExercises, masteredIds),
    [exercises, visibleExercises, masteredIds],
  );

  const handleModeChange = (nextMode: StudyMode) => {
    setMode(nextMode);
    setBannerDismissed(false);
    progressStore.setStudyMode(courseId, nextMode);
  };

  const handleToggleMastered = (exerciseId: string, next: boolean) => {
    const updated = progressStore.setExerciseMastered(courseId, exerciseId, next);
    setMasteredIds(new Set(updated));
  };

  const resetFilters = (restoreFocusToToolbar = false) => {
    setMode("all");
    setDifficulty("all");
    setUnit(initialUnit);
    setOnlyParcial(initialOnlyParcial);
    setQuery("");
    setBannerDismissed(false);
    progressStore.setStudyMode(courseId, "all");
    if (restoreFocusToToolbar) {
      requestAnimationFrame(() => {
        resetToolbarBtnRef.current?.focus();
      });
    }
  };

  const toggleAllSolutions = () => {
    const next = !solutionsExpanded;
    setSolutionsExpanded(next);
    window.dispatchEvent(
      new CustomEvent(SOLUTIONS_TOGGLE_EVENT, { detail: { open: next } }),
    );
  };

  return (
    <section aria-label="Filtro y seguimiento de ejercicios">
      <div className="hud-toolbar">
        <div className="hud-row">
          <div className="hud-group" role="group" aria-label="Modo de estudio">
            <span className="hud-label">Modo:</span>
            <button
              type="button"
              className={`btn filter-chip ${mode === "emergency" ? "is-active" : ""}`.trim()}
              aria-pressed={mode === "emergency"}
              onClick={() => handleModeChange("emergency")}
              data-testid="mode-emergency"
            >
              Emergencia ({summary.emergencyCount})
            </button>
            <button
              type="button"
              className={`btn filter-chip ${mode === "tactical" ? "is-active" : ""}`.trim()}
              aria-pressed={mode === "tactical"}
              onClick={() => handleModeChange("tactical")}
              data-testid="mode-tactical"
            >
              Táctico ({summary.tacticalCount})
            </button>
            <button
              type="button"
              className={`btn filter-chip ${mode === "all" ? "is-active" : ""}`.trim()}
              aria-pressed={mode === "all"}
              onClick={() => handleModeChange("all")}
              data-testid="mode-all"
            >
              Todos ({summary.totalExercises})
            </button>
          </div>

          <div className="progress-wrap">
            <div style={{ fontSize: "0.875rem", whiteSpace: "nowrap" }}>
              <strong data-testid="hud-mastered-count">
                {summary.masteredVisibleCount}
              </strong>{" "}
              / <span data-testid="hud-visible-count">{summary.visibleCount}</span>{" "}
              dominados ({summary.progressPercent}%)
            </div>
            <div
              className="progress-track"
              role="progressbar"
              aria-label="Progreso de ejercicios dominados en la vista actual"
              aria-valuemin={0}
              aria-valuemax={Math.max(summary.visibleCount, 1)}
              aria-valuenow={summary.masteredVisibleCount}
              aria-valuetext={`${summary.masteredVisibleCount} de ${summary.visibleCount} dominados (${summary.progressPercent}%)`}
            >
              <div
                className="progress-fill"
                style={{ width: `${summary.progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        <div className="hud-row">
          <div className="hud-group" role="group" aria-label="Filtrar por dificultad">
            <span className="hud-label">Dificultad:</span>
            <button
              type="button"
              className={`btn filter-chip ${difficulty === "all" ? "is-active" : ""}`.trim()}
              aria-pressed={difficulty === "all"}
              onClick={() => setDifficulty("all")}
              data-testid="diff-all"
            >
              Todas
            </button>
            {([1, 2, 3, 4, 5] as const).map((level) => (
              <button
                key={level}
                type="button"
                className={`btn filter-chip ${difficulty === level ? "is-active" : ""}`.trim()}
                aria-pressed={difficulty === level}
                aria-label={`Dificultad ${level} de 5`}
                onClick={() => setDifficulty(level)}
                data-testid={`diff-${level}`}
              >
                {level}★
              </button>
            ))}
          </div>

          <div className="hud-group">
            <label className="hud-label" htmlFor={unitSelectId}>
              Unidad:
            </label>
            <select
              id={unitSelectId}
              className="hud-select"
              value={unit}
              onChange={(event) => setUnit(event.target.value)}
              data-testid="filter-unit-select"
            >
              <option value="all">Todas las unidades</option>
              {units.map((u) => (
                <option key={u.slug} value={u.slug}>
                  {u.name}
                </option>
              ))}
            </select>

            <label className="mastery-toggle" style={{ minHeight: "2.35rem" }}>
              <input
                type="checkbox"
                checked={onlyParcial}
                onChange={(event) => setOnlyParcial(event.target.checked)}
                data-testid="filter-only-parcial"
              />
              <span>Solo parciales</span>
            </label>
          </div>
        </div>

        <div className="hud-row">
          <div className="hud-search-wrap">
            <label className="sr-only" htmlFor={searchInputId}>
              Buscar ejercicio por título, número u origen
            </label>
            <input
              ref={searchInputRef}
              id={searchInputId}
              type="search"
              className="hud-input"
              placeholder="Buscar ejercicio por nombre, número u origen (atajo / o Ctrl+K)"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              data-testid="hud-search-input"
            />
            {query ? (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setQuery("");
                  requestAnimationFrame(() => {
                    searchInputRef.current?.focus();
                  });
                }}
                data-testid="hud-clear-search"
              >
                Limpiar
              </button>
            ) : null}
          </div>

          <div className="hud-group">
            {showSolutionsToggle ? (
              <button
                type="button"
                className="btn btn-ghost"
                aria-pressed={solutionsExpanded}
                onClick={toggleAllSolutions}
              >
                {solutionsExpanded ? "Ocultar soluciones" : "Expandir soluciones"}
              </button>
            ) : null}
            <button
              ref={resetToolbarBtnRef}
              type="button"
              className="btn btn-ghost"
              onClick={() => resetFilters(false)}
              data-testid="hud-reset-filters"
            >
              Restablecer filtros
            </button>
          </div>
        </div>
      </div>

      {mode === "emergency" && !bannerDismissed ? (
        <div className="emergency-banner" role="status">
          <span>
            <strong>Modo Emergencia activo:</strong> mostrando únicamente los{" "}
            {summary.emergencyCount} ejercicios imprescindibles.
          </span>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setBannerDismissed(true)}
            aria-label="Ocultar aviso de modo emergencia"
          >
            Ocultar aviso
          </button>
        </div>
      ) : null}

      {visibleExercises.length === 0 ? (
        <div className="empty-state" data-testid="hud-empty-state">
          <h2 style={{ marginTop: 0 }}>
            No hay ejercicios que coincidan con los filtros actuales
          </h2>
          <p style={{ color: "var(--text-muted)" }}>
            Cambiá el término de búsqueda, ajustá la dificultad o volvé al modo{" "}
            <strong>Todos</strong>.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => resetFilters(true)}
            data-testid="hud-empty-reset"
          >
            Restablecer filtros
          </button>
        </div>
      ) : (
        <div className="exercise-list" data-testid="hud-exercise-list">
          {visibleExercises.map((exercise) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              mastered={masteredIds.has(exercise.id)}
              onToggleMastered={handleToggleMastered}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default ExerciseFilterHUD;
