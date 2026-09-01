import { describe, expect, it } from "vitest";
import { isLocalDevelopmentHost, prefersRedirect } from "./auth";

describe("Google sign-in presentation", () => {
  it("uses redirect on a narrow practice device", () => {
    expect(prefersRedirect(true, "desktop", "dartstat.craigmullin.com")).toBe(true);
  });

  it("uses redirect for mobile user agents", () => {
    expect(prefersRedirect(false, "Mozilla/5.0 (iPhone)", "dartstat.craigmullin.com")).toBe(true);
  });

  it("uses a popup on wider desktop devices", () => {
    expect(prefersRedirect(false, "Mozilla/5.0 (Windows NT 10.0)", "dartstat.craigmullin.com")).toBe(false);
  });

  it("uses a popup on localhost even at a narrow viewport", () => {
    expect(prefersRedirect(true, "Mozilla/5.0 (iPhone)", "localhost")).toBe(false);
    expect(prefersRedirect(true, "Mozilla/5.0 (Android)", "127.0.0.1")).toBe(false);
    expect(isLocalDevelopmentHost("::1")).toBe(true);
  });
});
