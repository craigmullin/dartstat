import type { X01InRule, X01OutRule, X01Player } from "./x01";

export type X01TurnOutcome = "score" | "zero" | "bust" | "finish";
export interface X01TotalTurn {
  playerId: string;
  submittedTotal?: number;
  explicitBust: boolean;
}
export interface X01TotalGame {
  version: 2;
  gameType: "x01";
  entryMode: "turn-total";
  startingScore: 301 | 501 | 701;
  inRule: X01InRule;
  outRule: X01OutRule;
  players: X01Player[];
  startingPlayerIndex: number;
  activePlayerIndex: number;
  turns: X01TotalTurn[];
  draft: string;
}
export interface X01TotalPlayerState extends X01Player { remainder: number }
export interface X01ScoredTurn extends X01TotalTurn {
  startRemainder: number;
  credited: number;
  endRemainder: number;
  outcome: X01TurnOutcome;
}
export interface X01TotalScore { players: X01TotalPlayerState[]; turns: X01ScoredTurn[]; winnerId?: string }

export function createX01TotalGame(options: {
  names: string[]; startingScore?: 301 | 501 | 701; inRule?: X01InRule; outRule?: X01OutRule; startingPlayerIndex?: number;
}): X01TotalGame {
  const { names, startingScore = 501, inRule = "open", outRule = "double", startingPlayerIndex = 0 } = options;
  if (names.length < 2 || names.length > 3) throw new Error("’01 requires two or three players.");
  if (startingPlayerIndex < 0 || startingPlayerIndex >= names.length) throw new Error("Invalid starting player.");
  return { version: 2, gameType: "x01", entryMode: "turn-total", startingScore, inRule, outRule, players: names.map((name, index) => ({ id: `player-${index + 1}`, name: name.trim() || `Player ${index + 1}` })), startingPlayerIndex, activePlayerIndex: startingPlayerIndex, turns: [], draft: "" };
}

export function parseTurnTotal(draft: string): number | null {
  if (draft === "") return 0;
  if (!/^\d{1,3}$/.test(draft)) return null;
  const value = Number(draft);
  return value <= 180 ? value : null;
}

export function scoreX01Totals(game: X01TotalGame): X01TotalScore {
  const players: X01TotalPlayerState[] = game.players.map((player) => ({ ...player, remainder: game.startingScore }));
  const turns: X01ScoredTurn[] = [];
  let winnerId: string | undefined;
  for (const turn of game.turns) {
    const player = players.find((item) => item.id === turn.playerId);
    if (!player || winnerId) continue;
    const startRemainder = player.remainder;
    const submitted = turn.submittedTotal ?? 0;
    if (!turn.explicitBust && (!Number.isInteger(submitted) || submitted < 0 || submitted > 180)) throw new Error("Invalid turn total.");
    const candidate = startRemainder - submitted;
    const bust = turn.explicitBust || candidate < 0 || (game.outRule === "double" && candidate === 1);
    const finish = !bust && candidate === 0;
    const credited = bust ? 0 : submitted;
    const endRemainder = bust ? startRemainder : candidate;
    player.remainder = endRemainder;
    const outcome: X01TurnOutcome = bust ? "bust" : finish ? "finish" : credited === 0 ? "zero" : "score";
    turns.push({ ...turn, startRemainder, credited, endRemainder, outcome });
    if (finish) winnerId = player.id;
  }
  return { players, turns, winnerId };
}

export function setX01Draft(game: X01TotalGame, draft: string): X01TotalGame {
  if (draft !== "" && !/^\d{1,3}$/.test(draft)) throw new Error("Invalid score entry.");
  return { ...game, draft };
}

export function appendX01Digit(game: X01TotalGame, digit: number): X01TotalGame {
  if (!Number.isInteger(digit) || digit < 0 || digit > 9) throw new Error("Invalid digit.");
  const next = game.draft === "" || game.draft === "0" ? String(digit) : `${game.draft}${digit}`;
  return next.length > 3 ? game : { ...game, draft: next };
}

export function commitX01Total(game: X01TotalGame, explicitBust = false): X01TotalGame {
  if (scoreX01Totals(game).winnerId) throw new Error("The game is complete.");
  const submittedTotal = parseTurnTotal(game.draft);
  if (!explicitBust && submittedTotal === null) throw new Error("Enter a whole score from 0 to 180.");
  const turn: X01TotalTurn = { playerId: game.players[game.activePlayerIndex].id, ...(game.draft !== "" ? { submittedTotal: Number(game.draft) } : {}), explicitBust };
  return { ...game, turns: [...game.turns, turn], activePlayerIndex: explicitBust || submittedTotal !== 0 || game.draft === "" || game.draft === "0" ? (game.activePlayerIndex + 1) % game.players.length : game.activePlayerIndex, draft: "" };
}

export function undoX01Total(game: X01TotalGame): X01TotalGame {
  if (game.draft || !game.turns.length) return game;
  const previous = game.turns.at(-1)!;
  return { ...game, turns: game.turns.slice(0, -1), activePlayerIndex: game.players.findIndex((player) => player.id === previous.playerId), draft: "" };
}

export function rematchX01Total(game: Pick<X01TotalGame, "players" | "startingScore" | "inRule" | "outRule" | "startingPlayerIndex">): X01TotalGame {
  return createX01TotalGame({ names: game.players.map((player) => player.name), startingScore: game.startingScore, inRule: game.inRule, outRule: game.outRule, startingPlayerIndex: (game.startingPlayerIndex + 1) % game.players.length });
}

export function isX01TotalGame(value: unknown): value is X01TotalGame {
  if (!value || typeof value !== "object") return false;
  const game = value as Partial<X01TotalGame>;
  return game.version === 2 && game.gameType === "x01" && game.entryMode === "turn-total" && Array.isArray(game.players) && Array.isArray(game.turns) && typeof game.draft === "string";
}
