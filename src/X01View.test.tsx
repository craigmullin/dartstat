import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { X01CalculatorBoard } from "./X01View";
import { createX01TotalGame } from "./x01Totals";

describe("’01 calculator interactions", () => {
  it("orders number keys from 1 through 0, top to bottom and left to right", () => {
    render(<X01CalculatorBoard game={createX01TotalGame({ names: ["A", "B"] })} setGame={() => undefined} onExit={() => undefined} onNewGame={() => undefined} />);
    const calculator = screen.getByRole("region", { name: "Turn score calculator" });
    const keyLabels = within(calculator).getAllByRole("button").slice(0, 12).map((button) => button.textContent);
    expect(keyLabels).toEqual(["1", "2", "3", "4", "5", "6", "7", "8", "9", "Clear", "0", "⌫"]);
  });

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
    fireEvent.keyDown(screen.getByRole("textbox", { name: /Turn score/ }), { key: "Enter", repeat: true });
    expect(setGame).not.toHaveBeenCalled();
  });
});
