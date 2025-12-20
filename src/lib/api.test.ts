import { describe, it, expect, beforeEach, vi } from "vitest";
import { defaultCities } from "./api";

describe("API module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exports default cities array", () => {
    expect(defaultCities).toBeDefined();
    expect(Array.isArray(defaultCities)).toBe(true);
    expect(defaultCities.length).toBeGreaterThan(0);
  });

  it("default cities are lowercase strings", () => {
    defaultCities.forEach((city) => {
      expect(typeof city).toBe("string");
      expect(city).toBe(city.toLowerCase());
    });
  });

  it("default cities contains expected Finnish cities", () => {
    expect(defaultCities).toContain("helsinki");
    expect(defaultCities).toContain("vantaa");
    expect(defaultCities).toContain("espoo");
  });
});
