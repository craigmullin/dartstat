export type JdcSection = "shanghai-low" | "doubles" | "shanghai-high";
export type JdcResult = "miss" | "single" | "double" | "triple" | "double-bull";

export interface JdcDart {
  section: JdcSection;
  target: string;
  visit: number;
  dart: 1 | 2 | 3;
  result: JdcResult;
}

export interface JdcPrompt {
  section: JdcSection;
  target: string;
  visit: number;
  dart: 1 | 2 | 3;
}

const low = [10, 11, 12, 13, 14, 15];
const high = [15, 16, 17, 18, 19, 20];

export const JDC_PROMPTS: JdcPrompt[] = [
  ...low.flatMap((target, visit) => [1, 2, 3].map((dart) => ({ section: "shanghai-low" as const, target: String(target), visit, dart: dart as 1 | 2 | 3 }))),
  ...Array.from({ length: 21 }, (_, index) => ({ section: "doubles" as const, target: index === 20 ? "B" : String(index + 1), visit: 6 + Math.floor(index / 3), dart: (index % 3 + 1) as 1 | 2 | 3 })),
  ...high.flatMap((target, index) => [1, 2, 3].map((dart) => ({ section: "shanghai-high" as const, target: String(target), visit: 13 + index, dart: dart as 1 | 2 | 3 }))),
];

export function createJdcDart(prompt: JdcPrompt, result: JdcResult): JdcDart {
  const allowed = prompt.section === "doubles"
    ? prompt.target === "B" ? ["miss", "double-bull"] : ["miss", "double"]
    : ["miss", "single", "double", "triple"];
  if (!allowed.includes(result)) throw new Error(`Invalid result for ${prompt.target}.`);
  return { ...prompt, result };
}

export function jdcDartScore(dart: JdcDart) {
  if (dart.result === "miss") return 0;
  if (dart.section === "doubles") return dart.result === "double-bull" ? 100 : 50;
  const multiplier = { single: 1, double: 2, triple: 3, "double-bull": 0 }[dart.result];
  return Number(dart.target) * multiplier;
}

export function hasShanghai(darts: JdcDart[]) {
  const results = new Set(darts.map((dart) => dart.result));
  return results.has("single") && results.has("double") && results.has("triple");
}

export function jdcVisitScore(darts: JdcDart[]) {
  const base = darts.reduce((sum, dart) => sum + jdcDartScore(dart), 0);
  return base + (darts[0]?.section !== "doubles" && hasShanghai(darts) ? 100 : 0);
}

export function jdcTotalScore(darts: JdcDart[]) {
  return Array.from(new Set(darts.map((dart) => dart.visit))).reduce(
    (sum, visit) => sum + jdcVisitScore(darts.filter((dart) => dart.visit === visit)), 0,
  );
}

export function jdcSectionScore(darts: JdcDart[], section: JdcSection) {
  return jdcTotalScore(darts.filter((dart) => dart.section === section));
}

export function isCompleteJdcChallenge(darts: JdcDart[]) {
  return darts.length === JDC_PROMPTS.length && darts.every((dart, index) => {
    const prompt = JDC_PROMPTS[index];
    return dart.section === prompt.section && dart.target === prompt.target && dart.visit === prompt.visit && dart.dart === prompt.dart;
  });
}
