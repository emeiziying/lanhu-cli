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
  tenantId?: string;
  projectId?: string;
  profile?: string;
}

export async function setAuthConfig(
  options: AuthSetOptions
): Promise<LanhuConfig> {
  return updateAuthConfig(options);
}

export async function updateAuthConfig(
  options: Partial<AuthSetOptions>
): Promise<LanhuConfig> {
  const existing = await readStoredConfig();
  const hasOption = (key: keyof AuthSetOptions): boolean =>
    Object.prototype.hasOwnProperty.call(options, key);

  await writeStoredConfig({
    ...existing,
    baseUrl: hasOption("baseUrl") ? options.baseUrl : existing.baseUrl,
    cookie: hasOption("cookie") ? options.cookie : existing.cookie,
    tenantId: hasOption("tenantId") ? options.tenantId : existing.tenantId,
    projectId: hasOption("projectId") ? options.projectId : existing.projectId,
    profile: hasOption("profile") ? options.profile : existing.profile
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

export function assertHasTenantId(config: LanhuConfig): void {
  if (!config.tenantId) {
    throw new LanhuError({
      code: "TENANT_REQUIRED",
      message: "No tenantId configured. Run `lanhu auth set --tenant-id <tenantId> --cookie <cookie>` first.",
      exitCode: EXIT_CODES.USAGE
    });
  }
}

export function assertHasProjectId(config: LanhuConfig): void {
  if (!config.projectId) {
    throw new LanhuError({
      code: "PROJECT_REQUIRED",
      message: "No projectId configured. Run `lanhu project switch` first.",
      exitCode: EXIT_CODES.USAGE
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
