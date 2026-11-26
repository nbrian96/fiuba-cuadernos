import { useId, useMemo, useState } from "react";

export interface EvidenceLevel {
  rank: number;
  id: string;
  name: string;
  strengthPercent: number;
  evidenceType: string;
  mechanics: string;
  whatItValidates: string;
  whatItDoesNotValidate: string;
  example: string;
  tier: "high" | "medium" | "low";
}

export interface EvidenceHierarchyExplorerProps {
  title?: string;
  levels?: EvidenceLevel[];
}

const TIER_META: Record<
  EvidenceLevel["tier"],
  { label: string; pillClass: string }
> = {
  high: {
    label: "Evidencia fuerte",
    pillClass: "meta-pill--preserved",
  },
  medium: {
    label: "Evidencia intermedia",
    pillClass: "meta-pill--importante",
  },
  low: {
    label: "Evidencia débil",
    pillClass: "meta-pill--imprescindible",
  },
};

export const DEFAULT_EVIDENCE_LEVELS: EvidenceLevel[] = [
  {
    rank: 1,
    id: "ab-testing-produccion",
    name: "A/B Testing en producción",
    strengthPercent: 95,
    evidenceType:
      "Conducta masiva en producción, dinero real y transacción irreversible.",
    mechanics:
      "Se divide tráfico real en producción entre dos variantes controladas (A y B) y se comparan métricas de conversión, retención o ingresos con significancia estadística.",
    whatItValidates:
      "Optimización de conversión, retención y desempeño comercial sobre usuarios reales y tráfico productivo.",
    whatItDoesNotValidate:
      "No sirve antes de tener un producto publicado con tráfico suficiente; tampoco descubre necesidades fuera de las variantes comparadas.",
    example:
      "Evaluar dos flujos de checkout en vivo midiendo pagos efectivamente acreditados y tasa de retención a 30 días.",
    tier: "high",
  },
  {
    rank: 2,
    id: "concierge-wizard-of-oz",
    name: "Concierge / Wizard of Oz MVP",
    strengthPercent: 80,
    evidenceType:
      "Pago real de dinero o compromiso de tiempo por el servicio operado.",
    mechanics:
      "Se entrega el servicio de principio a fin con operación manual detrás de escena (transparente en Concierge o simulando automatización en Wizard of Oz) antes de programar el sistema completo.",
    whatItValidates:
      "Valor percibido del resultado, experiencia end-to-end y disposición real a pagar por la solución.",
    whatItDoesNotValidate:
      "No valida factibilidad técnica ni escalabilidad operativa del backend real que luego deberá automatizarse.",
    example:
      "Food on the Table (menús armados manualmente), Zappos (compra en tiendas físicas locales al recibir cada orden) y Groupon (cupones gestionados por correo).",
    tier: "high",
  },
  {
    rank: 3,
    id: "fake-door-smoke-test",
    name: "Fake Door / Smoke Test / Landing Page",
    strengthPercent: 65,
    evidenceType:
      "Clics reales, registros verificables e intentos concretos de acción.",
    mechanics:
      "Se publica una propuesta de valor, página de aterrizaje o disparador visible hacia una funcionalidad todavía no implementada para medir interés concreto previo a escribir código.",
    whatItValidates:
      "Curiosidad inicial, atractivo de la propuesta y demanda puntual pre-código sin invertir en desarrollo completo.",
    whatItDoesNotValidate:
      "No valida uso recurrente, disposición a pagar real ni que el circuito completo de entrega (por ejemplo, que el partido efectivamente se complete) funcione.",
    example:
      "Landing de precios de Buffer, video explicativo de Dropbox y el botón «Encontrá los jugadores que te faltan» en ClubPlay.",
    tier: "medium",
  },
  {
    rank: 4,
    id: "pruebas-usabilidad-prototipo",
    name: "Pruebas de Usabilidad con Prototipo",
    strengthPercent: 50,
    evidenceType:
      "Comportamiento de interacción observado de primera mano con 5 usuarios.",
    mechanics:
      "Sesiones moderadas con 5 usuarios representativos resolviendo tareas reales sobre un prototipo interactivo mediante protocolo Think-Aloud (Kate Moran / Jakob Nielsen).",
    whatItValidates:
      "Operabilidad, claridad ergonómica de la interfaz, comprensión de flujos y detección temprana de fricciones de diseño.",
    whatItDoesNotValidate:
      "ALERTA: No demuestra demanda de mercado, deseabilidad del producto ni intención real de compra; que el usuario sepa operar la interfaz no prueba que la vaya a adoptar ni pagar.",
    example:
      "Observar a 5 usuarios reservar una cancha en un prototipo clickeable mientras expresan en voz alta dónde se traban o confunden.",
    tier: "medium",
  },
  {
    rank: 5,
    id: "mom-test-entrevistas",
    name: "The Mom Test / Entrevistas de hechos pasados",
    strengthPercent: 35,
    evidenceType:
      "Hechos concretos y verificables del pasado reciente (Rob Fitzpatrick).",
    mechanics:
      "Entrevistas enfocadas en comportamientos pasados reales del usuario (qué ocurrió la última vez, cómo lo resolvió, cuánto tiempo o dinero invirtió) sin vender la idea ni pedir cumplidos.",
    whatItValidates:
      "Si existe un dolor real y frecuente, en qué contexto aparece y qué alternativas o soluciones improvisadas utiliza hoy el usuario.",
    whatItDoesNotValidate:
      "No valida si tu solución específica funcionará, si cambiará el hábito del usuario ni cuánto pagarán efectivamente por ella.",
    example:
      "Indagar «Contame la última vez que te faltó un jugador para el partido: ¿qué hiciste?» en vez de «¿Usarías una app que busque reemplazos?».",
    tier: "medium",
  },
  {
    rank: 6,
    id: "encuestas-opinion",
    name: "Encuestas de opinión e intenciones futuras",
    strengthPercent: 15,
    evidenceType:
      "Opiniones declaradas e intenciones hipotéticas («¿Usarías una app que...?»).",
    mechanics:
      "Cuestionarios en los que las personas especulan sobre un comportamiento futuro sin asumir ningún costo real de tiempo, dinero ni reputación.",
    whatItValidates:
      "A lo sumo percepciones superficiales o vocabulario inicial del segmento, siempre subordinadas a validación conductual posterior.",
    whatItDoesNotValidate:
      "Evidencia débil contaminada por sesgo de cortesía y sesgo de optimismo («Diría que sí» ≠ «Lo hizo»). No prueba demanda, retención ni disposición a pagar.",
    example:
      "Formulario online preguntando «¿Pagarías por una app que organice partidos?» donde la mayoría responde afirmativamente pero luego no convierte.",
    tier: "low",
  },
];

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function EvidenceHierarchyExplorer({
  title = "Jerarquía de Solidez de Evidencia en Discovery",
  levels,
}: EvidenceHierarchyExplorerProps) {
  const effectiveLevels = useMemo(
    () => (levels === undefined ? DEFAULT_EVIDENCE_LEVELS : levels),
    [levels],
  );

  const [selectedId, setSelectedId] = useState<string>(
    effectiveLevels[0]?.id ?? "",
  );

  const headingId = useId();
  const detailHeadingId = useId();

  const selectedLevel = useMemo(() => {
    if (effectiveLevels.length === 0) return null;
    return (
      effectiveLevels.find((level) => level.id === selectedId) ??
      effectiveLevels[0]
    );
  }, [effectiveLevels, selectedId]);

  if (!selectedLevel) {
    return (
      <section
        className="gdsi-board"
        aria-labelledby={headingId}
        data-testid="evidence-hierarchy-explorer"
      >
        <header className="gdsi-board-header">
          <div>
            <h3 id={headingId} className="gdsi-board-title">
              {title}
            </h3>
            <p className="gdsi-board-subtitle">
              No hay niveles de evidencia configurados para explorar.
            </p>
          </div>
        </header>
      </section>
    );
  }

  const selectedTierMeta = TIER_META[selectedLevel.tier];
  const selectedPercent = clampPercent(selectedLevel.strengthPercent);

  return (
    <section
      className="gdsi-board"
      aria-labelledby={headingId}
      data-testid="evidence-hierarchy-explorer"
    >
      <header className="gdsi-board-header">
        <div>
          <h3 id={headingId} className="gdsi-board-title">
            {title}
          </h3>
          <p className="gdsi-board-subtitle">
            Compará los métodos de validación de mayor a menor solidez empírica. Hacé
            clic en cada nivel para revisar qué demuestra y qué trampa frecuente de
            examen debés evitar.
          </p>
        </div>
        <div className="gdsi-board-meta">
          <span className="meta-pill">
            {effectiveLevels.length} niveles
          </span>
          <span className={`meta-pill ${selectedTierMeta.pillClass}`}>
            #{selectedLevel.rank} · {selectedPercent}%
          </span>
        </div>
      </header>

      <div
        className="gdsi-evidence-list"
        role="group"
        aria-label="Niveles de solidez de evidencia ordenados de mayor a menor"
      >
        {effectiveLevels.map((level) => {
          const isSelected = level.id === selectedLevel.id;
          const pct = clampPercent(level.strengthPercent);
          const tierMeta = TIER_META[level.tier];

          return (
            <button
              key={level.id}
              type="button"
              className="gdsi-evidence-row"
              aria-pressed={isSelected}
              data-tier={level.tier}
              data-rank={level.rank}
              data-testid={`evidence-row-${level.id}`}
              onClick={() => setSelectedId(level.id)}
            >
              <span className="gdsi-evidence-row-top">
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "var(--space-2)",
                    fontWeight: 600,
                    color: "var(--text-heading)",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.8125rem",
                      color: "var(--text-muted)",
                    }}
                  >
                    #{level.rank}
                  </span>
                  <span>{level.name}</span>
                </span>

                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "var(--space-2)",
                  }}
                >
                  <span className={`meta-pill ${tierMeta.pillClass}`}>
                    {tierMeta.label}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontWeight: 700,
                      fontSize: "0.9375rem",
                      color: "var(--text-heading)",
                      minWidth: "2.75rem",
                      textAlign: "right",
                    }}
                  >
                    {pct}%
                  </span>
                </span>
              </span>

              <span
                className="gdsi-evidence-bar-track"
                aria-hidden="true"
                style={{ display: "block" }}
              >
                <span
                  className={`gdsi-evidence-bar-fill gdsi-evidence-bar-fill--${level.tier}`}
                  style={{ display: "block", width: `${pct}%` }}
                />
              </span>
            </button>
          );
        })}
      </div>

      <article
        className="gdsi-evidence-detail"
        aria-labelledby={detailHeadingId}
        aria-live="polite"
        data-testid="evidence-detail"
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
            #{selectedLevel.rank} · {selectedLevel.name}
          </h4>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
            <span className={`meta-pill ${selectedTierMeta.pillClass}`}>
              {selectedTierMeta.label}
            </span>
            <span
              className="meta-pill"
              style={{ fontFamily: "var(--font-mono)" }}
              data-testid="evidence-detail-strength"
            >
              Solidez: {selectedPercent}%
            </span>
          </div>
        </div>

        <div style={{ display: "grid", gap: "var(--space-3)", fontSize: "0.9375rem" }}>
          <dl
            style={{
              margin: 0,
              display: "grid",
              gap: "var(--space-3)",
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
                Tipo de evidencia recolectada
              </dt>
              <dd style={{ margin: 0, color: "var(--text-primary)" }}>
                {selectedLevel.evidenceType}
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
                Mecánica de aplicación
              </dt>
              <dd style={{ margin: 0, color: "var(--text-primary)" }}>
                {selectedLevel.mechanics}
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
                Ejemplo de cátedra
              </dt>
              <dd style={{ margin: 0, color: "var(--text-primary)" }}>
                {selectedLevel.example}
              </dd>
            </div>
          </dl>

          <div
            className="academic-block academic-block--tip"
            style={{ margin: 0 }}
          >
            <p className="academic-block-title">Lo que SÍ valida</p>
            <p style={{ margin: 0 }}>{selectedLevel.whatItValidates}</p>
          </div>

          <div
            className="academic-block academic-block--trap"
            role="note"
            aria-label="Lo que NO valida (trampa frecuente de examen)"
            style={{ margin: 0 }}
            data-testid="evidence-detail-trap"
          >
            <p className="academic-block-title">
              Lo que NO valida (trampa frecuente de examen)
            </p>
            <p style={{ margin: 0 }}>{selectedLevel.whatItDoesNotValidate}</p>
          </div>
        </div>
      </article>
    </section>
  );
}

export default EvidenceHierarchyExplorer;
