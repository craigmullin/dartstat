import { describe, expect, it } from "vitest";
import { JDC_PROMPTS, createJdcDart, isCompleteJdcChallenge, jdcDartScore, jdcTotalScore, jdcVisitScore } from "./jdc";

describe("JDC Challenge scoring", () => {
  it("adds a 100 point Shanghai bonus", () => {
    const prompt = JDC_PROMPTS[0];
    const visit = ["single", "double", "treble"].map((result, index) => createJdcDart({ ...prompt, dart: (index + 1) as 1 | 2 | 3 }, result as "single" | "double" | "treble"));
    expect(jdcVisitScore(visit)).toBe(160);
  });

  it("only scores the intended doubles and center bull", () => {
    const doubleOne = createJdcDart(JDC_PROMPTS[18], "double");
    const bull = createJdcDart(JDC_PROMPTS[38], "double-bull");
    expect(jdcDartScore(doubleOne)).toBe(50);
    expect(jdcDartScore(bull)).toBe(100);
    expect(() => createJdcDart(JDC_PROMPTS[38], "double")).toThrow();
  });

  it("validates and totals all 57 raw darts", () => {
    const darts = JDC_PROMPTS.map((prompt) => createJdcDart(prompt, "miss"));
    expect(darts).toHaveLength(57);
    expect(isCompleteJdcChallenge(darts)).toBe(true);
    expect(jdcTotalScore(darts)).toBe(0);
  });
});
