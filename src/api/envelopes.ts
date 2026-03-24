import { EXIT_CODES, LanhuError } from "../errors.js";

export function unwrapWorkbenchEnvelope<T>(payload: unknown): T {
  if (!payload || typeof payload !== "object") {
    throw invalidEnvelopeError("Lanhu returned an unexpected response body", payload);
  }

  const record = payload as Record<string, unknown>;
  const code = record.code;
  const msg = getString(record, ["msg", "message"]) ?? "Lanhu request failed";

  if (typeof code !== "number" || !("data" in record)) {
    throw invalidEnvelopeError("Lanhu returned an unexpected response envelope", payload);
  }

  if (code !== 0 && code !== 200) {
    throw new LanhuError({
      code: "BUSINESS_ERROR",
      message: msg,
      exitCode: EXIT_CODES.GENERAL,
      details: payload
    });
  }

  return record.data as T;
}

export function unwrapProjectEnvelope<T>(payload: unknown): T {
  if (!payload || typeof payload !== "object") {
    throw invalidEnvelopeError(
      "Lanhu returned an unexpected project API response body",
      payload
    );
  }

  const record = payload as Record<string, unknown>;
  const code = record.code;

  if (code !== undefined) {
    const success =
      code === 0 ||
      code === 200 ||
      code === "0" ||
      code === "00000" ||
      code === "200";

    if (!success) {
      throw new LanhuError({
        code: "BUSINESS_ERROR",
        message:
          getString(record, ["msg", "message", "error"]) ??
          "Lanhu project API request failed",
        exitCode: EXIT_CODES.GENERAL,
        details: payload
      });
    }
  }

  for (const key of ["result", "data", "list", "items"]) {
    if (key in record) {
      return record[key] as T;
    }
  }

  if (code === undefined) {
    throw invalidEnvelopeError(
      "Lanhu returned a project API response without a status code or recognized data field",
      payload
    );
  }

  return payload as T;
}

export function extractCollection(
  payload: unknown,
  candidates: string[]
): unknown[] | undefined {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!payload || typeof payload !== "object") {
    return undefined;
  }

  const record = payload as Record<string, unknown>;

  for (const key of candidates) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value;
    }
  }

  for (const value of Object.values(record)) {
    if (!value || typeof value !== "object") {
      continue;
    }

    const nested = extractCollection(value, candidates);
    if (nested) {
      return nested;
    }
  }

  return undefined;
}

export function getString(
  record: Record<string, unknown>,
  keys: string[]
): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return undefined;
}

function invalidEnvelopeError(message: string, payload: unknown): LanhuError {
  return new LanhuError({
    code: "INVALID_RESPONSE",
    message,
    exitCode: EXIT_CODES.GENERAL,
    details: payload
  });
}
