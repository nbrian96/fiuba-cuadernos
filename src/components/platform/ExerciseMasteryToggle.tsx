import { useEffect, useState } from "react";
import { progressStore } from "@/stores/progressStore";

export interface ExerciseMasteryToggleProps {
  courseId: string;
  exerciseId: string;
  label?: string;
  checked?: boolean;
  onToggle?: (next: boolean) => void;
}

export function ExerciseMasteryToggle({
  courseId,
  exerciseId,
  label = "Dominado",
  checked,
  onToggle,
}: ExerciseMasteryToggleProps) {
  const isControlled = checked !== undefined && onToggle !== undefined;
  const [internalChecked, setInternalChecked] = useState(false);

  useEffect(() => {
    if (isControlled) return undefined;
    const sync = () => {
      setInternalChecked(progressStore.isExerciseMastered(courseId, exerciseId));
    };
    sync();
    return progressStore.subscribe(sync);
  }, [courseId, exerciseId, isControlled]);

  const effectiveChecked = isControlled ? checked : internalChecked;

  return (
    <label className="mastery-toggle">
      <input
        type="checkbox"
        checked={effectiveChecked}
        onChange={(event) => {
          const next = event.currentTarget.checked;
          if (isControlled) {
            onToggle(next);
          } else {
            progressStore.setExerciseMastered(courseId, exerciseId, next);
            setInternalChecked(next);
          }
        }}
        data-testid={`mastery-toggle-${exerciseId}`}
      />
      <span>{label}</span>
    </label>
  );
}

export default ExerciseMasteryToggle;
