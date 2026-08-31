import { describe, expect, it } from "vitest";
import {
  CRICKET_TARGETS,
  createDart,
  formatMpd,
  isCompleteCricketSession,
  marksPerDart,
  targetTotal,
  totalMarks,
} from "./cricket";

describe("Cricket MPD scoring", () => {
  it("scores a single, single, double visit as four marks", () => {
    const darts = [createDart("20", 0, 1), createDart("20", 1, 1), createDart("20", 2, 2)];
    expect(targetTotal(darts, "20")).toBe(4);
  });

  it("calculates MPD from raw darts", () => {
    const darts = CRICKET_TARGETS.flatMap((target) => [0, 1, 2].map((index) => createDart(target, index, 1)));
    expect(totalMarks(darts)).toBe(21);
    expect(marksPerDart(darts)).toBe(1);
    expect(formatMpd(marksPerDart(darts))).toBe("1.00");
    expect(isCompleteCricketSession(darts)).toBe(true);
  });

  it("rejects triple bull and incomplete sessions", () => {
    expect(() => createDart("B", 0, 3)).toThrow("Invalid marks for B");
    expect(isCompleteCricketSession([createDart("20", 0, 1)])).toBe(false);
  });
});
