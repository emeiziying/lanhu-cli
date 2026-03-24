import { EXIT_CODES, LanhuError } from "./errors.js";
import { loadConfigWithMeta } from "./config/load.js";
import {
  clearStoredConfig,
  readStoredConfig,
  writeStoredConfig
} from "./config/store.js";
import { type LanhuConfig } from "./types.js";

export interface AuthSetOptions {
  cookie: string;
  baseUrl?: string;
  profile?: string;
}

export async function setAuthConfig(
  options: AuthSetOptions
): Promise<LanhuConfig> {
  const existing = await readStoredConfig();

  await writeStoredConfig({
    ...existing,
    baseUrl: options.baseUrl ?? existing.baseUrl,
    cookie: options.cookie,
    profile: options.profile ?? existing.profile
  });

  const { config } = await loadConfigWithMeta();
  return config;
}

export async function showAuthConfig(): Promise<
  Awaited<ReturnType<typeof loadConfigWithMeta>>
> {
  return loadConfigWithMeta();
}

export async function clearAuthConfig(): Promise<void> {
  await clearStoredConfig();
}

export function assertHasCookie(config: LanhuConfig): void {
  if (!config.cookie) {
    throw new LanhuError({
      code: "AUTH_REQUIRED",
      message: "No cookie configured. Run `lanhu auth set --cookie <cookie>` first.",
      exitCode: EXIT_CODES.AUTH
    });
  }
}

export function maskSecret(secret?: string): string | undefined {
  if (!secret) {
    return undefined;
  }

  if (secret.length <= 8) {
    return `${secret.slice(0, 2)}***`;
  }

  return `${secret.slice(0, 4)}***${secret.slice(-4)}`;
}
