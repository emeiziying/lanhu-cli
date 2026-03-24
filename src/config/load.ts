import {
  DEFAULT_BASE_URL,
  DEFAULT_PROFILE,
  DEFAULT_TIMEOUT_MS
} from "../constants.js";
import { EXIT_CODES, LanhuError } from "../errors.js";
import { type LanhuConfigMeta, type ConfigSource } from "../types.js";
import { getConfigPath, readStoredConfig } from "./store.js";
import { resolvedConfigSchema, type StoredConfig } from "./schema.js";

type ConfigOverrides = Partial<{
  baseUrl: string;
  token: string;
  timeoutMs: number;
  profile: string;
}>;

function parseTimeout(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const timeout = Number(value);

  if (!Number.isInteger(timeout) || timeout <= 0) {
    throw new LanhuError({
      code: "INVALID_ENV",
      message: "LANHU_TIMEOUT_MS must be a positive integer",
      exitCode: EXIT_CODES.USAGE
    });
  }

  return timeout;
}

function getEnvConfig(): StoredConfig {
  return {
    baseUrl: process.env.LANHU_BASE_URL,
    token: process.env.LANHU_TOKEN,
    timeoutMs: parseTimeout(process.env.LANHU_TIMEOUT_MS),
    profile: process.env.LANHU_PROFILE
  };
}

function getSource(
  field: keyof LanhuConfigMeta["config"],
  overrides: ConfigOverrides,
  envConfig: StoredConfig,
  fileConfig: StoredConfig
): ConfigSource {
  if (overrides[field] !== undefined) {
    return "flag";
  }

  if (envConfig[field] !== undefined) {
    return "env";
  }

  if (fileConfig[field] !== undefined) {
    return "config";
  }

  if (field === "token") {
    return "unset";
  }

  return "default";
}

export async function loadConfig(
  overrides: ConfigOverrides = {}
): Promise<LanhuConfigMeta["config"]> {
  const { config } = await loadConfigWithMeta(overrides);
  return config;
}

export async function loadConfigWithMeta(
  overrides: ConfigOverrides = {}
): Promise<LanhuConfigMeta> {
  const fileConfig = await readStoredConfig();
  const envConfig = stripUndefined(getEnvConfig());

  const merged = resolvedConfigSchema.parse({
    baseUrl: DEFAULT_BASE_URL,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    profile: DEFAULT_PROFILE,
    ...fileConfig,
    ...envConfig,
    ...stripUndefined(overrides)
  });

  return {
    config: merged,
    configPath: getConfigPath(),
    sources: {
      baseUrl: getSource("baseUrl", overrides, envConfig, fileConfig),
      token: getSource("token", overrides, envConfig, fileConfig),
      timeoutMs: getSource("timeoutMs", overrides, envConfig, fileConfig),
      profile: getSource("profile", overrides, envConfig, fileConfig)
    }
  };
}

function stripUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  ) as T;
}
