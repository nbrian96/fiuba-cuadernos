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
  storageScope?: string;
  unitId: string;
  items: CompiledRecallItem[];
}

type RecallFilter = "all" | "pending" | "review" | "mastered";
type RecallDisplayMode = "list" | "flashcard";

export function ActiveRecallCards({
  courseId,
  storageScope,
  unitId,
  items,
}: ActiveRecallCardsProps) {
  const [statuses, setStatuses] = useState<RecallStateMap>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<RecallFilter>("all");
  const [displayMode, setDisplayMode] = useState<RecallDisplayMode>("list");
  const [flashIndex, setFlashIndex] = useState(0);

  useEffect(() => {
    const sync = () => {
      setStatuses(
        readStoredMap<RecallStateMap>(getExamRecallKey(courseId, storageScope)),
      );
    };
    sync();
    const onSync = (ev: Event) => {
      const custom = ev as CustomEvent<{ courseId?: string; storageScope?: string }>;
      if (
        (!custom.detail?.courseId || custom.detail.courseId === courseId) &&
        (custom.detail?.storageScope ?? undefined) === (storageScope ?? undefined)
      ) {
        sync();
      }
    };
    window.addEventListener(EXAM_PREP_SYNC_EVENT, onSync);
    return () => window.removeEventListener(EXAM_PREP_SYNC_EVENT, onSync);
  }, [courseId, storageScope]);

  const setItemStatus = (itemId: string, nextStatus: RecallStatus) => {
    const key = getExamRecallKey(courseId, storageScope);
    const current = readStoredMap<RecallStateMap>(key);
    const updated: RecallStateMap = { ...current };
    if (updated[itemId] === nextStatus) {
      delete updated[itemId];
    } else {
      updated[itemId] = nextStatus;
    }
    setStatuses(updated);
    writeStoredMap(courseId, key, updated, storageScope);
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

  const safeFlashIndex =
    visibleItems.length > 0
      ? Math.min(flashIndex, visibleItems.length - 1)
      : 0;
  const activeFlashItem = visibleItems[safeFlashIndex];

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
          <div className="study-control-group" role="group" aria-label="Formato de estudio">
            <button
              type="button"
              className="filter-chip"
              aria-pressed={displayMode === "list"}
              onClick={() => setDisplayMode("list")}
            >
              Lista
            </button>
            <button
              type="button"
              className="filter-chip"
              aria-pressed={displayMode === "flashcard"}
              data-testid={`recall-flashcard-mode-${unitId}`}
              onClick={() => {
                setDisplayMode("flashcard");
                setFlashIndex(0);
              }}
            >
              Flashcards
            </button>
          </div>

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
                onClick={() => {
                  setFilter(key);
                  setFlashIndex(0);
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {displayMode === "list" ? (
            <button type="button" className="btn" onClick={handleExpandAll}>
              {allExpanded ? "Contraer todas" : "Expandir todas"}
            </button>
          ) : null}
        </div>
      </div>

      {visibleItems.length === 0 ? (
        <p className="deck-empty">No hay preguntas en este filtro.</p>
      ) : displayMode === "flashcard" && activeFlashItem ? (
        (() => {
          const st = statuses[activeFlashItem.id];
          const isOpen = Boolean(expanded[activeFlashItem.id]);
          const cardClass = [
            "recall-card recall-card--flashcard",
            st === "mastered" ? "recall-card--mastered" : "",
            st === "review" ? "recall-card--review" : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <div className="flashcard-stage" data-testid={`flashcard-stage-${unitId}`}>
              <article className={cardClass} data-testid={`recall-card-${activeFlashItem.id}`}>
                <div className="recall-card-header">
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <span className="recall-code">{activeFlashItem.code}</span>
                    <span className="meta-pill">
                      Tarjeta {safeFlashIndex + 1} de {visibleItems.length}
                    </span>
                  </div>
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
                  dangerouslySetInnerHTML={{ __html: activeFlashItem.questionHtml }}
                />

                <div className="recall-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    aria-expanded={isOpen}
                    data-testid={`recall-toggle-${activeFlashItem.id}`}
                    onClick={() => toggleExpanded(activeFlashItem.id)}
                  >
                    {isOpen ? "Ocultar respuesta" : "Revelar respuesta"}
                  </button>

                  <div className="recall-status-buttons">
                    <button
                      type="button"
                      className="filter-chip recall-btn-mastered"
                      aria-pressed={st === "mastered"}
                      data-testid={`recall-master-${activeFlashItem.id}`}
                      onClick={() => setItemStatus(activeFlashItem.id, "mastered")}
                    >
                      ✓ La sé
                    </button>
                    <button
                      type="button"
                      className="filter-chip recall-btn-review"
                      aria-pressed={st === "review"}
                      data-testid={`recall-review-${activeFlashItem.id}`}
                      onClick={() => setItemStatus(activeFlashItem.id, "review")}
                    >
                      ↻ Repasar
                    </button>
                  </div>
                </div>

                {isOpen ? (
                  <div
                    className="recall-answer"
                    data-testid={`recall-answer-${activeFlashItem.id}`}
                    dangerouslySetInnerHTML={{ __html: activeFlashItem.answerHtml }}
                  />
                ) : null}

                <div className="flashcard-nav">
                  <button
                    type="button"
                    className="btn"
                    disabled={safeFlashIndex === 0}
                    onClick={() => setFlashIndex((prev) => Math.max(0, prev - 1))}
                  >
                    ← Anterior
                  </button>
                  <button
                    type="button"
                    className="btn"
                    disabled={safeFlashIndex >= visibleItems.length - 1}
                    onClick={() =>
                      setFlashIndex((prev) =>
                        Math.min(visibleItems.length - 1, prev + 1),
                      )
                    }
                  >
                    Siguiente →
                  </button>
                </div>
              </article>
            </div>
          );
        })()
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
