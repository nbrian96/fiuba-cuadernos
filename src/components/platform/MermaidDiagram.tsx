import { useEffect, useId, useRef, useState } from "react";
import { progressStore } from "@/stores/progressStore";

export interface MermaidDiagramProps {
  code: string;
  caption?: string;
  className?: string;
}

export function MermaidDiagram({
  code,
  caption,
  className = "",
}: MermaidDiagramProps) {
  const reactId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const renderCountRef = useRef(0);
  const [svgHtml, setSvgHtml] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [themeTick, setThemeTick] = useState(0);

  useEffect(() => {
    return progressStore.subscribe(() => {
      setThemeTick((prev) => prev + 1);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function renderDiagram() {
      try {
        const { default: mermaid } = await import("mermaid");
        const isDark =
          document.documentElement.getAttribute("data-theme") === "dark";

        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: isDark ? "dark" : "neutral",
          themeVariables: isDark
            ? {
                fontFamily: "var(--font-sans)",
                darkMode: true,
                background: "#121c2e",
                mainBkg: "#1b2840",
                textColor: "#f1f5f9",
                primaryTextColor: "#f1f5f9",
                secondaryTextColor: "#cbd5e1",
                tertiaryTextColor: "#94a3b8",
                edgeLabelBackground: "#121c2e",
                lineColor: "#94a3b8",
              }
            : {
                fontFamily: "var(--font-sans)",
                darkMode: false,
                background: "#ffffff",
                mainBkg: "#ffffff",
                textColor: "#111827",
                primaryTextColor: "#111827",
                edgeLabelBackground: "#ffffff",
                lineColor: "#475569",
              },
        });

        renderCountRef.current += 1;
        const uniqueId = `mermaid-${reactId}-${renderCountRef.current}`;
        const { svg } = await mermaid.render(uniqueId, code.trim());
        if (!cancelled) {
          setSvgHtml(svg);
          setRenderError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setRenderError(
            err instanceof Error ? err.message : "No se pudo renderizar el diagrama",
          );
        }
      }
    }

    renderDiagram();
    return () => {
      cancelled = true;
    };
  }, [code, reactId, themeTick]);

  return (
    <figure className={`mermaid-figure ${className}`.trim()} data-testid="mermaid-diagram">
      <div className="mermaid-scroll">
        {svgHtml ? (
          <div
            className="mermaid-svg-host"
            dangerouslySetInnerHTML={{ __html: svgHtml }}
          />
        ) : (
          <pre
            className="mermaid-fallback"
            aria-label="Código fuente del diagrama"
            tabIndex={0}
          >
            <code>{code.trim()}</code>
          </pre>
        )}
      </div>
      {renderError ? (
        <figcaption style={{ color: "var(--danger)", fontSize: "0.875rem" }}>
          Aviso al renderizar diagrama: {renderError}
        </figcaption>
      ) : caption ? (
        <figcaption style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

export default MermaidDiagram;
