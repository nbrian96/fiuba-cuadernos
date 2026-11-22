import { describe, expect, it } from "vitest";
import {
  PRICING_METHOD_STEPS,
  SAT3_CLAUSES,
  SET_COVER_STEPS,
  contractKargerStep,
  createInitialKargerState,
  evaluateMax3Sat,
  runMax3SatMultiTrial,
  runMax3SatSingleTrial,
  simulateHamletStreaming,
} from "../../src/utils/tdaSimulators";

describe("TDA interactive simulators engine", () => {
  it("verifies Set Cover steps and harmonic bound H(4)", () => {
    expect(SET_COVER_STEPS).toHaveLength(5);
    const first = SET_COVER_STEPS[0];
    const finalStep = SET_COVER_STEPS[SET_COVER_STEPS.length - 1];

    expect(first.remainingElements).toEqual([
      "a",
      "b",
      "c",
      "d",
      "e",
      "f",
      "g",
      "h",
    ]);
    expect(finalStep.isFinal).toBe(true);
    expect(finalStep.remainingElements).toHaveLength(0);
    expect(finalStep.chosenSubsets).toEqual([
      "{c, d, g, h}",
      "{b, f}",
      "{a}",
      "{e}",
    ]);
  });

  it("verifies Pricing Method diamond graph 2-approximation steps", () => {
    expect(PRICING_METHOD_STEPS).toHaveLength(4);
    const last = PRICING_METHOD_STEPS[PRICING_METHOD_STEPS.length - 1];
    expect(last.nodes.a.isPaid).toBe(true);
    expect(last.nodes.b.isPaid).toBe(true);
    expect(last.nodes.c.isPaid).toBe(false);
    expect(last.nodes.d.isPaid).toBe(true);

    const paidCost = (
      Object.values(last.nodes) as Array<{ max: number; isPaid: boolean }>
    )
      .filter((n) => n.isPaid)
      .reduce((acc, n) => acc + n.max, 0);
    const edgeSum = last.edges.reduce((acc, e) => acc + e.price, 0);
    expect(paidCost).toBe(10); // a(4) + b(3) + d(3)
    expect(edgeSum).toBe(6); // 3 + 1 + 2
    expect(paidCost).toBeLessThanOrEqual(2 * edgeSum);
  });

  it("contracts Karger multigraph cleanly down to 2 supernodes without self-loops", () => {
    let state = createInitialKargerState();
    expect(state.nodes).toEqual(["a", "b", "c", "d"]);
    expect(state.edges).toHaveLength(5);

    // RNG determinista siempre elige índice 0
    state = contractKargerStep(state, () => 0);
    expect(state.nodes).toHaveLength(3);
    expect(state.edges.every((e) => e.u !== e.v)).toBe(true);

    state = contractKargerStep(state, () => 0);
    expect(state.nodes).toHaveLength(2);
    expect(state.edges.length).toBeGreaterThanOrEqual(2);
    expect(state.logs.at(-1)).toContain("Corte resultante:");

    // Paso adicional cuando ya hay <= 2 supernodos no modifica el estado
    const frozen = contractKargerStep(state, () => 0);
    expect(frozen).toBe(state);
  });

  it("evaluates MAX 3-SAT deterministic and random Monte Carlo trials accurately", () => {
    expect(SAT3_CLAUSES).toHaveLength(8);
    const allTrue = evaluateMax3Sat({
      1: true,
      2: true,
      3: true,
      4: true,
      5: true,
    });
    expect(allTrue.totalClauses).toBe(8);
    expect(allTrue.satisfiedCount).toBe(8);
    expect(allTrue.percent).toBe(100);

    // rng=0.9 => rng()<0.5 es false para todas las variables => C1 falsa, 7/8 = 87.5%
    const single = runMax3SatSingleTrial(() => 0.9);
    expect(single.satisfiedCount).toBe(7);
    expect(single.percent).toBe(87.5);

    const multi = runMax3SatMultiTrial(100, () => 0.9);
    expect(multi.trials).toBe(100);
    expect(multi.averageSatisfied).toBe(7);
    expect(multi.averagePercent).toBe(87.5);
  });

  it("executes Hamlet bounded-memory streaming simulation with deterministic alternating RNG", () => {
    let tick = 0;
    const alternatingRng = () => {
      tick = (tick + 1) % 2;
      return tick === 0 ? 0.1 : 0.7;
    };

    const res = simulateHamletStreaming(
      {
        maxCapacity: 100,
        totalDistinctWords: 3967,
      },
      alternatingRng,
    );

    expect(res.maxCapacity).toBe(100);
    expect(res.roundK).toBeGreaterThanOrEqual(4);
    expect(res.finalMemoryCount).toBeGreaterThanOrEqual(1);
    expect(res.finalMemoryCount).toBeLessThanOrEqual(100);
    expect(res.estimatedWords).toBe(
      res.finalMemoryCount * Math.pow(2, res.roundK),
    );
    expect(res.logs.some((line) => line.includes("Estimación ="))).toBe(true);
  });
});
