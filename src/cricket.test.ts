import { describe, expect, it } from "vitest";
import {
  CRICKET_TARGETS,
  createDart,
  formatMpr,
  isCompleteCricketSession,
  marksPerRound,
  targetTotal,
  totalMarks,
} from "./cricket";

describe("Cricket MPR scoring", () => {
  it("scores a single, single, double visit as four marks", () => {
    const darts = [createDart("20", 0, 1), createDart("20", 1, 1), createDart("20", 2, 2)];
    expect(targetTotal(darts, "20")).toBe(4);
  });

  it("calculates MPR from completed three-dart rounds", () => {
    const darts = CRICKET_TARGETS.flatMap((target) => [0, 1, 2].map((index) => createDart(target, index, 1)));
    expect(totalMarks(darts)).toBe(21);
    expect(marksPerRound(darts)).toBe(3);
    expect(formatMpr(marksPerRound(darts))).toBe("3.00");
    expect(isCompleteCricketSession(darts)).toBe(true);
  });

  it("does not include an unfinished round in live MPR", () => {
    const darts = [
      createDart("20", 0, 1), createDart("20", 1, 2), createDart("20", 2, 3),
      createDart("19", 0, 3),
    ];
    expect(marksPerRound(darts)).toBe(6);
  });

  it("rejects treble bull and incomplete sessions", () => {
    expect(() => createDart("B", 0, 3)).toThrow("Invalid marks for B");
    expect(isCompleteCricketSession([createDart("20", 0, 1)])).toBe(false);
  });
});
