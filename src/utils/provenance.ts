import type { EntityType, Provenance } from "@/schemas/academic";

export interface ProvenanceMetadata {
  value: Provenance;
  label: string;
  shortLabel: string;
  description: string;
  badgeClass: string;
}

export const PROVENANCE_META: Record<Provenance, ProvenanceMetadata> = {
  official_source: {
    value: "official_source",
    label: "Fuente oficial de cátedra",
    shortLabel: "Fuente oficial",
    description: "Material emitido oficialmente por la cátedra del curso.",
    badgeClass: "provenance-badge--official",
  },
  reconstructed_exam_statement: {
    value: "reconstructed_exam_statement",
    label: "Enunciado de examen reconstruido",
    shortLabel: "Parcial reconstruido",
    description: "Enunciado de examen real reconstruido mediante script reproducible.",
    badgeClass: "provenance-badge--reconstructed",
  },
  elaborated_submission: {
    value: "elaborated_submission",
    label: "Entrega resuelta autorizada",
    shortLabel: "Entrega autorizada",
    description: "Entrega de trabajo práctico autorizada y preservada íntegramente.",
    badgeClass: "provenance-badge--submission",
  },
  exam_prep_and_practice: {
    value: "exam_prep_and_practice",
    label: "Práctica de código y preparación",
    shortLabel: "Práctica de código",
    description: "Plantillas, pruebas y guías de ejercitación en código.",
    badgeClass: "provenance-badge--practice",
  },
  elaborated_notes: {
    value: "elaborated_notes",
    label: "Apuntes teóricos elaborados",
    shortLabel: "Apunte elaborado",
    description: "Apuntes conceptuales desarrollados para el estudio de la materia.",
    badgeClass: "provenance-badge--note",
  },
  elaborated_summary: {
    value: "elaborated_summary",
    label: "Resumen estratégico de estudio",
    shortLabel: "Resumen estratégico",
    description: "Matrices de frecuencia, checklists y recetas rápidas de examen.",
    badgeClass: "provenance-badge--summary",
  },
  elaborated_solution: {
    value: "elaborated_solution",
    label: "Solución elaborada de catálogo",
    shortLabel: "Solución elaborada",
    description: "Resolución desarrollada paso a paso para ejercicios del catálogo oficial.",
    badgeClass: "provenance-badge--solution",
  },
  advanced_theory_example: {
    value: "advanced_theory_example",
    label: "Ejemplo resuelto de teoría avanzada",
    shortLabel: "Teoría avanzada",
    description: "Ejercicio resuelto diferenciado fuera de la numeración principal del catálogo.",
    badgeClass: "provenance-badge--advanced",
  },
  interactive_widget: {
    value: "interactive_widget",
    label: "Simulador o entrenador interactivo",
    shortLabel: "Widget interactivo",
    description: "Herramienta interactiva de entrenamiento o simulación ejecutada en navegador.",
    badgeClass: "provenance-badge--interactive",
  },
};

export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  OfficialSlideDeck: "Diapositiva oficial",
  OfficialCodePackage: "Paquete de código oficial",
  OfficialGuide: "Guía de ejercicios oficial",
  OfficialExamPDF: "Parcial oficial (PDF)",
  ReconstructedExamPDF: "Parcial reconstruido (PDF)",
  OfficialTPAssessment: "Consigna oficial de TP",
  ElaboratedTPSubmission: "Entrega de TP autorizada",
  CodePractice: "Práctica en código",
  ElaboratedNote: "Apunte teórico",
  ElaboratedSummary: "Resumen estratégico",
  CatalogExercise: "Ejercicio de catálogo",
  AdvancedTheoryExercise: "Ejercicio de teoría avanzada",
  InteractiveSimulator: "Simulador interactivo",
};

export function getProvenanceMeta(provenance: Provenance): ProvenanceMetadata {
  return PROVENANCE_META[provenance];
}

export function getEntityTypeLabel(entityType: EntityType): string {
  return ENTITY_TYPE_LABELS[entityType];
}
