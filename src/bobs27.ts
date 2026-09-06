export type Bobs27Mode = "classic" | "complete";
export type Bobs27Status = "active" | "completed" | "eliminated" | "abandoned";
export type Bobs27Target = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 25;

export type Bobs27Round = {
  target: Bobs27Target;
  label: string;
  targetValue: number;
  hits: 0 | 1 | 2 | 3;
  scoreBefore: number;
  scoreChange: number;
  scoreAfter: number;
};

export type Bobs27Game = {
  version: 1;
  mode: Bobs27Mode;
  startedAt: string;
  rounds: Bobs27Round[];
  status: Bobs27Status;
};

export const BOBS27_TARGETS: Bobs27Target[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 25];

export function bobs27TargetLabel(target: Bobs27Target) { return target === 25 ? "Double Bull" : `D${target}`; }
export function bobs27TargetValue(target: Bobs27Target) { return target === 25 ? 50 : target * 2; }

export function createBobs27(mode: Bobs27Mode, startedAt = new Date()): Bobs27Game {
  return { version: 1, mode, startedAt: startedAt.toISOString(), rounds: [], status: "active" };
}

export function scoreBobs27(game: Bobs27Game) {
  const rounds = game.rounds;
  const finalScore = rounds.length ? rounds[rounds.length - 1]!.scoreAfter : 27;
  const totalHits = rounds.reduce((sum, round) => sum + round.hits, 0);
  const dartsThrown = rounds.length * 3;
  return {
    finalScore,
    totalHits,
    dartsThrown,
    accuracy: dartsThrown ? totalHits / dartsThrown : 0,
    targetsHit: rounds.filter((round) => round.hits > 0).length,
    targetsMissed: rounds.filter((round) => round.hits === 0).length,
    highestTargetReached: rounds.length ? rounds[rounds.length - 1]!.label : "—",
    currentTarget: BOBS27_TARGETS[Math.min(rounds.length, BOBS27_TARGETS.length - 1)]!,
  };
}

export function recordBobs27Round(game: Bobs27Game, hits: 0 | 1 | 2 | 3): Bobs27Game {
  if (game.status !== "active") throw new Error("This Bob's 27 session is finished.");
  if (![0, 1, 2, 3].includes(hits)) throw new Error("Hits must be from 0 to 3.");
  const target = BOBS27_TARGETS[game.rounds.length];
  if (target === undefined) throw new Error("Every double has already been recorded.");
  const scoreBefore = scoreBobs27(game).finalScore;
  const targetValue = bobs27TargetValue(target);
  const scoreChange = hits === 0 ? -targetValue : hits * targetValue;
  const scoreAfter = scoreBefore + scoreChange;
  const round: Bobs27Round = { target, label: bobs27TargetLabel(target), targetValue, hits, scoreBefore, scoreChange, scoreAfter };
  const rounds = [...game.rounds, round];
  const status: Bobs27Status = game.mode === "classic" && scoreAfter < 0 ? "eliminated" : rounds.length === BOBS27_TARGETS.length ? "completed" : "active";
  return { ...game, rounds, status };
}

export function undoBobs27(game: Bobs27Game): Bobs27Game {
  return { ...game, rounds: game.rounds.slice(0, -1), status: "active" };
}

export function abandonBobs27(game: Bobs27Game): Bobs27Game {
  return { ...game, status: "abandoned" };
}

export function bobs27StorageKey(userId: string) { return `dartstat:bobs27:${userId}`; }
export function readBobs27(userId: string): Bobs27Game | null {
  try {
    const raw = localStorage.getItem(bobs27StorageKey(userId));
    if (!raw) return null;
    const game = JSON.parse(raw) as Bobs27Game;
    return game?.version === 1 && (game.mode === "classic" || game.mode === "complete") && Array.isArray(game.rounds) ? game : null;
  } catch { return null; }
}
export function storeBobs27(userId: string, game: Bobs27Game) { try { localStorage.setItem(bobs27StorageKey(userId), JSON.stringify(game)); } catch { /* Recovery is best effort. */ } }
export function clearBobs27(userId: string) { try { localStorage.removeItem(bobs27StorageKey(userId)); } catch { /* Nothing else to clear. */ } }
