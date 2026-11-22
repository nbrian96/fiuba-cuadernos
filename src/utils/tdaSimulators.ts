export interface SetCoverRow {
  name: string;
  weight: string;
  intersection: string;
  ratio: string;
  chosen?: boolean;
  struck?: boolean;
}

export interface SetCoverStep {
  step: number;
  title: string;
  description: string;
  chosenSubsets: string[];
  remainingElements: string[];
  rows?: SetCoverRow[];
  comment?: string;
  isFinal?: boolean;
}

export const SET_COVER_STEPS: readonly SetCoverStep[] = [
  {
    step: 0,
    title: "Paso 0: Estado Inicial",
    description:
      "Universo U = {a, b, c, d, e, f, g, h}. Aún no se seleccionó ningún subconjunto. El conjunto R de elementos por cubrir es todo U (8 elementos).",
    chosenSubsets: [],
    remainingElements: ["a", "b", "c", "d", "e", "f", "g", "h"],
    rows: [
      { name: "{c, d, g, h}", weight: "1.0", intersection: "{c, d, g, h}", ratio: "0.250", chosen: true },
      { name: "{a, b, c, d}", weight: "1.1", intersection: "{a, b, c, d}", ratio: "0.275" },
      { name: "{e, f, g, h}", weight: "1.1", intersection: "{e, f, g, h}", ratio: "0.275" },
      { name: "{b, f}", weight: "1.0", intersection: "{b, f}", ratio: "0.500" },
      { name: "{a}", weight: "1.0", intersection: "{a}", ratio: "1.000" },
      { name: "{e}", weight: "1.0", intersection: "{e}", ratio: "1.000" },
    ],
    comment:
      "El menor ratio es 0.25 (1 / 4) perteneciente a {c, d, g, h}. Se elige para el siguiente paso.",
  },
  {
    step: 1,
    title: "Paso 1: Tras incorporar {c, d, g, h}",
    description:
      "Se agregó {c, d, g, h} a la solución C. Quedan por cubrir R = {a, b, e, f}. Reevaluamos los conjuntos restantes contra R.",
    chosenSubsets: ["{c, d, g, h}"],
    remainingElements: ["a", "b", "e", "f"],
    rows: [
      { name: "{c, d, g, h}", weight: "1.0", intersection: "Ya en C", ratio: "-", struck: true },
      { name: "{a, b, c, d}", weight: "1.1", intersection: "{a, b}", ratio: "0.550" },
      { name: "{e, f, g, h}", weight: "1.1", intersection: "{e, f}", ratio: "0.550" },
      { name: "{b, f}", weight: "1.0", intersection: "{b, f}", ratio: "0.500", chosen: true },
      { name: "{a}", weight: "1.0", intersection: "{a}", ratio: "1.000" },
      { name: "{e}", weight: "1.0", intersection: "{e}", ratio: "1.000" },
    ],
    comment:
      "El menor ratio sobre elementos nuevos es 0.500 (1 / 2) perteneciente a {b, f}. Se selecciona.",
  },
  {
    step: 2,
    title: "Paso 2: Tras incorporar {b, f}",
    description:
      "Solución parcial C = {{c,d,g,h}, {b,f}}. Elementos restantes R = {a, e}. Reevaluamos.",
    chosenSubsets: ["{c, d, g, h}", "{b, f}"],
    remainingElements: ["a", "e"],
    rows: [
      { name: "{c, d, g, h}", weight: "1.0", intersection: "Ya en C", ratio: "-", struck: true },
      { name: "{a, b, c, d}", weight: "1.1", intersection: "{a}", ratio: "1.100" },
      { name: "{e, f, g, h}", weight: "1.1", intersection: "{e}", ratio: "1.100" },
      { name: "{b, f}", weight: "1.0", intersection: "Ya en C", ratio: "-", struck: true },
      { name: "{a}", weight: "1.0", intersection: "{a}", ratio: "1.000", chosen: true },
      { name: "{e}", weight: "1.0", intersection: "{e}", ratio: "1.000" },
    ],
    comment:
      "El ratio de {a} es 1.0 (1 / 1), mejor que 1.100 (1.1 / 1). Se selecciona {a}.",
  },
  {
    step: 3,
    title: "Paso 3: Tras incorporar {a}",
    description:
      "Solución parcial C = {{c,d,g,h}, {b,f}, {a}}. Solo resta cubrir R = {e}.",
    chosenSubsets: ["{c, d, g, h}", "{b, f}", "{a}"],
    remainingElements: ["e"],
    rows: [
      { name: "{c, d, g, h}", weight: "1.0", intersection: "Ya en C", ratio: "-", struck: true },
      { name: "{a, b, c, d}", weight: "1.1", intersection: "∅", ratio: "-", struck: true },
      { name: "{e, f, g, h}", weight: "1.1", intersection: "{e}", ratio: "1.100" },
      { name: "{b, f}", weight: "1.0", intersection: "Ya en C", ratio: "-", struck: true },
      { name: "{a}", weight: "1.0", intersection: "Ya en C", ratio: "-", struck: true },
      { name: "{e}", weight: "1.0", intersection: "{e}", ratio: "1.000", chosen: true },
    ],
    comment: "Se elige {e} con ratio 1.000 para completar el universo.",
  },
  {
    step: 4,
    title: "Paso 4: Solución Final y Comparativa",
    description:
      "R = ∅. Todos los elementos fueron cubiertos. El algoritmo termina exitosamente.",
    chosenSubsets: ["{c, d, g, h}", "{b, f}", "{a}", "{e}"],
    remainingElements: [],
    isFinal: true,
  },
];

export type PricingNodeKey = "a" | "b" | "c" | "d";

export interface PricingEdgeState {
  name: string;
  price: number;
  status: "impaga" | "cobrada" | "cubierta";
}

export interface PricingNodeState {
  paid: number;
  max: number;
  isPaid: boolean;
}

export interface PricingStep {
  step: number;
  title: string;
  description: string;
  edges: PricingEdgeState[];
  nodes: Record<PricingNodeKey, PricingNodeState>;
  explanation: string;
}

export const PRICING_METHOD_STEPS: readonly PricingStep[] = [
  {
    step: 0,
    title: "Paso 0: Precios Iniciales",
    description:
      "Todas las aristas tienen precio p_e = 0. Ningún vértice está pago. Pesos: a=4, b=3, c=5, d=3.",
    edges: [
      { name: "(a,b)", price: 0, status: "impaga" },
      { name: "(a,d)", price: 0, status: "impaga" },
      { name: "(c,d)", price: 0, status: "impaga" },
      { name: "(a,c)", price: 0, status: "impaga" },
      { name: "(b,c)", price: 0, status: "impaga" },
    ],
    nodes: {
      a: { paid: 0, max: 4, isPaid: false },
      b: { paid: 0, max: 3, isPaid: false },
      c: { paid: 0, max: 5, isPaid: false },
      d: { paid: 0, max: 3, isPaid: false },
    },
    explanation:
      "Buscamos una arista con ambos extremos impagos. Elegimos la arista (a,b).",
  },
  {
    step: 1,
    title: "Paso 1: Cobrar Arista (a,b)",
    description:
      "El vértice b tiene peso 3 y a tiene peso 4. El máximo precio acorde en (a,b) sin que ningún extremo pague de más es 3.",
    edges: [
      { name: "(a,b)", price: 3, status: "cobrada" },
      { name: "(a,d)", price: 0, status: "impaga" },
      { name: "(c,d)", price: 0, status: "impaga" },
      { name: "(a,c)", price: 0, status: "impaga" },
      { name: "(b,c)", price: 0, status: "impaga" },
    ],
    nodes: {
      a: { paid: 3, max: 4, isPaid: false },
      b: { paid: 3, max: 3, isPaid: true },
      c: { paid: 0, max: 5, isPaid: false },
      d: { paid: 0, max: 3, isPaid: false },
    },
    explanation:
      "Vértice b queda totalmente pago (3/3) y entra a S. Al vértice a le resta cobrar 1 (acumuló 3/4).",
  },
  {
    step: 2,
    title: "Paso 2: Cobrar Arista (a,d)",
    description:
      "La arista (a,d) tiene ambos extremos sin saturar. A 'a' le falta 1, a 'd' le falta 3. El mayor precio acorde es 1.",
    edges: [
      { name: "(a,b)", price: 3, status: "cobrada" },
      { name: "(a,d)", price: 1, status: "cobrada" },
      { name: "(c,d)", price: 0, status: "impaga" },
      { name: "(a,c)", price: 0, status: "impaga" },
      { name: "(b,c)", price: 0, status: "impaga" },
    ],
    nodes: {
      a: { paid: 4, max: 4, isPaid: true },
      b: { paid: 3, max: 3, isPaid: true },
      c: { paid: 0, max: 5, isPaid: false },
      d: { paid: 1, max: 3, isPaid: false },
    },
    explanation:
      "Vértice a queda totalmente pago (3 + 1 = 4/4) y entra a S. Al vértice d le resta cobrar 2 (acumuló 1/3).",
  },
  {
    step: 3,
    title: "Paso 3: Cobrar Arista (c,d) y Cierre",
    description:
      "La arista (c,d) tiene a 'c' con 0/5 y a 'd' con 1/3. A 'd' le falta 2. Fijamos p(c,d) = 2.",
    edges: [
      { name: "(a,b)", price: 3, status: "cobrada" },
      { name: "(a,d)", price: 1, status: "cobrada" },
      { name: "(c,d)", price: 2, status: "cobrada" },
      { name: "(a,c)", price: 0, status: "cubierta" },
      { name: "(b,c)", price: 0, status: "cubierta" },
    ],
    nodes: {
      a: { paid: 4, max: 4, isPaid: true },
      b: { paid: 3, max: 3, isPaid: true },
      c: { paid: 2, max: 5, isPaid: false },
      d: { paid: 3, max: 3, isPaid: true },
    },
    explanation:
      "Vértice d queda totalmente pago (1 + 2 = 3/3) y entra a S. Ya todas las aristas tienen al menos un extremo pago.",
  },
];

export interface KargerEdge {
  id: string;
  u: string;
  v: string;
}

export interface KargerState {
  nodes: string[];
  edges: KargerEdge[];
  logs: string[];
}

export function createInitialKargerState(): KargerState {
  return {
    nodes: ["a", "b", "c", "d"],
    edges: [
      { id: "e1", u: "a", v: "b" },
      { id: "e2", u: "b", v: "c" },
      { id: "e3", u: "c", v: "d" },
      { id: "e4", u: "a", v: "d" },
      { id: "e5", u: "a", v: "c" },
    ],
    logs: ["Grafo inicial con 4 nodos {a, b, c, d} y 5 aristas listo para contraer."],
  };
}

export function contractKargerStep(
  state: KargerState,
  rng: () => number = Math.random,
): KargerState {
  if (state.nodes.length <= 2 || state.edges.length === 0) {
    return state;
  }

  const rawIdx = Math.floor(rng() * state.edges.length);
  const idx = Math.max(0, Math.min(state.edges.length - 1, rawIdx));
  const chosen = state.edges[idx];
  const merged = `{${chosen.u},${chosen.v}}`;

  const nextNodes = [
    ...state.nodes.filter((n) => n !== chosen.u && n !== chosen.v),
    merged,
  ];

  const nextEdges = state.edges
    .map((e) => ({
      id: e.id,
      u: e.u === chosen.u || e.u === chosen.v ? merged : e.u,
      v: e.v === chosen.u || e.v === chosen.v ? merged : e.v,
    }))
    .filter((e) => e.u !== e.v);

  const nextLogs = [
    ...state.logs,
    `Se eligió la arista (${chosen.u}, ${chosen.v}). Fusionando en ${merged}.`,
  ];

  if (nextNodes.length === 2) {
    nextLogs.push(`Solo quedan 2 supernodos: ${nextNodes.join(" y ")}.`);
    nextLogs.push(`Corte resultante: ${nextEdges.length} aristas cruzadas.`);
  }

  return {
    nodes: nextNodes,
    edges: nextEdges,
    logs: nextLogs,
  };
}

export interface Sat3Literal {
  variable: 1 | 2 | 3 | 4 | 5;
  sign: 1 | -1;
}

export type Sat3Clause = readonly [Sat3Literal, Sat3Literal, Sat3Literal];

export const SAT3_CLAUSES: readonly Sat3Clause[] = [
  [{ variable: 1, sign: 1 }, { variable: 2, sign: 1 }, { variable: 3, sign: 1 }],
  [{ variable: 1, sign: -1 }, { variable: 2, sign: 1 }, { variable: 4, sign: 1 }],
  [{ variable: 2, sign: 1 }, { variable: 3, sign: -1 }, { variable: 5, sign: 1 }],
  [{ variable: 2, sign: -1 }, { variable: 4, sign: -1 }, { variable: 5, sign: 1 }],
  [{ variable: 1, sign: 1 }, { variable: 3, sign: -1 }, { variable: 5, sign: -1 }],
  [{ variable: 1, sign: -1 }, { variable: 3, sign: 1 }, { variable: 4, sign: 1 }],
  [{ variable: 3, sign: 1 }, { variable: 4, sign: -1 }, { variable: 5, sign: -1 }],
  [{ variable: 2, sign: -1 }, { variable: 4, sign: 1 }, { variable: 5, sign: 1 }],
];

export type Sat3Assignment = Record<1 | 2 | 3 | 4 | 5, boolean>;

export interface Sat3ClauseEvaluation {
  clauseIndex: number;
  literals: Array<{ label: string; satisfied: boolean }>;
  clauseSatisfied: boolean;
}

export interface Sat3SingleResult {
  assignment: Sat3Assignment;
  evaluations: Sat3ClauseEvaluation[];
  satisfiedCount: number;
  totalClauses: number;
  percent: number;
}

export interface Sat3MultiResult {
  trials: number;
  averageSatisfied: number;
  averagePercent: number;
  distribution: {
    exact8: number;
    exact7: number;
    exact6: number;
    atMost5: number;
  };
}

export function evaluateMax3Sat(assignment: Sat3Assignment): Sat3SingleResult {
  let satisfiedCount = 0;
  const evaluations = SAT3_CLAUSES.map((clause, clauseIndex) => {
    let clauseSatisfied = false;
    const literals = clause.map((lit) => {
      const val = assignment[lit.variable];
      const satisfied = lit.sign === 1 ? val : !val;
      if (satisfied) clauseSatisfied = true;
      const label = `${lit.sign === -1 ? "¬x" : "x"}${lit.variable}`;
      return { label, satisfied };
    });
    if (clauseSatisfied) satisfiedCount++;
    return { clauseIndex, literals, clauseSatisfied };
  });

  const totalClauses = SAT3_CLAUSES.length;
  return {
    assignment,
    evaluations,
    satisfiedCount,
    totalClauses,
    percent: Math.round((satisfiedCount / totalClauses) * 1000) / 10,
  };
}

export function runMax3SatSingleTrial(
  rng: () => number = Math.random,
): Sat3SingleResult {
  const assignment: Sat3Assignment = {
    1: rng() < 0.5,
    2: rng() < 0.5,
    3: rng() < 0.5,
    4: rng() < 0.5,
    5: rng() < 0.5,
  };
  return evaluateMax3Sat(assignment);
}

export function runMax3SatMultiTrial(
  trials = 100,
  rng: () => number = Math.random,
): Sat3MultiResult {
  let totalSat = 0;
  const distribution = {
    exact8: 0,
    exact7: 0,
    exact6: 0,
    atMost5: 0,
  };

  for (let t = 0; t < trials; t++) {
    const res = runMax3SatSingleTrial(rng);
    totalSat += res.satisfiedCount;
    if (res.satisfiedCount === 8) distribution.exact8++;
    else if (res.satisfiedCount === 7) distribution.exact7++;
    else if (res.satisfiedCount === 6) distribution.exact6++;
    else distribution.atMost5++;
  }

  const averageSatisfied =
    trials > 0 ? Math.round((totalSat / trials) * 100) / 100 : 0;
  const averagePercent =
    trials > 0
      ? Math.round((averageSatisfied / SAT3_CLAUSES.length) * 1000) / 10
      : 0;

  return {
    trials,
    averageSatisfied,
    averagePercent,
    distribution,
  };
}

export interface HamletSimulationOptions {
  totalDistinctWords?: number;
  maxCapacity?: number;
}

export interface HamletSimulationResult {
  totalDistinctWords: number;
  maxCapacity: number;
  roundK: number;
  finalMemoryCount: number;
  factor: number;
  estimatedWords: number;
  errorPercent: number;
  accuracyPercent: number;
  logs: string[];
}

export function simulateHamletStreaming(
  options: HamletSimulationOptions = {},
  rng: () => number = Math.random,
): HamletSimulationResult {
  const totalDistinctWords = options.totalDistinctWords ?? 3967;
  const maxCapacity = options.maxCapacity ?? 100;

  let roundK = 0;
  let memory = new Set<number>();
  const logs: string[] = [
    `Iniciando lectura secuencial (${totalDistinctWords} palabras únicas, capacidad m=${maxCapacity})...`,
  ];

  for (let wordId = 1; wordId <= totalDistinctWords; wordId++) {
    if (memory.has(wordId)) continue;

    if (rng() < Math.pow(0.5, roundK)) {
      memory.add(wordId);
    }

    if (memory.size >= maxCapacity) {
      roundK += 1;
      const survived = new Set<number>();
      for (const w of memory) {
        if (rng() < 0.5) {
          survived.add(w);
        }
      }
      const discarded = memory.size - survived.size;
      memory = survived;
      logs.push(
        `Memoria llena (${maxCapacity}) -> Ronda K = ${roundK}: sobreviven ${survived.size}, descartadas ${discarded}.`,
      );
    }
  }

  const finalMemoryCount = memory.size;
  const factor = Math.pow(2, roundK);
  const estimatedWords = finalMemoryCount * factor;
  const rawErr =
    totalDistinctWords > 0
      ? (Math.abs(estimatedWords - totalDistinctWords) / totalDistinctWords) *
        100
      : 0;
  const errorPercent = Math.round(rawErr * 100) / 100;
  const accuracyPercent = Math.round((100 - errorPercent) * 100) / 100;

  logs.push(
    `Finalizado: |S| = ${finalMemoryCount}, 2^${roundK} = ${factor}, Estimación = ${estimatedWords} (Error ${errorPercent}%).`,
  );

  return {
    totalDistinctWords,
    maxCapacity,
    roundK,
    finalMemoryCount,
    factor,
    estimatedWords,
    errorPercent,
    accuracyPercent,
    logs,
  };
}
