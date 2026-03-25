import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { execa } from "execa";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");
const entryFile = resolve(projectRoot, "src/index.ts");

describe("CLI integration", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "lanhu-cli-e2e-"));
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(tempDir, { recursive: true, force: true });
  });

  it("persists config and shows it", async () => {
    const env = {
      ...process.env,
      XDG_CONFIG_HOME: tempDir
    };

    await execa(process.execPath, ["--import", "tsx", entryFile, "auth", "set", "--cookie", "session=secret"], {
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
      session: {
        hasCookie: boolean;
      };
      context: {
        tenantId?: string;
      };
      sources: {
        cookie: string;
        tenantId: string;
      };
    };

    expect(payload.session.hasCookie).toBe(true);
    expect(payload.context.tenantId).toBeUndefined();
    expect(payload.sources.cookie).toBe("config");
    expect(payload.sources.tenantId).toBe("unset");
  });

  it("returns auth exit code when request is attempted without a cookie", async () => {
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

  it("rejects non-integer timeout values as usage errors", async () => {
    const env = {
      ...process.env,
      XDG_CONFIG_HOME: tempDir
    };

    const result = await execa(
      process.execPath,
      [
        "--import",
        "tsx",
        entryFile,
        "auth",
        "set",
        "--cookie",
        "session=secret",
        "--timeout",
        "1500.5"
      ],
      {
        cwd: projectRoot,
        env,
        reject: false
      }
    );

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("INVALID_TIMEOUT");
  });

  it("prints team choices before interactive switch prompt", async () => {
    const stdoutChunks: string[] = [];
    vi.spyOn(process.stdout, "write").mockImplementation((chunk: string | Uint8Array) => {
      stdoutChunks.push(String(chunk));
      return true;
    });

    const teamItems = [
      { tenantId: "team-1", name: "Team One", isCurrent: false, raw: {} },
      { tenantId: "team-2", name: "Team Two", isCurrent: true, raw: {} }
    ];

    const { TeamService } = await import("../src/services/team-service.js");
    const interactive = await import("../src/cli/interactive.js");
    const { buildCli } = await import("../src/cli.js");

    vi.spyOn(TeamService.prototype, "list").mockResolvedValue({
      config: {
        session: {
          baseUrl: "https://lanhuapp.com/workbench/api",
          cookie: "session=secret",
          timeoutMs: 1_000,
          profile: "default"
        },
        context: {}
      },
      items: teamItems
    });
    vi.spyOn(TeamService.prototype, "switch").mockResolvedValue({
      config: {
        session: {
          baseUrl: "https://lanhuapp.com/workbench/api",
          cookie: "session=secret",
          timeoutMs: 1_000,
          profile: "default"
        },
        context: {
          tenantId: "team-2"
        }
      },
      items: teamItems,
      selected: teamItems[1]!
    });
    vi.spyOn(interactive, "promptTeamSelection").mockResolvedValue("2");

    const program = buildCli();
    await program.parseAsync(["team", "switch"], { from: "user" });

    const output = stdoutChunks.join("");
    expect(output).toContain("Teams:");
    expect(output).toContain("1. Team One");
    expect(output).toContain("2. Team Two");
    expect(output.indexOf("Teams:")).toBeLessThan(output.indexOf("Switched to Team Two"));
  });

  it("prints project choices before interactive switch prompt", async () => {
    const stdoutChunks: string[] = [];
    vi.spyOn(process.stdout, "write").mockImplementation((chunk: string | Uint8Array) => {
      stdoutChunks.push(String(chunk));
      return true;
    });

    const projectItems = [
      {
        id: 1,
        name: "Project One",
        type: "project",
        projectId: "project-1",
        parentId: 0,
        isCurrent: false,
        raw: {}
      },
      {
        id: 2,
        name: "Folder Two",
        type: "folder",
        projectId: "project-2",
        parentId: 0,
        isCurrent: true,
        raw: {}
      }
    ];

    const { ProjectService } = await import("../src/services/project-service.js");
    const interactive = await import("../src/cli/interactive.js");
    const { buildCli } = await import("../src/cli.js");

    vi.spyOn(ProjectService.prototype, "list").mockResolvedValue({
      config: {
        session: {
          baseUrl: "https://lanhuapp.com/workbench/api",
          cookie: "session=secret",
          timeoutMs: 1_000,
          profile: "default"
        },
        context: {
          tenantId: "tenant-1"
        }
      },
      items: projectItems
    });
    vi.spyOn(ProjectService.prototype, "switch").mockResolvedValue({
      config: {
        session: {
          baseUrl: "https://lanhuapp.com/workbench/api",
          cookie: "session=secret",
          timeoutMs: 1_000,
          profile: "default"
        },
        context: {
          tenantId: "tenant-1",
          projectId: "project-2"
        }
      },
      items: projectItems,
      selected: projectItems[1]!
    });
    vi.spyOn(interactive, "promptProjectSelection").mockResolvedValue("2");

    const program = buildCli();
    await program.parseAsync(["project", "switch"], { from: "user" });

    const output = stdoutChunks.join("");
    expect(output).toContain("Projects:");
    expect(output).toContain("1. Project One");
    expect(output).toContain("2. Folder Two [folder]");
    expect(output.indexOf("Projects:")).toBeLessThan(output.indexOf("Switched to Folder Two"));
  });
});
