import { describe, expect, it } from "vitest";
import { abandonBobs27, BOBS27_TARGETS, createBobs27, recordBobs27Round, scoreBobs27, undoBobs27 } from "./bobs27";

describe("Bob's 27", () => {
  it("scores hits and zero-hit visits correctly", () => {
    let game = recordBobs27Round(createBobs27("classic"), 2);
    expect(scoreBobs27(game).finalScore).toBe(31);
    game = recordBobs27Round(game, 0);
    expect(scoreBobs27(game).finalScore).toBe(27);
  });

  it("eliminates Classic only after falling below zero", () => {
    let game = createBobs27("classic");
    game = recordBobs27Round(game, 0); // 25
    game = recordBobs27Round(game, 0); // 21
    game = recordBobs27Round(game, 0); // 15
    game = recordBobs27Round(game, 0); // 7
    game = recordBobs27Round(game, 0); // -3
    expect(game.status).toBe("eliminated");
    expect(game.rounds).toHaveLength(5);
  });

  it("allows Complete Practice to remain negative and finish", () => {
    let game = createBobs27("complete");
    for (let index = 0; index < BOBS27_TARGETS.length; index += 1) game = recordBobs27Round(game, 0);
    expect(game.status).toBe("completed");
    expect(scoreBobs27(game)).toMatchObject({ finalScore: -443, dartsThrown: 63 });
  });

  it("scores a perfect game as 1437", () => {
    let game = createBobs27("classic");
    for (let index = 0; index < BOBS27_TARGETS.length; index += 1) game = recordBobs27Round(game, 3);
    expect(scoreBobs27(game)).toMatchObject({ finalScore: 1437, totalHits: 63, accuracy: 1 });
  });

  it("undo restores an eliminated game", () => {
    let game = createBobs27("classic");
    for (let i = 0; i < 5; i += 1) game = recordBobs27Round(game, 0);
    const restored = undoBobs27(game);
    expect(restored.status).toBe("active");
    expect(scoreBobs27(restored).finalScore).toBe(7);
  });

  it("marks an ended practice as abandoned", () => {
    expect(abandonBobs27(createBobs27("complete")).status).toBe("abandoned");
  });
});
