import { useState } from "react";
import {
  PRICING_METHOD_STEPS,
  type PricingNodeKey,
} from "@/utils/tdaSimulators";

const NODE_KEYS: PricingNodeKey[] = ["a", "b", "c", "d"];

export function PricingMethodSimulator() {
  const [stepIndex, setStepIndex] = useState(0);
  const current = PRICING_METHOD_STEPS[stepIndex];
  const maxStep = PRICING_METHOD_STEPS.length - 1;

  const paidNodes = NODE_KEYS.filter((k) => current.nodes[k].isPaid);

  const nodeFill = (k: PricingNodeKey) =>
    current.nodes[k].isPaid ? "var(--success)" : "var(--text-muted)";

  return (
    <section
      className="simulator-panel surface-panel"
      aria-label="Simulador de Vertex Cover por Pricing Method"
      data-testid="sim-pricing-method"
    >
      <div className="simulator-header">
        <div>
          <span className="meta-pill">Seguimiento interactivo</span>
          <h4 style={{ margin: "0.4rem 0 0" }}>
            Grafo Diamante: {"{a(4), b(3), c(5), d(3)}"}
          </h4>
        </div>

        <div className="simulator-controls">
          <button
            type="button"
            className="btn"
            disabled={stepIndex <= 0}
            onClick={() => setStepIndex((prev) => Math.max(0, prev - 1))}
            data-testid="pr-prev"
          >
            Anterior
          </button>
          <span className="meta-pill" data-testid="pr-step-indicator">
            Paso {current.step} de {maxStep}
          </span>
          <button
            type="button"
            className="btn btn-primary"
            disabled={stepIndex >= maxStep}
            onClick={() => setStepIndex((prev) => Math.min(maxStep, prev + 1))}
            data-testid="pr-next"
          >
            Siguiente
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setStepIndex(0)}
            data-testid="pr-reset"
          >
            Reiniciar
          </button>
        </div>
      </div>

      <div aria-live="polite">
        <p style={{ margin: "0 0 0.75rem" }}>
          <strong>{current.title}:</strong> {current.description}
        </p>

        <div className="sim-two-col">
          <div className="sim-svg-box">
            <svg
              viewBox="0 0 340 220"
              role="img"
              aria-label={`Grafo diamante en paso ${current.step}, vértices pagos: ${paidNodes.join(", ") || "ninguno"}`}
              style={{ width: "100%", maxWidth: "24rem", height: "auto" }}
            >
              <line
                x1="170"
                y1="30"
                x2="60"
                y2="110"
                stroke="var(--border-strong)"
                strokeWidth={current.edges[0].price > 0 ? 4 : 2}
              />
              <line
                x1="170"
                y1="30"
                x2="280"
                y2="110"
                stroke="var(--border-strong)"
                strokeWidth={current.edges[1].price > 0 ? 4 : 2}
              />
              <line
                x1="170"
                y1="30"
                x2="170"
                y2="180"
                stroke="var(--border-strong)"
                strokeWidth={current.edges[3].price > 0 ? 4 : 2}
              />
              <line
                x1="60"
                y1="110"
                x2="170"
                y2="180"
                stroke="var(--border-strong)"
                strokeWidth={current.edges[4].price > 0 ? 4 : 2}
              />
              <line
                x1="280"
                y1="110"
                x2="170"
                y2="180"
                stroke="var(--border-strong)"
                strokeWidth={current.edges[2].price > 0 ? 4 : 2}
              />

              <rect x="93" y="58" width="40" height="20" rx="4" fill="var(--bg-code)" />
              <text x="113" y="72" fill="#f1f5f9" fontSize="11" textAnchor="middle" fontWeight="bold">
                p={current.edges[0].price}
              </text>

              <rect x="208" y="58" width="40" height="20" rx="4" fill="var(--bg-code)" />
              <text x="228" y="72" fill="#f1f5f9" fontSize="11" textAnchor="middle" fontWeight="bold">
                p={current.edges[1].price}
              </text>

              <rect x="208" y="143" width="40" height="20" rx="4" fill="var(--bg-code)" />
              <text x="228" y="157" fill="#f1f5f9" fontSize="11" textAnchor="middle" fontWeight="bold">
                p={current.edges[2].price}
              </text>

              <circle cx="170" cy="30" r="18" fill={nodeFill("a")} stroke="var(--text-heading)" strokeWidth="2" />
              <text x="170" y="34" fill="var(--bg-surface)" fontSize="12" fontWeight="bold" textAnchor="middle">a</text>
              <text x="170" y="10" fill="var(--text-primary)" fontSize="11" fontWeight="bold" textAnchor="middle">
                {current.nodes.a.paid}/{current.nodes.a.max}
              </text>

              <circle cx="60" cy="110" r="18" fill={nodeFill("b")} stroke="var(--text-heading)" strokeWidth="2" />
              <text x="60" y="114" fill="var(--bg-surface)" fontSize="12" fontWeight="bold" textAnchor="middle">b</text>
              <text x="24" y="114" fill="var(--text-primary)" fontSize="11" fontWeight="bold" textAnchor="middle">
                {current.nodes.b.paid}/{current.nodes.b.max}
              </text>

              <circle cx="280" cy="110" r="18" fill={nodeFill("d")} stroke="var(--text-heading)" strokeWidth="2" />
              <text x="280" y="114" fill="var(--bg-surface)" fontSize="12" fontWeight="bold" textAnchor="middle">d</text>
              <text x="316" y="114" fill="var(--text-primary)" fontSize="11" fontWeight="bold" textAnchor="middle">
                {current.nodes.d.paid}/{current.nodes.d.max}
              </text>

              <circle cx="170" cy="180" r="18" fill={nodeFill("c")} stroke="var(--text-heading)" strokeWidth="2" />
              <text x="170" y="184" fill="var(--bg-surface)" fontSize="12" fontWeight="bold" textAnchor="middle">c</text>
              <text x="170" y="212" fill="var(--text-primary)" fontSize="11" fontWeight="bold" textAnchor="middle">
                {current.nodes.c.paid}/{current.nodes.c.max}
              </text>
            </svg>
          </div>

          <div style={{ display: "grid", gap: "0.75rem" }}>
            <ul className="plain-list">
              {NODE_KEYS.map((key) => {
                const st = current.nodes[key];
                return (
                  <li key={key}>
                    <strong>{key}</strong> (peso {st.max}): {st.paid} cobrado{" "}
                    {st.isPaid ? (
                      <span className="meta-pill meta-pill--preserved">Pago</span>
                    ) : null}
                  </li>
                );
              })}
            </ul>

            <p style={{ margin: 0 }}>
              <strong>Solución parcial S:</strong>{" "}
              <code>{`{${paidNodes.join(", ") || "vacía"}}`}</code>
            </p>
            <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.9rem" }}>
              {current.explanation}
            </p>

            {current.step === maxStep ? (
              <div className="academic-block academic-block--proof" style={{ margin: 0 }}>
                <p className="academic-block-title">Cálculo final</p>
                <p style={{ margin: 0, fontSize: "0.9rem" }}>
                  Costo(S) = 4 + 3 + 3 = <strong>10</strong> · Suma de precios Σ p_e = 3 + 1 + 2 ={" "}
                  <strong>6</strong> · Verificación: <code>10 ≤ 2 × 6 = 12</code>.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

export default PricingMethodSimulator;
