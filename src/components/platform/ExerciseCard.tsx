import type { ReactNode } from "react";
import type { ExerciseFilterItem } from "@/utils/exerciseFilters";
import ProvenanceBadge from "./ProvenanceBadge";
import ExerciseMasteryToggle from "./ExerciseMasteryToggle";
import SolutionDrawer from "./SolutionDrawer";

export interface ExerciseCardProps {
  exercise: ExerciseFilterItem;
  mastered?: boolean;
  onToggleMastered?: (exerciseId: string, next: boolean) => void;
  solution?: ReactNode;
  controlledSolutionOpen?: boolean;
  showDetailLink?: boolean;
}

export function ExerciseCard({
  exercise,
  mastered,
  onToggleMastered,
  solution,
  controlledSolutionOpen,
  showDetailLink = true,
}: ExerciseCardProps) {
  const anchorId = exercise.number !== null ? `ej-${exercise.number}` : exercise.id;
  const stars = "★".repeat(exercise.difficulty);
  const numberLabel =
    exercise.number !== null ? `EJ ${exercise.number}` : "Teoría avanzada";
  const priorityLabel =
    exercise.priority === "imprescindible" ? "Imprescindible" : "Importante";

  return (
    <article
      id={anchorId}
      className={`exercise-card ${mastered ? "is-mastered" : ""}`.trim()}
      data-exercise-id={exercise.id}
      data-priority={exercise.priority}
      data-unit={exercise.unit}
      data-difficulty={exercise.difficulty}
      data-parcial={exercise.isParcial ? "true" : "false"}
    >
      <header className="exercise-card-header">
        <div>
          <div className="exercise-card-title-row">
            <span className="exercise-number-tag">{numberLabel}</span>
            <h2 className="exercise-card-title">{exercise.title}</h2>
          </div>

          <div className="exercise-card-meta">
            <ProvenanceBadge provenance={exercise.provenance} />
            <span className={`meta-pill meta-pill--${exercise.priority}`}>
              {priorityLabel}
            </span>
            <span
              className="meta-pill"
              aria-label={`Dificultad ${exercise.difficulty} de 5`}
            >
              {stars} ({exercise.difficulty}/5)
            </span>
            <span className="meta-pill">{exercise.unitName ?? exercise.unit}</span>
            {exercise.isParcial ? (
              <span className="meta-pill meta-pill--parcial">Parcial real</span>
            ) : null}
          </div>

          <p className="exercise-card-origin">
            <strong>Origen:</strong> {exercise.origin}
          </p>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
          <ExerciseMasteryToggle
            courseId={exercise.courseId}
            exerciseId={exercise.id}
            checked={mastered}
            onToggle={
              onToggleMastered
                ? (next) => onToggleMastered(exercise.id, next)
                : undefined
            }
          />
          {showDetailLink ? (
            <a
              className="btn btn-primary"
              href={exercise.detailHref}
              target="_blank"
              rel="noopener noreferrer"
            >
              Abrir ejercicio
              <span aria-hidden="true"> ↗</span>
              <span className="sr-only"> (se abre en una nueva pestaña)</span>
            </a>
          ) : null}
        </div>
      </header>

      {exercise.excerpt ? (
        <p style={{ margin: "0.75rem 0 0", color: "var(--text-muted)" }}>
          {exercise.excerpt}
        </p>
      ) : null}

      {solution ? (
        <SolutionDrawer
          exerciseId={exercise.id}
          controlledOpen={controlledSolutionOpen}
        >
          {solution}
        </SolutionDrawer>
      ) : null}
    </article>
  );
}

export default ExerciseCard;
