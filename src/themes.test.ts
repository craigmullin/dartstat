import { describe, expect, it, vi } from "vitest";
import { THEMES, THEME_STORAGE_KEY, isThemeId, readStoredTheme, storeTheme } from "./themes";

describe("DartStat themes", () => {
  it("provides the original, six colorways, and dark mode", () => {
    expect(THEMES).toHaveLength(8);
    expect(THEMES.map((theme) => theme.id)).toContain("pink-dark");
    expect(THEMES.find((theme) => theme.id === "pink-dark")?.colors).toContain("#FF3D9A");
  });

  it("falls back to pink for an unknown stored value", () => {
    expect(readStoredTheme({ getItem: () => "unknown" })).toBe("pink");
    expect(isThemeId("cobalt")).toBe(true);
  });

  it("persists a valid selection", () => {
    const setItem = vi.fn();
    storeTheme("orange", { setItem });
    expect(setItem).toHaveBeenCalledWith(THEME_STORAGE_KEY, "orange");
  });
});
