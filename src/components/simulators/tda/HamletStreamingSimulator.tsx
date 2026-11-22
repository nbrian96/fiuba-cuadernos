import { useState } from "react";
import {
  simulateHamletStreaming,
  type HamletSimulationResult,
} from "@/utils/tdaSimulators";

export function HamletStreamingSimulator() {
  const [result, setResult] = useState<HamletSimulationResult | null>(null);

  const memoryPercent = result
    ? Math.round((result.finalMemoryCount / result.maxCapacity) * 100)
    : 0;

  return (
    <section
      className="simulator-panel surface-panel"
      aria-label="Simulador de conteo probabilístico con memoria acotada (Hamlet)"
      data-testid="sim-hamlet"
    >
      <div className="simulator-header">
        <div>
          <span className="meta-pill">Simulador Streaming</span>
          <h4 style={{ margin: "0.4rem 0 0" }}>
            Conteo probabilístico de Hamlet (m = 100)
          </h4>
        </div>

        <div className="simulator-controls">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setResult(simulateHamletStreaming())}
            data-testid="hamlet-run"
          >
            Simular flujo (m = 100)
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setResult(null)}
            data-testid="hamlet-reset"
          >
            Reiniciar
          </button>
        </div>
      </div>

      <div className="sim-two-col">
        <div>
          <ul className="plain-list" style={{ marginBottom: "0.75rem" }}>
            <li>
              Capacidad de memoria m: <strong>100 palabras</strong>
            </li>
            <li>
              Palabras distintas reales: <strong>3,967</strong>
            </li>
            <li>
              Ronda actual K:{" "}
              <strong data-testid="hamlet-round">{result ? result.roundK : 0}</strong>
            </li>
            <li>
              Palabras retenidas |S|:{" "}
              <strong data-testid="hamlet-count">
                {result ? `${result.finalMemoryCount} / ${result.maxCapacity}` : "0 / 100"}
              </strong>
            </li>
          </ul>

          <div
            className="progress-track"
            role="progressbar"
            aria-label="Ocupación de memoria en última ronda"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={memoryPercent}
            style={{ marginBottom: "0.75rem" }}
          >
            <div className="progress-fill" style={{ width: `${memoryPercent}%` }} />
          </div>

          <p aria-live="polite" style={{ margin: 0, fontWeight: 600 }} data-testid="hamlet-status">
            {result
              ? `Estimación: ${result.estimatedWords} palabras (error ${result.errorPercent}% · exactitud ${result.accuracyPercent}%)`
              : "Listo para simular la lectura de Hamlet en streaming."}
          </p>
        </div>

        <div className="sim-console" aria-live="polite" data-testid="hamlet-console">
          {result ? (
            <ul className="plain-list">
              {result.logs.map((entry, idx) => (
                <li key={idx}>{entry}</li>
              ))}
            </ul>
          ) : (
            <p style={{ margin: 0, color: "var(--text-muted)" }}>
              Presioná &ldquo;Simular flujo (m = 100)&rdquo; para ejecutar las rondas
              probabilísticas y el descarte por monedas.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

export default HamletStreamingSimulator;
