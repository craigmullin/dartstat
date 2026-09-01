import { CRICKET_TARGETS, type CricketTarget } from "./cricket";

export const COMPETITIVE_CRICKET_STORAGE_PREFIX = "dartstat-cricket-game";

export interface CricketPlayer {
  id: string;
  name: string;
}

export interface MatchDart {
  target: CricketTarget | null;
  marks: 0 | 1 | 2 | 3;
}

export interface CricketTurn {
  playerId: string;
  darts: MatchDart[];
}

export interface CompetitiveCricketGame {
  version: 1;
  rules: "points-cricket";
  players: CricketPlayer[];
  startingPlayerIndex: number;
  activePlayerIndex: number;
  turns: CricketTurn[];
  pendingDarts: MatchDart[];
}

export interface CricketPlayerScore extends CricketPlayer {
  points: number;
  marks: Record<CricketTarget, number>;
}

export interface CompetitiveCricketScore {
  players: CricketPlayerScore[];
  winnerId?: string;
}

function emptyMarks(): Record<CricketTarget, number> {
  return Object.fromEntries(CRICKET_TARGETS.map((target) => [target, 0])) as Record<CricketTarget, number>;
}

export function createCompetitiveCricketGame(names: string[], startingPlayerIndex = 0): CompetitiveCricketGame {
  if (names.length < 2 || names.length > 3) throw new Error("Cricket requires two or three players.");
  const players = names.map((name, index) => ({ id: `player-${index + 1}`, name: name.trim() || `Player ${index + 1}` }));
  if (startingPlayerIndex < 0 || startingPlayerIndex >= players.length) throw new Error("Invalid starting player.");
  return { version: 1, rules: "points-cricket", players, startingPlayerIndex, activePlayerIndex: startingPlayerIndex, turns: [], pendingDarts: [] };
}

export function scoreCompetitiveCricket(game: CompetitiveCricketGame): CompetitiveCricketScore {
  const players = game.players.map((player) => ({ ...player, points: 0, marks: emptyMarks() }));
  let winnerId: string | undefined;
  const events = [...game.turns, { playerId: game.players[game.activePlayerIndex].id, darts: game.pendingDarts }];

  for (const turn of events) {
    const thrower = players.find((player) => player.id === turn.playerId);
    if (!thrower) continue;
    for (const dart of turn.darts) {
      if (winnerId || !dart.target || dart.marks === 0) continue;
      const target = dart.target;
      const before = thrower.marks[target];
      const remaining = Math.max(0, 3 - before);
      const applied = Math.min(remaining, dart.marks);
      const excess = dart.marks - applied;
      thrower.marks[target] = before + applied;
      const opponentOpen = players.some((player) => player.id !== thrower.id && player.marks[target] < 3);
      if (excess > 0 && opponentOpen) thrower.points += excess * (target === "B" ? 25 : Number(target));
      const allClosed = CRICKET_TARGETS.every((item) => thrower.marks[item] >= 3);
      const levelOrAhead = players.every((player) => player.id === thrower.id || thrower.points >= player.points);
      if (allClosed && levelOrAhead) winnerId = thrower.id;
    }
  }
  return { players, winnerId };
}

export function recordMatchDart(game: CompetitiveCricketGame, dart: MatchDart): CompetitiveCricketGame {
  if (scoreCompetitiveCricket(game).winnerId) return game;
  if (game.pendingDarts.length >= 3) throw new Error("A turn has exactly three darts.");
  if (!Number.isInteger(dart.marks) || dart.marks < 0 || dart.marks > 3) throw new Error("Invalid mark count.");
  if (dart.target === "B" && dart.marks > 2) throw new Error("Bull cannot be trebled.");
  if (!dart.target && dart.marks !== 0) throw new Error("A miss has no target or marks.");
  return { ...game, pendingDarts: [...game.pendingDarts, dart] };
}

export function advanceCompetitiveCricket(game: CompetitiveCricketGame): CompetitiveCricketGame {
  if (game.pendingDarts.length !== 3) throw new Error("Enter all three darts before advancing.");
  if (scoreCompetitiveCricket(game).winnerId) return game;
  const playerId = game.players[game.activePlayerIndex].id;
  return {
    ...game,
    turns: [...game.turns, { playerId, darts: game.pendingDarts }],
    pendingDarts: [],
    activePlayerIndex: (game.activePlayerIndex + 1) % game.players.length,
  };
}

export function undoCompetitiveCricket(game: CompetitiveCricketGame): CompetitiveCricketGame {
  if (game.pendingDarts.length) return { ...game, pendingDarts: game.pendingDarts.slice(0, -1) };
  const previous = game.turns.at(-1);
  if (!previous) return game;
  const previousPlayerIndex = game.players.findIndex((player) => player.id === previous.playerId);
  return { ...game, turns: game.turns.slice(0, -1), pendingDarts: previous.darts, activePlayerIndex: previousPlayerIndex };
}

export function rematchCompetitiveCricket(game: CompetitiveCricketGame): CompetitiveCricketGame {
  return createCompetitiveCricketGame(game.players.map((player) => player.name), (game.startingPlayerIndex + 1) % game.players.length);
}

export function competitiveCricketStorageKey(userId: string) {
  return `${COMPETITIVE_CRICKET_STORAGE_PREFIX}:${userId}`;
}

export function readCompetitiveCricketGame(userId: string, storage: Pick<Storage, "getItem"> = localStorage) {
  try {
    const raw = storage.getItem(competitiveCricketStorageKey(userId));
    if (!raw) return null;
    const game = JSON.parse(raw) as CompetitiveCricketGame;
    if (game.version !== 1 || game.rules !== "points-cricket" || !Array.isArray(game.players) || !Array.isArray(game.turns) || !Array.isArray(game.pendingDarts)) return null;
    return game;
  } catch { return null; }
}

export function storeCompetitiveCricketGame(userId: string, game: CompetitiveCricketGame, storage: Pick<Storage, "setItem"> = localStorage) {
  storage.setItem(competitiveCricketStorageKey(userId), JSON.stringify(game));
}

export function clearCompetitiveCricketGame(userId: string, storage: Pick<Storage, "removeItem"> = localStorage) {
  storage.removeItem(competitiveCricketStorageKey(userId));
}
