import { describe, it, expect } from "vitest";
import {
  generateNextSourceKey,
  isValidSourceKey,
  getNextKeyIndex,
} from "@/lib/brand/source-key";

describe("Brand Source Key Generator", () => {
  it("1. Generates S-001 when no existing keys exist", () => {
    expect(generateNextSourceKey([])).toBe("S-001");
    expect(generateNextSourceKey([] as any)).toBe("S-001");
    expect(getNextKeyIndex([])).toBe(1);
  });

  it("2. Generates S-013 when highest key is S-012", () => {
    const existing = [
      "S-001",
      "S-002",
      "S-003",
      "S-004",
      "S-005",
      "S-006",
      "S-007",
      "S-008",
      "S-009",
      "S-010",
      "S-011",
      "S-012",
    ];
    expect(generateNextSourceKey(existing)).toBe("S-013");
    expect(getNextKeyIndex(existing)).toBe(13);
  });

  it("3. Handles out-of-order and non-consecutive keys", () => {
    const existing = ["S-008", "S-002", "S-042", "S-001"];
    expect(generateNextSourceKey(existing)).toBe("S-043");
  });

  it("4. Correctly pads double and triple digit keys", () => {
    expect(generateNextSourceKey(["S-009"])).toBe("S-010");
    expect(generateNextSourceKey(["S-099"])).toBe("S-100");
    expect(generateNextSourceKey(["S-999"])).toBe("S-1000");
  });

  it("5. Supports custom prefixes", () => {
    expect(generateNextSourceKey([], "SRC")).toBe("SRC-001");
    expect(generateNextSourceKey(["SRC-005"], "SRC")).toBe("SRC-006");
  });

  it("6. Ignores malformed or extraneous strings", () => {
    const existing = ["S-005", "random-key", "", "S-abc", "S-009"];
    expect(generateNextSourceKey(existing)).toBe("S-010");
  });

  it("7. Validates canonical key format", () => {
    expect(isValidSourceKey("S-001")).toBe(true);
    expect(isValidSourceKey("S-014")).toBe(true);
    expect(isValidSourceKey("S-100")).toBe(true);
    expect(isValidSourceKey("S-1")).toBe(false);
    expect(isValidSourceKey("invalid")).toBe(false);
    expect(isValidSourceKey("")).toBe(false);
  });
});
