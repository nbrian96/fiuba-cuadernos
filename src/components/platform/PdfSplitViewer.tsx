import { useEffect, useId, useState } from "react";
import type { EntityType, Provenance } from "@/schemas/academic";
import { getEntityTypeLabel } from "@/utils/provenance";
import {
  buildPdfEmbedUrl,
  buildUpdatedPageSearch,
  clampPdfPage,
  parsePageFromSearch,
} from "@/utils/pdfViewerState";
import ProvenanceBadge from "./ProvenanceBadge";

export interface PdfSplitViewerFile {
  path: string;
  extension: string;
  isPdf: boolean;
  url?: string | null;
}

export interface PdfSplitViewerRelatedExercise {
  id: string;
  label: string;
  href: string;
}

export interface PdfSplitViewerProps {
  courseId: string;
  resourceId: string;
  title: string;
  entityType: EntityType;
  provenance: Provenance;
  sourceFolder: string;
  unitLabels: string[];
  files: PdfSplitViewerFile[];
  pdfMetadata?: {
    pageCount: number;
    textChars: number;
    emptyPages: number;
    textLayerStatus: "extractable" | "sparse" | "metadata_fallback";
  };
  preservedIntact?: boolean;
  assetUrl: string | null;
  relatedExercises?: PdfSplitViewerRelatedExercise[];
  backToMaterialsHref: string;
}

export function PdfSplitViewer({
  resourceId,
  title,
  entityType,
  provenance,
  sourceFolder,
  unitLabels,
  files,
  pdfMetadata,
  preservedIntact = false,
  assetUrl,
  relatedExercises = [],
  backToMaterialsHref,
}: PdfSplitViewerProps) {
  const hasPdf = files.some((f) => f.isPdf) && Boolean(pdfMetadata);
  const maxPages = pdfMetadata?.pageCount ?? 1;
  const pageInputId = useId();

  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [splitView, setSplitView] = useState(true);

  useEffect(() => {
    if (!hasPdf) return;
    const parsed = parsePageFromSearch(window.location.search, maxPages);
    setCurrentPage(parsed);
    setPageInput(String(parsed));
  }, [hasPdf, maxPages]);

  const navigateToPage = (targetPage: number) => {
    const clamped = clampPdfPage(targetPage, maxPages);
    setCurrentPage(clamped);
    setPageInput(String(clamped));
    if (typeof window !== "undefined") {
      const nextSearch = buildUpdatedPageSearch(
        window.location.search,
        clamped,
        maxPages,
      );
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${nextSearch}${window.location.hash}`,
      );
    }
  };

  const commitPageInput = () => {
    if (!/^\d+$/.test(pageInput.trim())) {
      setPageInput(String(currentPage));
      return;
    }
    navigateToPage(Number.parseInt(pageInput.trim(), 10));
  };

  const primaryFile = files.find((f) => f.isPdf) ?? files[0];

  return (
    <section
      className="pdf-viewer-shell"
      aria-label={`Visor de material: ${title}`}
      data-resource-id={resourceId}
    >
      <div className="pdf-toolbar">
        <div className="pdf-page-controls">
          <a className="btn btn-ghost" href={backToMaterialsHref}>
            Volver a materiales
          </a>

          {hasPdf ? (
            <>
              <button
                type="button"
                className="btn"
                disabled={currentPage <= 1}
                onClick={() => navigateToPage(currentPage - 1)}
                data-testid="pdf-prev-page"
              >
                Anterior
              </button>
              <label htmlFor={pageInputId} className="hud-label">
                Página
              </label>
              <input
                id={pageInputId}
                type="number"
                min={1}
                max={maxPages}
                className="pdf-page-input"
                value={pageInput}
                onChange={(event) => setPageInput(event.target.value)}
                onBlur={commitPageInput}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    commitPageInput();
                  }
                }}
                data-testid="pdf-page-input"
              />
              <span style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                de {maxPages}
              </span>
              <button
                type="button"
                className="btn"
                disabled={currentPage >= maxPages}
                onClick={() => navigateToPage(currentPage + 1)}
                data-testid="pdf-next-page"
              >
                Siguiente
              </button>
            </>
          ) : null}
        </div>

        <div className="pdf-page-controls">
          <button
            type="button"
            className="btn btn-ghost"
            aria-pressed={splitView}
            onClick={() => setSplitView((prev) => !prev)}
            data-testid="pdf-toggle-split"
          >
            {splitView ? "Solo documento" : "Vista dividida"}
          </button>

          {assetUrl ? (
            <a
              className="btn btn-primary"
              href={
                hasPdf
                  ? buildPdfEmbedUrl(assetUrl, currentPage, maxPages)
                  : assetUrl
              }
              target="_blank"
              rel="noopener noreferrer"
            >
              Abrir archivo
            </a>
          ) : null}
        </div>
      </div>

      <div className={`pdf-split-grid ${splitView ? "" : "is-single"}`.trim()}>
        {splitView ? (
          <aside
            className="surface-panel"
            aria-label="Metadatos y contexto del recurso"
            data-testid="pdf-metadata-panel"
          >
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem" }}>
              <ProvenanceBadge provenance={provenance} showFullLabel />
              <span className="meta-pill">{getEntityTypeLabel(entityType)}</span>
              {preservedIntact ? (
                <span className="meta-pill meta-pill--preserved">
                  Preservado íntegro
                </span>
              ) : null}
            </div>

            <dl style={{ margin: 0, display: "grid", gap: "0.6rem" }}>
              <div>
                <dt style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--text-muted)" }}>
                  Carpeta de origen
                </dt>
                <dd style={{ margin: 0 }}>
                  <code>{sourceFolder}</code>
                </dd>
              </div>
              <div>
                <dt style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--text-muted)" }}>
                  Unidades asociadas
                </dt>
                <dd style={{ margin: 0 }}>{unitLabels.join(", ")}</dd>
              </div>
              {pdfMetadata ? (
                <div>
                  <dt style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--text-muted)" }}>
                    Auditoría de texto PDF
                  </dt>
                  <dd style={{ margin: 0 }}>
                    {pdfMetadata.pageCount} páginas · {pdfMetadata.textChars.toLocaleString("es-AR")} caracteres · estado{" "}
                    <code>{pdfMetadata.textLayerStatus}</code>
                  </dd>
                </div>
              ) : null}
            </dl>

            <h2 style={{ marginTop: "1rem", marginBottom: "0.5rem", fontSize: "1.05rem" }}>
              Archivos del recurso ({files.length})
            </h2>
            <ul className="plain-list">
              {files.map((file) => (
                <li key={file.path} style={{ fontSize: "0.875rem", wordBreak: "break-word" }}>
                  {file.url ? (
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <code>{file.path}</code>
                    </a>
                  ) : (
                    <code>{file.path}</code>
                  )}
                </li>
              ))}
            </ul>

            {relatedExercises.length > 0 ? (
              <>
                <h2 style={{ marginTop: "1rem", marginBottom: "0.5rem", fontSize: "1.05rem" }}>
                  Ejercicios vinculados
                </h2>
                <ul className="plain-list">
                  {relatedExercises.map((rel) => (
                    <li key={rel.id}>
                      <a href={rel.href}>{rel.label}</a>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </aside>
        ) : null}

        <div className="surface-panel" style={{ padding: "0.75rem" }}>
          {hasPdf && assetUrl ? (
            <iframe
              key={`${assetUrl}-${currentPage}`}
              src={buildPdfEmbedUrl(assetUrl, currentPage, maxPages)}
              title={`${title} — Página ${currentPage}`}
              className="pdf-frame"
            />
          ) : !hasPdf && assetUrl ? (
            <div style={{ padding: "1.25rem" }} data-testid="non-pdf-asset-ready">
              <h2 style={{ marginTop: 0 }}>{title}</h2>
              <p style={{ color: "var(--text-muted)" }}>
                Recurso no-PDF disponible en{" "}
                <code>{primaryFile?.path ?? resourceId}</code>.
              </p>
              <a
                className="btn btn-primary"
                href={assetUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Abrir o descargar archivo
              </a>
            </div>
          ) : (
            <div style={{ padding: "1.25rem" }} data-testid="pdf-asset-pending">
              <h2 style={{ marginTop: 0 }}>
                {hasPdf
                  ? `Página ${currentPage} de ${maxPages} — ${title}`
                  : title}
              </h2>
              <p style={{ color: "var(--text-muted)" }}>
                Archivo fuente registrado en el repositorio:{" "}
                <code>{primaryFile?.path ?? resourceId}</code>.
              </p>
              <p style={{ marginBottom: 0 }}>
                {hasPdf ? (
                  <>
                    Vista previa PDF pendiente de publicación en{" "}
                    <code>dist/materials/</code>; la navegación por página (
                    <code>?page={currentPage}</code>) y los metadatos ya se
                    encuentran operativos sin generar enlaces rotos.
                  </>
                ) : (
                  <>
                    Recurso fuente no-PDF registrado en el inventario; la
                    publicación estática desde <code>materias/</code> hacia{" "}
                    <code>dist/materials/</code> habilitará su descarga directa.
                  </>
                )}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default PdfSplitViewer;
