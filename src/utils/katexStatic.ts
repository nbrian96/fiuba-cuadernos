import katex from "katex";

const KATEX_OPTIONS = {
  strict: false as const,
  throwOnError: true as const,
  macros: {
    "\\dollar": "\\$",
  },
};

export function escapeHtml(raw: string): string {
  return raw
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * Compila fórmulas $$...$$ y $...$ a HTML KaTeX en build-time, escapando todo texto HTML externo.
 */
export function renderInlineMathTextToHtml(text: string): string {
  const pattern = /(\$\$[\s\S]+?\$\$|\$(?:\\.|[^$\n])+?\$)/g;
  let result = "";
  let lastIndex = 0;

  for (const match of text.matchAll(pattern)) {
    const idx = match.index ?? 0;
    if (idx > lastIndex) {
      result += escapeHtml(text.slice(lastIndex, idx));
    }

    const token = match[0];
    const isDisplay = token.startsWith("$$") && token.endsWith("$$");
    const tex = isDisplay ? token.slice(2, -2).trim() : token.slice(1, -1).trim();
    result += katex.renderToString(tex, {
      ...KATEX_OPTIONS,
      displayMode: isDisplay,
    });
    lastIndex = idx + token.length;
  }

  if (lastIndex < text.length) {
    result += escapeHtml(text.slice(lastIndex));
  }
  return result;
}

export function renderBlockFormulaHtml(tex: string): string {
  return katex.renderToString(tex, {
    ...KATEX_OPTIONS,
    displayMode: true,
  });
}

/**
 * Compila únicamente tokens $$...$$ y $...$ dentro de un fragmento HTML estático confiable,
 * respetando etiquetas <pre>, <code> y el marcado estructural existente.
 */
export function renderMathTokensInsideTrustedHtml(trustedHtml: string): string {
  const segments = trustedHtml.split(/(<pre[\s\S]*?<\/pre>|<code[\s\S]*?<\/code>)/gi);
  const mathPattern =
    /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\$(?:\\.|[^$\n<])+?\$|\\\((?:\\.|[^\n<])+?\\\))/g;

  return segments
    .map((segment, index) => {
      // Los índices impares corresponden a <pre>...</pre> o <code>...</code>
      if (index % 2 === 1) return segment;
      return segment.replace(mathPattern, (token) => {
        const isDisplay =
          (token.startsWith("$$") && token.endsWith("$$")) ||
          (token.startsWith("\\[") && token.endsWith("\\]"));
        const tex = token.slice(2, -2).trim();
        const inlineTex = token.slice(1, -1).trim();
        const finalTex = isDisplay
          ? tex
          : token.startsWith("\\(")
            ? tex
            : inlineTex;
        return katex.renderToString(finalTex, {
          ...KATEX_OPTIONS,
          displayMode: isDisplay,
        });
      });
    })
    .join("");
}
