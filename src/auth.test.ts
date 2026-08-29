import { describe, expect, it } from "vitest";
import { prefersRedirect } from "./auth";

describe("Google sign-in presentation", () => {
  it("uses redirect on a narrow practice device", () => {
    expect(prefersRedirect(true, "desktop")).toBe(true);
  });

  it("uses redirect for mobile user agents", () => {
    expect(prefersRedirect(false, "Mozilla/5.0 (iPhone)")).toBe(true);
  });

  it("uses a popup on wider desktop devices", () => {
    expect(prefersRedirect(false, "Mozilla/5.0 (Windows NT 10.0)")).toBe(false);
  });
});
