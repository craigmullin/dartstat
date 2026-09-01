import type { Timestamp } from "firebase/firestore";
import type { StoredPracticeSession } from "./data";
import { marksPerRound } from "./cricket";
import { jdcTotalScore } from "./jdc";

export type DartTipType = "steel" | "soft" | "both";

export interface DartSetSnapshot {
  name: string;
  color: string;
  weightGrams: number;
  tipType: DartTipType;
}

export interface DartSet extends DartSetSnapshot {
  id: string;
  status: "active" | "archived";
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export type DartSetValues = DartSetSnapshot;

export function validateDartSet(values: DartSetValues) {
  if (!values.name.trim()) return "Give this set a name.";
  if (!values.color.trim()) return "Enter the darts' color.";
  if (!Number.isFinite(values.weightGrams) || values.weightGrams <= 0 || values.weightGrams > 100) return "Enter a valid weight in grams.";
  return "";
}

export function tipTypeLabel(tipType: DartTipType) {
  return { steel: "Steel-tip", soft: "Soft-tip", both: "Steel & soft-tip" }[tipType];
}

export function snapshotDartSet(dartSet: DartSet): DartSetSnapshot {
  const { name, color, weightGrams, tipType } = dartSet;
  return { name, color, weightGrams, tipType };
}

export interface DartSetStats {
  key: string;
  dartSet?: DartSetSnapshot;
  cricketSessions: number;
  cricketAverageMpr: number;
  cricketBestMpr: number;
  cricketRounds: number;
  jdcSessions: number;
  jdcAverageScore: number;
  jdcBestScore: number;
}

export function aggregateStatsByDartSet(sessions: StoredPracticeSession[]): DartSetStats[] {
  const groups = new Map<string, { dartSet?: DartSetSnapshot; sessions: StoredPracticeSession[] }>();
  for (const session of sessions) {
    const key = session.dartSetId || "unspecified";
    const group = groups.get(key) ?? { dartSet: session.dartSetSnapshot, sessions: [] };
    group.dartSet ??= session.dartSetSnapshot;
    group.sessions.push(session);
    groups.set(key, group);
  }
  return Array.from(groups, ([key, group]) => {
    const cricket = group.sessions.filter((session) => session.routineId === "cricket-mpd");
    const jdc = group.sessions.filter((session) => session.routineId === "jdc-challenge");
    const mprs = cricket.map((session) => marksPerRound(session.darts.filter((dart) => "marks" in dart)));
    const scores = jdc.map((session) => jdcTotalScore(session.darts.filter((dart) => "result" in dart)));
    return {
      key,
      dartSet: group.dartSet,
      cricketSessions: cricket.length,
      cricketAverageMpr: mprs.length ? mprs.reduce((sum, value) => sum + value, 0) / mprs.length : 0,
      cricketBestMpr: mprs.length ? Math.max(...mprs) : 0,
      cricketRounds: cricket.reduce((sum, session) => sum + Math.floor(session.darts.length / 3), 0),
      jdcSessions: jdc.length,
      jdcAverageScore: scores.length ? scores.reduce((sum, value) => sum + value, 0) / scores.length : 0,
      jdcBestScore: scores.length ? Math.max(...scores) : 0,
    };
  });
}
