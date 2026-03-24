import { EXIT_CODES, LanhuError } from "./errors.js";
import { loadConfigWithMeta } from "./config/load.js";
import {
  clearStoredConfig,
  readStoredConfig,
  writeStoredConfig
} from "./config/store.js";
import { type LanhuConfig } from "./types.js";

export interface AuthSetOptions {
  token: string;
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
    token: options.token,
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

export function assertHasToken(config: LanhuConfig): void {
  if (!config.token) {
    throw new LanhuError({
      code: "AUTH_REQUIRED",
      message: "No token configured. Run `lanhu auth set --token <token>` first.",
      exitCode: EXIT_CODES.AUTH
    });
  }
}

export function maskToken(token?: string): string | undefined {
  if (!token) {
    return undefined;
  }

  if (token.length <= 8) {
    return `${token.slice(0, 2)}***`;
  }

  return `${token.slice(0, 4)}***${token.slice(-4)}`;
}
