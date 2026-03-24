import { LanhuError, isLanhuError } from "../errors.js";

const SENSITIVE_KEYS = new Set(["cookie", "authorization", "token", "secret", "password"]);

export function writeJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

export function writeError(error: unknown, verbose = false): void {
  const normalized = normalizeError(error);
  const payload: Record<string, unknown> = {
    error: {
      code: normalized.code,
      message: normalized.message
    }
  };

  if (normalized.httpStatus !== undefined) {
    payload.error = {
      ...(payload.error as Record<string, unknown>),
      httpStatus: normalized.httpStatus
    };
  }

  if (normalized.requestId !== undefined) {
    payload.error = {
      ...(payload.error as Record<string, unknown>),
      requestId: normalized.requestId
    };
  }

  if (normalized.details !== undefined) {
    payload.error = {
      ...(payload.error as Record<string, unknown>),
      details: redactSensitiveFields(normalized.details)
    };
  }

  if (verbose && normalized.stack) {
    payload.error = {
      ...(payload.error as Record<string, unknown>),
      stack: normalized.stack
    };
  }

  process.stderr.write(`${JSON.stringify(payload, null, 2)}\n`);
}

function redactSensitiveFields(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactSensitiveFields(item));
  }

  if (typeof value === "object") {
    const result: Record<string, unknown> = {};

    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase()) && typeof val === "string") {
        result[key] = val.length > 8
          ? `${val.slice(0, 4)}***${val.slice(-4)}`
          : `${val.slice(0, 2)}***`;
      } else {
        result[key] = redactSensitiveFields(val);
      }
    }

    return result;
  }

  return value;
}

function normalizeError(error: unknown): LanhuError {
  if (isLanhuError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new LanhuError({
      code: "UNEXPECTED_ERROR",
      message: error.message,
      cause: error
    });
  }

  return new LanhuError({
    code: "UNEXPECTED_ERROR",
    message: "An unknown error occurred",
    details: error
  });
}
