import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Bobs27 } from "./Bobs27View";
import { saveSession } from "./data";

vi.mock("./data", () => ({ saveSession: vi.fn() }));

function missVisit() {
  fireEvent.click(screen.getByRole("button", { name: "0 hits" }));
  fireEvent.click(screen.getByRole("button", { name: "Confirm / Next Double" }));
}

describe("Bob's 27 interactions", () => {
  beforeEach(() => { localStorage.clear(); vi.mocked(saveSession).mockReset(); });

  it("previews a hit selection before confirming the next double", () => {
    render(<Bobs27 userId="user-1" dartSets={[]} onExit={() => undefined} onSaved={async () => undefined} />);
    fireEvent.click(screen.getByRole("button", { name: "Start game" }));
    fireEvent.click(screen.getByRole("button", { name: "2 hits" }));
    expect(screen.getByText("2 hits × 2 = +4")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Confirm / Next Double" }));
    expect(screen.getByText("D2")).toBeInTheDocument();
    expect(screen.getByText("31")).toBeInTheDocument();
  });

  it("eliminates Classic after the fifth zero-hit visit and supports undo", () => {
    render(<Bobs27 userId="user-2" dartSets={[]} onExit={() => undefined} onSaved={async () => undefined} />);
    fireEvent.click(screen.getByRole("button", { name: "Start game" }));
    for (let index = 0; index < 5; index += 1) missVisit();
    expect(screen.getByRole("heading", { name: "Eliminated" })).toBeInTheDocument();
    expect(screen.getByText("-3")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Undo last visit" }));
    expect(screen.getByText("D5")).toBeInTheDocument();
  });

  it("offers save or discard when ending practice and saves equipment", async () => {
    const onSaved = vi.fn(async () => undefined);
    const dartSets = [{ id: "set-1", name: "Match darts", color: "Black", weightGrams: 24, tipType: "steel" as const, status: "active" as const }];
    render(<Bobs27 userId="user-3" dartSets={dartSets} onExit={() => undefined} onSaved={onSaved} />);
    fireEvent.change(screen.getByLabelText(/Darts used/), { target: { value: "set-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Start game" }));
    missVisit();
    fireEvent.click(screen.getByText("End practice", { selector: "button" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Save this abandoned session?");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await vi.waitFor(() => expect(saveSession).toHaveBeenCalled());
    expect(vi.mocked(saveSession).mock.calls[0]?.[1]).toMatchObject({ routineId: "bobs-27", status: "abandoned", mode: "classic", dartSetId: "set-1" });
    expect(onSaved).toHaveBeenCalled();
  });
});
