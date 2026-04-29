import { describe, expect, it } from "vitest";
import { clsx, fallbackGradient, initials } from "./utils";

describe("initials", () => {
  it("uppercases the first letters of two words", () => {
    expect(initials("hello world")).toBe("HW");
  });

  it("handles dashes and underscores as separators", () => {
    expect(initials("claude-launcher")).toBe("CL");
    expect(initials("my_project_v2")).toBe("MP");
  });

  it("returns first two letters for a single word", () => {
    expect(initials("single")).toBe("SI");
  });

  it("returns first letter uppercased for one-char input", () => {
    expect(initials("x")).toBe("X");
  });

  it("returns ? for empty input", () => {
    expect(initials("")).toBe("?");
  });

  it("collapses multiple separators", () => {
    expect(initials("foo--bar")).toBe("FB");
    expect(initials("  spaced   out  ")).toBe("SO");
  });
});

describe("clsx", () => {
  it("joins truthy strings with single spaces", () => {
    expect(clsx("a", "b", "c")).toBe("a b c");
  });

  it("filters out falsy values", () => {
    expect(clsx("a", false, null, undefined, "b")).toBe("a b");
  });

  it("returns empty string when all values are falsy", () => {
    expect(clsx(false, null, undefined)).toBe("");
  });
});

describe("fallbackGradient", () => {
  it("returns an object with from and to hex colors", () => {
    const grad = fallbackGradient("anything");
    expect(grad.from).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(grad.to).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it("is deterministic — same input gives same colors", () => {
    expect(fallbackGradient("bolsa")).toEqual(fallbackGradient("bolsa"));
  });

  it("typically gives different colors for different inputs", () => {
    // Not strictly guaranteed, but should be true for these handpicked names
    const a = fallbackGradient("alpha");
    const b = fallbackGradient("zulu-very-different");
    expect(a).not.toEqual(b);
  });
});
