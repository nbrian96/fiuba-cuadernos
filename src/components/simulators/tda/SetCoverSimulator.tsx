import { useState } from "react";
import { SET_COVER_STEPS } from "@/utils/tdaSimulators";

export function SetCoverSimulator() {
  const [stepIndex, setStepIndex] = useState(0);
  const current = SET_COVER_STEPS[stepIndex];
  const maxStep = SET_COVER_STEPS.length - 1;

  return (
    <section
      className="simulator-panel surface-panel"
      aria-label="Simulador paso a paso de Set Cover Aproximado"
      data-testid="sim-set-cover"
    >
      <div className="simulator-header">
        <div>
          <span className="meta-pill">Simulador interactivo</span>
          <h4 style={{ margin: "0.4rem 0 0" }}>
            Ejemplo oficial de clase: Set Cover
          </h4>
        </div>

        <div className="simulator-controls">
          <button
            type="button"
            className="btn"
            disabled={stepIndex <= 0}
            onClick={() => setStepIndex((prev) => Math.max(0, prev - 1))}
            data-testid="sc-prev"
          >
            Anterior
          </button>
          <span className="meta-pill" data-testid="sc-step-indicator">
            Paso {current.step} de {maxStep}
          </span>
          <button
            type="button"
            className="btn btn-primary"
            disabled={stepIndex >= maxStep}
            onClick={() => setStepIndex((prev) => Math.min(maxStep, prev + 1))}
            data-testid="sc-next"
          >
            Siguiente
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setStepIndex(0)}
            data-testid="sc-reset"
          >
            Reiniciar
          </button>
        </div>
      </div>

      <div aria-live="polite">
        <p style={{ margin: "0 0 0.75rem" }}>
          <strong>{current.title}:</strong> {current.description}
        </p>

        {current.isFinal ? (
          <div className="card-grid">
            <div className="academic-block academic-block--example" style={{ margin: 0 }}>
              <p className="academic-block-title">Solución hallada por Greedy</p>
              <p style={{ margin: "0 0 0.35rem" }}>
                Subconjuntos: <code>{current.chosenSubsets.join(", ")}</code>
              </p>
              <p style={{ margin: 0 }}>
                <strong>Costo total W:</strong> 1.0 + 1.0 + 1.0 + 1.0 ={" "}
                <strong>4.0</strong>
              </p>
            </div>

            <div className="academic-block academic-block--proof" style={{ margin: 0 }}>
              <p className="academic-block-title">Solución óptima real C*</p>
              <p style={{ margin: "0 0 0.35rem" }}>
                Subconjuntos: <code>{"{a, b, c, d}, {e, f, g, h}"}</code>
              </p>
              <p style={{ margin: 0 }}>
                <strong>Costo óptimo W*:</strong> 1.1 + 1.1 ={" "}
                <strong>2.2</strong>
              </p>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginBottom: "0.75rem", fontSize: "0.9rem" }}>
              <span>
                <strong>Solución C:</strong>{" "}
                <code>{`{${current.chosenSubsets.join(", ")}}`}</code>
              </span>
              <span>
                <strong>Restantes R:</strong>{" "}
                <code>{`{${current.remainingElements.join(", ")}}`}</code> (
                {current.remainingElements.length} elementos)
              </span>
            </div>

            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Subconjunto S_i</th>
                    <th>Peso w_i</th>
                    <th>Intersección S_i ∩ R</th>
                    <th>Ratio w_i / |S_i ∩ R|</th>
                  </tr>
                </thead>
                <tbody>
                  {(current.rows ?? []).map((row) => (
                    <tr
                      key={row.name}
                      className={
                        row.chosen
                          ? "sim-row-highlight"
                          : row.struck
                            ? "sim-row-muted"
                            : ""
                      }
                    >
                      <td>
                        <code>{row.name}</code>{" "}
                        {row.chosen ? (
                          <span className="meta-pill meta-pill--preserved">
                            Elegido
                          </span>
                        ) : null}
                      </td>
                      <td>{row.weight}</td>
                      <td>{row.intersection}</td>
                      <td>
                        <strong>{row.ratio}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {current.comment ? (
              <p style={{ margin: "0.5rem 0 0", color: "var(--text-muted)", fontSize: "0.9rem" }}>
                {current.comment}
              </p>
            ) : null}
          </>
        )}

        {current.isFinal ? (
          <div className="academic-block academic-block--note" style={{ marginBottom: 0 }}>
            <p className="academic-block-title">Verificación de la cota armónica</p>
            <p style={{ margin: 0 }}>
              Tamaño máximo d* = 4, H(4) = 1 + 1/2 + 1/3 + 1/4 ≈ 2.083. Cota:{" "}
              <code>W ≤ H(4) · W*</code> → <code>4.0 ≤ 2.083 × 2.2 = 4.58</code>.
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default SetCoverSimulator;
