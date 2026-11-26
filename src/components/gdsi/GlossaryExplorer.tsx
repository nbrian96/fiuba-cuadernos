import { useId, useMemo, useState } from "react";

export interface GlossaryTerm {
  id: string;
  term: string;
  category: string;
  definition: string;
}

export interface GlossaryExplorerProps {
  title?: string;
  terms: GlossaryTerm[];
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function GlossaryExplorer({
  title = "Glosario interactivo",
  terms,
}: GlossaryExplorerProps) {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selfTestMode, setSelfTestMode] = useState(false);
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});

  const searchInputId = useId();
  const baseDefId = useId();

  const categories = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const item of terms) {
      const cat = item.category.trim();
      if (cat.length > 0 && !seen.has(cat)) {
        seen.add(cat);
        list.push(cat);
      }
    }
    return list;
  }, [terms]);

  const visibleTerms = useMemo(() => {
    const normalizedQuery = normalizeText(query);
    return terms.filter((item) => {
      if (selectedCategory !== "all" && item.category !== selectedCategory) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }
      return (
        normalizeText(item.term).includes(normalizedQuery) ||
        normalizeText(item.definition).includes(normalizedQuery) ||
        normalizeText(item.category).includes(normalizedQuery)
      );
    });
  }, [terms, query, selectedCategory]);

  const hasActiveFilters = query.trim().length > 0 || selectedCategory !== "all";

  const handleToggleSelfTest = () => {
    setSelfTestMode((prev) => {
      setRevealedIds({});
      return !prev;
    });
  };

  const handleToggleReveal = (termId: string) => {
    setRevealedIds((prev) => ({
      ...prev,
      [termId]: !prev[termId],
    }));
  };

  const handleResetFilters = () => {
    setQuery("");
    setSelectedCategory("all");
  };

  return (
    <section
      className="gdsi-board surface-panel"
      aria-label={title}
      data-testid="glossary-explorer"
    >
      <div className="simulator-header">
        <div>
          <h3 style={{ margin: 0 }}>{title}</h3>
        </div>
        <p
          className="meta-pill"
          role="status"
          aria-live="polite"
          data-testid="glossary-count"
          style={{ margin: 0 }}
        >
          Mostrando {visibleTerms.length} de {terms.length} términos
        </p>
      </div>

      <div className="gdsi-glossary-controls">
        <div className="hud-row">
          <div className="hud-search-wrap">
            <label htmlFor={searchInputId} className="hud-label">
              Buscar término
            </label>
            <input
              id={searchInputId}
              type="search"
              className="hud-input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filtrar por nombre, categoría o definición…"
              data-testid="glossary-search"
            />
          </div>

          <button
            type="button"
            className={`btn filter-chip ${selfTestMode ? "is-active" : ""}`.trim()}
            aria-pressed={selfTestMode}
            data-testid="glossary-selftest-toggle"
            onClick={handleToggleSelfTest}
          >
            Modo autoevaluación (ocultar definiciones)
          </button>
        </div>

        <div
          className="study-control-group"
          role="group"
          aria-label="Filtrar por categoría"
        >
          <button
            type="button"
            className={`btn filter-chip ${selectedCategory === "all" ? "is-active" : ""}`.trim()}
            aria-pressed={selectedCategory === "all"}
            data-testid="glossary-cat-all"
            onClick={() => setSelectedCategory("all")}
          >
            Todas ({terms.length})
          </button>
          {categories.map((category) => {
            const isActive = selectedCategory === category;
            return (
              <button
                key={category}
                type="button"
                className={`btn filter-chip ${isActive ? "is-active" : ""}`.trim()}
                aria-pressed={isActive}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </button>
            );
          })}
        </div>
      </div>

      {visibleTerms.length === 0 ? (
        <div className="deck-empty" role="status">
          <p style={{ margin: "0 0 0.75rem" }}>
            No se encontraron términos que coincidan con tu búsqueda o categoría.
          </p>
          {hasActiveFilters ? (
            <button
              type="button"
              className="btn"
              onClick={handleResetFilters}
            >
              Limpiar filtros
            </button>
          ) : null}
        </div>
      ) : (
        <div className="gdsi-glossary-grid">
          {visibleTerms.map((item) => {
            const isRevealed = Boolean(revealedIds[item.id]);
            const defId = `${baseDefId}-${item.id}`;

            return (
              <article
                key={item.id}
                className="gdsi-glossary-card"
                data-testid={`glossary-card-${item.id}`}
              >
                <div className="recall-card-header">
                  <h4 className="gdsi-glossary-term">{item.term}</h4>
                  <span className="meta-pill">{item.category}</span>
                </div>

                {selfTestMode ? (
                  <div>
                    <button
                      type="button"
                      className="btn"
                      aria-expanded={isRevealed}
                      aria-controls={defId}
                      data-testid={`glossary-reveal-${item.id}`}
                      onClick={() => handleToggleReveal(item.id)}
                    >
                      {isRevealed ? "Ocultar definición" : "Revelar definición"}
                    </button>

                    {isRevealed ? (
                      <p
                        id={defId}
                        className="gdsi-glossary-def"
                        data-testid={`glossary-def-${item.id}`}
                      >
                        {item.definition}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <p
                    id={defId}
                    className="gdsi-glossary-def"
                    data-testid={`glossary-def-${item.id}`}
                  >
                    {item.definition}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default GlossaryExplorer;
