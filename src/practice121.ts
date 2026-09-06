export type Practice121Visit = {
  target: number;
  visit: 1 | 2 | 3;
  startScore: number;
  submittedScore: number;
  dartsUsed: 1 | 2 | 3;
  outcome: "score" | "bust" | "checkout";
};

export type Practice121Game = {
  version: 1;
  startingLives: number;
  startedAt: string;
  visits: Practice121Visit[];
};

export type Practice121Score = {
  status: "active" | "completed";
  currentTarget: number;
  remainingScore: number;
  visitNumber: 1 | 2 | 3;
  livesRemaining: number;
  livesEarned: number;
  targetsCompleted: number;
  highestCheckoutCompleted: number | null;
  totalDartsThrown: number;
  threeDartCheckouts: number;
};

export function createPractice121(startingLives: number, startedAt = new Date()): Practice121Game {
  if (!Number.isInteger(startingLives) || startingLives < 1) throw new Error("Starting lives must be a positive whole number.");
  return { version: 1, startingLives, startedAt: startedAt.toISOString(), visits: [] };
}

export function scorePractice121(game: Practice121Game): Practice121Score {
  let currentTarget = 121;
  let remainingScore = 121;
  let visitNumber: 1 | 2 | 3 = 1;
  let livesRemaining = game.startingLives;
  let livesEarned = 0;
  let targetsCompleted = 0;
  let highestCheckoutCompleted: number | null = null;
  let totalDartsThrown = 0;
  let threeDartCheckouts = 0;

  for (const event of game.visits) {
    if (livesRemaining <= 0 || event.target !== currentTarget || event.visit !== visitNumber || event.startScore !== remainingScore) break;
    totalDartsThrown += event.dartsUsed;
    if (event.outcome === "checkout") {
      const attemptDarts = (visitNumber - 1) * 3 + event.dartsUsed;
      targetsCompleted += 1;
      highestCheckoutCompleted = currentTarget;
      if (attemptDarts <= 3) { livesRemaining += 1; livesEarned += 1; threeDartCheckouts += 1; }
      currentTarget += 1;
      remainingScore = currentTarget;
      visitNumber = 1;
    } else {
      if (event.outcome === "score") remainingScore -= event.submittedScore;
      if (visitNumber === 3) {
        livesRemaining -= 1;
        remainingScore = currentTarget;
        visitNumber = 1;
      } else visitNumber = (visitNumber + 1) as 2 | 3;
    }
  }

  return { status: livesRemaining <= 0 ? "completed" : "active", currentTarget, remainingScore, visitNumber, livesRemaining, livesEarned, targetsCompleted, highestCheckoutCompleted, totalDartsThrown, threeDartCheckouts };
}

export function recordPractice121Score(game: Practice121Game, submittedScore: number): Practice121Game {
  const state = scorePractice121(game);
  validateActive(state);
  if (!Number.isInteger(submittedScore) || submittedScore < 0 || submittedScore > 180) throw new Error("Enter a whole score from 0 to 180.");
  const remainder = state.remainingScore - submittedScore;
  if (remainder <= 1) throw new Error(remainder === 0 ? "Use Checkout to finish the target." : "That score would bust. Use Bust / No Score.");
  return append(game, state, { submittedScore, dartsUsed: 3, outcome: "score" });
}

export function recordPractice121Bust(game: Practice121Game, submittedScore = 0): Practice121Game {
  const state = scorePractice121(game);
  validateActive(state);
  return append(game, state, { submittedScore, dartsUsed: 3, outcome: "bust" });
}

export function recordPractice121Checkout(game: Practice121Game, submittedScore: number, dartsUsed: 1 | 2 | 3): Practice121Game {
  const state = scorePractice121(game);
  validateActive(state);
  if (submittedScore !== state.remainingScore) throw new Error(`A checkout must equal the ${state.remainingScore} remaining.`);
  return append(game, state, { submittedScore, dartsUsed, outcome: "checkout" });
}

export function undoPractice121(game: Practice121Game): Practice121Game {
  return { ...game, visits: game.visits.slice(0, -1) };
}

function append(game: Practice121Game, state: Practice121Score, result: Pick<Practice121Visit, "submittedScore" | "dartsUsed" | "outcome">) {
  return { ...game, visits: [...game.visits, { target: state.currentTarget, visit: state.visitNumber, startScore: state.remainingScore, ...result }] };
}

function validateActive(state: Practice121Score) {
  if (state.status !== "active") throw new Error("This 121 session is complete.");
}

export function practice121StorageKey(userId: string) { return `dartstat:practice121:${userId}`; }

export function readPractice121(userId: string): Practice121Game | null {
  try {
    const raw = localStorage.getItem(practice121StorageKey(userId));
    if (!raw) return null;
    const game = JSON.parse(raw) as Practice121Game;
    return game?.version === 1 && Number.isInteger(game.startingLives) && game.startingLives > 0 && Array.isArray(game.visits) ? game : null;
  } catch { return null; }
}

export function storePractice121(userId: string, game: Practice121Game) {
  try { localStorage.setItem(practice121StorageKey(userId), JSON.stringify(game)); } catch { /* Scoring remains usable if storage is unavailable. */ }
}

export function clearPractice121(userId: string) {
  try { localStorage.removeItem(practice121StorageKey(userId)); } catch { /* No recovery data to clear. */ }
}
