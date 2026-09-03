import { createX01TotalGame, isX01TotalGame, scoreX01Totals, type X01TotalGame } from "./x01Totals";

export const X01_STORAGE_PREFIX = "dartstat-x01-game";

export type X01InRule = "open" | "double";
export type X01OutRule = "open" | "double";
export type X01Multiplier = 1 | 2 | 3;

export interface X01Player { id: string; name: string }
export type X01Dart =
  | { kind: "number"; segment: number; multiplier: X01Multiplier }
  | { kind: "bull"; multiplier: 1 | 2 }
  | { kind: "miss" };
export interface X01Visit { playerId: string; darts: X01Dart[] }
export interface X01Game {
  version: 1;
  gameType: "x01";
  startingScore: 301 | 501 | 701;
  inRule: X01InRule;
  outRule: X01OutRule;
  players: X01Player[];
  startingPlayerIndex: number;
  activePlayerIndex: number;
  visits: X01Visit[];
  pendingDarts: X01Dart[];
}
export interface X01PlayerState extends X01Player { remainder: number; opened: boolean }
export interface X01PendingState {
  startRemainder: number;
  remainder: number;
  startOpened: boolean;
  opened: boolean;
  credited: number;
  creditedByDart: number[];
  bust: boolean;
  winner: boolean;
}
export interface X01Score { players: X01PlayerState[]; pending: X01PendingState; winnerId?: string }

export function createX01Game(options: {
  names: string[]; startingScore?: 301 | 501 | 701; inRule?: X01InRule; outRule?: X01OutRule; startingPlayerIndex?: number;
}): X01Game {
  const { names, startingScore = 501, inRule = "open", outRule = "double", startingPlayerIndex = 0 } = options;
  if (names.length < 2 || names.length > 3) throw new Error("’01 requires two or three players.");
  if (![301, 501, 701].includes(startingScore)) throw new Error("Invalid starting score.");
  if (startingPlayerIndex < 0 || startingPlayerIndex >= names.length) throw new Error("Invalid starting player.");
  return {
    version: 1, gameType: "x01", startingScore, inRule, outRule,
    players: names.map((name, index) => ({ id: `player-${index + 1}`, name: name.trim() || `Player ${index + 1}` })),
    startingPlayerIndex, activePlayerIndex: startingPlayerIndex, visits: [], pendingDarts: [],
  };
}

export function dartValue(dart: X01Dart) {
  if (dart.kind === "miss") return 0;
  if (dart.kind === "bull") return dart.multiplier * 25;
  return dart.segment * dart.multiplier;
}

export function isDouble(dart: X01Dart) { return dart.kind !== "miss" && dart.multiplier === 2; }

function validateDart(dart: X01Dart) {
  if (dart.kind === "miss") return;
  if (dart.kind === "bull") {
    if (dart.multiplier !== 1 && dart.multiplier !== 2) throw new Error("Bull can only be single or double.");
    return;
  }
  if (!Number.isInteger(dart.segment) || dart.segment < 1 || dart.segment > 20 || ![1, 2, 3].includes(dart.multiplier)) throw new Error("Invalid dart segment.");
}

function applyVisit(startRemainder: number, startOpened: boolean, darts: X01Dart[], game: Pick<X01Game, "inRule" | "outRule">): X01PendingState {
  let remainder = startRemainder;
  let opened = startOpened;
  let credited = 0;
  const creditedByDart: number[] = [];
  let bust = false;
  let winner = false;
  for (const dart of darts) {
    validateDart(dart);
    let value = 0;
    if (opened || game.inRule === "open") {
      opened = true; value = dartValue(dart);
    } else if (isDouble(dart)) {
      opened = true; value = dartValue(dart);
    }
    creditedByDart.push(value);
    const candidate = remainder - value;
    const invalidFinish = candidate === 0 && game.outRule === "double" && !isDouble(dart);
    const invalidOne = candidate === 1 && game.outRule === "double";
    if (candidate < 0 || invalidFinish || invalidOne) { bust = true; remainder = startRemainder; credited = 0; break; }
    remainder = candidate; credited += value;
    if (candidate === 0) { winner = true; break; }
  }
  return { startRemainder, remainder, startOpened, opened, credited, creditedByDart, bust, winner };
}

export function scoreX01(game: X01Game): X01Score {
  const players: X01PlayerState[] = game.players.map((player) => ({ ...player, remainder: game.startingScore, opened: game.inRule === "open" }));
  let winnerId: string | undefined;
  for (const visit of game.visits) {
    const player = players.find((item) => item.id === visit.playerId);
    if (!player || winnerId) continue;
    const result = applyVisit(player.remainder, player.opened, visit.darts, game);
    player.remainder = result.remainder; player.opened = result.opened;
    if (result.winner) winnerId = player.id;
  }
  const active = players[game.activePlayerIndex];
  const pending = applyVisit(active.remainder, active.opened, game.pendingDarts, game);
  if (pending.winner) winnerId = active.id;
  return { players, pending, winnerId };
}

export function recordX01Dart(game: X01Game, dart: X01Dart): X01Game {
  validateDart(dart);
  const state = scoreX01(game);
  if (state.winnerId) throw new Error("The game is complete.");
  if (state.pending.bust) throw new Error("The visit has busted.");
  if (game.pendingDarts.length >= 3) throw new Error("A visit has exactly three darts.");
  return { ...game, pendingDarts: [...game.pendingDarts, dart] };
}

export function advanceX01(game: X01Game): X01Game {
  const score = scoreX01(game);
  if (score.winnerId) throw new Error("The game is complete.");
  if (game.pendingDarts.length !== 3 && !score.pending.bust) throw new Error("Enter three darts or bust before advancing.");
  return { ...game, visits: [...game.visits, { playerId: game.players[game.activePlayerIndex].id, darts: game.pendingDarts }], pendingDarts: [], activePlayerIndex: (game.activePlayerIndex + 1) % game.players.length };
}

export function undoX01(game: X01Game): X01Game {
  if (game.pendingDarts.length) return { ...game, pendingDarts: game.pendingDarts.slice(0, -1) };
  const previous = game.visits[game.visits.length - 1];
  if (!previous) return game;
  const activePlayerIndex = game.players.findIndex((player) => player.id === previous.playerId);
  return { ...game, visits: game.visits.slice(0, -1), pendingDarts: previous.darts, activePlayerIndex };
}

export function rematchX01(game: X01Game): X01TotalGame {
  return createX01TotalGame({ names: game.players.map((player) => player.name), startingScore: game.startingScore, inRule: game.inRule, outRule: game.outRule, startingPlayerIndex: (game.startingPlayerIndex + 1) % game.players.length });
}

export function formatX01Dart(dart: X01Dart) {
  if (dart.kind === "miss") return "MISS";
  if (dart.kind === "bull") return dart.multiplier === 2 ? "DBULL" : "BULL";
  return `${dart.multiplier === 1 ? "S" : dart.multiplier === 2 ? "D" : "T"}${dart.segment}`;
}

export function x01StorageKey(userId: string) { return `${X01_STORAGE_PREFIX}:${userId}`; }
export function readX01Game(userId: string, storage: Pick<Storage, "getItem"> = localStorage): X01Game | X01TotalGame | null {
  try {
    const raw = storage.getItem(x01StorageKey(userId)); if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (isX01TotalGame(parsed)) { scoreX01TotalsForValidation(parsed); return parsed; }
    const game = parsed as X01Game;
    if (game.version !== 1 || game.gameType !== "x01" || !Array.isArray(game.players) || game.players.length < 2 || game.players.length > 3 || !Array.isArray(game.visits) || !Array.isArray(game.pendingDarts)) return null;
    scoreX01(game); return game;
  } catch { return null; }
}
export function storeX01Game(userId: string, game: X01Game | X01TotalGame, storage: Pick<Storage, "setItem"> = localStorage) { storage.setItem(x01StorageKey(userId), JSON.stringify(game)); }
export function clearX01Game(userId: string, storage: Pick<Storage, "removeItem"> = localStorage) { storage.removeItem(x01StorageKey(userId)); }

function scoreX01TotalsForValidation(game: X01TotalGame) {
  if (game.players.length < 2 || game.players.length > 3 || game.activePlayerIndex < 0 || game.activePlayerIndex >= game.players.length) throw new Error("Invalid saved game.");
  if (game.draft.length > 32) throw new Error("Invalid saved draft.");
  scoreX01Totals(game);
}
