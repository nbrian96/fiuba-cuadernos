import { useEffect, useId, useMemo, useState } from "react";

export interface ParcialMcOption {
  key: "a" | "b" | "c" | "d";
  text: string;
}

export interface ParcialRubricItem {
  label: string;
  detail: string;
}

export interface ParcialQuestion {
  id: string;
  numberLabel: string;
  title: string;
  weightPercent: number;
  kind: "mcq" | "open";
  prompt: string;
  options?: ParcialMcOption[];
  correctKey?: "a" | "b" | "c" | "d";
  rubric?: ParcialRubricItem[];
  solutionHtml: string;
  exerciseHref?: string;
}

export interface ParcialSimulatorProps {
  examId: string;
  title: string;
  dateLabel: string;
  passThresholdPercent?: number;
  caseTitle: string;
  caseContext: string;
  examNotes?: string[];
  questions: ParcialQuestion[];
}

type McOptionKey = "a" | "b" | "c" | "d";
type SelfGradeLevel = "none" | "partial" | "full";

interface PersistedParcialState {
  mcqAnswers: Record<string, McOptionKey>;
  openGrades: Record<string, SelfGradeLevel>;
  drafts: Record<string, string>;
  revealedOpen: Record<string, boolean>;
}

const EMPTY_STATE: PersistedParcialState = {
  mcqAnswers: {},
  openGrades: {},
  drafts: {},
  revealedOpen: {},
};

const VALID_MCQ_KEYS = new Set<string>(["a", "b", "c", "d"]);
const VALID_GRADE_LEVELS = new Set<string>(["none", "partial", "full"]);

const SELF_GRADE_OPTIONS: ReadonlyArray<{
  level: SelfGradeLevel;
  label: string;
  multiplier: number;
}> = [
  { level: "none", label: "No logrado (0%)", multiplier: 0 },
  { level: "partial", label: "Parcial (50%)", multiplier: 0.5 },
  { level: "full", label: "Logrado (100%)", multiplier: 1 },
];

function getStorageKey(examId: string): string {
  return `mc:v1:gdsi:parcial:${examId}`;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readPersistedState(storageKey: string): PersistedParcialState {
  if (typeof window === "undefined") {
    return EMPTY_STATE;
  }
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return EMPTY_STATE;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!isPlainRecord(parsed)) {
      return EMPTY_STATE;
    }

    const mcqAnswers: Record<string, McOptionKey> = {};
    if (isPlainRecord(parsed.mcqAnswers)) {
      for (const [k, v] of Object.entries(parsed.mcqAnswers)) {
        if (typeof v === "string" && VALID_MCQ_KEYS.has(v)) {
          mcqAnswers[k] = v as McOptionKey;
        }
      }
    }

    const openGrades: Record<string, SelfGradeLevel> = {};
    if (isPlainRecord(parsed.openGrades)) {
      for (const [k, v] of Object.entries(parsed.openGrades)) {
        if (typeof v === "string" && VALID_GRADE_LEVELS.has(v)) {
          openGrades[k] = v as SelfGradeLevel;
        }
      }
    }

    const drafts: Record<string, string> = {};
    if (isPlainRecord(parsed.drafts)) {
      for (const [k, v] of Object.entries(parsed.drafts)) {
        if (typeof v === "string") {
          drafts[k] = v;
        }
      }
    }

    const revealedOpen: Record<string, boolean> = {};
    if (isPlainRecord(parsed.revealedOpen)) {
      for (const [k, v] of Object.entries(parsed.revealedOpen)) {
        if (typeof v === "boolean") {
          revealedOpen[k] = v;
        }
      }
    }

    return { mcqAnswers, openGrades, drafts, revealedOpen };
  } catch {
    return EMPTY_STATE;
  }
}

function writePersistedState(
  storageKey: string,
  state: PersistedParcialState,
): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    // Fallback silencioso en modo privado o cuota excedida.
  }
}

function clearPersistedState(storageKey: string): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // Fallback silencioso en modo privado o almacenamiento bloqueado.
  }
}

function formatScore(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);
}

function computeQuestionEarned(
  question: ParcialQuestion,
  state: PersistedParcialState,
): { evaluated: boolean; earned: number } {
  if (question.kind === "mcq") {
    const selected = state.mcqAnswers[question.id];
    if (!selected) {
      return { evaluated: false, earned: 0 };
    }
    const isCorrect =
      Boolean(question.correctKey) && selected === question.correctKey;
    return {
      evaluated: true,
      earned: isCorrect ? question.weightPercent : 0,
    };
  }

  const grade = state.openGrades[question.id];
  if (!grade) {
    return { evaluated: false, earned: 0 };
  }
  if (grade === "full") {
    return { evaluated: true, earned: question.weightPercent };
  }
  if (grade === "partial") {
    return { evaluated: true, earned: question.weightPercent * 0.5 };
  }
  return { evaluated: true, earned: 0 };
}

export function ParcialSimulator({
  examId,
  title,
  dateLabel,
  passThresholdPercent = 60,
  caseTitle,
  caseContext,
  examNotes = [],
  questions,
}: ParcialSimulatorProps) {
  const storageKey = getStorageKey(examId);
  const [state, setState] = useState<PersistedParcialState>(EMPTY_STATE);
  const [showCase, setShowCase] = useState(true);

  const baseId = useId();
  const caseSectionId = `${baseId}-case`;

  useEffect(() => {
    setState(readPersistedState(storageKey));
  }, [storageKey]);

  const updateState = (
    updater: (prev: PersistedParcialState) => PersistedParcialState,
  ) => {
    setState((prev) => {
      const next = updater(prev);
      writePersistedState(storageKey, next);
      return next;
    });
  };

  const handleSelectMcq = (questionId: string, optionKey: McOptionKey) => {
    updateState((prev) => ({
      ...prev,
      mcqAnswers: {
        ...prev.mcqAnswers,
        [questionId]: optionKey,
      },
    }));
  };

  const handleDraftChange = (questionId: string, value: string) => {
    updateState((prev) => ({
      ...prev,
      drafts: {
        ...prev.drafts,
        [questionId]: value,
      },
    }));
  };

  const handleToggleOpenSolution = (questionId: string) => {
    updateState((prev) => ({
      ...prev,
      revealedOpen: {
        ...prev.revealedOpen,
        [questionId]: !prev.revealedOpen[questionId],
      },
    }));
  };

  const handleSelectOpenGrade = (
    questionId: string,
    level: SelfGradeLevel,
  ) => {
    updateState((prev) => {
      const nextGrades = { ...prev.openGrades };
      if (nextGrades[questionId] === level) {
        delete nextGrades[questionId];
      } else {
        nextGrades[questionId] = level;
      }
      return {
        ...prev,
        openGrades: nextGrades,
      };
    });
  };

  const handleReset = () => {
    setState(EMPTY_STATE);
    clearPersistedState(storageKey);
  };

  const summary = useMemo(() => {
    const rawWeight = questions.reduce((sum, q) => sum + q.weightPercent, 0);
    const totalWeight = rawWeight > 0 ? rawWeight : 100;
    let earned = 0;
    let evaluatedCount = 0;

    for (const q of questions) {
      const res = computeQuestionEarned(q, state);
      if (res.evaluated) {
        evaluatedCount += 1;
        earned += res.earned;
      }
    }

    const progressPct = Math.min(100, Math.max(0, (earned / totalWeight) * 100));
    const passed = earned >= passThresholdPercent;
    const remainingToPass = Math.max(0, passThresholdPercent - earned);

    return {
      totalWeight,
      earned,
      evaluatedCount,
      progressPct,
      passed,
      remainingToPass,
    };
  }, [questions, state, passThresholdPercent]);

  const hasProgress =
    summary.evaluatedCount > 0 ||
    Object.values(state.drafts).some((text) => text.trim().length > 0) ||
    Object.values(state.revealedOpen).some(Boolean);

  const caseParagraphs = useMemo(
    () => splitParagraphs(caseContext),
    [caseContext],
  );

  return (
    <section
      className="gdsi-parcial-sim"
      aria-label={`Simulacro de parcial: ${title}`}
      data-testid={`parcial-simulator-${examId}`}
    >
      <header className="gdsi-parcial-hud" aria-label="Panel de puntaje del simulacro">
        <div className="simulator-header" style={{ marginBlockEnd: "0.75rem" }}>
          <div>
            <h3 style={{ margin: "0 0 0.35rem" }}>{title}</h3>
            <div className="study-control-group">
              <span className="meta-pill">{dateLabel}</span>
              <span className="meta-pill">
                Consignas evaluadas: {summary.evaluatedCount} / {questions.length}
              </span>
            </div>
          </div>

          <div className="simulator-controls">
            <button
              type="button"
              className="btn"
              aria-expanded={showCase}
              aria-controls={caseSectionId}
              data-testid={`parcial-toggle-case-${examId}`}
              onClick={() => setShowCase((prev) => !prev)}
            >
              {showCase ? "Ocultar caso común" : "Mostrar caso común"}
            </button>
            <button
              type="button"
              className="btn btn-danger-outline"
              disabled={!hasProgress}
              data-testid={`parcial-reset-${examId}`}
              onClick={handleReset}
            >
              Reiniciar simulacro
            </button>
          </div>
        </div>

        <div
          className="study-metric-top"
          role="status"
          aria-live="polite"
          style={{ marginBlockEnd: "0.5rem" }}
        >
          <div>
            <span className="study-metric-label">Puntaje acumulado: </span>
            <strong
              className="study-metric-value"
              data-testid={`parcial-score-${examId}`}
            >
              {formatScore(summary.earned)}% / {formatScore(summary.totalWeight)}%
            </strong>
          </div>

          {summary.passed ? (
            <span
              className="recall-badge recall-badge--mastered"
              data-testid={`parcial-status-${examId}`}
            >
              ✓ Aprobado (umbral {passThresholdPercent}% = nota 4)
            </span>
          ) : summary.evaluatedCount === questions.length &&
            questions.length > 0 ? (
            <span
              className="recall-badge recall-badge--wrong"
              data-testid={`parcial-status-${examId}`}
            >
              ✕ Debajo del umbral ({passThresholdPercent}% = nota 4)
            </span>
          ) : summary.evaluatedCount > 0 ? (
            <span
              className="recall-badge recall-badge--review"
              data-testid={`parcial-status-${examId}`}
            >
              Faltan {formatScore(summary.remainingToPass)}% para aprobar (
              {passThresholdPercent}% = nota 4)
            </span>
          ) : (
            <span
              className="recall-badge"
              data-testid={`parcial-status-${examId}`}
            >
              Umbral de aprobación: {passThresholdPercent}% (nota 4)
            </span>
          )}
        </div>

        <div
          className="study-progress-track"
          role="progressbar"
          aria-label="Progreso de puntaje del simulacro"
          aria-valuemin={0}
          aria-valuemax={summary.totalWeight}
          aria-valuenow={Math.round(summary.earned * 10) / 10}
          aria-valuetext={`${formatScore(summary.earned)} por ciento de ${formatScore(summary.totalWeight)} por ciento`}
        >
          <div
            className={`study-progress-fill ${summary.passed ? "" : "study-progress-fill--accent"}`.trim()}
            style={{ width: `${summary.progressPct}%` }}
          />
        </div>
      </header>

      {showCase ? (
        <section
          id={caseSectionId}
          className="gdsi-parcial-case academic-block academic-block--statement"
          aria-label={`Caso común: ${caseTitle}`}
          data-testid={`parcial-case-${examId}`}
        >
          <h4 className="academic-block-title">{caseTitle}</h4>
          <div className="academic-block-body prose-academic">
            {caseParagraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}

            {examNotes.length > 0 ? (
              <div style={{ marginTop: "0.75rem" }}>
                <p style={{ marginBlockEnd: "0.35rem" }}>
                  <strong>Notas del examen:</strong>
                </p>
                <ul style={{ marginBlockEnd: 0 }}>
                  {examNotes.map((note, idx) => (
                    <li key={idx}>{note}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <div className="exercise-list">
        {questions.map((q) => {
          const scoreInfo = computeQuestionEarned(q, state);
          const draftValue = state.drafts[q.id] ?? "";
          const draftId = `${baseId}-draft-${q.id}`;
          const solutionPanelId = `${baseId}-solution-${q.id}`;
          const promptParagraphs = splitParagraphs(q.prompt);

          const selectedMcq = state.mcqAnswers[q.id];
          const isMcqAnswered = q.kind === "mcq" && Boolean(selectedMcq);
          const isMcqCorrect =
            isMcqAnswered &&
            Boolean(q.correctKey) &&
            selectedMcq === q.correctKey;

          const isOpenRevealed = Boolean(state.revealedOpen[q.id]);
          const currentOpenGrade = state.openGrades[q.id];

          return (
            <article
              key={q.id}
              className="gdsi-parcial-q surface-panel"
              data-testid={`parcial-q-${q.id}`}
            >
              <div className="recall-card-header">
                <div className="exercise-card-title-row">
                  <span className="recall-code">{q.numberLabel}</span>
                  <h4 style={{ margin: 0 }}>{q.title}</h4>
                </div>

                <div className="study-control-group">
                  <span className="meta-pill">
                    Peso: {formatScore(q.weightPercent)}%
                  </span>
                  {scoreInfo.evaluated ? (
                    <span
                      className={`recall-badge ${
                        scoreInfo.earned >= q.weightPercent
                          ? "recall-badge--mastered"
                          : scoreInfo.earned > 0
                            ? "recall-badge--review"
                            : "recall-badge--wrong"
                      }`}
                    >
                      +{formatScore(scoreInfo.earned)}%
                    </span>
                  ) : (
                    <span className="recall-badge">Sin evaluar</span>
                  )}
                </div>
              </div>

              <div className="prose-academic" style={{ marginBlock: "0.75rem" }}>
                {promptParagraphs.map((paragraph, idx) => (
                  <p key={idx} style={{ marginBlockEnd: idx === promptParagraphs.length - 1 ? 0 : undefined }}>
                    {paragraph}
                  </p>
                ))}
              </div>

              {q.kind === "mcq" ? (
                <div style={{ display: "grid", gap: "0.75rem" }}>
                  <div
                    className="mcq-options"
                    role="group"
                    aria-label={`Opciones para ${q.numberLabel}`}
                  >
                    {(q.options ?? []).map((opt) => {
                      const isSelected = selectedMcq === opt.key;
                      const showAsCorrect =
                        isMcqAnswered && opt.key === q.correctKey;
                      const showAsWrong =
                        isMcqAnswered && isSelected && !isMcqCorrect;

                      const optionClass = [
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
                          className={optionClass}
                          aria-pressed={isSelected}
                          data-testid={`parcial-mcq-${q.id}-${opt.key}`}
                          onClick={() => handleSelectMcq(q.id, opt.key)}
                        >
                          <span className="mcq-option-key">{opt.key}</span>
                          <span className="mcq-option-text">{opt.text}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div>
                    <label
                      htmlFor={draftId}
                      className="hud-label"
                      style={{ display: "block", marginBottom: "0.35rem" }}
                    >
                      Tu justificación breve (opcional, 2–3 líneas)
                    </label>
                    <textarea
                      id={draftId}
                      className="gdsi-parcial-textarea"
                      rows={3}
                      value={draftValue}
                      onChange={(event) =>
                        handleDraftChange(q.id, event.target.value)
                      }
                      placeholder="Escribí brevemente por qué elegiste esa opción…"
                      data-testid={`parcial-draft-${q.id}`}
                    />
                  </div>

                  {isMcqAnswered ? (
                    <div
                      className={`mcq-feedback ${
                        isMcqCorrect
                          ? "mcq-feedback--correct"
                          : "mcq-feedback--wrong"
                      }`}
                      role="region"
                      aria-label={`Solución oficial de ${q.numberLabel}`}
                      data-testid={`parcial-mcq-feedback-${q.id}`}
                    >
                      <p className="mcq-feedback-title">
                        {isMcqCorrect
                          ? `✓ Respuesta correcta (${q.correctKey}) · +${formatScore(q.weightPercent)}%`
                          : `✕ Elegiste ${selectedMcq}${q.correctKey ? ` — La opción correcta es ${q.correctKey}` : ""} · +0%`}
                      </p>
                      <div
                        className="mcq-feedback-body prose-academic"
                        dangerouslySetInnerHTML={{ __html: q.solutionHtml }}
                      />
                    </div>
                  ) : null}
                </div>
              ) : (
                <div style={{ display: "grid", gap: "0.75rem" }}>
                  <div>
                    <label
                      htmlFor={draftId}
                      className="hud-label"
                      style={{ display: "block", marginBottom: "0.35rem" }}
                    >
                      Tu respuesta de práctica (opcional)
                    </label>
                    <textarea
                      id={draftId}
                      className="gdsi-parcial-textarea"
                      rows={5}
                      value={draftValue}
                      onChange={(event) =>
                        handleDraftChange(q.id, event.target.value)
                      }
                      placeholder="Esbozá tu desarrollo aquí antes de revelar la solución modelo y la rúbrica…"
                      data-testid={`parcial-draft-${q.id}`}
                    />
                  </div>

                  <div className="recall-actions">
                    <button
                      type="button"
                      className="btn btn-primary"
                      aria-expanded={isOpenRevealed}
                      aria-controls={solutionPanelId}
                      data-testid={`parcial-reveal-${q.id}`}
                      onClick={() => handleToggleOpenSolution(q.id)}
                    >
                      {isOpenRevealed
                        ? "Ocultar solución modelo y rúbrica"
                        : "Revelar solución modelo y rúbrica"}
                    </button>
                  </div>

                  {isOpenRevealed ? (
                    <div
                      id={solutionPanelId}
                      className="recall-answer"
                      data-testid={`parcial-solution-${q.id}`}
                    >
                      <div
                        className="prose-academic"
                        dangerouslySetInnerHTML={{ __html: q.solutionHtml }}
                      />

                      {q.rubric && q.rubric.length > 0 ? (
                        <div className="gdsi-parcial-rubric">
                          <h5 style={{ margin: "0 0 0.5rem" }}>
                            Rúbrica de corrección
                          </h5>
                          <ul style={{ margin: 0, paddingInlineStart: "1.25rem" }}>
                            {q.rubric.map((item, idx) => (
                              <li key={idx}>
                                <strong>{item.label}:</strong> {item.detail}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <div
                    className="gdsi-parcial-selfgrade"
                    role="group"
                    aria-label={`Autoevaluación por rúbrica de ${q.numberLabel}`}
                  >
                    <span className="hud-label">
                      Autoevaluación por rúbrica:
                    </span>
                    <div className="study-control-group">
                      {SELF_GRADE_OPTIONS.map((option) => {
                        const isSelected = currentOpenGrade === option.level;
                        const earnedPts = q.weightPercent * option.multiplier;
                        return (
                          <button
                            key={option.level}
                            type="button"
                            className={`btn filter-chip ${isSelected ? "is-active" : ""}`.trim()}
                            aria-pressed={isSelected}
                            data-testid={`parcial-selfgrade-${q.id}-${option.level}`}
                            onClick={() =>
                              handleSelectOpenGrade(q.id, option.level)
                            }
                          >
                            {option.label} (+{formatScore(earnedPts)}%)
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {q.exerciseHref ? (
                <div style={{ marginTop: "0.75rem" }}>
                  <a
                    href={q.exerciseHref}
                    style={{ fontSize: "0.875rem", fontWeight: 500 }}
                  >
                    Ver ficha completa en catálogo →
                  </a>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default ParcialSimulator;
