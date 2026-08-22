import { describe, expect, it } from "vitest";
import { knownNumber, knownValue } from "@/lib/known-value";

const filter = knownValue(["all", "dangling", "duplicates"] as const, "all");

describe("knownValue", () => {
  it("reads back a setting this version knows", () => {
    expect(filter.decode("dangling")).toBe("dangling");
  });

  it("falls back when the choice has since been dropped", () => {
    // "water" was a real setting once, and old browsers still hold it
    expect(filter.decode("water")).toBe("all");
  });

  it("falls back on anything that was never a setting", () => {
    expect(filter.decode("")).toBe("all");
    expect(filter.decode("[object Object]")).toBe("all");
  });
});

describe("knownNumber", () => {
  it("reads back a number", () => {
    expect(knownNumber(0.45).decode("0.9")).toBe(0.9);
  });

  it("falls back on what will not read as one", () => {
    expect(knownNumber(0.45).decode("almost")).toBe(0.45);
    expect(knownNumber(0.45).decode("")).toBe(0.45);
  });
});
