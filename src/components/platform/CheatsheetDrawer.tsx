import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CheatsheetSection } from "@/data/cheatsheets";

export interface CheatsheetDrawerProps {
  courseTitle: string;
  sections: CheatsheetSection[];
  buttonLabel?: string;
}

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(", ");

export function CheatsheetDrawer({
  courseTitle,
  sections,
  buttonLabel = "Fórmulas",
}: CheatsheetDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [canPortal, setCanPortal] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const drawerRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);
  const titleId = useId();

  useEffect(() => {
    setCanPortal(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      wasOpenRef.current = true;

      const inertTargets: Array<{ el: Element; hadInert: boolean }> = [];
      for (const child of Array.from(document.body.children)) {
        if (child.hasAttribute("data-cheatsheet-portal")) continue;
        inertTargets.push({ el: child, hadInert: child.hasAttribute("inert") });
        child.setAttribute("inert", "");
      }

      closeBtnRef.current?.focus();

      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          event.preventDefault();
          setIsOpen(false);
          return;
        }
        if (event.key === "Tab" && drawerRef.current) {
          const focusables = Array.from(
            drawerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
          ).filter((el) => el.offsetParent !== null);
          if (focusables.length === 0) {
            event.preventDefault();
            return;
          }
          const first = focusables[0];
          const last = focusables[focusables.length - 1];
          const active = document.activeElement;
          if (event.shiftKey) {
            if (active === first || !drawerRef.current.contains(active)) {
              event.preventDefault();
              last.focus();
            }
          } else if (active === last || !drawerRef.current.contains(active)) {
            event.preventDefault();
            first.focus();
          }
        }
      };

      document.addEventListener("keydown", onKeyDown);
      return () => {
        document.removeEventListener("keydown", onKeyDown);
        for (const item of inertTargets) {
          if (!item.hadInert) {
            item.el.removeAttribute("inert");
          }
        }
      };
    }

    if (wasOpenRef.current) {
      wasOpenRef.current = false;
      triggerRef.current?.focus();
    }
    return undefined;
  }, [isOpen]);

  if (sections.length === 0) {
    return null;
  }

  const drawerNode = isOpen ? (
    <div data-cheatsheet-portal="true">
      <div
        className="cheatsheet-backdrop"
        aria-hidden="true"
        onClick={() => setIsOpen(false)}
      />
      <aside
        ref={drawerRef}
        id="cheatsheet-drawer"
        className="cheatsheet-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="cheatsheet-drawer-header">
          <div>
            <h2 id={titleId} className="cheatsheet-section-title">
              Fórmulas y recetas rápidas
            </h2>
            <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--text-muted)" }}>
              {courseTitle}
            </p>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            className="btn btn-ghost"
            onClick={() => setIsOpen(false)}
            aria-label="Cerrar panel de fórmulas"
            data-testid="cheatsheet-close"
          >
            Cerrar
          </button>
        </div>

        <div className="cheatsheet-drawer-body">
          {sections.map((section) => {
            const ListTag = section.listType;
            return (
              <section
                key={section.id}
                className={`cheatsheet-section ${
                  section.variant === "warning" ? "cheatsheet-section--warning" : ""
                }`.trim()}
              >
                <h3 className="cheatsheet-section-title">{section.title}</h3>
                {section.formulaHtml ? (
                  <div
                    className="katex-display"
                    dangerouslySetInnerHTML={{ __html: section.formulaHtml }}
                  />
                ) : null}
                <ListTag style={{ margin: "0.5rem 0 0", paddingInlineStart: "1.25rem" }}>
                  {section.items.map((item, idx) => (
                    <li key={`${section.id}-${idx}`}>
                      {item.lead ? <strong>{item.lead} </strong> : null}
                      <span dangerouslySetInnerHTML={{ __html: item.bodyHtml }} />
                    </li>
                  ))}
                </ListTag>
              </section>
            );
          })}
        </div>
      </aside>
    </div>
  ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="btn btn-ghost"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls="cheatsheet-drawer"
        onClick={() => setIsOpen(true)}
        data-testid="cheatsheet-trigger"
      >
        <span aria-hidden="true">📐</span>
        <span>{buttonLabel}</span>
      </button>

      {drawerNode && canPortal ? createPortal(drawerNode, document.body) : drawerNode}
    </>
  );
}

export default CheatsheetDrawer;
