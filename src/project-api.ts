import { EXIT_CODES, LanhuError } from "./errors.js";

export function unwrapProjectApiResponse<T>(payload: unknown): T {
  if (!payload || typeof payload !== "object") {
    throw new LanhuError({
      code: "INVALID_RESPONSE",
      message: "Lanhu returned an unexpected project API response body",
      exitCode: EXIT_CODES.GENERAL,
      details: payload
    });
  }

  const record = payload as Record<string, unknown>;
  const code = record.code;
  const success =
    code === 0 ||
    code === 200 ||
    code === "0" ||
    code === "00000" ||
    code === "200";

  if (code !== undefined && !success) {
    throw new LanhuError({
      code: "BUSINESS_ERROR",
      message:
        getString(record, ["msg", "message", "error"]) ??
        "Lanhu project API request failed",
      exitCode: EXIT_CODES.GENERAL,
      details: payload
    });
  }

  for (const key of ["result", "data", "list", "items"]) {
    if (key in record) {
      return record[key] as T;
    }
  }

  return payload as T;
}

function getString(
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
