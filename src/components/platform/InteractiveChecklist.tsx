import { useEffect, useMemo, useState } from "react";
import { progressStore } from "@/stores/progressStore";

export interface InteractiveChecklistItem {
  id: string;
  sectionId: string;
  sectionTitle?: string;
  itemIndex: number;
  labelHtml: string;
}

export interface InteractiveChecklistProps {
  courseId: string;
  title?: string;
  items: InteractiveChecklistItem[];
}

interface ChecklistGroup {
  sectionId: string;
  sectionTitle?: string;
  items: InteractiveChecklistItem[];
}

export function InteractiveChecklist({
  courseId,
  title = "Seguimiento interactivo de preparación",
  items,
}: InteractiveChecklistProps) {
  const [checkedMap, setCheckedMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const sync = () => {
      setCheckedMap(progressStore.getChecklistState(courseId));
    };
    sync();
    return progressStore.subscribe(sync);
  }, [courseId]);

  const checkedCount = useMemo(
    () => items.reduce((acc, item) => acc + (checkedMap[item.id] ? 1 : 0), 0),
    [items, checkedMap],
  );

  const percent =
    items.length > 0 ? Math.round((checkedCount / items.length) * 100) : 0;

  const groups = useMemo(() => {
    const list: ChecklistGroup[] = [];
    for (const item of items) {
      const prev = list[list.length - 1];
      if (prev && prev.sectionId === item.sectionId) {
        prev.items.push(item);
      } else {
        list.push({
          sectionId: item.sectionId,
          sectionTitle: item.sectionTitle,
          items: [item],
        });
      }
    }
    return list;
  }, [items]);

  const hasSectionTitles = groups.some((g) => Boolean(g.sectionTitle));

  return (
    <section
      className="checklist-panel"
      aria-label={title}
      data-testid="interactive-checklist"
    >
      <div className="checklist-header">
        <div>
          <h2 style={{ margin: 0 }}>{title}</h2>
          <p style={{ margin: "0.25rem 0 0", color: "var(--text-muted)", fontSize: "0.9rem" }}>
            Tu progreso se guarda automáticamente por materia en este navegador.
          </p>
        </div>

        <div className="progress-wrap">
          <span style={{ fontSize: "0.875rem", whiteSpace: "nowrap" }} data-testid="checklist-counter">
            <strong>{checkedCount}</strong> / {items.length} ({percent}%)
          </span>
          <div
            className="progress-track"
            role="progressbar"
            aria-label="Progreso del checklist"
            aria-valuemin={0}
            aria-valuemax={Math.max(items.length, 1)}
            aria-valuenow={checkedCount}
            aria-valuetext={`${checkedCount} de ${items.length} completados (${percent}%)`}
          >
            <div className="progress-fill" style={{ width: `${percent}%` }} />
          </div>
        </div>
      </div>

      {hasSectionTitles ? (
        <div style={{ display: "grid", gap: "1rem" }}>
          {groups.map((group) => (
            <div key={group.sectionId}>
              {group.sectionTitle ? (
                <h3 id={group.sectionId} style={{ margin: "0.25rem 0 0.6rem" }}>
                  {group.sectionTitle}
                </h3>
              ) : null}
              <ul className="checklist-items">
                {group.items.map((item) => {
                  const isChecked = Boolean(checkedMap[item.id]);
                  return (
                    <li key={item.id}>
                      <label className="checklist-item-label">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(event) => {
                            const next = event.currentTarget.checked;
                            const updated = progressStore.setChecklistItem(
                              courseId,
                              item.id,
                              next,
                            );
                            setCheckedMap({ ...updated });
                          }}
                          data-testid={`checklist-item-${item.id}`}
                        />
                        <span dangerouslySetInnerHTML={{ __html: item.labelHtml }} />
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <ul className="checklist-items">
          {items.map((item) => {
            const isChecked = Boolean(checkedMap[item.id]);
            return (
              <li key={item.id}>
                <label className="checklist-item-label">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(event) => {
                      const next = event.currentTarget.checked;
                      const updated = progressStore.setChecklistItem(
                        courseId,
                        item.id,
                        next,
                      );
                      setCheckedMap({ ...updated });
                    }}
                    data-testid={`checklist-item-${item.id}`}
                  />
                  <span dangerouslySetInnerHTML={{ __html: item.labelHtml }} />
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default InteractiveChecklist;
