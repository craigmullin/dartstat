import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Practice121 } from "./Practice121View";

vi.mock("./data", () => ({ saveSession: vi.fn() }));

describe("121 practice interactions", () => {
  beforeEach(() => localStorage.clear());

  it("starts at 121 with the selected lives", () => {
    render(<Practice121 userId="user-1" onExit={() => undefined} onSaved={async () => undefined} />);
    fireEvent.click(screen.getByRole("button", { name: "Start game" }));
    expect(screen.getByText("Target").nextElementSibling).toHaveTextContent("121");
    expect(screen.getByLabelText("3 lives remaining")).toBeInTheDocument();
    expect(screen.getByText("Visit", { selector: ".practice121-meta span" })).toHaveTextContent("1 of 3");
  });

  it("confirms checkout darts and awards a first-visit life", () => {
    render(<Practice121 userId="user-2" onExit={() => undefined} onSaved={async () => undefined} />);
    fireEvent.click(screen.getByRole("button", { name: "Start game" }));
    fireEvent.click(screen.getByRole("button", { name: "1" }));
    fireEvent.click(screen.getByRole("button", { name: "2" }));
    fireEvent.click(screen.getByRole("button", { name: "1" }));
    fireEvent.click(screen.getByRole("button", { name: "Checkout" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("How many darts");
    fireEvent.click(screen.getByRole("button", { name: "2 darts" }));
    expect(screen.getByText(/Checked out in 2/)).toHaveTextContent("+1 life");
    expect(screen.getByText("Target").nextElementSibling).toHaveTextContent("122");
    expect(screen.getByLabelText("4 lives remaining")).toBeInTheDocument();
  });

  it("automatically loses a life after the third failed visit", () => {
    render(<Practice121 userId="user-3" onExit={() => undefined} onSaved={async () => undefined} />);
    fireEvent.click(screen.getByRole("button", { name: "Start game" }));
    const bust = screen.getByRole("button", { name: "Bust / No Score" });
    fireEvent.click(bust); fireEvent.click(bust); fireEvent.click(bust);
    expect(screen.getByText(/Not out/)).toHaveTextContent("Retry 121");
    expect(screen.getByLabelText("2 lives remaining")).toBeInTheDocument();
  });
});
