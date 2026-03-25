import { EXIT_CODES, LanhuError } from "./errors.js";
import { normalizeConfigInput } from "./config/compat.js";
import { loadResolvedConfigWithMeta } from "./config/loader.js";
import { replaceStoredContext } from "./config/context-store.js";
import { clearStoredConfigFile } from "./config/file-store.js";
import { readStoredSession, writeStoredSession } from "./config/session-store.js";
import {
  type LanhuConfigInput,
  type LanhuResolvedContext,
  type LanhuWorkspaceContext
} from "./types.js";

export interface AuthSetOptions {
  cookie: string;
  baseUrl?: string;
  timeoutMs?: number;
  profile?: string;
}

export async function setAuthConfig(
  options: AuthSetOptions
): Promise<LanhuResolvedContext> {
  const existing = await readStoredSession();

  await writeStoredSession({
    ...existing,
    baseUrl: options.baseUrl ?? existing.baseUrl,
    cookie: options.cookie,
    timeoutMs: options.timeoutMs ?? existing.timeoutMs,
    profile: options.profile ?? existing.profile
  });

  const { config } = await loadResolvedConfigWithMeta();
  return config;
}

export async function updateWorkspaceContext(
  context: LanhuWorkspaceContext
): Promise<LanhuResolvedContext> {
  const { config } = await loadResolvedConfigWithMeta();

  await replaceStoredContext({
    ...config.context,
    ...context
  });

  return loadResolvedConfigWithMeta().then((result) => result.config);
}

export async function showAuthConfig(): Promise<
  Awaited<ReturnType<typeof loadResolvedConfigWithMeta>>
> {
  return loadResolvedConfigWithMeta();
}

export async function clearAuthConfig(): Promise<void> {
  await clearStoredConfigFile();
}

export function assertHasCookie(config: LanhuConfigInput): void {
  if (!normalizeConfigInput(config).session.cookie) {
    throw new LanhuError({
      code: "AUTH_REQUIRED",
      message: "No cookie configured. Run `lanhu auth set --cookie <cookie>` first.",
      exitCode: EXIT_CODES.AUTH
    });
  }
}

export function assertHasTenantId(config: LanhuConfigInput): void {
  if (!normalizeConfigInput(config).context.tenantId) {
    throw new LanhuError({
      code: "TENANT_REQUIRED",
      message: "No tenantId configured. Run `lanhu team switch` first.",
      exitCode: EXIT_CODES.USAGE
    });
  }
}

export function assertHasProjectId(config: LanhuConfigInput): void {
  if (!normalizeConfigInput(config).context.projectId) {
    throw new LanhuError({
      code: "PROJECT_REQUIRED",
      message: "No projectId configured. Run `lanhu project switch` first.",
      exitCode: EXIT_CODES.USAGE
    });
  }
}

export function maskSecret(secret?: string): string | undefined {
  if (secret === undefined || secret === "") {
    return undefined;
  }

  if (secret.length <= 8) {
    return `${secret.slice(0, 2)}***`;
  }

  return `${secret.slice(0, 4)}***${secret.slice(-4)}`;
}
