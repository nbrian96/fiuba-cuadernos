import rawData from "./gdsiEval1Data.json";
import type {
  CompiledExamUnit,
  McqOptionKey,
} from "@/data/gdsiExamPrep";
import type { GlossaryTerm } from "@/components/gdsi/GlossaryExplorer";
import type { ParcialSimulatorProps } from "@/components/gdsi/ParcialSimulator";
import type { InteractiveChecklistItem } from "@/components/platform/InteractiveChecklist";
import { renderInlineMathTextToHtml } from "@/utils/katexStatic";

function formatInlineMarkdownOutsideMath(text: string): string {
  const rendered = renderInlineMathTextToHtml(text);
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
  return formatInlineMarkdownOutsideMath(text.trim());
}

const COMPILED_EV1_UNITS: CompiledExamUnit[] = rawData.units.map((unit) => ({
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

const EV1_UNIT_MAP = new Map<string, CompiledExamUnit>(
  COMPILED_EV1_UNITS.map((unit) => [unit.id, unit]),
);

const COMPILED_GLOSSARY: GlossaryTerm[] = rawData.glossary.map((entry) => ({
  id: entry.id,
  term: entry.term,
  category: entry.category,
  definition: entry.definition,
}));

const COMPILED_CHECKLIST: InteractiveChecklistItem[] = rawData.checklist.map(
  (item, idx) => ({
    id: item.id,
    sectionId: item.sectionId,
    sectionTitle: item.sectionTitle,
    itemIndex: idx,
    labelHtml: compileRichText(item.label),
  }),
);

const COMPILED_PARCIALES: ParcialSimulatorProps[] = rawData.parciales.map(
  (exam) => ({
    examId: exam.examId,
    title: exam.title,
    dateLabel: exam.dateLabel,
    passThresholdPercent: exam.passThresholdPercent,
    caseTitle: exam.caseTitle,
    caseContext: exam.caseContext,
    examNotes: exam.examNotes,
    questions: exam.questions.map((q) => ({
      id: q.id,
      numberLabel: q.numberLabel,
      title: q.title,
      weightPercent: q.weightPercent,
      kind: q.kind as "mcq" | "open",
      prompt: q.prompt,
      options: q.options?.map((o) => ({
        key: o.key as "a" | "b" | "c" | "d",
        text: o.text,
      })),
      correctKey: q.correctKey as "a" | "b" | "c" | "d" | undefined,
      rubric: q.rubric,
      solutionHtml: compileRichText(q.solution),
      exerciseHref: q.exerciseHref,
    })),
  }),
);

export function getCompiledGdsiEval1Units(): CompiledExamUnit[] {
  return COMPILED_EV1_UNITS;
}

export function getCompiledGdsiEval1Unit(unitId: string): CompiledExamUnit {
  const found = EV1_UNIT_MAP.get(unitId);
  if (!found) {
    throw new Error(`Unidad de Evaluación 1 GDSI no encontrada: '${unitId}'`);
  }
  return found;
}

export function getGdsiEval1Glossary(): GlossaryTerm[] {
  return COMPILED_GLOSSARY;
}

export function getGdsiEval1Checklist(): InteractiveChecklistItem[] {
  return COMPILED_CHECKLIST;
}

export function getGdsiEval1Parciales(): ParcialSimulatorProps[] {
  return COMPILED_PARCIALES;
}

export function getGdsiEval1Parcial(examId: string): ParcialSimulatorProps {
  const found = COMPILED_PARCIALES.find((p) => p.examId === examId);
  if (!found) {
    throw new Error(`Simulacro de parcial GDSI no encontrado: '${examId}'`);
  }
  return found;
}
