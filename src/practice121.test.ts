import { describe, expect, it } from "vitest";
import { createPractice121, recordPractice121Bust, recordPractice121Checkout, recordPractice121Score, scorePractice121, undoPractice121 } from "./practice121";

describe("121 practice", () => {
  it("awards a life for a checkout in the first visit", () => {
    const game = recordPractice121Checkout(createPractice121(3), 121, 3);
    expect(scorePractice121(game)).toMatchObject({ currentTarget: 122, livesRemaining: 4, livesEarned: 1, highestCheckoutCompleted: 121, threeDartCheckouts: 1 });
  });

  it("does not award a life for a checkout on dart four", () => {
    let game = recordPractice121Score(createPractice121(3), 81);
    game = recordPractice121Checkout(game, 40, 1);
    expect(scorePractice121(game)).toMatchObject({ currentTarget: 122, livesRemaining: 3, totalDartsThrown: 4 });
  });

  it("loses one life and retries after the ninth dart", () => {
    let game = createPractice121(2);
    game = recordPractice121Score(game, 0);
    game = recordPractice121Bust(game);
    game = recordPractice121Score(game, 0);
    expect(scorePractice121(game)).toMatchObject({ currentTarget: 121, remainingScore: 121, visitNumber: 1, livesRemaining: 1, totalDartsThrown: 9 });
  });

  it("ends immediately when the final life is lost", () => {
    let game = createPractice121(1);
    game = recordPractice121Bust(game);
    game = recordPractice121Bust(game);
    game = recordPractice121Bust(game);
    expect(scorePractice121(game).status).toBe("completed");
    expect(() => recordPractice121Bust(game)).toThrow("complete");
  });

  it("rejects finish-like score entries and leaving one", () => {
    const game = createPractice121(3);
    expect(() => recordPractice121Score(game, 121)).toThrow("Checkout");
    expect(() => recordPractice121Score(game, 120)).toThrow("bust");
    expect(() => recordPractice121Checkout(game, 120, 2)).toThrow("121 remaining");
  });

  it("restores the exact prior state when undoing", () => {
    const original = createPractice121(3);
    expect(undoPractice121(recordPractice121Score(original, 60))).toEqual(original);
  });
});
