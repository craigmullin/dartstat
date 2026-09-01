export const CRICKET_TARGETS = ["20", "19", "18", "17", "16", "15", "B"] as const;

export type CricketTarget = (typeof CRICKET_TARGETS)[number];

export interface CricketDart {
  target: CricketTarget;
  dart: 1 | 2 | 3;
  marks: number;
}

export function maxMarksForTarget(target: CricketTarget) {
  return target === "B" ? 2 : 3;
}

export function isValidDart(dart: CricketDart) {
  return Number.isInteger(dart.marks) && dart.marks >= 0 && dart.marks <= maxMarksForTarget(dart.target);
}

export function createDart(target: CricketTarget, dartIndex: number, marks: number): CricketDart {
  const dart = dartIndex + 1;
  if (dart < 1 || dart > 3 || !Number.isInteger(dart)) throw new Error("A visit has exactly three darts.");
  const result = { target, dart: dart as CricketDart["dart"], marks };
  if (!isValidDart(result)) throw new Error(`Invalid marks for ${target}.`);
  return result;
}

export function totalMarks(darts: CricketDart[]) {
  return darts.reduce((total, dart) => total + dart.marks, 0);
}

export function marksPerRound(darts: CricketDart[]) {
  const completedDartCount = darts.length - (darts.length % 3);
  if (!completedDartCount) return 0;
  return totalMarks(darts.slice(0, completedDartCount)) / (completedDartCount / 3);
}

export function isCompleteCricketSession(darts: CricketDart[]) {
  if (darts.length !== 21 || darts.some((dart) => !isValidDart(dart))) return false;
  return CRICKET_TARGETS.every((target) => {
    const visit = darts.filter((dart) => dart.target === target);
    return visit.length === 3 && visit.every((dart, index) => dart.dart === index + 1);
  });
}

export function targetTotal(darts: CricketDart[], target: CricketTarget) {
  return totalMarks(darts.filter((dart) => dart.target === target));
}

export function formatMpr(value: number) {
  return value.toFixed(2);
}
