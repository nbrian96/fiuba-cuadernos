import { useMemo, useState } from "react";
import {
  AUTOMATON_PRESETS,
  type AutomatonPresetId,
  simulateAutomatonTrace,
} from "@/utils/computabilitySimulators";

export function AutomatonSimulator() {
  const [presetId, setPresetId] =
    useState<AutomatonPresetId>("interseccion-afd");
  const [input, setInput] = useState<string>(
    AUTOMATON_PRESETS["interseccion-afd"].examples[0],
  );
  const [stepIndex, setStepIndex] = useState<number>(0);

  const runResult = useMemo(
    () => simulateAutomatonTrace(presetId, input),
    [presetId, input],
  );

  const maxStep = Math.max(0, runResult.steps.length - 1);
  const clampedIndex = Math.min(stepIndex, maxStep);
  const current = runResult.steps[clampedIndex] ?? null;

  const handlePresetChange = (nextId: AutomatonPresetId) => {
    setPresetId(nextId);
    setInput(AUTOMATON_PRESETS[nextId].examples[0]);
    setStepIndex(0);
  };

  const handleInputChange = (nextVal: string) => {
    setInput(nextVal);
    setStepIndex(0);
  };

  const preset = runResult.preset;
  const activeSet = new Set(current?.activeStates ?? []);
  const acceptSet = new Set(preset.acceptStates);

  return (
    <section
      id="sim-automaton"
      className="simulator-panel surface-panel"
      aria-label="Simulador paso a paso de Autómatas Finitos (AFD y AFND)"
      data-testid="sim-automaton"
    >
      <div className="simulator-header">
        <div>
          <span className="meta-pill">
            Simulador interactivo · {preset.kind}
          </span>
          <h4 style={{ margin: "0.4rem 0 0" }}>
            Simulador de Autómatas Finitos (AFD / AFND con ε)
          </h4>
        </div>

        <div className="simulator-controls">
          <button
            type="button"
            className="btn"
            disabled={!current || clampedIndex <= 0}
            onClick={() => setStepIndex((prev) => Math.max(0, prev - 1))}
            data-testid="aut-prev"
          >
            Anterior
          </button>
          <span className="meta-pill" data-testid="aut-step-indicator">
            Paso {current ? current.step : 0} de {maxStep}
          </span>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!current || clampedIndex >= maxStep}
            onClick={() => setStepIndex((prev) => Math.min(maxStep, prev + 1))}
            data-testid="aut-next"
          >
            Siguiente
          </button>
          <button
            type="button"
            className="btn"
            disabled={!current || clampedIndex >= maxStep}
            onClick={() => setStepIndex(maxStep)}
            data-testid="aut-run-all"
          >
            Ejecutar todo
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setStepIndex(0)}
            data-testid="aut-reset"
          >
            Reiniciar
          </button>
        </div>
      </div>

      <p style={{ margin: "0.5rem 0 0.75rem", color: "var(--text-muted)" }}>
        {preset.description}
      </p>

      <div className="sim-input-row">
        <div className="sim-field">
          <label htmlFor="aut-preset-select">Autómata de clase</label>
          <select
            id="aut-preset-select"
            value={presetId}
            onChange={(e) =>
              handlePresetChange(e.target.value as AutomatonPresetId)
            }
            data-testid="aut-preset-select"
          >
            {Object.values(AUTOMATON_PRESETS).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="sim-field">
          <label htmlFor="aut-input">
            Cadena de entrada (Σ = {`{${preset.alphabet.join(", ")}}`})
          </label>
          <input
            id="aut-input"
            type="text"
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Ej: 10111"
            data-testid="aut-input"
          />
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.4rem",
          alignItems: "center",
          marginBottom: "0.75rem",
        }}
      >
        <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
          Ejemplos:
        </span>
        {preset.examples.map((ex) => (
          <button
            key={ex}
            type="button"
            className={ex === input ? "btn btn-primary" : "btn"}
            onClick={() => handleInputChange(ex)}
            style={{ padding: "0.2rem 0.6rem", fontSize: "0.82rem" }}
          >
            <code>{ex || "ε"}</code>
          </button>
        ))}
      </div>

      <div aria-live="polite">
        {runResult.error ? (
          <div className="academic-block academic-block--warning" style={{ marginBottom: 0 }}>
            <p className="academic-block-title">Entrada inválida</p>
            <p style={{ margin: 0 }}>{runResult.error}</p>
          </div>
        ) : current ? (
          <>
            <div className="sim-tape" aria-label="Cinta de entrada del autómata">
              {runResult.input.length === 0 ? (
                <div className="sim-tape-cell sim-tape-cell--current">
                  <span>ε</span>
                  <span className="sim-tape-cell-idx">vacía</span>
                </div>
              ) : (
                runResult.input.split("").map((ch, idx) => {
                  const isCurrent = idx === current.consumedIndex;
                  const isConsumed = idx < current.consumedIndex;
                  return (
                    <div
                      key={`${idx}-${ch}`}
                      className={`sim-tape-cell ${
                        isCurrent
                          ? "sim-tape-cell--current"
                          : isConsumed
                            ? "sim-tape-cell--consumed"
                            : ""
                      }`}
                    >
                      <span>{ch}</span>
                      <span className="sim-tape-cell-idx">#{idx + 1}</span>
                    </div>
                  );
                })
              )}
            </div>

            <div className="sim-state-grid" aria-label="Estados del autómata">
              {preset.states.map((st) => {
                const isActive = activeSet.has(st.id);
                const isAccept = acceptSet.has(st.id);
                const chipClass =
                  isActive && isAccept && current.isFinal
                    ? "sim-state-chip sim-state-chip--accept"
                    : isActive
                      ? "sim-state-chip sim-state-chip--active"
                      : "sim-state-chip";
                return (
                  <span key={st.id} className={chipClass}>
                    <span>{st.label}</span>
                    {st.id === preset.initialState ? (
                      <span className="meta-pill">Inicial</span>
                    ) : null}
                    {isAccept ? (
                      <span className="meta-pill meta-pill--preserved">
                        Aceptación
                      </span>
                    ) : null}
                  </span>
                );
              })}
              {current.activeStates.length === 0 ? (
                <span className="sim-state-chip sim-state-chip--dead">
                  Sin ramas activas (∅)
                </span>
              ) : null}
            </div>

            <p style={{ margin: "0.4rem 0 0.65rem" }}>
              <strong>Paso {current.step}:</strong> {current.description}
            </p>

            {current.firedTransitions.length > 0 ? (
              <p
                style={{
                  margin: "0 0 0.65rem",
                  fontSize: "0.88rem",
                  color: "var(--text-muted)",
                }}
              >
                <strong>Transiciones:</strong>{" "}
                <code>{current.firedTransitions.join(" · ")}</code>
              </p>
            ) : null}

            {current.isFinal ? (
              <div
                className={`academic-block ${
                  runResult.accepted
                    ? "academic-block--proof"
                    : "academic-block--warning"
                }`}
                style={{ marginBottom: 0 }}
                data-testid="aut-verdict"
              >
                <p className="academic-block-title">
                  {runResult.accepted
                    ? "Cadena ACEPTADA"
                    : "Cadena RECHAZADA"}
                </p>
                <p style={{ margin: 0 }}>
                  {runResult.accepted
                    ? `Al finalizar la lectura, al menos un estado activo (${current.activeStates.join(", ")}) pertenece a F = {${preset.acceptStates.join(", ")}}.`
                    : `Al finalizar la lectura, ningún estado activo (${current.activeStates.length > 0 ? current.activeStates.join(", ") : "∅"}) pertenece a F = {${preset.acceptStates.join(", ")}}.`}
                </p>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  );
}
