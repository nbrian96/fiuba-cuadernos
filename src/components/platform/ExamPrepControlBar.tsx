import { useEffect, useState } from "react";
import type { McqOptionKey } from "@/data/gdsiExamPrep";
import {
  clearExamPrepProgress,
  EXAM_PREP_SYNC_EVENT,
  getExamMcqKey,
  getExamRecallKey,
  readStoredMap,
  type McqStateMap,
  type RecallStateMap,
} from "@/utils/examPrepStorage";

export type StudyViewMode = "all" | "theory" | "recall" | "mcq";

export interface ExamUnitMeta {
  id: string;
  number: number;
  shortTitle: string;
  title: string;
  correctKeys: Record<string, McqOptionKey>;
}

export interface ExamPrepControlBarProps {
  courseId: string;
  storageScope?: string;
  units: ExamUnitMeta[];
  totalRecall: number;
  totalMcq: number;
}

const VIEW_MODES: Array<{ key: StudyViewMode; label: string }> = [
  { key: "all", label: "Vista completa" },
  { key: "theory", label: "Teoría y Matrices" },
  { key: "recall", label: "Autoevaluación" },
  { key: "mcq", label: "Multiple Choice" },
];

export function ExamPrepControlBar({
  courseId,
  storageScope,
  units,
  totalRecall,
  totalMcq,
}: ExamPrepControlBarProps) {
  const [viewMode, setViewMode] = useState<StudyViewMode>("all");
  const [unitFilter, setUnitFilter] = useState<string>("all");
  const [confirmReset, setConfirmReset] = useState(false);
  const [stats, setStats] = useState({
    mastered: 0,
    review: 0,
    mcqAnswered: 0,
    mcqCorrect: 0,
  });

  useEffect(() => {
    const correctLookup = new Map<string, McqOptionKey>();
    for (const unit of units) {
      for (const [qId, key] of Object.entries(unit.correctKeys)) {
        correctLookup.set(qId, key);
      }
    }

    const syncStats = () => {
      const recallMap = readStoredMap<RecallStateMap>(
        getExamRecallKey(courseId, storageScope),
      );
      const mcqMap = readStoredMap<McqStateMap>(
        getExamMcqKey(courseId, storageScope),
      );

      let mastered = 0;
      let review = 0;
      for (const status of Object.values(recallMap)) {
        if (status === "mastered") mastered++;
        else if (status === "review") review++;
      }

      let mcqAnswered = 0;
      let mcqCorrect = 0;
      for (const [qId, selected] of Object.entries(mcqMap)) {
        const expected = correctLookup.get(qId);
        if (expected) {
          mcqAnswered++;
          if (selected === expected) mcqCorrect++;
        }
      }

      setStats({ mastered, review, mcqAnswered, mcqCorrect });
    };

    syncStats();
    const onSync = (ev: Event) => {
      const custom = ev as CustomEvent<{ courseId?: string; storageScope?: string }>;
      if (
        (!custom.detail?.courseId || custom.detail.courseId === courseId) &&
        (custom.detail?.storageScope ?? undefined) === (storageScope ?? undefined)
      ) {
        syncStats();
      }
    };
    window.addEventListener(EXAM_PREP_SYNC_EVENT, onSync);
    window.addEventListener("storage", syncStats);
    return () => {
      window.removeEventListener(EXAM_PREP_SYNC_EVENT, onSync);
      window.removeEventListener("storage", syncStats);
    };
  }, [courseId, storageScope, units]);

  useEffect(() => {
    const root = document.querySelector("[data-exam-prep-root]");
    if (root) {
      root.setAttribute("data-study-view", viewMode);
      root.setAttribute("data-study-unit", unitFilter);
    }
  }, [viewMode, unitFilter]);

  const recallPct = totalRecall > 0 ? Math.round((stats.mastered / totalRecall) * 100) : 0;
  const mcqPct = totalMcq > 0 ? Math.round((stats.mcqCorrect / totalMcq) * 100) : 0;
  const mcqAccuracy =
    stats.mcqAnswered > 0
      ? Math.round((stats.mcqCorrect / stats.mcqAnswered) * 100)
      : 0;

  return (
    <section
      className="study-hub"
      aria-label="Panel interactivo de estudio y progreso"
      data-testid="exam-prep-control-bar"
    >
      <div className="study-hub-metrics">
        <div className="study-metric-card">
          <div className="study-metric-top">
            <span className="study-metric-label">Autoevaluación (Active Recall)</span>
            <strong className="study-metric-value" data-testid="global-recall-count">
              {stats.mastered} / {totalRecall} dominadas
            </strong>
          </div>
          <div className="study-progress-track" aria-hidden="true">
            <div className="study-progress-fill" style={{ width: `${recallPct}%` }} />
          </div>
          <div className="study-metric-sub">
            {stats.review > 0
              ? `${stats.review} marcadas para repasar`
              : "Marcá cada pregunta como Dominada o Repasar"}
          </div>
        </div>

        <div className="study-metric-card">
          <div className="study-metric-top">
            <span className="study-metric-label">Simulacro Multiple Choice</span>
            <strong className="study-metric-value" data-testid="global-mcq-count">
              {stats.mcqCorrect} / {totalMcq} correctas
            </strong>
          </div>
          <div className="study-progress-track" aria-hidden="true">
            <div
              className="study-progress-fill study-progress-fill--accent"
              style={{ width: `${mcqPct}%` }}
            />
          </div>
          <div className="study-metric-sub">
            {stats.mcqAnswered > 0
              ? `${stats.mcqAnswered} respondidas · ${mcqAccuracy}% de precisión`
              : "Respondé los Multiple Choice con corrección al instante"}
          </div>
        </div>
      </div>

      <div className="study-controls-stack">
        <div className="study-control-row">
          <span className="study-control-label">Modo de vista:</span>
          <div className="study-control-group" role="group" aria-label="Modo de vista">
            {VIEW_MODES.map((mode) => (
              <button
                key={mode.key}
                type="button"
                className="filter-chip"
                aria-pressed={viewMode === mode.key}
                data-testid={`study-view-${mode.key}`}
                onClick={() => setViewMode(mode.key)}
              >
                {mode.label}
              </button>
            ))}
          </div>

          <div className="study-reset-area">
            {confirmReset ? (
              <>
                <button
                  type="button"
                  className="btn btn-danger-outline"
                  onClick={() => {
                    clearExamPrepProgress(courseId, storageScope);
                    setConfirmReset(false);
                  }}
                >
                  Confirmar reinicio
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setConfirmReset(false)}
                >
                  Cancelar
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn"
                onClick={() => setConfirmReset(true)}
                disabled={stats.mastered === 0 && stats.review === 0 && stats.mcqAnswered === 0}
              >
                Reiniciar progreso
              </button>
            )}
          </div>
        </div>

        <div className="study-control-row">
          <span className="study-control-label">Unidad:</span>
          <div className="study-unit-pills" role="group" aria-label="Filtrar por unidad">
            <button
              type="button"
              className="filter-chip"
              aria-pressed={unitFilter === "all"}
              data-testid="study-unit-all"
              onClick={() => setUnitFilter("all")}
            >
              Todas ({units.length})
            </button>
            {units.map((unit) => (
              <button
                key={unit.id}
                type="button"
                className="filter-chip"
                aria-pressed={unitFilter === unit.id}
                data-testid={`study-unit-${unit.id}`}
                title={unit.title}
                onClick={() => setUnitFilter(unit.id)}
              >
                U{unit.number}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default ExamPrepControlBar;
