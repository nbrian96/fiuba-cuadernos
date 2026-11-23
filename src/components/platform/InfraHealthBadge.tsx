import { useState } from "react";

interface InfraHealthBadgeProps {
  courseCount: number;
  exerciseCount: number;
  docCount: number;
}

/**
 * Isla React mínima para confirmar hidratación interactiva en cliente sobre el Hub.
 */
export function InfraHealthBadge({
  courseCount,
  exerciseCount,
  docCount,
}: InfraHealthBadgeProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <section
      className="surface-panel"
      aria-label="Estado de plataforma académica"
      style={{ marginBlockEnd: "1.5rem" }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.75rem",
        }}
      >
        <div>
          <strong style={{ fontSize: "0.95rem", color: "var(--text-heading)" }}>
            Núcleo Astro + Islas React activo
          </strong>
          <div style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
            {courseCount} materia(s) · {exerciseCount} ejercicios ·{" "}
            {docCount} apunte(s)
          </div>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          data-testid="infra-health-toggle"
        >
          {expanded ? "Ocultar detalle técnico" : "Verificar hidratación React"}
        </button>
      </div>
      <div
        aria-live="polite"
        data-testid="infra-health-status"
        style={{
          marginTop: expanded ? "0.75rem" : "0",
          fontSize: "0.875rem",
          color: "var(--text-primary)",
        }}
      >
        {expanded ? (
          <span>
            Isla hidratada correctamente en cliente (<code>client:load</code>)
            con Content Collections validadas por Zod, Design System WCAG 2.1 AA
            y KaTeX precompilado en build-time.
          </span>
        ) : null}
      </div>
    </section>
  );
}

export default InfraHealthBadge;
