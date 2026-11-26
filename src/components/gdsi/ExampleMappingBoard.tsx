import { useId, useMemo, useState } from "react";

export type ExampleMapAction = "ready" | "split" | "refine";

export interface ExampleMapRule {
  id: string;
  title: string;
  detail?: string;
  examples: string[];
}

export interface ExampleMappingBoardProps {
  title?: string;
  story: string;
  rules: ExampleMapRule[];
  questions: string[];
  diagnosis?: string;
  expectedAction?: ExampleMapAction;
  practiceMode?: boolean;
}

interface ActionMeta {
  value: ExampleMapAction;
  label: string;
  summary: string;
  defaultDiagnosis: string;
}

const DIAGNOSTIC_ACTIONS: readonly ActionMeta[] = [
  {
    value: "ready",
    label: "Lista para el Sprint",
    summary: "Reglas acotadas, ejemplos concretos y dudas mínimas.",
    defaultDiagnosis:
      "La historia tiene un conjunto manejable de reglas de negocio respaldadas por ejemplos concretos y sin incertidumbre bloqueante. Está lista para estimarse y entrar al Sprint.",
  },
  {
    value: "split",
    label: "Dividir historia (Épica)",
    summary: "Demasiadas reglas de negocio dentro de una misma historia.",
    defaultDiagnosis:
      "La cantidad de reglas (tarjetas azules) indica que esta historia es demasiado grande o agrupa múltiples comportamientos independientes. Conviene dividirla verticalmente en historias más pequeñas.",
  },
  {
    value: "refine",
    label: "No está lista — Investigar dudas",
    summary: "Muchas preguntas abiertas que impiden el entendimiento compartido.",
    defaultDiagnosis:
      "Existen demasiadas tarjetas rojas abiertas sobre reglas o casos borde. Conviene devolver la historia a refinamiento para resolver las incógnitas con negocio antes de comprometerla en un Sprint.",
  },
];

function getActionMeta(action: ExampleMapAction): ActionMeta {
  return (
    DIAGNOSTIC_ACTIONS.find((item) => item.value === action) ??
    DIAGNOSTIC_ACTIONS[0]
  );
}

function formatCounter(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function ExampleMappingBoard({
  title = "Tablero de Example Mapping",
  story,
  rules,
  questions,
  diagnosis,
  expectedAction,
  practiceMode = false,
}: ExampleMappingBoardProps) {
  const [isPracticeMode, setIsPracticeMode] = useState<boolean>(practiceMode);
  const [selectedAction, setSelectedAction] = useState<ExampleMapAction | null>(
    null,
  );
  const [diagnosisOpen, setDiagnosisOpen] = useState<boolean>(true);

  const headingId = useId();
  const diagnosisBodyId = useId();

  const totalExamples = useMemo(
    () => rules.reduce((acc, rule) => acc + rule.examples.length, 0),
    [rules],
  );

  const resolvedAction: ExampleMapAction = useMemo(() => {
    if (expectedAction) return expectedAction;
    if (questions.length >= 3) return "refine";
    if (rules.length >= 6) return "split";
    return "ready";
  }, [expectedAction, questions.length, rules.length]);

  const expectedMeta = getActionMeta(resolvedAction);
  const diagnosisText = diagnosis ?? expectedMeta.defaultDiagnosis;
  const isCorrect = selectedAction !== null && selectedAction === resolvedAction;

  return (
    <section
      className="gdsi-board"
      aria-labelledby={headingId}
      data-testid="example-mapping-board"
    >
      <header className="gdsi-board-header">
        <div>
          <span
            style={{
              display: "inline-block",
              fontFamily: "var(--font-mono)",
              fontSize: "0.75rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              color: "var(--text-muted)",
            }}
          >
            Example Mapping
          </span>
          <h3 id={headingId} style={{ margin: "0.2rem 0 0" }}>
            {title}
          </h3>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "var(--space-2)",
          }}
        >
          <span
            className="meta-pill meta-pill--parcial"
            data-testid="em-rules-count"
          >
            {formatCounter(rules.length, "regla", "reglas")}
          </span>
          <span
            className="meta-pill meta-pill--preserved"
            data-testid="em-examples-count"
          >
            {formatCounter(totalExamples, "ejemplo", "ejemplos")}
          </span>
          <span
            className={`meta-pill ${questions.length > 0 ? "meta-pill--imprescindible" : ""}`.trim()}
            data-testid="em-questions-count"
          >
            {formatCounter(
              questions.length,
              "duda abierta",
              "dudas abiertas",
            )}
          </span>

          <button
            type="button"
            className={`btn filter-chip ${isPracticeMode ? "is-active" : ""}`.trim()}
            aria-pressed={isPracticeMode}
            onClick={() => {
              setIsPracticeMode((prev) => !prev);
              setSelectedAction(null);
            }}
            data-testid="example-mapping-practice-toggle"
          >
            Modo diagnóstico
          </button>
        </div>
      </header>

      <div
        className="gdsi-em-story"
        role="region"
        aria-label="Historia de usuario"
        data-testid="example-mapping-story"
      >
        <span
          style={{
            display: "block",
            fontSize: "0.75rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            color: "var(--warning)",
            marginBottom: "var(--space-1)",
          }}
        >
          Tarjeta amarilla · Historia de usuario
        </span>
        <p style={{ margin: 0, fontWeight: 600, color: "var(--text-primary)" }}>
          {story}
        </p>
      </div>

      <div
        className="gdsi-em-grid"
        role="region"
        aria-label="Reglas de negocio y ejemplos concretos"
      >
        {rules.length > 0 ? (
          rules.map((rule, ruleIndex) => (
            <div
              key={rule.id}
              className="gdsi-em-column"
              data-testid={`em-rule-${rule.id}`}
            >
              <div className="gdsi-em-rule">
                <span
                  style={{
                    display: "block",
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    color: "var(--info)",
                    marginBottom: "var(--space-1)",
                  }}
                >
                  Regla {ruleIndex + 1}
                </span>
                <strong
                  style={{
                    display: "block",
                    color: "var(--text-heading)",
                    lineHeight: 1.4,
                  }}
                >
                  {rule.title}
                </strong>
                {rule.detail ? (
                  <p
                    style={{
                      margin: "var(--space-1) 0 0",
                      fontSize: "0.875rem",
                      color: "var(--text-muted)",
                    }}
                  >
                    {rule.detail}
                  </p>
                ) : null}
              </div>

              {rule.examples.length > 0 ? (
                <ul
                  className="plain-list"
                  aria-label={`Ejemplos de la regla ${rule.title}`}
                  style={{ marginTop: "var(--space-2)" }}
                >
                  {rule.examples.map((example, exIndex) => (
                    <li
                      key={`${rule.id}-ex-${exIndex}`}
                      className="gdsi-em-example"
                    >
                      <span
                        style={{
                          display: "block",
                          fontFamily: "var(--font-mono)",
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                          color: "var(--success)",
                          marginBottom: "0.15rem",
                        }}
                      >
                        Ejemplo {ruleIndex + 1}.{exIndex + 1}
                      </span>
                      <span>{example}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p
                  className="gdsi-em-example"
                  style={{
                    margin: "var(--space-2) 0 0",
                    fontSize: "0.875rem",
                    color: "var(--text-muted)",
                    fontStyle: "italic",
                  }}
                >
                  Sin ejemplos concretos todavía. Conviene sumar un caso feliz y
                  al menos un caso borde.
                </p>
              )}
            </div>
          ))
        ) : (
          <p
            style={{
              margin: 0,
              color: "var(--text-muted)",
              fontSize: "0.9rem",
            }}
          >
            Todavía no se registraron reglas de negocio (tarjetas azules) para
            esta historia.
          </p>
        )}
      </div>

      <aside
        className="gdsi-em-questions"
        aria-label="Preguntas abiertas y dudas"
        data-testid="example-mapping-questions"
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "var(--space-2)",
            marginBottom: "var(--space-2)",
          }}
        >
          <h4
            style={{
              margin: 0,
              fontSize: "0.9rem",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              color: "var(--danger)",
            }}
          >
            Tarjetas rojas · Preguntas abiertas ({questions.length})
          </h4>
        </div>

        {questions.length > 0 ? (
          <ul className="plain-list">
            {questions.map((question, idx) => (
              <li key={`question-${idx}`} className="gdsi-em-question">
                <span
                  aria-hidden="true"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontWeight: 700,
                    color: "var(--danger)",
                    marginInlineEnd: "var(--space-2)",
                  }}
                >
                  ?
                </span>
                <span>{question}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p
            style={{
              margin: 0,
              fontSize: "0.875rem",
              color: "var(--text-muted)",
            }}
          >
            No quedan dudas abiertas bloqueantes en este tablero.
          </p>
        )}
      </aside>

      {isPracticeMode ? (
        <div
          className="gdsi-board-diagnosis"
          data-testid="example-mapping-practice-panel"
        >
          <p
            style={{
              margin: "0 0 var(--space-3)",
              fontWeight: 600,
              color: "var(--text-heading)",
            }}
          >
            Modo diagnóstico: observando la proporción de tarjetas azules,
            verdes y rojas, ¿qué decisión debería tomar el equipo?
          </p>

          <div
            className="trainer-options"
            role="group"
            aria-label="Opciones de diagnóstico de la historia"
          >
            {DIAGNOSTIC_ACTIONS.map((option) => {
              const isSelected = selectedAction === option.value;
              const showCorrect =
                selectedAction !== null && option.value === resolvedAction;
              const showWrong = isSelected && option.value !== resolvedAction;

              const stateClass = showCorrect
                ? "is-correct"
                : showWrong
                  ? "is-wrong"
                  : "";

              return (
                <button
                  key={option.value}
                  type="button"
                  className={`btn trainer-option ${stateClass}`.trim()}
                  aria-pressed={isSelected}
                  onClick={() => setSelectedAction(option.value)}
                  data-testid={`em-action-${option.value}`}
                >
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>

          {selectedAction !== null ? (
            <div
              className={`trainer-feedback ${isCorrect ? "is-correct" : "is-wrong"}`}
              role="status"
              aria-live="polite"
              data-testid="example-mapping-feedback"
              style={{ marginBottom: 0 }}
            >
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "var(--space-2)",
                }}
              >
                <strong>
                  {isCorrect
                    ? `¡Correcto! Decisión recomendada: ${expectedMeta.label}.`
                    : `No exactamente. La decisión recomendada es: ${expectedMeta.label}.`}
                </strong>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setSelectedAction(null)}
                  data-testid="em-reset-practice"
                >
                  Reintentar
                </button>
              </div>
              <p className="trainer-feedback-detail">{diagnosisText}</p>
            </div>
          ) : (
            <p
              style={{
                margin: 0,
                fontSize: "0.875rem",
                color: "var(--text-muted)",
              }}
            >
              Seleccioná una de las tres opciones para contrastar tu criterio
              con las heurísticas de Example Mapping.
            </p>
          )}
        </div>
      ) : (
        <div
          className="gdsi-board-diagnosis"
          data-testid="example-mapping-diagnosis"
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "var(--space-2)",
            }}
          >
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: "var(--space-2)",
              }}
            >
              <strong style={{ color: "var(--text-heading)" }}>
                Diagnóstico del tablero:
              </strong>
              <span
                className={`meta-pill ${
                  resolvedAction === "ready"
                    ? "meta-pill--preserved"
                    : resolvedAction === "split"
                      ? "meta-pill--importante"
                      : "meta-pill--imprescindible"
                }`}
                data-testid="em-resolved-action"
              >
                {expectedMeta.label}
              </span>
            </div>

            <button
              type="button"
              className="btn btn-ghost"
              aria-expanded={diagnosisOpen}
              aria-controls={diagnosisBodyId}
              onClick={() => setDiagnosisOpen((prev) => !prev)}
              data-testid="em-toggle-diagnosis"
            >
              {diagnosisOpen ? "Ocultar lectura" : "Ver lectura"}
            </button>
          </div>

          {diagnosisOpen ? (
            <p
              id={diagnosisBodyId}
              style={{
                margin: "var(--space-2) 0 0",
                color: "var(--text-primary)",
                lineHeight: 1.55,
              }}
            >
              {diagnosisText}
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}

export default ExampleMappingBoard;
