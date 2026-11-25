import rawData from "./gdsiExamPrepData.json";
import { renderInlineMathTextToHtml } from "@/utils/katexStatic";

export type McqOptionKey = "A" | "B" | "C" | "D";

export interface CompiledRecallItem {
  id: string;
  code: string;
  questionHtml: string;
  answerHtml: string;
}

export interface CompiledMcqOption {
  key: McqOptionKey;
  html: string;
}

export interface CompiledMcqItem {
  id: string;
  number: number;
  promptHtml: string;
  options: CompiledMcqOption[];
  correctKey: McqOptionKey;
  justificationHtml: string;
}

export interface CompiledExamUnit {
  id: string;
  number: number;
  title: string;
  shortTitle: string;
  trapTitle: string;
  trapHtml: string;
  recallItems: CompiledRecallItem[];
  mcqItems: CompiledMcqItem[];
}

function formatInlineMarkdownOutsideMath(text: string): string {
  const rendered = renderInlineMathTextToHtml(text);
  // Aplicar <strong> y <em> únicamente sobre segmentos fuera de <span class="katex">...</span>
  const parts = rendered.split(/(<span class="katex[\s\S]*?<\/math><\/span><\/span>)/g);
  return parts
    .map((part) => {
      if (part.startsWith('<span class="katex')) {
        return part;
      }
      return part
        .replace(/\*\*([^*\n]+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*([^*\n]+?)\*/g, "<em>$1</em>")
        .replace(/\n\n+/g, "<br /><br />")
        .replace(/\n/g, "<br />");
    })
    .join("");
}

function compileRichText(text: string): string {
  // Si contiene líneas que comienzan con "1. " o "- ", formatear de forma limpia manteniendo KaTeX
  return formatInlineMarkdownOutsideMath(text.trim());
}

const COMPILED_UNITS: CompiledExamUnit[] = rawData.units.map((unit) => ({
  id: unit.id,
  number: unit.number,
  title: unit.title,
  shortTitle: unit.shortTitle,
  trapTitle: unit.trapTitle,
  trapHtml: compileRichText(unit.trapBody),
  recallItems: unit.recallItems.map((item) => ({
    id: item.id,
    code: item.code,
    questionHtml: compileRichText(item.question),
    answerHtml: compileRichText(item.answer),
  })),
  mcqItems: unit.mcqItems.map((q) => ({
    id: q.id,
    number: q.number,
    promptHtml: compileRichText(q.prompt),
    options: q.options.map((opt) => ({
      key: opt.key as McqOptionKey,
      html: compileRichText(opt.text),
    })),
    correctKey: q.correctKey as McqOptionKey,
    justificationHtml: compileRichText(q.justification),
  })),
}));

const UNIT_MAP = new Map<string, CompiledExamUnit>(
  COMPILED_UNITS.map((unit) => [unit.id, unit]),
);

export function getCompiledGdsiExamUnits(): CompiledExamUnit[] {
  return COMPILED_UNITS;
}

export function getCompiledGdsiExamUnit(unitId: string): CompiledExamUnit {
  const found = UNIT_MAP.get(unitId);
  if (!found) {
    throw new Error(`Unidad de examen GDSI no encontrada: '${unitId}'`);
  }
  return found;
}
