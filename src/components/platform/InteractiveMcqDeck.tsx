import { useEffect, useState } from "react";
import type { CompiledMcqItem, McqOptionKey } from "@/data/gdsiExamPrep";
import {
  EXAM_PREP_SYNC_EVENT,
  getExamMcqKey,
  readStoredMap,
  writeStoredMap,
  type McqStateMap,
} from "@/utils/examPrepStorage";

export interface InteractiveMcqDeckProps {
  courseId: string;
  storageScope?: string;
  unitId: string;
  questions: CompiledMcqItem[];
}

export function InteractiveMcqDeck({
  courseId,
  storageScope,
  unitId,
  questions,
}: InteractiveMcqDeckProps) {
  const [answers, setAnswers] = useState<McqStateMap>({});
  const [onlyPendingOrWrong, setOnlyPendingOrWrong] = useState(false);

  useEffect(() => {
    const sync = () => {
      setAnswers(
        readStoredMap<McqStateMap>(getExamMcqKey(courseId, storageScope)),
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

  const handleSelectOption = (questionId: string, optionKey: McqOptionKey) => {
    const key = getExamMcqKey(courseId, storageScope);
    const current = readStoredMap<McqStateMap>(key);
    const updated: McqStateMap = { ...current, [questionId]: optionKey };
    setAnswers(updated);
    writeStoredMap(courseId, key, updated, storageScope);
  };

  const handleResetUnit = () => {
    const key = getExamMcqKey(courseId, storageScope);
    const current = readStoredMap<McqStateMap>(key);
    const updated: McqStateMap = { ...current };
    for (const q of questions) {
      delete updated[q.id];
    }
    setAnswers(updated);
    writeStoredMap(courseId, key, updated, storageScope);
  };

  const answeredCount = questions.filter((q) => Boolean(answers[q.id])).length;
  const correctCount = questions.filter(
    (q) => answers[q.id] === q.correctKey,
  ).length;

  const visibleQuestions = onlyPendingOrWrong
    ? questions.filter((q) => answers[q.id] !== q.correctKey)
    : questions;

  return (
    <div className="mcq-deck" data-testid={`mcq-deck-${unitId}`}>
      <div className="deck-toolbar">
        <div className="deck-summary">
          <strong>
            Aciertos: {correctCount} / {questions.length}
          </strong>
          <span className="meta-pill">
            Respondidas: {answeredCount} / {questions.length}
          </span>
        </div>

        <div className="deck-toolbar-actions">
          <button
            type="button"
            className="filter-chip"
            aria-pressed={onlyPendingOrWrong}
            onClick={() => setOnlyPendingOrWrong((prev) => !prev)}
          >
            Solo falladas o sin responder
          </button>
          <button
            type="button"
            className="btn"
            disabled={answeredCount === 0}
            onClick={handleResetUnit}
          >
            Reiniciar unidad
          </button>
        </div>
      </div>

      {visibleQuestions.length === 0 ? (
        <p className="deck-empty">
          ¡Excelente! Todas las preguntas de esta unidad están respondidas correctamente.
        </p>
      ) : (
        <div className="mcq-list">
          {visibleQuestions.map((q) => {
            const selected = answers[q.id];
            const isAnswered = Boolean(selected);
            const isCorrect = selected === q.correctKey;

            return (
              <article key={q.id} className="mcq-card" data-testid={`mcq-card-${q.id}`}>
                <div className="mcq-card-header">
                  <span className="recall-code">Pregunta {q.number}</span>
                  {isAnswered ? (
                    isCorrect ? (
                      <span className="recall-badge recall-badge--mastered">
                        ✓ Correcta ({q.correctKey})
                      </span>
                    ) : (
                      <span className="recall-badge recall-badge--wrong">
                        ✕ Incorrecta · Correcta: {q.correctKey}
                      </span>
                    )
                  ) : (
                    <span className="recall-badge">Elegí una opción</span>
                  )}
                </div>

                <p
                  className="mcq-prompt"
                  dangerouslySetInnerHTML={{ __html: q.promptHtml }}
                />

                <div className="mcq-options" role="group" aria-label={`Opciones pregunta ${q.number}`}>
                  {q.options.map((opt) => {
                    const isSelected = selected === opt.key;
                    const showAsCorrect = isAnswered && opt.key === q.correctKey;
                    const showAsWrong = isAnswered && isSelected && !isCorrect;

                    const optClass = [
                      "mcq-option",
                      showAsCorrect ? "mcq-option--correct" : "",
                      showAsWrong ? "mcq-option--wrong" : "",
                    ]
                      .filter(Boolean)
                      .join(" ");

                    return (
                      <button
                        key={opt.key}
                        type="button"
                        className={optClass}
                        aria-pressed={isSelected}
                        data-testid={`mcq-opt-${q.id}-${opt.key}`}
                        onClick={() => handleSelectOption(q.id, opt.key)}
                      >
                        <span className="mcq-option-key">{opt.key}</span>
                        <span
                          className="mcq-option-text"
                          dangerouslySetInnerHTML={{ __html: opt.html }}
                        />
                      </button>
                    );
                  })}
                </div>

                {isAnswered ? (
                  <div
                    className={`mcq-feedback ${
                      isCorrect ? "mcq-feedback--correct" : "mcq-feedback--wrong"
                    }`}
                    data-testid={`mcq-feedback-${q.id}`}
                  >
                    <p className="mcq-feedback-title">
                      {isCorrect
                        ? `✓ Respuesta correcta (${q.correctKey})`
                        : `✕ Elegiste ${selected} — La respuesta correcta es ${q.correctKey}`}
                    </p>
                    <div
                      className="mcq-feedback-body"
                      dangerouslySetInnerHTML={{ __html: q.justificationHtml }}
                    />
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default InteractiveMcqDeck;
