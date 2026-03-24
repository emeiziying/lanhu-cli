import { chmod, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

import {
  CONFIG_DIR_NAME,
  CONFIG_FILE_NAME
} from "../constants.js";
import { EXIT_CODES, LanhuError } from "../errors.js";
import {
  type StoredConfig,
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

export async function readStoredConfig(): Promise<StoredConfig> {
  const configPath = getConfigPath();

  try {
    const raw = await readFile(configPath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return normalizeStoredConfig(storedConfigFileSchema.parse(parsed));
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;

    if (nodeError?.code === "ENOENT") {
      return {};
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

function normalizeStoredConfig(
  config: Record<string, unknown>
): StoredConfig {
  return storedConfigSchema.parse({
    baseUrl: config.baseUrl,
    cookie: config.cookie,
    tenantId: config.tenantId,
    projectId: config.projectId,
    timeoutMs: config.timeoutMs,
    profile: config.profile
  });
}

export async function writeStoredConfig(config: StoredConfig): Promise<void> {
  const normalized = storedConfigSchema.parse(stripUndefined(config));
  const configPath = getConfigPath();

  await ensureConfigDir();
  await writeFile(configPath, `${JSON.stringify(normalized, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600
  });
  await chmod(configPath, 0o600);
}

export async function clearStoredConfig(): Promise<void> {
  await rm(getConfigPath(), {
    force: true
  });
}

function stripUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  ) as T;
}
