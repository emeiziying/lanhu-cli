import { describe, expect, it } from "vitest";

import { parseTimeoutMs, toOverrides } from "../src/utils/parse-options.js";
import { LanhuError } from "../src/errors.js";

describe("parseTimeoutMs", () => {
  it("returns undefined for undefined input", () => {
    expect(parseTimeoutMs(undefined)).toBeUndefined();
  });

  it("parses a valid positive number", () => {
    expect(parseTimeoutMs("5000")).toBe(5000);
  });

  it("parses a floating point timeout", () => {
    expect(parseTimeoutMs("1500.5")).toBe(1500.5);
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
