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
