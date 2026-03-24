import { chmod, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

import {
  CONFIG_DIR_NAME,
  CONFIG_FILE_NAME
} from "../constants.js";
import { EXIT_CODES, LanhuError } from "../errors.js";
import {
  type StoredLanhuConfig,
  type StoredLanhuConfigFile,
  storedConfigFileSchema,
  storedConfigSchema
} from "./schema.js";

function getDefaultConfigRoot(): string {
  if (process.env.XDG_CONFIG_HOME) {
    return process.env.XDG_CONFIG_HOME;
  }

  if (process.platform === "darwin") {
    return join(homedir(), "Library", "Application Support");
  }

  if (process.platform === "win32" && process.env.APPDATA) {
    return process.env.APPDATA;
  }

  return join(homedir(), ".config");
}

export function getConfigPath(): string {
  return join(getDefaultConfigRoot(), CONFIG_DIR_NAME, CONFIG_FILE_NAME);
}

async function ensureConfigDir(): Promise<void> {
  await mkdir(dirname(getConfigPath()), {
    recursive: true,
    mode: 0o700
  });
}

export async function readStoredConfigFile(): Promise<StoredLanhuConfig> {
  const configPath = getConfigPath();

  try {
    const raw = await readFile(configPath, "utf8");
    const parsed = storedConfigFileSchema.parse(JSON.parse(raw) as unknown);
    return normalizeStoredConfig(parsed);
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;

    if (nodeError?.code === "ENOENT") {
      return storedConfigSchema.parse({});
    }

    throw new LanhuError({
      code: "INVALID_CONFIG",
      message: `Failed to read config file at ${configPath}`,
      exitCode: EXIT_CODES.GENERAL,
      details: {
        path: configPath,
        reason: error instanceof Error ? error.message : error
      },
      cause: error
    });
  }
}

export async function writeStoredConfigFile(
  config: StoredLanhuConfig
): Promise<void> {
  const normalized = storedConfigSchema.parse(stripUndefinedDeep(config));
  const configPath = getConfigPath();

  await ensureConfigDir();
  await writeFile(configPath, `${JSON.stringify(normalized, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600
  });
  await chmod(configPath, 0o600);
}

export async function clearStoredConfigFile(): Promise<void> {
  await rm(getConfigPath(), {
    force: true
  });
}

export function normalizeStoredConfig(
  config: StoredLanhuConfigFile
): StoredLanhuConfig {
  return storedConfigSchema.parse({
    session: {
      ...config.session,
      baseUrl: config.session?.baseUrl ?? config.baseUrl,
      cookie: config.session?.cookie ?? config.cookie,
      timeoutMs: config.session?.timeoutMs ?? config.timeoutMs,
      profile: config.session?.profile ?? config.profile
    },
    context: {
      ...config.context,
      tenantId: config.context?.tenantId ?? config.tenantId,
      projectId: config.context?.projectId ?? config.projectId
    }
  });
}

function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((entry) => stripUndefinedDeep(entry)) as T;
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entryValue]) => entryValue !== undefined)
      .map(([key, entryValue]) => [key, stripUndefinedDeep(entryValue)])
  ) as T;
}
