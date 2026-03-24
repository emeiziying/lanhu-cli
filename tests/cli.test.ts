import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { execa } from "execa";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");
const entryFile = resolve(projectRoot, "src/index.ts");

describe("CLI integration", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "lanhu-cli-e2e-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("persists config and shows it", async () => {
    const env = {
      ...process.env,
      XDG_CONFIG_HOME: tempDir
    };

    await execa(process.execPath, ["--import", "tsx", entryFile, "auth", "set", "--token", "secret"], {
      cwd: projectRoot,
      env
    });

    const result = await execa(
      process.execPath,
      ["--import", "tsx", entryFile, "auth", "show"],
      {
        cwd: projectRoot,
        env
      }
    );

    const payload = JSON.parse(result.stdout) as {
      hasToken: boolean;
      sources: {
        token: string;
      };
    };

    expect(payload.hasToken).toBe(true);
    expect(payload.sources.token).toBe("config");
  });

  it("returns auth exit code when request is attempted without a token", async () => {
    const env = {
      ...process.env,
      XDG_CONFIG_HOME: tempDir
    };

    const result = await execa(
      process.execPath,
      ["--import", "tsx", entryFile, "request", "GET", "/v1/projects"],
      {
        cwd: projectRoot,
        env,
        reject: false
      }
    );

    expect(result.exitCode).toBe(3);
    expect(result.stderr).toContain("AUTH_REQUIRED");
  });
});
