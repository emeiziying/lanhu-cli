import { LanhuError, isLanhuError } from "../errors.js";

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
      details: normalized.details
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
