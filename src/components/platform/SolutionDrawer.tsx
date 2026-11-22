import { useEffect, useRef, useState, type ReactNode } from "react";

export const SOLUTIONS_TOGGLE_EVENT = "mc:solutions-toggle";

export interface SolutionDrawerProps {
  exerciseId: string;
  title?: string;
  badgeText?: string;
  defaultOpen?: boolean;
  controlledOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
}

export function SolutionDrawer({
  exerciseId,
  title = "Respuesta y desarrollo paso a paso",
  badgeText = "Active Recall",
  defaultOpen = false,
  controlledOpen,
  onOpenChange,
  children,
}: SolutionDrawerProps) {
  const isControlled = controlledOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = isControlled ? controlledOpen : internalOpen;
  const internalOpenRef = useRef(internalOpen);
  internalOpenRef.current = internalOpen;
  const prePrintOpenRef = useRef<boolean | null>(null);

  useEffect(() => {
    const onGlobalToggle = (ev: Event) => {
      if (isControlled) return;
      const custom = ev as CustomEvent<{ open?: boolean }>;
      if (typeof custom.detail?.open === "boolean") {
        setInternalOpen(custom.detail.open);
      }
    };

    const onBeforePrint = () => {
      if (isControlled) return;
      prePrintOpenRef.current = internalOpenRef.current;
      setInternalOpen(true);
    };

    const onAfterPrint = () => {
      if (isControlled || prePrintOpenRef.current === null) return;
      setInternalOpen(prePrintOpenRef.current);
      prePrintOpenRef.current = null;
    };

    window.addEventListener(SOLUTIONS_TOGGLE_EVENT, onGlobalToggle);
    window.addEventListener("beforeprint", onBeforePrint);
    window.addEventListener("afterprint", onAfterPrint);
    return () => {
      window.removeEventListener(SOLUTIONS_TOGGLE_EVENT, onGlobalToggle);
      window.removeEventListener("beforeprint", onBeforePrint);
      window.removeEventListener("afterprint", onAfterPrint);
    };
  }, [isControlled]);

  return (
    <details
      id={`solution-${exerciseId}`}
      className="solution-drawer"
      open={open}
      onToggle={(event) => {
        const nextOpen = event.currentTarget.open;
        if (!isControlled) {
          setInternalOpen(nextOpen);
        }
        if (nextOpen !== open) {
          onOpenChange?.(nextOpen);
        }
      }}
      data-testid={`solution-drawer-${exerciseId}`}
    >
      <summary className="solution-drawer-summary">
        <span>{title}</span>
        <span className="meta-pill">{badgeText}</span>
      </summary>
      <div className="solution-drawer-body">{children}</div>
    </details>
  );
}

export default SolutionDrawer;
