import { describe, expect, it } from "vitest";
import { appendX01Digit, commitX01Total, createX01TotalGame, parseTurnTotal, rematchX01Total, scoreX01Totals, setX01Draft, undoX01Total } from "./x01Totals";

const gameAt = (remainder: number, outRule: "open" | "double" = "double") => {
  const game = createX01TotalGame({ names: ["A", "B"], startingScore: 301, outRule });
  const scored = 301 - remainder;
  return { ...game, turns: scored > 180
    ? [{ playerId: "player-1", submittedTotal: 180, explicitBust: false }, { playerId: "player-1", submittedTotal: scored - 180, explicitBust: false }]
    : [{ playerId: "player-1", submittedTotal: scored, explicitBust: false }] };
};

describe("’01 turn-total scoring", () => {
  it("creates calculator games with the requested defaults", () => {
    expect(createX01TotalGame({ names: ["A", "B"] })).toMatchObject({ version: 2, entryMode: "turn-total", startingScore: 501, inRule: "open", outRule: "double", draft: "" });
  });

  it("commits normal, blank, and explicit zero turns", () => {
    let game = setX01Draft(createX01TotalGame({ names: ["A", "B"] }), "60");
    game = commitX01Total(game);
    expect(scoreX01Totals(game).players[0].remainder).toBe(441);
    expect(game).toMatchObject({ activePlayerIndex: 1, draft: "" });
    game = commitX01Total(game);
    expect(scoreX01Totals(game).turns.at(-1)).toMatchObject({ credited: 0, outcome: "zero" });
    game = setX01Draft(game, "0"); game = commitX01Total(game);
    expect(scoreX01Totals(game).turns.at(-1)).toMatchObject({ submittedTotal: 0, credited: 0, outcome: "zero" });
  });

  it("normalizes digits and supports clear and backspace state", () => {
    let game = createX01TotalGame({ names: ["A", "B"] });
    game = appendX01Digit(game, 0); game = appendX01Digit(game, 6); game = appendX01Digit(game, 0);
    expect(game.draft).toBe("60");
    game = setX01Draft(game, game.draft.slice(0, -1)); expect(game.draft).toBe("6");
    game = setX01Draft(game, ""); expect(game.draft).toBe("");
  });

  it("commits manual and automatic busts without reducing remainder", () => {
    let game = setX01Draft(gameAt(20), "15"); game = commitX01Total(game, true);
    expect(scoreX01Totals(game).turns.at(-1)).toMatchObject({ startRemainder: 20, endRemainder: 20, credited: 0, outcome: "bust", submittedTotal: 15 });
    game = setX01Draft(gameAt(20), "25"); game = commitX01Total(game);
    expect(scoreX01Totals(game).turns.at(-1)).toMatchObject({ endRemainder: 20, outcome: "bust", submittedTotal: 25 });
    game = setX01Draft(gameAt(2), "1"); game = commitX01Total(game);
    expect(scoreX01Totals(game).turns.at(-1)).toMatchObject({ endRemainder: 2, outcome: "bust" });
  });

  it("trusts finishes and allows remainder one under open-out", () => {
    let game = setX01Draft(gameAt(20), "20"); game = commitX01Total(game);
    expect(scoreX01Totals(game).winnerId).toBe("player-1");
    game = setX01Draft(gameAt(20, "open"), "19"); game = commitX01Total(game);
    expect(scoreX01Totals(game).players[0].remainder).toBe(1);
    game = setX01Draft({ ...game, activePlayerIndex: 0 }, "1"); game = commitX01Total(game);
    expect(scoreX01Totals(game).winnerId).toBe("player-1");
  });

  it("uses totals as trusted credited points for double-in", () => {
    let game = createX01TotalGame({ names: ["A", "B"], startingScore: 301, inRule: "double" });
    game = commitX01Total(game); expect(scoreX01Totals(game).players[0].remainder).toBe(301);
    game = setX01Draft({ ...game, activePlayerIndex: 0 }, "100"); game = commitX01Total(game);
    expect(scoreX01Totals(game).players[0].remainder).toBe(201);
  });

  it("rejects invalid totals without mutation", () => {
    expect(parseTurnTotal("181")).toBeNull(); expect(parseTurnTotal("-1")).toBeNull(); expect(parseTurnTotal("1.5")).toBeNull(); expect(parseTurnTotal("abc")).toBeNull();
    const game = setX01Draft(createX01TotalGame({ names: ["A", "B"] }), "181");
    expect(() => commitX01Total(game)).toThrow(); expect(game.turns).toHaveLength(0);
  });

  it("undoes scores, busts, and wins across three-player wrap", () => {
    let game = createX01TotalGame({ names: ["A", "B", "C"] });
    game = commitX01Total(game); game = commitX01Total(game); game = commitX01Total(game);
    expect(game.activePlayerIndex).toBe(0); game = undoX01Total(game);
    expect(game.activePlayerIndex).toBe(2); expect(game.turns).toHaveLength(2); expect(game.draft).toBe("");
    expect(undoX01Total(setX01Draft(game, "20"))).toEqual(setX01Draft(game, "20"));
  });

  it("preserves settings and rotates the starter on rematch", () => {
    const game = createX01TotalGame({ names: ["A", "B", "C"], startingScore: 701, inRule: "double", outRule: "open", startingPlayerIndex: 2 });
    expect(rematchX01Total(game)).toMatchObject({ startingScore: 701, inRule: "double", outRule: "open", startingPlayerIndex: 0, activePlayerIndex: 0, turns: [], draft: "" });
  });
});
