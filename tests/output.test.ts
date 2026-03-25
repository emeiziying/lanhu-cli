import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { writeError, writeJson } from "../src/utils/output.js";
import { LanhuError } from "../src/errors.js";

describe("writeError", () => {
  let stderrOutput: string;

  beforeEach(() => {
    stderrOutput = "";
    vi.spyOn(process.stderr, "write").mockImplementation((chunk: string | Uint8Array) => {
      stderrOutput += String(chunk);
      return true;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("redacts cookie in error details", () => {
    const error = new LanhuError({
      code: "HTTP_ERROR",
      message: "request failed",
      details: {
        cookie: "session=abc123secretvalue",
        other: "safe-data"
      }
    });

    writeError(error);

    const parsed = JSON.parse(stderrOutput);
    expect(parsed.error.details.cookie).toBe("sess***alue");
    expect(parsed.error.details.other).toBe("safe-data");
  });

  it("redacts authorization header in nested details", () => {
    const error = new LanhuError({
      code: "HTTP_ERROR",
      message: "request failed",
      details: {
        headers: {
          authorization: "Bearer long-secret-token-value"
        }
      }
    });

    writeError(error);

    const parsed = JSON.parse(stderrOutput);
    expect(parsed.error.details.headers.authorization).toBe("Bear***alue");
  });

  it("handles short secrets", () => {
    const error = new LanhuError({
      code: "HTTP_ERROR",
      message: "request failed",
      details: { token: "ab" }
    });

    writeError(error);

    const parsed = JSON.parse(stderrOutput);
    expect(parsed.error.details.token).toBe("ab***");
  });

  it("does not redact non-sensitive fields", () => {
    const error = new LanhuError({
      code: "HTTP_ERROR",
      message: "request failed",
      details: { code: 401, message: "unauthorized" }
    });

    writeError(error);

    const parsed = JSON.parse(stderrOutput);
    expect(parsed.error.details.code).toBe(401);
    expect(parsed.error.details.message).toBe("unauthorized");
  });

  it("redacts within arrays", () => {
    const error = new LanhuError({
      code: "TEST",
      message: "test",
      details: [{ password: "supersecretpass" }]
    });

    writeError(error);

    const parsed = JSON.parse(stderrOutput);
    expect(parsed.error.details[0].password).toBe("supe***pass");
  });
});

describe("writeJson", () => {
  let stdoutOutput: string;

  beforeEach(() => {
    stdoutOutput = "";
    vi.spyOn(process.stdout, "write").mockImplementation((chunk: string | Uint8Array) => {
      stdoutOutput += String(chunk);
      return true;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("writes pretty-printed JSON to stdout", () => {
    writeJson({ key: "value" });
    expect(JSON.parse(stdoutOutput)).toEqual({ key: "value" });
  });
});
