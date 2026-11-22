import { useState } from "react";
import {
  SAT3_CLAUSES,
  runMax3SatMultiTrial,
  runMax3SatSingleTrial,
  type Sat3MultiResult,
  type Sat3SingleResult,
} from "@/utils/tdaSimulators";

export function Max3SatSimulator() {
  const [singleResult, setSingleResult] = useState<Sat3SingleResult | null>(null);
  const [multiResult, setMultiResult] = useState<Sat3MultiResult | null>(null);

  const handleSingle = () => {
    setMultiResult(null);
    setSingleResult(runMax3SatSingleTrial());
  };

  const handleMulti = () => {
    setSingleResult(null);
    setMultiResult(runMax3SatMultiTrial(100));
  };

  const activePercent = singleResult
    ? singleResult.percent
    : multiResult
      ? multiResult.averagePercent
      : 0;

  return (
    <section
      className="simulator-panel surface-panel"
      aria-label="Simulador Monte Carlo para MAX 3-SAT"
      data-testid="sim-max-3sat"
    >
      <div className="simulator-header">
        <div>
          <span className="meta-pill">Simulador Monte Carlo</span>
          <h4 style={{ margin: "0.4rem 0 0" }}>
            Laboratorio: Asignación aleatoria en MAX 3-SAT
          </h4>
        </div>

        <div className="simulator-controls">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSingle}
            data-testid="sat3-single"
          >
            Lanzar 1 asignación
          </button>
          <button
            type="button"
            className="btn"
            onClick={handleMulti}
            data-testid="sat3-multi"
          >
            Simular 100 corridas
          </button>
        </div>
      </div>

      <div className="sim-two-col">
        <div>
          <p style={{ margin: "0 0 0.5rem", fontWeight: 700 }}>
            Fórmula de prueba (8 cláusulas, 5 variables)
          </p>
          <ul className="plain-list" style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem" }}>
            {SAT3_CLAUSES.map((clause, idx) => {
              const evalClause = singleResult?.evaluations[idx];
              return (
                <li
                  key={idx}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "0.5rem",
                    padding: "0.25rem 0.5rem",
                    borderRadius: "var(--radius-xs)",
                    backgroundColor: "var(--bg-subtle)",
                  }}
                >
                  <span>
                    C{idx + 1} = (
                    {clause
                      .map((l) => `${l.sign === -1 ? "¬x" : "x"}${l.variable}`)
                      .join(" ∨ ")}
                    )
                  </span>
                  {evalClause ? (
                    <span
                      className={`meta-pill ${
                        evalClause.clauseSatisfied
                          ? "meta-pill--preserved"
                          : "meta-pill--imprescindible"
                      }`}
                    >
                      {evalClause.clauseSatisfied ? "Sat" : "Falsa"}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>

        <div aria-live="polite" data-testid="sat3-stats">
          <p style={{ margin: "0 0 0.5rem", fontWeight: 700 }}>
            Resultados del experimento
          </p>

          {singleResult ? (
            <>
              <p style={{ margin: "0 0 0.4rem", fontSize: "0.9rem" }}>
                <strong>Asignación:</strong>{" "}
                {([1, 2, 3, 4, 5] as const)
                  .map((v) => `x${v}=${singleResult.assignment[v] ? "V" : "F"}`)
                  .join(", ")}
              </p>
              <p style={{ margin: "0 0 0.5rem" }}>
                Cláusulas satisfechas:{" "}
                <strong>
                  {singleResult.satisfiedCount} / {singleResult.totalClauses}
                </strong>{" "}
                ({singleResult.percent}%)
              </p>
            </>
          ) : multiResult ? (
            <>
              <p style={{ margin: "0 0 0.4rem" }}>
                Promedio en {multiResult.trials} ensayos:{" "}
                <strong>
                  {multiResult.averageSatisfied} / {SAT3_CLAUSES.length}
                </strong>{" "}
                ({multiResult.averagePercent}% · teórico esperado 7.00 / 87.5%)
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.6rem" }}>
                <span className="meta-pill">8 sat: {multiResult.distribution.exact8}</span>
                <span className="meta-pill">7 sat: {multiResult.distribution.exact7}</span>
                <span className="meta-pill">6 sat: {multiResult.distribution.exact6}</span>
                <span className="meta-pill">≤5 sat: {multiResult.distribution.atMost5}</span>
              </div>
            </>
          ) : (
            <p style={{ margin: "0 0 0.5rem", color: "var(--text-muted)" }}>
              Ejecutá un ensayo o 100 corridas independientes para contrastar la
              cota esperada de 7/8 (87.5%).
            </p>
          )}

          <div
            className="progress-track"
            role="progressbar"
            aria-label="Porcentaje de cláusulas satisfechas"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(activePercent)}
          >
            <div
              className="progress-fill"
              style={{ width: `${Math.min(100, activePercent)}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export default Max3SatSimulator;
