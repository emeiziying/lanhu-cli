import { EXIT_CODES, LanhuError } from "../errors.js";
import { type LanhuConfigOverrides } from "../types.js";

export interface CommonCommandOptions {
  cookie?: string;
  baseUrl?: string;
  timeout?: string;
  profile?: string;
  tenantId?: string;
  projectId?: string;
}

export function parseTimeoutMs(raw: string | undefined): number | undefined {
  if (raw === undefined) {
    return undefined;
  }

  const value = Number(raw);

  if (!Number.isFinite(value) || value <= 0) {
    throw new LanhuError({
      code: "INVALID_TIMEOUT",
      message: `Invalid timeout value "${raw}": must be a positive number in milliseconds`,
      exitCode: EXIT_CODES.USAGE,
    });
  }

  return value;
}

export function toOverrides(options: CommonCommandOptions): LanhuConfigOverrides {
  return {
    cookie: options.cookie,
    baseUrl: options.baseUrl,
    timeoutMs: parseTimeoutMs(options.timeout),
    profile: options.profile,
    tenantId: options.tenantId,
    projectId: options.projectId,
  };
}
