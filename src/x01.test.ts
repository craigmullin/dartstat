import { describe, expect, it, vi } from "vitest";
import { advanceX01, clearX01Game, createX01Game, readX01Game, recordX01Dart, rematchX01, scoreX01, storeX01Game, undoX01, x01StorageKey, type X01Dart, type X01Game } from "./x01";

const s = (segment: number): X01Dart => ({ kind: "number", segment, multiplier: 1 });
const d = (segment: number): X01Dart => ({ kind: "number", segment, multiplier: 2 });
const t = (segment: number): X01Dart => ({ kind: "number", segment, multiplier: 3 });
const miss: X01Dart = { kind: "miss" };
const bull: X01Dart = { kind: "bull", multiplier: 1 };
const dbull: X01Dart = { kind: "bull", multiplier: 2 };
const add = (game: X01Game, ...darts: X01Dart[]) => darts.reduce(recordX01Dart, game);
const withRemainder = (game: X01Game, remainder: 20 | 32 | 40 | 50 | 60) => {
  const finalVisit: Record<typeof remainder, X01Dart[]> = {
    20: [t(20), d(20), s(1)],
    32: [t(20), s(20), s(9)],
    40: [t(20), s(20), s(1)],
    50: [t(20), s(11), miss],
    60: [t(20), s(1), miss],
  };
  return { ...game, visits: [{ playerId: "player-1", darts: [t(20), t(20), t(20)] }, { playerId: "player-1", darts: finalVisit[remainder] }] };
};

describe("’01 scoring", () => {
  it("uses the requested defaults and scores ordinary darts", () => {
    const game = createX01Game({ names: ["A", "B"] });
    expect(game).toMatchObject({ startingScore: 501, inRule: "open", outRule: "double" });
    expect(scoreX01(add(game, t(20), s(20), d(20))).pending).toMatchObject({ credited: 120, remainder: 381 });
  });

  it("records but does not credit darts before doubling in", () => {
    const game = createX01Game({ names: ["A", "B"], startingScore: 301, inRule: "double" });
    expect(scoreX01(add(game, s(20), d(20), t(20))).pending).toMatchObject({ creditedByDart: [0, 40, 60], credited: 100, remainder: 201, opened: true });
    expect(scoreX01(add(game, t(20), bull, miss)).pending).toMatchObject({ remainder: 301, opened: false });
  });

  it("opens on inner bull and undo restores unopened state", () => {
    const game = createX01Game({ names: ["A", "B"], startingScore: 301, inRule: "double" });
    const opened = add(game, dbull);
    expect(scoreX01(opened).pending).toMatchObject({ remainder: 251, opened: true });
    expect(scoreX01(undoX01(opened)).pending).toMatchObject({ remainder: 301, opened: false });
  });

  it("wins and busts correctly under double-out", () => {
    const base = createX01Game({ names: ["A", "B"], startingScore: 301 });
    expect(scoreX01(add(withRemainder(base, 40), d(20))).winnerId).toBe("player-1");
    expect(scoreX01(add(withRemainder(base, 40), s(20), s(20))).pending).toMatchObject({ bust: true, remainder: 40, credited: 0 });
    expect(scoreX01(add(withRemainder(base, 32), s(20), s(11))).pending).toMatchObject({ bust: true, remainder: 32 });
    expect(scoreX01(add(withRemainder(base, 60), t(20))).pending).toMatchObject({ bust: true, remainder: 60 });
    expect(scoreX01(add(withRemainder(base, 50), dbull)).winnerId).toBe("player-1");
  });

  it("undoes the busting dart and preserves earlier pending score", () => {
    const game = add(withRemainder(createX01Game({ names: ["A", "B"], startingScore: 301 }), 32), s(20), s(11));
    expect(scoreX01(undoX01(game)).pending).toMatchObject({ bust: false, remainder: 12, credited: 20 });
  });

  it("supports open-out remainder one and single, treble, or bull finishes", () => {
    const base = createX01Game({ names: ["A", "B"], startingScore: 301, outRule: "open" });
    const at20 = withRemainder(base, 20); const nineteen = add(at20, s(19));
    expect(scoreX01(nineteen).pending.remainder).toBe(1); expect(scoreX01(add(nineteen, s(1))).winnerId).toBe("player-1");
    expect(scoreX01(add(withRemainder(base, 60), t(20))).winnerId).toBe("player-1");
    expect(scoreX01(add(withRemainder(base, 50), dbull)).winnerId).toBe("player-1");
  });

  it("advances A-B-C-A and edits the previous visit across wrap", () => {
    let game = createX01Game({ names: ["A", "B", "C"] });
    for (let index = 0; index < 3; index++) game = advanceX01(add(game, miss, miss, miss));
    expect(game.activePlayerIndex).toBe(0); game = undoX01(game);
    expect(game.activePlayerIndex).toBe(2); expect(undoX01(game).pendingDarts).toHaveLength(2);
  });

  it("rejects invalid, fourth, post-bust, and post-win input", () => {
    const base = createX01Game({ names: ["A", "B"], startingScore: 301 });
    expect(() => recordX01Dart(base, { kind: "number", segment: 21, multiplier: 1 })).toThrow();
    expect(() => recordX01Dart(base, { kind: "bull", multiplier: 3 } as unknown as X01Dart)).toThrow();
    expect(() => recordX01Dart(add(base, miss, miss, miss), miss)).toThrow();
    expect(() => recordX01Dart(add(withRemainder(base, 40), s(20), s(20)), miss)).toThrow();
    expect(() => recordX01Dart(add(withRemainder(base, 40), d(20)), miss)).toThrow();
  });

  it("round-trips recovery and rotates rematch while preserving settings", () => {
    const game = add(createX01Game({ names: ["A", "B", "C"], startingScore: 701, inRule: "double", outRule: "open", startingPlayerIndex: 1 }), d(16));
    const setItem = vi.fn(); storeX01Game("uid", game, { setItem }); expect(setItem).toHaveBeenCalledWith(x01StorageKey("uid"), JSON.stringify(game));
    expect(readX01Game("uid", { getItem: () => JSON.stringify(game) })).toEqual(game);
    expect(rematchX01(game)).toMatchObject({ version: 2, entryMode: "turn-total", startingScore: 701, inRule: "double", outRule: "open", startingPlayerIndex: 2, activePlayerIndex: 2, draft: "" });
    const removeItem = vi.fn(); clearX01Game("uid", { removeItem }); expect(removeItem).toHaveBeenCalledWith(x01StorageKey("uid"));
  });
});
