import { useEffect, useState } from "react";
import type { CompiledRecallItem } from "@/data/gdsiExamPrep";
import {
  EXAM_PREP_SYNC_EVENT,
  getExamRecallKey,
  readStoredMap,
  writeStoredMap,
  type RecallStateMap,
  type RecallStatus,
} from "@/utils/examPrepStorage";

export interface ActiveRecallCardsProps {
  courseId: string;
  unitId: string;
  items: CompiledRecallItem[];
}

type RecallFilter = "all" | "pending" | "review" | "mastered";

export function ActiveRecallCards({
  courseId,
  unitId,
  items,
}: ActiveRecallCardsProps) {
  const [statuses, setStatuses] = useState<RecallStateMap>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<RecallFilter>("all");

  useEffect(() => {
    const sync = () => {
      setStatuses(readStoredMap<RecallStateMap>(getExamRecallKey(courseId)));
    };
    sync();
    const onSync = (ev: Event) => {
      const custom = ev as CustomEvent<{ courseId?: string }>;
      if (!custom.detail?.courseId || custom.detail.courseId === courseId) {
        sync();
      }
    };
    window.addEventListener(EXAM_PREP_SYNC_EVENT, onSync);
    return () => window.removeEventListener(EXAM_PREP_SYNC_EVENT, onSync);
  }, [courseId]);

  const setItemStatus = (itemId: string, nextStatus: RecallStatus) => {
    const current = readStoredMap<RecallStateMap>(getExamRecallKey(courseId));
    const updated: RecallStateMap = { ...current };
    if (updated[itemId] === nextStatus) {
      delete updated[itemId];
    } else {
      updated[itemId] = nextStatus;
    }
    setStatuses(updated);
    writeStoredMap(courseId, getExamRecallKey(courseId), updated);
  };

  const toggleExpanded = (itemId: string) => {
    setExpanded((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const masteredCount = items.filter((it) => statuses[it.id] === "mastered").length;
  const reviewCount = items.filter((it) => statuses[it.id] === "review").length;
  const allExpanded = items.length > 0 && items.every((it) => Boolean(expanded[it.id]));

  const visibleItems = items.filter((it) => {
    const st = statuses[it.id];
    if (filter === "mastered") return st === "mastered";
    if (filter === "review") return st === "review";
    if (filter === "pending") return !st;
    return true;
  });

  const handleExpandAll = () => {
    const nextState: Record<string, boolean> = {};
    for (const it of items) {
      nextState[it.id] = !allExpanded;
    }
    setExpanded(nextState);
  };

  return (
    <div className="recall-deck" data-testid={`recall-deck-${unitId}`}>
      <div className="deck-toolbar">
        <div className="deck-summary">
          <strong>
            {masteredCount} / {items.length} dominadas
          </strong>
          {reviewCount > 0 ? (
            <span className="meta-pill">Repasar: {reviewCount}</span>
          ) : null}
        </div>

        <div className="deck-toolbar-actions">
          <div className="study-control-group" role="group" aria-label="Filtrar preguntas">
            {(
              [
                ["all", "Todas"],
                ["pending", "Sin marcar"],
                ["review", "Repasar"],
                ["mastered", "Dominadas"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                className="filter-chip"
                aria-pressed={filter === key}
                onClick={() => setFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>

          <button type="button" className="btn" onClick={handleExpandAll}>
            {allExpanded ? "Contraer todas" : "Expandir todas"}
          </button>
        </div>
      </div>

      {visibleItems.length === 0 ? (
        <p className="deck-empty">No hay preguntas en este filtro.</p>
      ) : (
        <div className="recall-list">
          {visibleItems.map((item) => {
            const st = statuses[item.id];
            const isOpen = Boolean(expanded[item.id]);
            const cardClass = [
              "recall-card",
              st === "mastered" ? "recall-card--mastered" : "",
              st === "review" ? "recall-card--review" : "",
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <article key={item.id} className={cardClass} data-testid={`recall-card-${item.id}`}>
                <div className="recall-card-header">
                  <span className="recall-code">{item.code}</span>
                  {st === "mastered" ? (
                    <span className="recall-badge recall-badge--mastered">✓ Dominada</span>
                  ) : st === "review" ? (
                    <span className="recall-badge recall-badge--review">↻ Repasar</span>
                  ) : (
                    <span className="recall-badge">Pendiente</span>
                  )}
                </div>

                <p
                  className="recall-question"
                  dangerouslySetInnerHTML={{ __html: item.questionHtml }}
                />

                <div className="recall-actions">
                  <button
                    type="button"
                    className="btn"
                    aria-expanded={isOpen}
                    data-testid={`recall-toggle-${item.id}`}
                    onClick={() => toggleExpanded(item.id)}
                  >
                    {isOpen ? "Ocultar respuesta" : "Mostrar respuesta"}
                  </button>

                  <div className="recall-status-buttons">
                    <button
                      type="button"
                      className="filter-chip recall-btn-mastered"
                      aria-pressed={st === "mastered"}
                      data-testid={`recall-master-${item.id}`}
                      onClick={() => setItemStatus(item.id, "mastered")}
                    >
                      ✓ La sé
                    </button>
                    <button
                      type="button"
                      className="filter-chip recall-btn-review"
                      aria-pressed={st === "review"}
                      data-testid={`recall-review-${item.id}`}
                      onClick={() => setItemStatus(item.id, "review")}
                    >
                      ↻ Repasar
                    </button>
                  </div>
                </div>

                {isOpen ? (
                  <div
                    className="recall-answer"
                    data-testid={`recall-answer-${item.id}`}
                    dangerouslySetInnerHTML={{ __html: item.answerHtml }}
                  />
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ActiveRecallCards;
