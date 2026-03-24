import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { loadConfigWithMeta } from "../src/config/load.js";
import { clearStoredConfig, writeStoredConfig } from "../src/config/store.js";

describe("config loading", () => {
  const originalEnv = { ...process.env };
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "lanhu-cli-config-"));
    process.env.XDG_CONFIG_HOME = tempDir;
    delete process.env.LANHU_BASE_URL;
    delete process.env.LANHU_TOKEN;
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
      token: "config-token",
      timeoutMs: 2_000,
      profile: "config"
    });

    process.env.LANHU_BASE_URL = "https://env.example.com";
    process.env.LANHU_TOKEN = "env-token";
    process.env.LANHU_TIMEOUT_MS = "3000";
    process.env.LANHU_PROFILE = "env";

    const meta = await loadConfigWithMeta({
      token: "flag-token",
      timeoutMs: 4_000
    });

    expect(meta.config).toEqual({
      baseUrl: "https://env.example.com",
      token: "flag-token",
      timeoutMs: 4_000,
      profile: "env"
    });

    expect(meta.sources).toEqual({
      baseUrl: "env",
      token: "flag",
      timeoutMs: "flag",
      profile: "env"
    });
  });

  it("falls back to defaults when config is empty", async () => {
    const meta = await loadConfigWithMeta();

    expect(meta.config.baseUrl).toBe("https://openapi.lanhuapp.com");
    expect(meta.config.timeoutMs).toBe(15_000);
    expect(meta.config.profile).toBe("default");
    expect(meta.config.token).toBeUndefined();
    expect(meta.sources.token).toBe("unset");
  });
});
