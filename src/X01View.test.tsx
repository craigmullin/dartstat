import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { X01CalculatorBoard } from "./X01View";
import { createX01TotalGame } from "./x01Totals";

describe("’01 calculator interactions", () => {
  it("guards duplicate submit activations from committing a blank turn", () => {
    const setGame = vi.fn();
    render(<X01CalculatorBoard game={createX01TotalGame({ names: ["A", "B"] })} setGame={setGame} onExit={() => undefined} onNewGame={() => undefined} />);
    const next = screen.getByRole("button", { name: "Next player" });
    fireEvent.click(next); fireEvent.click(next);
    expect(setGame).toHaveBeenCalledTimes(1);
  });

  it("does not submit on a repeated Enter key", () => {
    const setGame = vi.fn();
    render(<X01CalculatorBoard game={createX01TotalGame({ names: ["A", "B"] })} setGame={setGame} onExit={() => undefined} onNewGame={() => undefined} />);
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Turn score" }), { key: "Enter", repeat: true });
    expect(setGame).not.toHaveBeenCalled();
  });
});
