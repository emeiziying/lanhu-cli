import {
  DEFAULT_BASE_URL,
  DEFAULT_PROFILE,
  DEFAULT_TIMEOUT_MS
} from "../constants.js";
import {
  type ConfigSource,
  type LanhuConfigKey,
  type LanhuConfigMeta,
  type LanhuConfigOverrides,
  type LanhuResolvedContext
} from "../types.js";
import { parseTimeoutMs } from "../utils/parse-options.js";
import { getConfigPath, readStoredConfigFile } from "./file-store.js";
import { resolvedConfigSchema, type StoredLanhuConfig } from "./schema.js";

function getEnvOverrides(): LanhuConfigOverrides {
  return {
    baseUrl: process.env.LANHU_BASE_URL,
    cookie: process.env.LANHU_COOKIE,
    timeoutMs: parseTimeoutMs(process.env.LANHU_TIMEOUT_MS),
    profile: process.env.LANHU_PROFILE,
    tenantId: process.env.LANHU_TENANT_ID,
    projectId: process.env.LANHU_PROJECT_ID
  };
}

export async function loadResolvedConfig(
  overrides: LanhuConfigOverrides = {}
): Promise<LanhuResolvedContext> {
  const { config } = await loadResolvedConfigWithMeta(overrides);
  return config;
}

export async function loadResolvedConfigWithMeta(
  overrides: LanhuConfigOverrides = {}
): Promise<LanhuConfigMeta> {
  const fileConfig = await readStoredConfigFile();
  const envOverrides = stripUndefined(getEnvOverrides());
  const flagOverrides = stripUndefined(overrides);

  const merged = resolvedConfigSchema.parse({
    session: {
      baseUrl: DEFAULT_BASE_URL,
      timeoutMs: DEFAULT_TIMEOUT_MS,
      profile: DEFAULT_PROFILE,
      ...fileConfig.session,
      ...extractSessionOverrides(envOverrides),
      ...extractSessionOverrides(flagOverrides)
    },
    context: {
      ...fileConfig.context,
      ...extractContextOverrides(envOverrides),
      ...extractContextOverrides(flagOverrides)
    }
  });

  return {
    config: merged,
    configPath: getConfigPath(),
    sources: {
      baseUrl: getSource("baseUrl", flagOverrides, envOverrides, fileConfig),
      cookie: getSource("cookie", flagOverrides, envOverrides, fileConfig),
      timeoutMs: getSource("timeoutMs", flagOverrides, envOverrides, fileConfig),
      profile: getSource("profile", flagOverrides, envOverrides, fileConfig),
      tenantId: getSource("tenantId", flagOverrides, envOverrides, fileConfig),
      projectId: getSource("projectId", flagOverrides, envOverrides, fileConfig)
    }
  };
}

function extractSessionOverrides(
  overrides: LanhuConfigOverrides
): Record<string, unknown> {
  return stripUndefined({
    baseUrl: overrides.baseUrl,
    cookie: overrides.cookie,
    timeoutMs: overrides.timeoutMs,
    profile: overrides.profile
  });
}

function extractContextOverrides(
  overrides: LanhuConfigOverrides
): Record<string, unknown> {
  return stripUndefined({
    tenantId: overrides.tenantId,
    projectId: overrides.projectId
  });
}

function getSource(
  field: LanhuConfigKey,
  flagOverrides: LanhuConfigOverrides,
  envOverrides: LanhuConfigOverrides,
  fileConfig: StoredLanhuConfig
): ConfigSource {
  if (flagOverrides[field] !== undefined) {
    return "flag";
  }

  if (envOverrides[field] !== undefined) {
    return "env";
  }

  if (field in fileConfig.session && fileConfig.session[field as keyof typeof fileConfig.session] !== undefined) {
    return "config";
  }

  if (field in fileConfig.context && fileConfig.context[field as keyof typeof fileConfig.context] !== undefined) {
    return "config";
  }

  if (field === "cookie" || field === "tenantId" || field === "projectId") {
    return "unset";
  }

  return "default";
}

function stripUndefined<T extends object>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  ) as T;
}
