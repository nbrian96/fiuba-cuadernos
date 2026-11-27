import { useMemo, useState } from "react";
import {
  TURING_PRESETS,
  type TuringPresetId,
  simulateTuringMachine,
} from "@/utils/computabilitySimulators";

export function TuringMachineSimulator() {
  const [presetId, setPresetId] =
    useState<TuringPresetId>("binary-increment");
  const [input, setInput] = useState<string>(
    TURING_PRESETS["binary-increment"].examples[0],
  );
  const [stepIndex, setStepIndex] = useState<number>(0);

  const runResult = useMemo(
    () => simulateTuringMachine(presetId, input, 60),
    [presetId, input],
  );

  const maxStep = Math.max(0, runResult.steps.length - 1);
  const clampedIndex = Math.min(stepIndex, maxStep);
  const current = runResult.steps[clampedIndex] ?? null;

  const handlePresetChange = (nextId: TuringPresetId) => {
    setPresetId(nextId);
    setInput(TURING_PRESETS[nextId].examples[0]);
    setStepIndex(0);
  };

  const handleInputChange = (nextVal: string) => {
    setInput(nextVal);
    setStepIndex(0);
  };

  const preset = runResult.preset;

  return (
    <section
      id="sim-turing"
      className="simulator-panel surface-panel"
      aria-label="Simulador paso a paso de Máquina de Turing"
      data-testid="sim-turing"
    >
      <div className="simulator-header">
        <div>
          <span className="meta-pill">Simulador interactivo · 7-tupla MT</span>
          <h4 style={{ margin: "0.4rem 0 0" }}>
            Simulador de Máquina de Turing (Cinta y Configuraciones)
          </h4>
        </div>

        <div className="simulator-controls">
          <button
            type="button"
            className="btn"
            disabled={!current || clampedIndex <= 0}
            onClick={() => setStepIndex((prev) => Math.max(0, prev - 1))}
            data-testid="tm-prev"
          >
            Anterior
          </button>
          <span className="meta-pill" data-testid="tm-step-indicator">
            Paso {current ? current.step : 0} de {maxStep}
          </span>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!current || clampedIndex >= maxStep}
            onClick={() => setStepIndex((prev) => Math.min(maxStep, prev + 1))}
            data-testid="tm-next"
          >
            Siguiente
          </button>
          <button
            type="button"
            className="btn"
            disabled={!current || clampedIndex >= maxStep}
            onClick={() => setStepIndex(maxStep)}
            data-testid="tm-run-all"
          >
            Ejecutar
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setStepIndex(0)}
            data-testid="tm-reset"
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
          <label htmlFor="tm-preset-select">Máquina de Turing</label>
          <select
            id="tm-preset-select"
            value={presetId}
            onChange={(e) =>
              handlePresetChange(e.target.value as TuringPresetId)
            }
            data-testid="tm-preset-select"
          >
            {Object.values(TURING_PRESETS).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="sim-field">
          <label htmlFor="tm-input">
            Cinta inicial (Σ = {`{${preset.inputAlphabet.join(", ")}}`})
          </label>
          <input
            id="tm-input"
            type="text"
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Ej: 0101"
            data-testid="tm-input"
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
            <code>{ex}</code>
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
            <div className="sim-tape" aria-label="Cinta de la Máquina de Turing">
              {current.tapeWindow.map((cell) => (
                <div
                  key={cell.index}
                  className={`sim-tape-cell ${
                    cell.isHead ? "sim-tape-cell--head" : ""
                  }`}
                >
                  <span>{cell.symbol}</span>
                  <span className="sim-tape-cell-idx">
                    {cell.isHead ? "▲" : cell.index}
                  </span>
                </div>
              ))}
            </div>

            <div className="sim-state-grid">
              <span className="sim-state-chip sim-state-chip--active">
                Estado: <code>{current.state}</code>
              </span>
              <span className="sim-state-chip">
                Cabezal: celda <code>{current.head}</code> (lee{" "}
                <code>{current.readSymbol}</code>)
              </span>
              <span className="sim-state-chip">
                Celdas usadas: <code>{current.visitedCellsCount}</code>
              </span>
            </div>

            <p style={{ margin: "0.4rem 0 0.65rem" }}>
              <strong>Configuración {current.step}:</strong>{" "}
              {current.description}
            </p>

            {current.halted ? (
              <div
                className={`academic-block ${
                  current.status === "accepted"
                    ? "academic-block--proof"
                    : "academic-block--warning"
                }`}
                style={{ marginBottom: 0 }}
                data-testid="tm-verdict"
              >
                <p className="academic-block-title">
                  {current.status === "accepted"
                    ? "Halting: ACEPTADA"
                    : current.status === "rejected"
                      ? "Halting: RECHAZADA"
                      : "No-Halting: Límite de pasos alcanzado"}
                </p>
                <p style={{ margin: 0 }}>
                  Cinta resultante: <code>{current.tapeText || "_"}</code>
                </p>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  );
}
