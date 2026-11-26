import { Fragment, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";

export type RiskScaleValue = 1 | 2 | 3 | 4 | 5;

export interface RiskPresetExample {
  id: string;
  label: string;
  probability: RiskScaleValue;
  impact: RiskScaleValue;
  strategy: string;
  moscow: "Must Have" | "Should Have" | "Could Have" | "Won't Have";
  detail: string;
}

export interface RiskExposureMatrixProps {
  title?: string;
  presets?: RiskPresetExample[];
}

type RiskZoneKey = "low" | "medium" | "high" | "critical";

interface RiskZoneMeta {
  key: RiskZoneKey;
  label: string;
  shortLabel: string;
  rangeLabel: string;
  pillClass: string;
  strategy: string;
  strategyGuidance: string;
  moscow: RiskPresetExample["moscow"];
  moscowNote: string;
  thresholdNote: string;
}

const PROBABILITY_ROWS: readonly RiskScaleValue[] = [5, 4, 3, 2, 1];
const IMPACT_COLS: readonly RiskScaleValue[] = [1, 2, 3, 4, 5];

const PROBABILITY_LABELS: Record<RiskScaleValue, string> = {
  5: "Muy alta",
  4: "Alta",
  3: "Media",
  2: "Baja",
  1: "Muy baja",
};

const IMPACT_LABELS: Record<RiskScaleValue, string> = {
  1: "Insignificante",
  2: "Menor",
  3: "Moderado",
  4: "Mayor",
  5: "Catastrófico",
};

export const DEFAULT_RISK_PRESETS: RiskPresetExample[] = [
  {
    id: "brecha-seguridad",
    label: "Brecha de seguridad (P=4, I=5)",
    probability: 4,
    impact: 5,
    strategy: "Mitigación preventiva urgente o evitación",
    moscow: "Must Have",
    detail:
      "Exposición crítica (E = 20): amenaza directa sobre datos sensibles, reputación y continuidad operativa. Exige controles preventivos antes del release (cifrado, pruebas de seguridad, hardening) o eliminar el vector de exposición desde la arquitectura.",
  },
  {
    id: "smarthome-pasarela",
    label: "SmartHome: Caída de pasarela (P=2, I=5)",
    probability: 2,
    impact: 5,
    strategy: "Plan de contingencia o transferencia",
    moscow: "Should Have",
    detail:
      "Evento poco frecuente pero de impacto catastrófico (E = 10) que frena cobros y operación crítica. Conviene preparar un plan de contingencia (pasarela secundaria o cola de reintentos) y transferir riesgo mediante SLA con el proveedor externo.",
  },
  {
    id: "smarthome-tipografias",
    label: "SmartHome: Tipografías navegadores antiguos (P=5, I=1)",
    probability: 5,
    impact: 1,
    strategy: "Monitoreo en dailies / aceptación controlada",
    moscow: "Could Have",
    detail:
      "Ocurrencia casi segura en navegadores heredados pero impacto meramente estético (E = 5). Se cubre con fuentes de respaldo (fallback) y seguimiento liviano en dailies sin desviar capacidad crítica del sprint.",
  },
];

function getRiskZone(exposure: number): RiskZoneMeta {
  if (exposure <= 4) {
    return {
      key: "low",
      label: "Zona Baja",
      shortLabel: "Baja",
      rangeLabel: "1–4",
      pillClass: "meta-pill--preserved",
      strategy: "Aceptación pasiva",
      strategyGuidance:
        "El costo de mitigar supera el daño esperado. Se registra el riesgo sin asignar acciones preventivas activas y solo se revisa si cambia el contexto del proyecto.",
      moscow: "Won't Have",
      moscowNote: "No justifica desviar esfuerzo del release actual.",
      thresholdNote:
        "E ≤ 10: por debajo del umbral de priorización operativa de la cátedra.",
    };
  }

  if (exposure <= 9) {
    return {
      key: "medium",
      label: "Zona Media",
      shortLabel: "Media",
      rangeLabel: "5–9",
      pillClass: "meta-pill--parcial",
      strategy: "Monitoreo en dailies",
      strategyGuidance:
        "Seguimiento periódico en dailies y revisiones de sprint con señales de alerta temprana para escalar si aumenta la probabilidad o el impacto.",
      moscow: "Could Have",
      moscowNote: "Atención deseable si existe capacidad remanente en el sprint.",
      thresholdNote:
        "E ≤ 10: mantener bajo vigilancia para detectar un posible salto al umbral prioritario.",
    };
  }

  if (exposure <= 14) {
    return {
      key: "high",
      label: "Zona Alta",
      shortLabel: "Alta",
      rangeLabel: "10–14",
      pillClass: "meta-pill--importante",
      strategy: "Plan de contingencia o transferencia",
      strategyGuidance:
        "Diseñar un plan de respuesta ex-post listo para activarse (rollback, respaldo o reserva) o transferir la carga a un tercero especializado (SLA, outsourcing o seguro).",
      moscow: "Should Have",
      moscowNote: "Tratamiento importante a planificar en los próximos releases.",
      thresholdNote:
        exposure > 10
          ? "E > 10: ingresa en la franja de priorización obligatoria según la cátedra."
          : "E = 10: límite superior de atención antes del corte estricto E > 10; requiere plan explícito si el impacto es alto.",
    };
  }

  return {
    key: "critical",
    label: "Zona Crítica",
    shortLabel: "Crítica",
    rangeLabel: "15–25",
    pillClass: "meta-pill--imprescindible",
    strategy: "Mitigación preventiva urgente o evitación",
    strategyGuidance:
      "Actuar ex-ante para reducir Probabilidad o Impacto (pruebas automatizadas, releases modulares, spikes técnicos) o evitar de raíz la tecnología o decisión riesgosa.",
    moscow: "Must Have",
    moscowNote:
      "Bloqueante para liberar con seguridad; prioridad inmediata en el backlog.",
    thresholdNote:
      exposure > 20
        ? "E > 20: cuadrante de exposición crítica máxima de la cátedra; intervención ineludible."
        : "E > 10: prioridad obligatoria que exige acción preventiva antes del despliegue.",
  };
}

export function RiskExposureMatrix({
  title = "Matriz Interactiva de Exposición al Riesgo (5×5)",
  presets,
}: RiskExposureMatrixProps) {
  const effectivePresets = useMemo(
    () => (presets === undefined ? DEFAULT_RISK_PRESETS : presets),
    [presets],
  );

  const initialPreset = effectivePresets[0] ?? null;

  const [selectedProbability, setSelectedProbability] = useState<RiskScaleValue>(
    initialPreset ? initialPreset.probability : 4,
  );
  const [selectedImpact, setSelectedImpact] = useState<RiskScaleValue>(
    initialPreset ? initialPreset.impact : 5,
  );
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(
    initialPreset ? initialPreset.id : null,
  );

  const headingId = useId();
  const detailHeadingId = useId();
  const cellRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const exposure = selectedProbability * selectedImpact;
  const zone = getRiskZone(exposure);

  const activePreset = useMemo(() => {
    if (selectedPresetId) {
      const byId = effectivePresets.find((item) => item.id === selectedPresetId);
      if (
        byId &&
        byId.probability === selectedProbability &&
        byId.impact === selectedImpact
      ) {
        return byId;
      }
    }
    return (
      effectivePresets.find(
        (item) =>
          item.probability === selectedProbability &&
          item.impact === selectedImpact,
      ) ?? null
    );
  }, [effectivePresets, selectedPresetId, selectedProbability, selectedImpact]);

  const handleSelectCell = (p: RiskScaleValue, i: RiskScaleValue) => {
    setSelectedProbability(p);
    setSelectedImpact(i);
    const matchingPreset = effectivePresets.find(
      (item) => item.probability === p && item.impact === i,
    );
    setSelectedPresetId(matchingPreset ? matchingPreset.id : null);
  };

  const handleSelectPreset = (preset: RiskPresetExample) => {
    setSelectedProbability(preset.probability);
    setSelectedImpact(preset.impact);
    setSelectedPresetId(preset.id);
  };

  const handleCellKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    p: RiskScaleValue,
    i: RiskScaleValue,
  ) => {
    let nextP: number = p;
    let nextI: number = i;

    if (event.key === "ArrowUp") {
      nextP = Math.min(5, p + 1);
    } else if (event.key === "ArrowDown") {
      nextP = Math.max(1, p - 1);
    } else if (event.key === "ArrowLeft") {
      nextI = Math.max(1, i - 1);
    } else if (event.key === "ArrowRight") {
      nextI = Math.min(5, i + 1);
    } else {
      return;
    }

    event.preventDefault();
    const targetP = nextP as RiskScaleValue;
    const targetI = nextI as RiskScaleValue;
    handleSelectCell(targetP, targetI);
    cellRefs.current[`${targetP}-${targetI}`]?.focus();
  };

  return (
    <section
      className="gdsi-board"
      aria-labelledby={headingId}
      data-testid="risk-exposure-matrix"
    >
      <header className="gdsi-board-header">
        <div>
          <h3 id={headingId} className="gdsi-board-title">
            {title}
          </h3>
          <p className="gdsi-board-subtitle">
            Seleccioná una celda de Probabilidad (P) × Impacto (I) o cargá un caso de
            cátedra para evaluar Exposición (E = P × I), estrategia recomendada y
            prioridad MoSCoW.
          </p>
        </div>
        <div className="gdsi-board-meta">
          <span className="meta-pill">E = P × I</span>
          <span className={`meta-pill ${zone.pillClass}`}>
            {zone.label}: {exposure}
          </span>
        </div>
      </header>

      {effectivePresets.length > 0 ? (
        <div
          role="group"
          aria-label="Casos rápidos de riesgo"
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "var(--space-2)",
          }}
        >
          <span
            style={{
              fontSize: "0.875rem",
              fontWeight: 600,
              color: "var(--text-muted)",
            }}
          >
            Casos de cátedra:
          </span>
          {effectivePresets.map((preset) => {
            const isActive = activePreset?.id === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                className={`btn filter-chip${isActive ? " is-active" : ""}`}
                aria-pressed={isActive}
                onClick={() => handleSelectPreset(preset)}
                data-testid={`risk-preset-${preset.id}`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="gdsi-risk-layout">
        <div style={{ display: "grid", gap: "var(--space-3)", minWidth: 0 }}>
          <div className="gdsi-scroll-x">
            <div
              className="gdsi-risk-grid"
              role="group"
              aria-label="Matriz de calor de Probabilidad por Impacto de 5 por 5"
            >
              {PROBABILITY_ROWS.map((p) => (
                <Fragment key={`row-${p}`}>
                  <span className="gdsi-risk-axis" aria-hidden="true">
                    P={p}
                  </span>
                  {IMPACT_COLS.map((i) => {
                    const cellExposure = p * i;
                    const cellZone = getRiskZone(cellExposure);
                    const isSelected =
                      selectedProbability === p && selectedImpact === i;

                    return (
                      <button
                        key={`${p}-${i}`}
                        ref={(node) => {
                          cellRefs.current[`${p}-${i}`] = node;
                        }}
                        type="button"
                        className={`gdsi-risk-cell gdsi-risk-cell--${cellZone.key}`}
                        aria-pressed={isSelected}
                        aria-label={`Probabilidad ${p}, Impacto ${i}, Exposición ${cellExposure}, ${cellZone.label}`}
                        data-probability={p}
                        data-impact={i}
                        data-exposure={cellExposure}
                        data-zone={cellZone.key}
                        data-testid={`risk-cell-p${p}-i${i}`}
                        onClick={() => handleSelectCell(p, i)}
                        onKeyDown={(event) => handleCellKeyDown(event, p, i)}
                      >
                        {cellExposure}
                      </button>
                    );
                  })}
                </Fragment>
              ))}

              <span className="gdsi-risk-axis" aria-hidden="true">
                P \ I
              </span>
              {IMPACT_COLS.map((i) => (
                <span key={`col-${i}`} className="gdsi-risk-axis" aria-hidden="true">
                  I={i}
                </span>
              ))}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "var(--space-2)",
              fontSize: "0.8125rem",
              color: "var(--text-muted)",
            }}
          >
            <span>
              Filas: Probabilidad (5 arriba → 1 abajo) · Columnas: Impacto (1 → 5)
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-1)" }}>
              <span className="meta-pill meta-pill--preserved">Baja (1–4)</span>
              <span className="meta-pill meta-pill--parcial">Media (5–9)</span>
              <span className="meta-pill meta-pill--importante">Alta (10–14)</span>
              <span className="meta-pill meta-pill--imprescindible">Crítica (15–25)</span>
            </div>
          </div>
        </div>

        <aside
          className="gdsi-risk-detail"
          aria-labelledby={detailHeadingId}
          aria-live="polite"
          data-testid="risk-exposure-detail"
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
            <h4 id={detailHeadingId} style={{ margin: 0 }}>
              Análisis de la celda seleccionada
            </h4>
            <span className={`meta-pill ${zone.pillClass}`}>
              {zone.label} ({zone.rangeLabel})
            </span>
          </div>

          <div
            style={{
              padding: "var(--space-3)",
              backgroundColor: "var(--bg-subtle)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-sm)",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "1.05rem",
                fontWeight: 700,
                color: "var(--text-heading)",
              }}
              data-testid="risk-formula"
            >
              Exposición = {selectedProbability} × {selectedImpact} = {exposure}
            </div>
            <div
              style={{
                marginTop: "var(--space-1)",
                fontSize: "0.875rem",
                color: "var(--text-muted)",
              }}
            >
              Probabilidad {selectedProbability} ({PROBABILITY_LABELS[selectedProbability]}) ·
              Impacto {selectedImpact} ({IMPACT_LABELS[selectedImpact]})
            </div>
          </div>

          <dl
            style={{
              margin: 0,
              display: "grid",
              gap: "var(--space-3)",
              fontSize: "0.9375rem",
            }}
          >
            <div>
              <dt
                style={{
                  fontSize: "0.8125rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.03em",
                  color: "var(--text-muted)",
                  marginBottom: "var(--space-1)",
                }}
              >
                Estrategia recomendada según cátedra
              </dt>
              <dd style={{ margin: 0 }}>
                <strong style={{ color: "var(--text-heading)" }}>
                  {activePreset ? activePreset.strategy : zone.strategy}
                </strong>
                <p style={{ margin: "var(--space-1) 0 0", color: "var(--text-primary)" }}>
                  {zone.strategyGuidance}
                </p>
              </dd>
            </div>

            <div>
              <dt
                style={{
                  fontSize: "0.8125rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.03em",
                  color: "var(--text-muted)",
                  marginBottom: "var(--space-1)",
                }}
              >
                Clasificación MoSCoW típica
              </dt>
              <dd
                style={{
                  margin: 0,
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: "var(--space-2)",
                }}
              >
                <span className="meta-pill">
                  {activePreset ? activePreset.moscow : zone.moscow}
                </span>
                <span style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
                  {zone.moscowNote}
                </span>
              </dd>
            </div>

            <div>
              <dt
                style={{
                  fontSize: "0.8125rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.03em",
                  color: "var(--text-muted)",
                  marginBottom: "var(--space-1)",
                }}
              >
                Regla de umbral GDSI
              </dt>
              <dd style={{ margin: 0, color: "var(--text-primary)" }}>
                {zone.thresholdNote}
              </dd>
            </div>
          </dl>

          {activePreset ? (
            <div
              className="academic-block academic-block--example"
              style={{ margin: "var(--space-2) 0 0" }}
              data-testid="risk-active-preset-detail"
            >
              <p className="academic-block-title">Caso aplicado: {activePreset.label}</p>
              <p style={{ margin: 0 }}>{activePreset.detail}</p>
            </div>
          ) : null}
        </aside>
      </div>
    </section>
  );
}

export default RiskExposureMatrix;
