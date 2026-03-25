import { describe, expect, it } from "vitest";

import {
  parseNonNegativeInt,
  parsePositiveInt,
  parseTimeoutMs,
  toOverrides
} from "../src/utils/parse-options.js";
import { LanhuError } from "../src/errors.js";

describe("parseTimeoutMs", () => {
  it("returns undefined for undefined input", () => {
    expect(parseTimeoutMs(undefined)).toBeUndefined();
  });

  it("parses a valid positive number", () => {
    expect(parseTimeoutMs("5000")).toBe(5000);
  });

  it("throws for floating point timeout", () => {
    expect(() => parseTimeoutMs("1500.5")).toThrow(LanhuError);
    expect(() => parseTimeoutMs("1500.5")).toThrow(/positive integer/);
  });

  it("throws for NaN input", () => {
    expect(() => parseTimeoutMs("abc")).toThrow(LanhuError);
    expect(() => parseTimeoutMs("abc")).toThrow(/Invalid timeout value/);
  });

  it("throws for zero", () => {
    expect(() => parseTimeoutMs("0")).toThrow(LanhuError);
  });

  it("throws for negative number", () => {
    expect(() => parseTimeoutMs("-100")).toThrow(LanhuError);
  });

  it("throws for empty string", () => {
    expect(() => parseTimeoutMs("")).toThrow(LanhuError);
  });
});

describe("toOverrides", () => {
  it("maps common options to config overrides", () => {
    const result = toOverrides({
      cookie: "c=val",
      baseUrl: "https://example.com",
      timeout: "3000",
      profile: "test",
      tenantId: "t1",
      projectId: "p1"
    });

    expect(result).toEqual({
      cookie: "c=val",
      baseUrl: "https://example.com",
      timeoutMs: 3000,
      profile: "test",
      tenantId: "t1",
      projectId: "p1"
    });
  });

  it("leaves undefined fields as undefined", () => {
    const result = toOverrides({});
    expect(result.cookie).toBeUndefined();
    expect(result.timeoutMs).toBeUndefined();
    expect(result.tenantId).toBeUndefined();
  });
});

describe("parsePositiveInt", () => {
  it("parses a valid positive integer", () => {
    expect(parsePositiveInt("5", "position", 1)).toBe(5);
  });

  it("uses fallback when undefined", () => {
    expect(parsePositiveInt(undefined, "position", 1)).toBe(1);
  });

  it("throws for zero", () => {
    expect(() => parsePositiveInt("0", "position", 1)).toThrow(LanhuError);
    expect(() => parsePositiveInt("0", "position", 1)).toThrow(/must be a positive integer/);
  });

  it("throws for negative number", () => {
    expect(() => parsePositiveInt("-1", "img-limit", 1)).toThrow(LanhuError);
  });

  it("throws for non-integer", () => {
    expect(() => parsePositiveInt("1.5", "detach", 1)).toThrow(LanhuError);
  });

  it("throws for non-numeric string", () => {
    expect(() => parsePositiveInt("abc", "position", 1)).toThrow(LanhuError);
  });
});

describe("parseNonNegativeInt", () => {
  it("parses zero", () => {
    expect(parseNonNegativeInt("0", "parent-id", 0)).toBe(0);
  });

  it("parses a positive integer", () => {
    expect(parseNonNegativeInt("10", "parent-id", 0)).toBe(10);
  });

  it("uses fallback when undefined", () => {
    expect(parseNonNegativeInt(undefined, "parent-id", 0)).toBe(0);
  });

  it("throws for negative number", () => {
    expect(() => parseNonNegativeInt("-1", "parent-id", 0)).toThrow(LanhuError);
    expect(() => parseNonNegativeInt("-1", "parent-id", 0)).toThrow(/must be a non-negative integer/);
  });

  it("throws for non-integer", () => {
    expect(() => parseNonNegativeInt("1.5", "parent-id", 0)).toThrow(LanhuError);
  });

  it("throws for non-numeric string", () => {
    expect(() => parseNonNegativeInt("abc", "parent-id", 0)).toThrow(LanhuError);
  });
});
