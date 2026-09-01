import { describe, expect, it, vi } from "vitest";
import {
  advanceCompetitiveCricket,
  clearCompetitiveCricketGame,
  competitiveCricketStorageKey,
  createCompetitiveCricketGame,
  readCompetitiveCricketGame,
  recordMatchDart,
  rematchCompetitiveCricket,
  scoreCompetitiveCricket,
  storeCompetitiveCricketGame,
  undoCompetitiveCricket,
  type CompetitiveCricketGame,
  type MatchDart,
} from "./competitiveCricket";

const hit = (target: MatchDart["target"], marks: MatchDart["marks"]): MatchDart => ({ target, marks });
const miss = hit(null, 0);

function add(game: CompetitiveCricketGame, ...darts: MatchDart[]) {
  return darts.reduce(recordMatchDart, game);
}

function turn(game: CompetitiveCricketGame, ...darts: MatchDart[]) {
  return advanceCompetitiveCricket(add(game, ...darts));
}

describe("competitive Cricket", () => {
  it("closes a target before awarding excess marks", () => {
    let game = createCompetitiveCricketGame(["A", "B"]);
    game = turn(game, hit("20", 2), miss, miss);
    game = turn(game, miss, miss, miss);
    game = add(game, hit("20", 3));
    const score = scoreCompetitiveCricket(game);
    expect(score.players[0].marks["20"]).toBe(3);
    expect(score.players[0].points).toBe(40);
  });

  it("awards excess points once when one or two opponents remain open", () => {
    let game = createCompetitiveCricketGame(["A", "B", "C"]);
    game = turn(game, hit("20", 3), miss, miss);
    game = turn(game, hit("20", 3), miss, miss);
    game = turn(game, miss, miss, miss);
    game = add(game, hit("20", 3));
    expect(scoreCompetitiveCricket(game).players[0].points).toBe(60);
  });

  it("does not score after every player has closed a target", () => {
    let game = createCompetitiveCricketGame(["A", "B"]);
    game = turn(game, hit("20", 3), miss, miss);
    game = turn(game, hit("20", 3), miss, miss);
    game = add(game, hit("20", 3));
    expect(scoreCompetitiveCricket(game).players[0].points).toBe(0);
  });

  it("scores inner bull excess as 25 points", () => {
    let game = createCompetitiveCricketGame(["A", "B"]);
    game = turn(game, hit("B", 2), miss, miss);
    game = turn(game, miss, miss, miss);
    game = add(game, hit("B", 2));
    const player = scoreCompetitiveCricket(game).players[0];
    expect(player.marks.B).toBe(3);
    expect(player.points).toBe(25);
  });

  it("advances A to B to C to A and reopens C across the wrap", () => {
    let game = createCompetitiveCricketGame(["A", "B", "C"]);
    game = turn(game, miss, miss, miss);
    game = turn(game, miss, miss, miss);
    game = turn(game, miss, miss, miss);
    expect(game.activePlayerIndex).toBe(0);
    game = undoCompetitiveCricket(game);
    expect(game.activePlayerIndex).toBe(2);
    expect(game.pendingDarts).toHaveLength(3);
    game = undoCompetitiveCricket(game);
    expect(game.pendingDarts).toHaveLength(2);
  });

  it("wins immediately when all targets are closed while level or ahead", () => {
    let game = createCompetitiveCricketGame(["A", "B"]);
    for (const target of ["20", "19", "18", "17", "16", "15"] as const) {
      game = turn(game, hit(target, 3), miss, miss);
      game = turn(game, miss, miss, miss);
    }
    game = add(game, hit("B", 2), hit("B", 1));
    expect(scoreCompetitiveCricket(game).winnerId).toBe("player-1");
    expect(game.pendingDarts).toHaveLength(2);
    expect(scoreCompetitiveCricket(undoCompetitiveCricket(game)).winnerId).toBeUndefined();
  });

  it("does not win after closing every target while behind", () => {
    let game = createCompetitiveCricketGame(["A", "B"], 1);
    game = turn(game, hit("20", 3), hit("20", 3), miss);
    game = turn(game, hit("20", 3), miss, miss);
    for (const target of ["19", "18", "17", "16", "15"] as const) {
      game = turn(game, miss, miss, miss);
      game = turn(game, hit(target, 3), miss, miss);
    }
    game = turn(game, miss, miss, miss);
    game = add(game, hit("B", 2), hit("B", 1));
    const score = scoreCompetitiveCricket(game);
    expect(score.players[0].points).toBe(0);
    expect(score.players[1].points).toBe(60);
    expect(score.winnerId).toBeUndefined();
  });

  it("restores a three-player game with an exact partial turn", () => {
    let game = createCompetitiveCricketGame(["A", "B", "C"], 1);
    game = add(game, hit("18", 3), hit("20", 1));
    const restored = readCompetitiveCricketGame("uid", { getItem: () => JSON.stringify(game) });
    expect(restored?.players.map((player) => player.name)).toEqual(["A", "B", "C"]);
    expect(restored?.activePlayerIndex).toBe(1);
    expect(restored?.pendingDarts).toEqual([hit("18", 3), hit("20", 1)]);
  });

  it("rotates the starting player for a rematch", () => {
    const game = createCompetitiveCricketGame(["A", "B", "C"], 2);
    const rematch = rematchCompetitiveCricket(game);
    expect(rematch.startingPlayerIndex).toBe(0);
    expect(rematch.activePlayerIndex).toBe(0);
  });

  it("rejects treble bull and advancing an incomplete turn", () => {
    const game = createCompetitiveCricketGame(["A", "B"]);
    expect(() => recordMatchDart(game, hit("B", 3))).toThrow("Bull cannot be trebled");
    expect(() => advanceCompetitiveCricket(game)).toThrow("Enter all three darts");
  });

  it("round-trips pending games through scoped local storage", () => {
    const game = add(createCompetitiveCricketGame(["A", "B"]), hit("15", 1));
    const setItem = vi.fn();
    storeCompetitiveCricketGame("uid", game, { setItem });
    expect(setItem).toHaveBeenCalledWith(competitiveCricketStorageKey("uid"), JSON.stringify(game));
    const restored = readCompetitiveCricketGame("uid", { getItem: () => JSON.stringify(game) });
    expect(restored).toEqual(game);
    const removeItem = vi.fn();
    clearCompetitiveCricketGame("uid", { removeItem });
    expect(removeItem).toHaveBeenCalledWith(competitiveCricketStorageKey("uid"));
  });
});
