import { useState } from "react";
import {
  contractKargerStep,
  createInitialKargerState,
  type KargerState,
} from "@/utils/tdaSimulators";

export function KargerMinCutSimulator() {
  const [state, setState] = useState<KargerState>(() =>
    createInitialKargerState(),
  );

  const cx = 180;
  const cy = 110;
  const radius = 70;
  const positions = new Map<string, { x: number; y: number }>();

  state.nodes.forEach((node, idx) => {
    const angle = (2 * Math.PI * idx) / state.nodes.length;
    positions.set(node, {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    });
  });

  const finished = state.nodes.length <= 2;

  return (
    <section
      className="simulator-panel surface-panel"
      aria-label="Simulador interactivo de contracción aleatoria de Karger"
      data-testid="sim-karger"
    >
      <div className="simulator-header">
        <div>
          <span className="meta-pill">Simulador Karger</span>
          <h4 style={{ margin: "0.4rem 0 0" }}>
            Contracción aleatoria de aristas
          </h4>
        </div>

        <div className="simulator-controls">
          <button
            type="button"
            className="btn btn-primary"
            disabled={finished}
            onClick={() => setState((prev) => contractKargerStep(prev))}
            data-testid="karger-step"
          >
            Contraer arista al azar
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setState(createInitialKargerState())}
            data-testid="karger-reset"
          >
            Reiniciar grafo
          </button>
        </div>
      </div>

      <div className="sim-two-col">
        <div className="sim-svg-box">
          <svg
            viewBox="0 0 360 220"
            role="img"
            aria-label={`Multigrafo con ${state.nodes.length} vértices y ${state.edges.length} aristas`}
            style={{ width: "100%", maxWidth: "24rem", height: "auto" }}
          >
            {state.edges.map((edge, idx) => {
              const p1 = positions.get(edge.u) ?? { x: cx, y: cy };
              const p2 = positions.get(edge.v) ?? { x: cx, y: cy };
              const offset = (idx % 2 === 0 ? 1 : -1) * Math.floor(idx / 2) * 5;
              return (
                <line
                  key={edge.id}
                  x1={p1.x}
                  y1={p1.y + offset}
                  x2={p2.x}
                  y2={p2.y + offset}
                  stroke="var(--border-strong)"
                  strokeWidth="2.5"
                />
              );
            })}

            {state.nodes.map((node) => {
              const p = positions.get(node) ?? { x: cx, y: cy };
              return (
                <g key={node}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="24"
                    fill="var(--btn-primary-bg)"
                    stroke="var(--text-heading)"
                    strokeWidth="2"
                  />
                  <text
                    x={p.x}
                    y={p.y + 4}
                    fill="var(--btn-primary-fg)"
                    fontSize="11"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {node}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div
          className="sim-console"
          aria-live="polite"
          data-testid="karger-console"
        >
          <ul className="plain-list">
            {state.logs.map((entry, idx) => (
              <li key={idx}>{entry}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export default KargerMinCutSimulator;
