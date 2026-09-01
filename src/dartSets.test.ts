import { Timestamp } from "firebase/firestore";
import { describe, expect, it } from "vitest";
import { CRICKET_TARGETS, createDart } from "./cricket";
import { JDC_PROMPTS, createJdcDart } from "./jdc";
import { aggregateStatsByDartSet, snapshotDartSet, tipTypeLabel, validateDartSet, type DartSet } from "./dartSets";
import type { StoredPracticeSession } from "./data";

const set: DartSet = { id: "set-1", name: "Black Widows", color: "Black", weightGrams: 24, tipType: "steel", status: "active" };
const timestamp = Timestamp.now();

describe("dart sets", () => {
  it("validates and snapshots equipment details", () => {
    expect(validateDartSet(set)).toBe("");
    expect(validateDartSet({ ...set, weightGrams: 0 })).toContain("weight");
    expect(snapshotDartSet(set)).toEqual({ name: "Black Widows", color: "Black", weightGrams: 24, tipType: "steel" });
    expect(tipTypeLabel("both")).toBe("Steel & soft-tip");
  });

  it("aggregates Cricket and JDC results by set while retaining unspecified sessions", () => {
    const cricketDarts = Array.from({ length: 21 }, (_, index) => createDart(CRICKET_TARGETS[Math.floor(index / 3)], index % 3, 1));
    const sessions: StoredPracticeSession[] = [
      { id: "c", routineId: "cricket-mpd", status: "completed", startedAt: timestamp, completedAt: timestamp, darts: cricketDarts, dartSetId: set.id, dartSetSnapshot: snapshotDartSet(set) },
      { id: "j", routineId: "jdc-challenge", status: "completed", startedAt: timestamp, completedAt: timestamp, darts: JDC_PROMPTS.map((prompt) => createJdcDart(prompt, "miss")), dartSetId: set.id, dartSetSnapshot: snapshotDartSet(set) },
      { id: "old", routineId: "cricket-mpd", status: "completed", startedAt: timestamp, completedAt: timestamp, darts: cricketDarts },
    ];
    const stats = aggregateStatsByDartSet(sessions);
    expect(stats.find((item) => item.key === set.id)).toMatchObject({ cricketSessions: 1, cricketAverageMpr: 3, cricketBestMpr: 3, cricketRounds: 7, jdcSessions: 1, jdcAverageScore: 0 });
    expect(stats.find((item) => item.key === "unspecified")?.cricketSessions).toBe(1);
  });
});
