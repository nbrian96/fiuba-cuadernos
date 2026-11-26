import { useId, useMemo, useState } from "react";

export interface StoryMapStory {
  text: string;
  role: string;
}

export interface StoryMapActivity {
  id: string;
  title: string;
  roles: string[];
  mvpStories: StoryMapStory[];
  release2Stories: StoryMapStory[];
}

export interface StoryMapBoardProps {
  title: string;
  subtitle?: string;
  activities: StoryMapActivity[];
  cutJustification: string;
}

function toRoleSlug(role: string): string {
  return role
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function StoryMapBoard({
  title,
  subtitle,
  activities,
  cutJustification,
}: StoryMapBoardProps) {
  const [activeRole, setActiveRole] = useState<string>("all");
  const [justificationOpen, setJustificationOpen] = useState<boolean>(true);

  const headingId = useId();
  const justificationId = useId();

  const uniqueRoles = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];

    const register = (rawRole: string) => {
      const trimmed = rawRole.trim();
      if (trimmed && !seen.has(trimmed)) {
        seen.add(trimmed);
        list.push(trimmed);
      }
    };

    for (const activity of activities) {
      for (const story of activity.mvpStories) register(story.role);
      for (const story of activity.release2Stories) register(story.role);
      for (const role of activity.roles) register(role);
    }

    return list;
  }, [activities]);

  const counts = useMemo(() => {
    let totalMvp = 0;
    let matchedMvp = 0;
    let totalR2 = 0;
    let matchedR2 = 0;

    for (const activity of activities) {
      for (const story of activity.mvpStories) {
        totalMvp += 1;
        if (activeRole === "all" || story.role.trim() === activeRole) {
          matchedMvp += 1;
        }
      }
      for (const story of activity.release2Stories) {
        totalR2 += 1;
        if (activeRole === "all" || story.role.trim() === activeRole) {
          matchedR2 += 1;
        }
      }
    }

    return { totalMvp, matchedMvp, totalR2, matchedR2 };
  }, [activities, activeRole]);

  const matchesRole = (role: string): boolean =>
    activeRole === "all" || role.trim() === activeRole;

  const columnCount = Math.max(activities.length, 1);

  return (
    <section
      className="gdsi-board"
      aria-labelledby={headingId}
      data-testid="story-map-board"
    >
      <header className="gdsi-board-header">
        <div>
          <span
            style={{
              display: "inline-block",
              fontFamily: "var(--font-mono)",
              fontSize: "0.75rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              color: "var(--text-muted)",
            }}
          >
            User Story Mapping
          </span>
          <h3 id={headingId} style={{ margin: "0.2rem 0 0" }}>
            {title}
          </h3>
          {subtitle ? (
            <p
              style={{
                margin: "var(--space-1) 0 0",
                color: "var(--text-muted)",
                fontSize: "0.9375rem",
              }}
            >
              {subtitle}
            </p>
          ) : null}
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "var(--space-2)",
          }}
        >
          <span
            className="meta-pill meta-pill--importante"
            data-testid="sm-backbone-reminder"
          >
            Backbone: orden cronológico · NO se prioriza entre sí
          </span>
          <span className="meta-pill meta-pill--parcial">
            {activities.length}{" "}
            {activities.length === 1 ? "actividad" : "actividades"}
          </span>
          <span className="meta-pill meta-pill--preserved">
            MVP: {counts.matchedMvp}
            {activeRole !== "all" ? ` / ${counts.totalMvp}` : ""}
          </span>
          <span className="meta-pill">
            Release 2: {counts.matchedR2}
            {activeRole !== "all" ? ` / ${counts.totalR2}` : ""}
          </span>
        </div>
      </header>

      <div
        role="group"
        aria-label="Filtrar historias por rol de usuario"
        data-testid="sm-role-filters"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "var(--space-2)",
          marginBlock: "var(--space-3)",
        }}
      >
        <span
          style={{
            fontSize: "0.875rem",
            fontWeight: 600,
            color: "var(--text-muted)",
          }}
        >
          Filtrar por rol:
        </span>

        <button
          type="button"
          className={`btn filter-chip ${activeRole === "all" ? "is-active" : ""}`.trim()}
          aria-pressed={activeRole === "all"}
          onClick={() => setActiveRole("all")}
          data-testid="sm-role-filter-all"
        >
          Todos los roles
        </button>

        {uniqueRoles.map((role) => {
          const isActive = activeRole === role;
          return (
            <button
              key={role}
              type="button"
              className={`btn filter-chip ${isActive ? "is-active" : ""}`.trim()}
              aria-pressed={isActive}
              onClick={() => setActiveRole(role)}
              data-testid={`sm-role-filter-${toRoleSlug(role)}`}
            >
              {role}
            </button>
          );
        })}
      </div>

      {activeRole !== "all" ? (
        <p
          role="status"
          aria-live="polite"
          data-testid="sm-active-role-status"
          style={{
            margin: "0 0 var(--space-3)",
            fontSize: "0.875rem",
            color: "var(--text-muted)",
          }}
        >
          Resaltando historias del rol{" "}
          <strong style={{ color: "var(--text-heading)" }}>{activeRole}</strong>{" "}
          ({counts.matchedMvp} en MVP · {counts.matchedR2} en Release 2). Las
          tarjetas de otros roles quedan atenuadas para mantener el contexto del
          flujo fin-a-fin.
        </p>
      ) : null}

      <div
        className="gdsi-scroll-x"
        role="region"
        aria-label={`Mapa de historias bidimensional: ${title}`}
        tabIndex={0}
      >
        <div
          className="gdsi-sm-table"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${columnCount}, minmax(13.5rem, 1fr))`,
            gap: "var(--space-3)",
          }}
        >
          {/* Fila 1: Backbone (Actividades del Usuario) */}
          {activities.map((activity, index) => (
            <div
              key={`backbone-${activity.id}`}
              className="gdsi-sm-backbone"
              data-testid={`sm-activity-${activity.id}`}
              style={{
                backgroundColor: "var(--info-bg)",
                border: "1px solid var(--info)",
                borderTopWidth: "4px",
                borderRadius: "var(--radius-md)",
                padding: "var(--space-3)",
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-2)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "var(--space-2)",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    color: "var(--info)",
                  }}
                >
                  Actividad {index + 1}
                </span>
                {index < activities.length - 1 ? (
                  <span
                    aria-hidden="true"
                    style={{ color: "var(--info)", fontWeight: 700 }}
                  >
                    →
                  </span>
                ) : null}
              </div>

              <h4
                style={{
                  margin: 0,
                  fontSize: "0.95rem",
                  color: "var(--text-heading)",
                  lineHeight: 1.35,
                }}
              >
                {activity.title}
              </h4>

              {activity.roles.length > 0 ? (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "0.35rem",
                    marginTop: "auto",
                  }}
                >
                  {activity.roles.map((role) => (
                    <span key={role} className="gdsi-role-tag meta-pill">
                      {role}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ))}

          {/* Separador visual de línea de corte: Walking Skeleton / Release 1 (MVP) */}
          <div
            className="gdsi-sm-release-banner gdsi-sm-release-banner--mvp"
            data-testid="sm-release-mvp-divider"
            style={{
              gridColumn: "1 / -1",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "var(--space-2)",
              padding: "var(--space-2) var(--space-3)",
              backgroundColor: "var(--success-bg)",
              border: "1px solid var(--success)",
              borderInlineStartWidth: "4px",
              borderRadius: "var(--radius-sm)",
            }}
          >
            <strong style={{ color: "var(--success)", fontSize: "0.9rem" }}>
              Walking Skeleton / Release 1 (MVP)
            </strong>
            <span className="meta-pill meta-pill--preserved">
              Valor mínimo fin-a-fin
            </span>
          </div>

          {/* Fila 2: Tarjetas de mvpStories por actividad */}
          {activities.map((activity) => (
            <div
              key={`mvp-${activity.id}`}
              className="gdsi-sm-cell gdsi-sm-cell--mvp"
              data-testid={`sm-mvp-col-${activity.id}`}
            >
              {activity.mvpStories.length > 0 ? (
                <ul
                  className="plain-list"
                  aria-label={`Historias de Release 1 (MVP) para ${activity.title}`}
                >
                  {activity.mvpStories.map((story, idx) => {
                    const matched = matchesRole(story.role);
                    const isHighlighted = activeRole !== "all" && matched;

                    return (
                      <li
                        key={`${activity.id}-mvp-${idx}`}
                        className={`gdsi-sm-story ${!matched ? "is-dimmed" : ""}`.trim()}
                        data-role={story.role}
                        data-matched={matched ? "true" : "false"}
                        style={{
                          padding: "var(--space-3)",
                          borderRadius: "var(--radius-sm)",
                          backgroundColor: matched
                            ? "var(--bg-surface)"
                            : "var(--bg-subtle)",
                          border: matched
                            ? `1px solid ${isHighlighted ? "var(--accent)" : "var(--border-subtle)"}`
                            : "1px dashed var(--border-subtle)",
                          borderInlineStartWidth: "3px",
                          borderInlineStartStyle: "solid",
                          borderInlineStartColor: matched
                            ? isHighlighted
                              ? "var(--accent)"
                              : "var(--success)"
                            : "var(--border-subtle)",
                          display: "grid",
                          gap: "var(--space-2)",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.9rem",
                            color: matched
                              ? "var(--text-primary)"
                              : "var(--text-muted)",
                            lineHeight: 1.45,
                          }}
                        >
                          {story.text}
                        </span>
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            alignItems: "center",
                            gap: "0.35rem",
                          }}
                        >
                          <span className="gdsi-role-tag meta-pill">
                            {story.role}
                          </span>
                          {!matched ? (
                            <span
                              style={{
                                fontSize: "0.75rem",
                                color: "var(--text-muted)",
                              }}
                            >
                              (otro rol)
                            </span>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p
                  style={{
                    margin: 0,
                    padding: "var(--space-3)",
                    fontSize: "0.85rem",
                    color: "var(--text-muted)",
                    border: "1px dashed var(--border-subtle)",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "var(--bg-subtle)",
                  }}
                >
                  Sin historias en MVP
                </p>
              )}
            </div>
          ))}

          {/* Separador visual: Release 2 (Evolutivo) */}
          <div
            className="gdsi-sm-release-banner gdsi-sm-release-banner--r2"
            data-testid="sm-release-r2-divider"
            style={{
              gridColumn: "1 / -1",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "var(--space-2)",
              padding: "var(--space-2) var(--space-3)",
              backgroundColor: "var(--advanced-bg)",
              border: "1px solid var(--advanced)",
              borderInlineStartWidth: "4px",
              borderRadius: "var(--radius-sm)",
              marginTop: "var(--space-2)",
            }}
          >
            <strong style={{ color: "var(--advanced)", fontSize: "0.9rem" }}>
              Release 2 (Evolutivo)
            </strong>
            <span className="meta-pill">Incrementos posteriores al MVP</span>
          </div>

          {/* Fila 3: Tarjetas de release2Stories por actividad */}
          {activities.map((activity) => (
            <div
              key={`r2-${activity.id}`}
              className="gdsi-sm-cell gdsi-sm-cell--r2"
              data-testid={`sm-r2-col-${activity.id}`}
            >
              {activity.release2Stories.length > 0 ? (
                <ul
                  className="plain-list"
                  aria-label={`Historias de Release 2 (Evolutivo) para ${activity.title}`}
                >
                  {activity.release2Stories.map((story, idx) => {
                    const matched = matchesRole(story.role);
                    const isHighlighted = activeRole !== "all" && matched;

                    return (
                      <li
                        key={`${activity.id}-r2-${idx}`}
                        className={`gdsi-sm-story ${!matched ? "is-dimmed" : ""}`.trim()}
                        data-role={story.role}
                        data-matched={matched ? "true" : "false"}
                        style={{
                          padding: "var(--space-3)",
                          borderRadius: "var(--radius-sm)",
                          backgroundColor: matched
                            ? "var(--bg-surface)"
                            : "var(--bg-subtle)",
                          border: matched
                            ? `1px solid ${isHighlighted ? "var(--accent)" : "var(--border-subtle)"}`
                            : "1px dashed var(--border-subtle)",
                          borderInlineStartWidth: "3px",
                          borderInlineStartStyle: "solid",
                          borderInlineStartColor: matched
                            ? isHighlighted
                              ? "var(--accent)"
                              : "var(--advanced)"
                            : "var(--border-subtle)",
                          display: "grid",
                          gap: "var(--space-2)",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.9rem",
                            color: matched
                              ? "var(--text-primary)"
                              : "var(--text-muted)",
                            lineHeight: 1.45,
                          }}
                        >
                          {story.text}
                        </span>
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            alignItems: "center",
                            gap: "0.35rem",
                          }}
                        >
                          <span className="gdsi-role-tag meta-pill">
                            {story.role}
                          </span>
                          {!matched ? (
                            <span
                              style={{
                                fontSize: "0.75rem",
                                color: "var(--text-muted)",
                              }}
                            >
                              (otro rol)
                            </span>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p
                  style={{
                    margin: 0,
                    padding: "var(--space-3)",
                    fontSize: "0.85rem",
                    color: "var(--text-muted)",
                    border: "1px dashed var(--border-subtle)",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "var(--bg-subtle)",
                  }}
                >
                  Sin historias en Release 2
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      <footer
        className="gdsi-board-diagnosis"
        data-testid="sm-cut-justification"
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
          <strong style={{ color: "var(--text-heading)" }}>
            Criterio de recorte del MVP
          </strong>
          <button
            type="button"
            className="btn btn-ghost"
            aria-expanded={justificationOpen}
            aria-controls={justificationId}
            onClick={() => setJustificationOpen((prev) => !prev)}
            data-testid="sm-toggle-justification"
          >
            {justificationOpen ? "Ocultar criterio" : "Ver criterio"}
          </button>
        </div>

        {justificationOpen ? (
          <p
            id={justificationId}
            style={{
              margin: "var(--space-2) 0 0",
              color: "var(--text-primary)",
              lineHeight: 1.55,
            }}
          >
            {cutJustification}
          </p>
        ) : null}
      </footer>
    </section>
  );
}

export default StoryMapBoard;
