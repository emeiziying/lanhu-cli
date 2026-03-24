import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { loadConfigWithMeta } from "../src/config/load.js";
import {
  clearStoredConfig,
  getConfigPath,
  writeStoredConfig
} from "../src/config/store.js";

describe("config loading", () => {
  const originalEnv = { ...process.env };
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "lanhu-cli-config-"));
    process.env.XDG_CONFIG_HOME = tempDir;
    delete process.env.LANHU_BASE_URL;
    delete process.env.LANHU_COOKIE;
    delete process.env.LANHU_TENANT_ID;
    delete process.env.LANHU_PROJECT_ID;
    delete process.env.LANHU_TIMEOUT_MS;
    delete process.env.LANHU_PROFILE;
    await clearStoredConfig();
  });

  afterEach(async () => {
    process.env = { ...originalEnv };
    await rm(tempDir, { recursive: true, force: true });
  });

  it("applies flag overrides over env and file config", async () => {
    await writeStoredConfig({
      baseUrl: "https://config.example.com",
      cookie: "config-cookie",
      tenantId: "config-tenant",
      projectId: "config-project",
      timeoutMs: 2_000,
      profile: "config"
    });

    process.env.LANHU_BASE_URL = "https://env.example.com";
    process.env.LANHU_COOKIE = "env-cookie";
    process.env.LANHU_TENANT_ID = "env-tenant";
    process.env.LANHU_PROJECT_ID = "env-project";
    process.env.LANHU_TIMEOUT_MS = "3000";
    process.env.LANHU_PROFILE = "env";

    const meta = await loadConfigWithMeta({
      cookie: "flag-cookie",
      tenantId: "flag-tenant",
      projectId: "flag-project",
      timeoutMs: 4_000
    });

    expect(meta.config).toEqual({
      baseUrl: "https://env.example.com",
      cookie: "flag-cookie",
      tenantId: "flag-tenant",
      projectId: "flag-project",
      timeoutMs: 4_000,
      profile: "env"
    });

    expect(meta.sources).toEqual({
      baseUrl: "env",
      cookie: "flag",
      tenantId: "flag",
      projectId: "flag",
      timeoutMs: "flag",
      profile: "env"
    });
  });

  it("falls back to defaults when config is empty", async () => {
    const meta = await loadConfigWithMeta();

    expect(meta.config.baseUrl).toBe("https://lanhuapp.com/workbench/api");
    expect(meta.config.timeoutMs).toBe(15_000);
    expect(meta.config.profile).toBe("default");
    expect(meta.config.cookie).toBeUndefined();
    expect(meta.config.tenantId).toBeUndefined();
    expect(meta.config.projectId).toBeUndefined();
    expect(meta.sources.cookie).toBe("unset");
    expect(meta.sources.tenantId).toBe("unset");
    expect(meta.sources.projectId).toBe("unset");
  });

  it("ignores legacy token field in stored config", async () => {
    const configPath = getConfigPath();
    await mkdir(dirname(configPath), { recursive: true });

    await writeFile(
      configPath,
      `${JSON.stringify(
        {
          token: "legacy-token",
          baseUrl: "https://legacy.example.com",
          tenantId: "legacy-tenant",
          projectId: "legacy-project"
        },
        null,
        2
      )}\n`,
      "utf8"
    );

    const meta = await loadConfigWithMeta();

    expect(meta.config).toEqual({
      baseUrl: "https://legacy.example.com",
      tenantId: "legacy-tenant",
      projectId: "legacy-project",
      timeoutMs: 15_000,
      profile: "default"
    });
    expect(meta.config.cookie).toBeUndefined();
    expect(meta.sources.cookie).toBe("unset");
    expect(meta.sources.tenantId).toBe("config");
    expect(meta.sources.projectId).toBe("config");
  });
});
