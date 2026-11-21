import { useState } from "react";

interface InfraHealthBadgeProps {
  courseCount: number;
  exerciseCount: number;
  docCount: number;
}

/**
 * Isla React mínima de verificación para Etapa 2.
 * Confirma hidratación interactiva en cliente sin afectar el rendimiento de páginas estáticas.
 */
export function InfraHealthBadge({
  courseCount,
  exerciseCount,
  docCount,
}: InfraHealthBadgeProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <section
      aria-label="Estado de infraestructura Astro"
      style={{
        marginTop: "1.25rem",
        padding: "1rem 1.25rem",
        borderRadius: "10px",
        border: "1px solid #cbd5e1",
        backgroundColor: "#f8fafc",
        color: "#0f172a",
      }}
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
          <strong style={{ fontSize: "0.95rem" }}>
            Núcleo Astro + Islas React activo
          </strong>
          <div style={{ fontSize: "0.875rem", color: "#334155" }}>
            {courseCount} materia(s) · {exerciseCount} ejercicios semilla ·{" "}
            {docCount} apunte(s)
          </div>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          data-testid="infra-health-toggle"
          style={{
            backgroundColor: "#1d4ed8",
            color: "#ffffff",
            border: "1px solid #1e40af",
            borderRadius: "8px",
            padding: "0.5rem 0.9rem",
            fontSize: "0.875rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
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
          color: "#1e293b",
        }}
      >
        {expanded ? (
          <span>
            Isla hidratada correctamente en cliente (<code>client:load</code>)
            con Content Collections validadas por Zod y KaTeX precompilado en
            build-time.
          </span>
        ) : null}
      </div>
    </section>
  );
}
export default InfraHealthBadge;
