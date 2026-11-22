import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import ProvenanceBadge from "./ProvenanceBadge";
import type { Provenance } from "@/schemas/academic";
import { PROVENANCE_META } from "@/utils/provenance";
import { withBase } from "@/utils/paths";

interface PagefindSearchHit {
  id: string;
  data: () => Promise<PagefindResultData>;
}

interface PagefindResultData {
  url: string;
  excerpt: string;
  meta?: {
    title?: string;
    provenance?: string;
    kind?: string;
    resourceId?: string;
    page?: string;
    fallback?: string;
  };
}

interface PagefindApi {
  init?: () => Promise<void>;
  options?: (opts: { baseUrl?: string }) => Promise<void>;
  search: (
    query: string,
    opts?: { filters?: Record<string, string[]> },
  ) => Promise<{ results: PagefindSearchHit[] }>;
}

interface RenderedResult {
  id: string;
  href: string;
  title: string;
  excerpt: string;
  provenance?: Provenance;
  kind?: string;
  page?: string;
  fallback?: boolean;
}

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(", ");

const KIND_OPTIONS = [
  { value: "all", label: "Todo" },
  { value: "pdf", label: "Solo PDFs" },
  { value: "exercise", label: "Ejercicios" },
  { value: "doc", label: "Apuntes" },
] as const;

const PROVENANCE_OPTIONS: Array<{ value: "all" | Provenance; label: string }> = [
  { value: "all", label: "Todas las procedencias" },
  { value: "official_source", label: "Fuente oficial" },
  { value: "elaborated_solution", label: "Solución elaborada" },
  { value: "elaborated_notes", label: "Apuntes elaborados" },
  { value: "elaborated_summary", label: "Resúmenes" },
  { value: "reconstructed_exam_statement", label: "Parcial reconstruido" },
  { value: "elaborated_submission", label: "Entrega TP0" },
];

function isProvenance(value: string | undefined): value is Provenance {
  return Boolean(value && value in PROVENANCE_META);
}

export function resolveSearchHref(rawUrl: string): string {
  if (!rawUrl) return withBase("/");
  if (/^https?:\/\//i.test(rawUrl)) return rawUrl;
  if (rawUrl.startsWith("//")) return withBase("/");

  const normalizedBase = withBase("/");
  const cleanRaw = rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`;
  if (normalizedBase !== "/" && cleanRaw.startsWith(normalizedBase)) {
    return cleanRaw;
  }
  return withBase(cleanRaw);
}

function decodeBasicEntities(text: string): string {
  return text
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&#x27;", "'")
    .replaceAll("&amp;", "&");
}

function stripTags(htmlText: string): string {
  return decodeBasicEntities(htmlText.replace(/<[^>]+>/g, ""));
}

export function renderSafeExcerpt(rawExcerpt: string): ReactNode[] {
  const parts = rawExcerpt.split(/(<mark>[\s\S]*?<\/mark>)/gi);
  return parts.map((segment, index) => {
    const match = /^<mark>([\s\S]*?)<\/mark>$/i.exec(segment);
    if (match) {
      return <mark key={index}>{stripTags(match[1])}</mark>;
    }
    return <span key={index}>{stripTags(segment)}</span>;
  });
}

export function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [canPortal, setCanPortal] = useState(false);
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] =
    useState<(typeof KIND_OPTIONS)[number]["value"]>("all");
  const [provenanceFilter, setProvenanceFilter] = useState<"all" | Provenance>(
    "all",
  );
  const [results, setResults] = useState<RenderedResult[]>([]);
  const [totalMatches, setTotalMatches] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const pagefindRef = useRef<PagefindApi | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const wasOpenRef = useRef(false);
  const titleId = useId();
  const inputId = useId();

  useEffect(() => {
    setCanPortal(true);
  }, []);

  // Atajo global Ctrl+K / Cmd+K (con respeto a foco en otros diálogos)
  useEffect(() => {
    const onGlobalKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        if (
          !isOpen &&
          document.querySelector('[role="dialog"][aria-modal="true"]')
        ) {
          return;
        }
        event.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", onGlobalKey);
    return () => document.removeEventListener("keydown", onGlobalKey);
  }, [isOpen]);

  // Gestión de foco, inert y Escape/Tab al abrir o cerrar el modal
  useEffect(() => {
    if (isOpen) {
      wasOpenRef.current = true;
      const inertTargets: Array<{ el: Element; hadInert: boolean }> = [];
      for (const child of Array.from(document.body.children)) {
        if (child.hasAttribute("data-search-portal")) continue;
        inertTargets.push({ el: child, hadInert: child.hasAttribute("inert") });
        child.setAttribute("inert", "");
      }

      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });

      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          event.preventDefault();
          setIsOpen(false);
          return;
        }
        if (event.key === "Tab" && modalRef.current) {
          const focusables = Array.from(
            modalRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
          ).filter((el) => el.offsetParent !== null);
          if (focusables.length === 0) {
            event.preventDefault();
            return;
          }
          const first = focusables[0];
          const last = focusables[focusables.length - 1];
          const active = document.activeElement;
          if (event.shiftKey) {
            if (active === first || !modalRef.current.contains(active)) {
              event.preventDefault();
              last.focus();
            }
          } else if (active === last || !modalRef.current.contains(active)) {
            event.preventDefault();
            first.focus();
          }
        }
      };

      document.addEventListener("keydown", onKeyDown);
      return () => {
        document.removeEventListener("keydown", onKeyDown);
        for (const target of inertTargets) {
          if (!target.hadInert) {
            target.el.removeAttribute("inert");
          }
        }
      };
    } else if (wasOpenRef.current) {
      wasOpenRef.current = false;
      triggerRef.current?.focus();
    }
  }, [isOpen]);

  // Carga perezosa del bundle Pagefind y ejecución de búsqueda
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    async function ensureAndSearch() {
      const trimmed = query.trim();
      if (!trimmed) {
        setResults([]);
        setTotalMatches(0);
        setLoading(false);
        return;
      }

      setLoading(true);
      setLoadError(null);

      try {
        if (!pagefindRef.current) {
          const moduleUrl = withBase("/pagefind/pagefind.js");
          const mod = (await import(/* @vite-ignore */ moduleUrl)) as PagefindApi;
          if (typeof mod.options === "function") {
            await mod.options({ baseUrl: withBase("/") });
          }
          if (typeof mod.init === "function") {
            await mod.init();
          }
          pagefindRef.current = mod;
        }

        const filters: Record<string, string[]> = {};
        if (kindFilter !== "all") {
          filters.kind = [kindFilter];
        }
        if (provenanceFilter !== "all") {
          filters.provenance = [provenanceFilter];
        }

        const searchResponse = await pagefindRef.current.search(
          trimmed,
          Object.keys(filters).length > 0 ? { filters } : undefined,
        );

        const hits = searchResponse.results ?? [];
        const topSlice = hits.slice(0, 20);
        const resolved = await Promise.all(
          topSlice.map(async (hit) => {
            const data = await hit.data();
            const rawProv = data.meta?.provenance;
            return {
              id: hit.id,
              href: resolveSearchHref(data.url),
              title: data.meta?.title || data.url,
              excerpt: data.excerpt || "",
              provenance: isProvenance(rawProv) ? rawProv : undefined,
              kind: data.meta?.kind,
              page: data.meta?.page,
              fallback: data.meta?.fallback === "true",
            } satisfies RenderedResult;
          }),
        );

        if (!cancelled) {
          setTotalMatches(hits.length);
          setResults(resolved);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setLoading(false);
          setLoadError(
            "El índice Pagefind no está disponible en este entorno. Ejecutá npm run build para generarlo.",
          );
        }
      }
    }

    const timer = setTimeout(ensureAndSearch, 120);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isOpen, query, kindFilter, provenanceFilter]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="btn"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(true)}
        data-testid="global-search-trigger"
      >
        Buscar <kbd style={{ fontSize: "0.75rem", opacity: 0.8 }}>Ctrl+K</kbd>
      </button>

      {isOpen && canPortal
        ? createPortal(
            <div
              data-search-portal="true"
              className="search-modal-backdrop"
              onClick={(event) => {
                if (event.target === event.currentTarget) {
                  setIsOpen(false);
                }
              }}
            >
              <div
                ref={modalRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="search-modal"
                data-testid="global-search-dialog"
              >
                <div className="search-modal-header">
                  <div>
                    <h2 id={titleId} style={{ margin: 0, fontSize: "1.1rem" }}>
                      Buscador global (páginas y PDFs)
                    </h2>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setIsOpen(false)}
                    data-testid="global-search-close"
                  >
                    Cerrar (Esc)
                  </button>
                </div>

                <div className="search-modal-body">
                  <div>
                    <label htmlFor={inputId} className="sr-only">
                      Buscar ejercicios, teoría o texto dentro de PDFs
                    </label>
                    <input
                      ref={inputRef}
                      id={inputId}
                      type="search"
                      className="hud-input"
                      style={{ width: "100%" }}
                      placeholder="Ej: simplex, mochila, Karger, dualidad, NP-completo..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      data-testid="global-search-input"
                    />
                  </div>

                  <div className="search-filter-row" role="group" aria-label="Filtrar por tipo de recurso">
                    {KIND_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        className={`btn ${kindFilter === opt.value ? "btn-primary" : ""}`.trim()}
                        aria-pressed={kindFilter === opt.value}
                        onClick={() => setKindFilter(opt.value)}
                        data-testid={`global-search-kind-${opt.value}`}
                      >
                        {opt.label}
                      </button>
                    ))}

                    <label style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", marginLeft: "auto" }}>
                      <span className="sr-only">Procedencia</span>
                      <select
                        className="hud-select"
                        value={provenanceFilter}
                        onChange={(e) =>
                          setProvenanceFilter(e.target.value as "all" | Provenance)
                        }
                        aria-label="Filtrar resultados por procedencia"
                        data-testid="global-search-provenance"
                      >
                        {PROVENANCE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div aria-live="polite" style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
                    {loadError ? (
                      <p style={{ margin: 0, color: "var(--danger)" }}>{loadError}</p>
                    ) : loading ? (
                      <p style={{ margin: 0 }}>Buscando en índice estático…</p>
                    ) : query.trim() ? (
                      <p style={{ margin: 0 }} data-testid="global-search-count">
                        {totalMatches} coincidencia(s) encontrada(s)
                        {totalMatches > 20 ? " (mostrando las primeras 20)" : ""}.
                      </p>
                    ) : (
                      <p style={{ margin: 0 }}>
                        Escribí un término para buscar en páginas, apuntes y
                        documentos PDF indexados en la plataforma.
                      </p>
                    )}
                  </div>

                  {results.length > 0 ? (
                    <ul className="search-results-list" data-testid="global-search-results">
                      {results.map((item) => (
                        <li key={item.id}>
                          <a
                            href={item.href}
                            className="search-result-link"
                            onClick={() => setIsOpen(false)}
                          >
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", alignItems: "center", marginBottom: "0.25rem" }}>
                              {item.provenance ? (
                                <ProvenanceBadge provenance={item.provenance} />
                              ) : null}
                              {item.kind === "pdf" && item.page ? (
                                <span className="meta-pill">
                                  PDF · Página {item.page}
                                </span>
                              ) : null}
                              {item.fallback ? (
                                <span className="meta-pill">Ficha metadatos</span>
                              ) : null}
                            </div>
                            <strong>{item.title}</strong>
                            {item.excerpt ? (
                              <p className="search-result-excerpt">
                                {renderSafeExcerpt(item.excerpt)}
                              </p>
                            ) : null}
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

export default GlobalSearch;
