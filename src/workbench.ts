import { EXIT_CODES, LanhuError } from "./errors.js";

export interface WorkbenchEnvelope<T> {
  code: number;
  msg: string;
  data: T;
}

export function unwrapWorkbenchResponse<T>(payload: unknown): T {
  if (!payload || typeof payload !== "object") {
    throw new LanhuError({
      code: "INVALID_RESPONSE",
      message: "Lanhu returned an unexpected response body",
      exitCode: EXIT_CODES.GENERAL,
      details: payload
    });
  }

  const envelope = payload as Partial<WorkbenchEnvelope<T>>;

  if (typeof envelope.code !== "number" || typeof envelope.msg !== "string") {
    throw new LanhuError({
      code: "INVALID_RESPONSE",
      message: "Lanhu returned an unexpected response envelope",
      exitCode: EXIT_CODES.GENERAL,
      details: payload
    });
  }

  if (envelope.code !== 0 && envelope.code !== 200) {
    throw new LanhuError({
      code: "BUSINESS_ERROR",
      message: envelope.msg || "Lanhu request failed",
      exitCode: EXIT_CODES.GENERAL,
      details: payload
    });
  }

  return envelope.data as T;
}
