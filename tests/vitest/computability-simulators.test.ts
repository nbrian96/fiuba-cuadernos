import { describe, expect, it } from "vitest";
import {
  simulateAutomatonTrace,
  simulateTuringMachine,
} from "../../src/utils/computabilitySimulators";

describe("TDA computability simulators engine", () => {
  it("simulates AFD intersection preset accurately for accepted and rejected strings", () => {
    const ok1 = simulateAutomatonTrace("interseccion-afd", "10111");
    expect(ok1.error).toBeNull();
    expect(ok1.accepted).toBe(true);
    expect(ok1.steps).toHaveLength(6);

    const ok2 = simulateAutomatonTrace("interseccion-afd", "11");
    expect(ok2.accepted).toBe(true);

    const badPrefix = simulateAutomatonTrace("interseccion-afd", "01");
    expect(badPrefix.accepted).toBe(false);

    const twoZeros = simulateAutomatonTrace("interseccion-afd", "100");
    expect(twoZeros.accepted).toBe(false);
  });

  it("simulates AFND with epsilon transitions for 010110 and rejects invalid alphabet symbols", () => {
    const afnd = simulateAutomatonTrace("afnd-epsilon", "010110");
    expect(afnd.error).toBeNull();
    expect(afnd.accepted).toBe(true);
    // En paso 2 (después de '1'), Q0 -> Q1 y por ε-clausura se agrega Q2
    expect(afnd.steps[2].activeStates).toEqual(["Q0", "Q1", "Q2"]);
    expect(afnd.steps[2].epsilonAdded).toEqual(["Q2"]);

    const ends000 = simulateAutomatonTrace("termina-000", "1000");
    expect(ends000.accepted).toBe(true);
    expect(simulateAutomatonTrace("termina-000", "1001").accepted).toBe(false);

    const invalid = simulateAutomatonTrace("interseccion-afd", "10a");
    expect(invalid.error).toContain("'a'");
    expect(invalid.steps).toHaveLength(0);
  });

  it("simulates Turing Machine presets (binary increment, 0^n1^n decider, and infinite loop)", () => {
    const inc1 = simulateTuringMachine("binary-increment", "0101");
    expect(inc1.error).toBeNull();
    expect(inc1.status).toBe("accepted");
    expect(inc1.finalTapeText).toBe("0110");

    const inc2 = simulateTuringMachine("binary-increment", "0111");
    expect(inc2.status).toBe("accepted");
    expect(inc2.finalTapeText).toBe("1000");

    const incCarry = simulateTuringMachine("binary-increment", "111");
    expect(incCarry.status).toBe("accepted");
    expect(incCarry.finalTapeText).toBe("1000");

    expect(simulateTuringMachine("anbn-decider", "0011").status).toBe("accepted");
    expect(simulateTuringMachine("anbn-decider", "01").status).toBe("accepted");
    expect(simulateTuringMachine("anbn-decider", "001").status).toBe("rejected");
    expect(simulateTuringMachine("anbn-decider", "10").status).toBe("rejected");

    const loop = simulateTuringMachine("infinite-loop", "01", 20);
    expect(loop.status).toBe("step_limit");
    expect(loop.steps).toHaveLength(21);
  });
});
