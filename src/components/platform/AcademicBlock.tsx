import { useId, type ReactNode } from "react";

export type AcademicBlockKind =
  | "statement"
  | "theorem"
  | "definition"
  | "proof"
  | "complexity"
  | "trap"
  | "example"
  | "note";

const DEFAULT_TITLES: Record<AcademicBlockKind, string> = {
  statement: "Enunciado",
  theorem: "Teorema",
  definition: "Definición",
  proof: "Demostración",
  complexity: "Análisis de complejidad",
  trap: "Trampa frecuente",
  example: "Ejemplo",
  note: "Nota académica",
};

export interface AcademicBlockProps {
  kind: AcademicBlockKind;
  title?: string;
  id?: string;
  className?: string;
  children?: ReactNode;
}

export function AcademicBlock({
  kind,
  title,
  id,
  className = "",
  children,
}: AcademicBlockProps) {
  const headingId = useId();
  const resolvedTitle = title ?? DEFAULT_TITLES[kind];

  return (
    <section
      id={id}
      className={`academic-block academic-block--${kind} ${className}`.trim()}
      data-block-kind={kind}
      aria-labelledby={headingId}
    >
      <p id={headingId} className="academic-block-title">
        {resolvedTitle}
      </p>
      <div className="academic-block-body">{children}</div>
    </section>
  );
}

export default AcademicBlock;
