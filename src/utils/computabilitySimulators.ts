export type AutomatonPresetId =
  | "interseccion-afd"
  | "afnd-epsilon"
  | "termina-000";

export interface AutomatonTransition {
  from: string;
  symbol: string; // símbolo de entrada o "ε"
  to: string;
}

export interface AutomatonStateMeta {
  id: string;
  label: string;
}

export interface AutomatonPreset {
  id: AutomatonPresetId;
  name: string;
  kind: "AFD" | "AFND";
  description: string;
  alphabet: string[];
  states: AutomatonStateMeta[];
  initialState: string;
  acceptStates: string[];
  transitions: AutomatonTransition[];
  examples: string[];
}

export interface AutomatonStepSnapshot {
  step: number;
  consumedIndex: number;
  symbolRead: string | null;
  activeStates: string[];
  epsilonAdded: string[];
  firedTransitions: string[];
  description: string;
  isFinal: boolean;
}

export interface AutomatonRunResult {
  preset: AutomatonPreset;
  input: string;
  error: string | null;
  steps: AutomatonStepSnapshot[];
  accepted: boolean;
}

export const AUTOMATON_PRESETS: Record<AutomatonPresetId, AutomatonPreset> = {
  "interseccion-afd": {
    id: "interseccion-afd",
    name: "AFD — Intersección (empieza con '1' y a lo sumo un '0')",
    kind: "AFD",
    description:
      "Ejercicio de Clase de Repaso (Computabilidad, slide 38): L = {w ∈ {0,1}* | w comienza con '1' y tiene cuando mucho un '0'}.",
    alphabet: ["0", "1"],
    states: [
      { id: "q0", label: "q0 (Inicio)" },
      { id: "q1", label: "q1 (1…, 0 ceros)" },
      { id: "q2", label: "q2 (1…, 1 cero)" },
      { id: "q_err", label: "q_err (Trampa)" },
    ],
    initialState: "q0",
    acceptStates: ["q1", "q2"],
    transitions: [
      { from: "q0", symbol: "1", to: "q1" },
      { from: "q0", symbol: "0", to: "q_err" },
      { from: "q1", symbol: "1", to: "q1" },
      { from: "q1", symbol: "0", to: "q2" },
      { from: "q2", symbol: "1", to: "q2" },
      { from: "q2", symbol: "0", to: "q_err" },
      { from: "q_err", symbol: "0", to: "q_err" },
      { from: "q_err", symbol: "1", to: "q_err" },
    ],
    examples: ["10111", "11", "110", "01", "100"],
  },
  "afnd-epsilon": {
    id: "afnd-epsilon",
    name: "AFND con ε — Ejemplo de Clase 25 (slides 13–15)",
    kind: "AFND",
    description:
      "Autómata no determinístico con transición espontánea Q1 —ε→ Q2 y múltiples ramas paralelas.",
    alphabet: ["0", "1"],
    states: [
      { id: "Q0", label: "Q0 (Inicio)" },
      { id: "Q1", label: "Q1" },
      { id: "Q2", label: "Q2" },
      { id: "Q3", label: "Q3 (Aceptación)" },
    ],
    initialState: "Q0",
    acceptStates: ["Q3"],
    transitions: [
      { from: "Q0", symbol: "0", to: "Q0" },
      { from: "Q0", symbol: "1", to: "Q0" },
      { from: "Q0", symbol: "1", to: "Q1" },
      { from: "Q1", symbol: "0", to: "Q2" },
      { from: "Q1", symbol: "ε", to: "Q2" },
      { from: "Q2", symbol: "1", to: "Q3" },
      { from: "Q3", symbol: "0", to: "Q3" },
      { from: "Q3", symbol: "1", to: "Q3" },
    ],
    examples: ["010110", "11", "101", "000"],
  },
  "termina-000": {
    id: "termina-000",
    name: "AFD — Binarios terminados en al menos tres '0's (Clase 25)",
    kind: "AFD",
    description:
      "Reconoce palabras binarias que terminan con el sufijo '000' (diapositiva 24 de Autómatas).",
    alphabet: ["0", "1"],
    states: [
      { id: "Q0", label: "Q0 (0 ceros)" },
      { id: "Q1", label: "Q1 (1 cero)" },
      { id: "Q2", label: "Q2 (2 ceros)" },
      { id: "Q3", label: "Q3 (≥3 ceros)" },
    ],
    initialState: "Q0",
    acceptStates: ["Q3"],
    transitions: [
      { from: "Q0", symbol: "0", to: "Q1" },
      { from: "Q0", symbol: "1", to: "Q0" },
      { from: "Q1", symbol: "0", to: "Q2" },
      { from: "Q1", symbol: "1", to: "Q0" },
      { from: "Q2", symbol: "0", to: "Q3" },
      { from: "Q2", symbol: "1", to: "Q0" },
      { from: "Q3", symbol: "0", to: "Q3" },
      { from: "Q3", symbol: "1", to: "Q0" },
    ],
    examples: ["1000", "000", "100100"],
  },
};

export function computeEpsilonClosure(
  seeds: string[],
  preset: AutomatonPreset,
): { allStates: string[]; added: string[] } {
  const orderIndex = new Map(preset.states.map((s, idx) => [s.id, idx]));
  const visited = new Set<string>(seeds);
  const added = new Set<string>();
  const queue = [...seeds];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const t of preset.transitions) {
      if (t.from === current && t.symbol === "ε" && !visited.has(t.to)) {
        visited.add(t.to);
        added.add(t.to);
        queue.push(t.to);
      }
    }
  }

  const sortStates = (arr: string[]) =>
    arr.sort((a, b) => (orderIndex.get(a) ?? 999) - (orderIndex.get(b) ?? 999));

  return {
    allStates: sortStates([...visited]),
    added: sortStates([...added]),
  };
}

export function simulateAutomatonTrace(
  presetId: AutomatonPresetId,
  rawInput: string,
): AutomatonRunResult {
  const preset = AUTOMATON_PRESETS[presetId];
  const input = rawInput.trim();
  const allowed = new Set(preset.alphabet);

  for (const ch of input) {
    if (!allowed.has(ch)) {
      return {
        preset,
        input,
        error: `El símbolo '${ch}' no pertenece al alfabeto {${preset.alphabet.join(", ")}}.`,
        steps: [],
        accepted: false,
      };
    }
  }

  const initialClosure = computeEpsilonClosure([preset.initialState], preset);
  const steps: AutomatonStepSnapshot[] = [
    {
      step: 0,
      consumedIndex: 0,
      symbolRead: null,
      activeStates: initialClosure.allStates,
      epsilonAdded: initialClosure.added,
      firedTransitions: [],
      description:
        initialClosure.added.length > 0
          ? `Inicio en ${preset.initialState}; por ε-clausura se activan {${initialClosure.allStates.join(", ")}}.`
          : `Inicio en el estado ${preset.initialState}.`,
      isFinal: input.length === 0,
    },
  ];

  let currentActive = initialClosure.allStates;

  for (let i = 0; i < input.length; i++) {
    const symbol = input[i];
    const directTargets = new Set<string>();
    const fired: string[] = [];

    for (const state of currentActive) {
      for (const t of preset.transitions) {
        if (t.from === state && t.symbol === symbol) {
          directTargets.add(t.to);
          fired.push(`${t.from} —${symbol}→ ${t.to}`);
        }
      }
    }

    const closure = computeEpsilonClosure([...directTargets], preset);
    for (const epsTarget of closure.added) {
      fired.push(`ε → ${epsTarget}`);
    }

    currentActive = closure.allStates;
    const isFinal = i === input.length - 1;

    const description =
      currentActive.length === 0
        ? `Al leer '${symbol}', todas las ramas activas murieron (sin transición disponible).`
        : closure.added.length > 0
          ? `Lee '${symbol}': transiciones directas alcanzan {${[...directTargets].join(", ")}}; con ε-clausura quedan activos {${currentActive.join(", ")}}.`
          : `Lee '${symbol}': estados activos → {${currentActive.join(", ")}}.`;

    steps.push({
      step: i + 1,
      consumedIndex: i + 1,
      symbolRead: symbol,
      activeStates: currentActive,
      epsilonAdded: closure.added,
      firedTransitions: fired,
      description,
      isFinal,
    });
  }

  const acceptSet = new Set(preset.acceptStates);
  const accepted = currentActive.some((st) => acceptSet.has(st));

  return {
    preset,
    input,
    error: null,
    steps,
    accepted,
  };
}

export type TuringPresetId =
  | "binary-increment"
  | "anbn-decider"
  | "infinite-loop";

export type TuringDirection = "L" | "R";

export interface TuringRule {
  state: string;
  read: string;
  nextState: string;
  write: string;
  dir: TuringDirection;
}

export interface TuringPreset {
  id: TuringPresetId;
  name: string;
  description: string;
  inputAlphabet: string[];
  blankSymbol: string;
  initialState: string;
  acceptState: string;
  rejectState: string;
  rules: TuringRule[];
  examples: string[];
}

export interface TuringTapeCell {
  index: number;
  symbol: string;
  isHead: boolean;
}

export interface TuringConfigSnapshot {
  step: number;
  state: string;
  head: number;
  tapeWindow: TuringTapeCell[];
  tapeText: string;
  readSymbol: string;
  appliedRule: string | null;
  visitedCellsCount: number;
  description: string;
  halted: boolean;
  status: "running" | "accepted" | "rejected" | "step_limit";
}

export interface TuringRunResult {
  preset: TuringPreset;
  input: string;
  error: string | null;
  steps: TuringConfigSnapshot[];
  status: "accepted" | "rejected" | "step_limit";
  finalTapeText: string;
}

export const TURING_PRESETS: Record<TuringPresetId, TuringPreset> = {
  "binary-increment": {
    id: "binary-increment",
    name: "Contador Binario (+1 en espacio O(n) — PSPACE)",
    description:
      "Suma 1 a un número binario reutilizando los mismos bits de la cinta (análogo al contador de 0 a 2^n de la Clase 26).",
    inputAlphabet: ["0", "1"],
    blankSymbol: "_",
    initialState: "q_seek",
    acceptState: "q_accept",
    rejectState: "q_reject",
    rules: [
      { state: "q_seek", read: "0", nextState: "q_seek", write: "0", dir: "R" },
      { state: "q_seek", read: "1", nextState: "q_seek", write: "1", dir: "R" },
      { state: "q_seek", read: "_", nextState: "q_add", write: "_", dir: "L" },
      { state: "q_add", read: "1", nextState: "q_add", write: "0", dir: "L" },
      { state: "q_add", read: "0", nextState: "q_accept", write: "1", dir: "R" },
      { state: "q_add", read: "_", nextState: "q_accept", write: "1", dir: "R" },
    ],
    examples: ["0101", "0111", "111"],
  },
  "anbn-decider": {
    id: "anbn-decider",
    name: "Decidor de {0^n 1^n | n ≥ 1}",
    description:
      "Demuestra mayor poder que un AFD: empareja cada '0' (marcado como 'X') con un '1' (marcado como 'Y') y siempre se detiene.",
    inputAlphabet: ["0", "1"],
    blankSymbol: "_",
    initialState: "q0",
    acceptState: "q_accept",
    rejectState: "q_reject",
    rules: [
      { state: "q0", read: "0", nextState: "q1", write: "X", dir: "R" },
      { state: "q0", read: "Y", nextState: "q3", write: "Y", dir: "R" },
      { state: "q0", read: "1", nextState: "q_reject", write: "1", dir: "R" },
      { state: "q0", read: "_", nextState: "q_reject", write: "_", dir: "R" },

      { state: "q1", read: "0", nextState: "q1", write: "0", dir: "R" },
      { state: "q1", read: "Y", nextState: "q1", write: "Y", dir: "R" },
      { state: "q1", read: "1", nextState: "q2", write: "Y", dir: "L" },

      { state: "q2", read: "0", nextState: "q2", write: "0", dir: "L" },
      { state: "q2", read: "Y", nextState: "q2", write: "Y", dir: "L" },
      { state: "q2", read: "X", nextState: "q0", write: "X", dir: "R" },

      { state: "q3", read: "Y", nextState: "q3", write: "Y", dir: "R" },
      { state: "q3", read: "_", nextState: "q_accept", write: "_", dir: "R" },
    ],
    examples: ["0011", "01", "001", "10"],
  },
  "infinite-loop": {
    id: "infinite-loop",
    name: "Ejemplo de No-Halting (Loop Infinito)",
    description:
      "Ilustra cómo una Máquina de Turing puede no alcanzar jamás q_accept ni q_reject (Halting Problem, Clase 26).",
    inputAlphabet: ["0", "1"],
    blankSymbol: "_",
    initialState: "q_ping",
    acceptState: "q_accept",
    rejectState: "q_reject",
    rules: [
      { state: "q_ping", read: "0", nextState: "q_pong", write: "0", dir: "R" },
      { state: "q_ping", read: "1", nextState: "q_pong", write: "1", dir: "R" },
      { state: "q_ping", read: "_", nextState: "q_pong", write: "_", dir: "R" },
      { state: "q_pong", read: "0", nextState: "q_ping", write: "0", dir: "L" },
      { state: "q_pong", read: "1", nextState: "q_ping", write: "1", dir: "L" },
      { state: "q_pong", read: "_", nextState: "q_ping", write: "_", dir: "L" },
    ],
    examples: ["01", "0"],
  },
};

function buildTapeWindow(
  tape: Map<number, string>,
  head: number,
  blank: string,
): { window: TuringTapeCell[]; tapeText: string } {
  const indices = [...tape.keys(), head];
  const minIdx = Math.min(-1, ...indices) ;
  const maxIdx = Math.max(head + 1, ...indices);

  const window: TuringTapeCell[] = [];
  for (let i = minIdx; i <= maxIdx; i++) {
    window.push({
      index: i,
      symbol: tape.get(i) ?? blank,
      isHead: i === head,
    });
  }

  // Texto compacto sin blancos externos
  const nonBlankIndices = [...tape.entries()]
    .filter(([, v]) => v !== blank)
    .map(([k]) => k);
  let tapeText = "";
  if (nonBlankIndices.length > 0) {
    const start = Math.min(...nonBlankIndices);
    const end = Math.max(...nonBlankIndices);
    for (let i = start; i <= end; i++) {
      tapeText += tape.get(i) ?? blank;
    }
  }

  return { window, tapeText };
}

export function simulateTuringMachine(
  presetId: TuringPresetId,
  rawInput: string,
  maxSteps = 60,
): TuringRunResult {
  const preset = TURING_PRESETS[presetId];
  const input = rawInput.trim();

  if (input.length === 0) {
    return {
      preset,
      input,
      error: "Ingresá al menos un símbolo para inicializar la cinta.",
      steps: [],
      status: "rejected",
      finalTapeText: "",
    };
  }

  const allowed = new Set(preset.inputAlphabet);
  for (const ch of input) {
    if (!allowed.has(ch)) {
      return {
        preset,
        input,
        error: `El símbolo '${ch}' no pertenece al alfabeto de entrada {${preset.inputAlphabet.join(", ")}}.`,
        steps: [],
        status: "rejected",
        finalTapeText: "",
      };
    }
  }

  const tape = new Map<number, string>();
  for (let i = 0; i < input.length; i++) {
    tape.set(i, input[i]);
  }

  let state = preset.initialState;
  let head = 0;
  const visited = new Set<number>([0]);

  const initialView = buildTapeWindow(tape, head, preset.blankSymbol);
  const steps: TuringConfigSnapshot[] = [
    {
      step: 0,
      state,
      head,
      tapeWindow: initialView.window,
      tapeText: initialView.tapeText,
      readSymbol: tape.get(head) ?? preset.blankSymbol,
      appliedRule: null,
      visitedCellsCount: visited.size,
      description: `Configuración inicial: estado ${state}, cabezal en celda 0 leyendo '${tape.get(head) ?? preset.blankSymbol}'.`,
      halted: false,
      status: "running",
    },
  ];

  let finalStatus: "accepted" | "rejected" | "step_limit" = "step_limit";

  for (let step = 1; step <= maxSteps; step++) {
    const readSym = tape.get(head) ?? preset.blankSymbol;
    const rule = preset.rules.find(
      (r) => r.state === state && r.read === readSym,
    );

    if (!rule) {
      finalStatus = "rejected";
      const view = buildTapeWindow(tape, head, preset.blankSymbol);
      steps.push({
        step,
        state: preset.rejectState,
        head,
        tapeWindow: view.window,
        tapeText: view.tapeText,
        readSymbol: readSym,
        appliedRule: null,
        visitedCellsCount: visited.size,
        description: `Sin transición para (${state}, '${readSym}'): la máquina se detiene en estado de rechazo (${preset.rejectState}).`,
        halted: true,
        status: "rejected",
      });
      break;
    }

    tape.set(head, rule.write);
    head += rule.dir === "R" ? 1 : -1;
    visited.add(head);
    state = rule.nextState;

    const ruleText = `(${rule.state}, '${rule.read}') → (${rule.nextState}, '${rule.write}', ${rule.dir})`;
    const view = buildTapeWindow(tape, head, preset.blankSymbol);

    if (state === preset.acceptState) {
      finalStatus = "accepted";
      steps.push({
        step,
        state,
        head,
        tapeWindow: view.window,
        tapeText: view.tapeText,
        readSymbol: tape.get(head) ?? preset.blankSymbol,
        appliedRule: ruleText,
        visitedCellsCount: visited.size,
        description: `Regla ${ruleText}. Alcanza estado de aceptación (${preset.acceptState}).`,
        halted: true,
        status: "accepted",
      });
      break;
    }

    if (state === preset.rejectState) {
      finalStatus = "rejected";
      steps.push({
        step,
        state,
        head,
        tapeWindow: view.window,
        tapeText: view.tapeText,
        readSymbol: tape.get(head) ?? preset.blankSymbol,
        appliedRule: ruleText,
        visitedCellsCount: visited.size,
        description: `Regla ${ruleText}. Alcanza estado de rechazo (${preset.rejectState}).`,
        halted: true,
        status: "rejected",
      });
      break;
    }

    const hitLimit = step === maxSteps;
    if (hitLimit) {
      finalStatus = "step_limit";
    }

    steps.push({
      step,
      state,
      head,
      tapeWindow: view.window,
      tapeText: view.tapeText,
      readSymbol: tape.get(head) ?? preset.blankSymbol,
      appliedRule: ruleText,
      visitedCellsCount: visited.size,
      description: hitLimit
        ? `Regla ${ruleText}. Límite de ${maxSteps} pasos alcanzado (posible loop infinito).`
        : `Regla ${ruleText}. Cabezal en celda ${head} leyendo '${tape.get(head) ?? preset.blankSymbol}'.`,
      halted: hitLimit,
      status: hitLimit ? "step_limit" : "running",
    });
  }

  return {
    preset,
    input,
    error: null,
    steps,
    status: finalStatus,
    finalTapeText: steps.at(-1)?.tapeText ?? "",
  };
}
