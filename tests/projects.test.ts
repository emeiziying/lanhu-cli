import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  Agent,
  MockAgent,
  getGlobalDispatcher,
  setGlobalDispatcher
} from "undici";

import { LanhuError } from "../src/errors.js";
import {
  resolveProjectSelection
} from "../src/domain/projects.js";
import { ProjectService } from "../src/services/project-service.js";

describe("listProjects", () => {
  const originalDispatcher = getGlobalDispatcher();
  const originalEnv = { ...process.env };
  let mockAgent: MockAgent;
  let tempDir: string;
  let service: ProjectService;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "lanhu-cli-projects-"));
    process.env.XDG_CONFIG_HOME = tempDir;
    mockAgent = new MockAgent();
    mockAgent.disableNetConnect();
    setGlobalDispatcher(mockAgent);
    service = new ProjectService();
  });

  afterEach(async () => {
    process.env = { ...originalEnv };
    await rm(tempDir, { recursive: true, force: true });
    await mockAgent.close();
    setGlobalDispatcher(originalDispatcher as Agent);
  });

  it("lists root projects via abstractfile/list", async () => {
    const pool = mockAgent.get("https://lanhuapp.com");

    pool
      .intercept({
        method: "POST",
        path: "/workbench/api/workbench/abstractfile/list",
        headers: {
          cookie: "session=secret"
        },
        body: JSON.stringify({
          tenantId: "tenant-1",
          parentId: 0
        })
      })
      .reply(200, {
        code: 0,
        msg: "success",
        data: [
          {
            id: 1,
            sourceName: "Demo",
            sourceType: "project",
            sourceId: "abc",
            sourceShortId: "xyz",
            parentId: 0
          }
        ]
      });

    const result = await service.list({
      baseUrl: "https://lanhuapp.com/workbench/api",
      cookie: "session=secret",
      tenantId: "tenant-1",
      timeoutMs: 1_000,
      profile: "default"
    });

    expect(result.items).toEqual([
      expect.objectContaining({
        id: 1,
        name: "Demo",
        type: "project"
      })
    ]);
  });

  it("requires tenantId", async () => {
    await expect(
      service.list({
        baseUrl: "https://lanhuapp.com/workbench/api",
        cookie: "session=secret",
        timeoutMs: 1_000,
        profile: "default"
      })
    ).rejects.toMatchObject({
      code: "TENANT_REQUIRED"
    } satisfies Partial<LanhuError>);
  });

  it("selects a project by sourceId or shortId", () => {
    const projects = [
      {
        id: 1,
        name: "Demo",
        type: "project",
        projectId: "project-1",
        shortId: "demo-1",
        parentId: 0,
        isCurrent: false,
        raw: {}
      },
      {
        id: 2,
        name: "Demo 2",
        type: "project",
        projectId: "project-2",
        shortId: "demo-2",
        parentId: 0,
        isCurrent: false,
        raw: {}
      }
    ];

    expect(resolveProjectSelection(projects, "demo-2").projectId).toBe("project-2");
    expect(resolveProjectSelection(projects, "1").projectId).toBe("project-1");
  });

  it("switches the current project", async () => {
    const pool = mockAgent.get("https://lanhuapp.com");

    pool
      .intercept({
        method: "POST",
        path: "/workbench/api/workbench/abstractfile/list",
        headers: {
          cookie: "session=secret"
        },
        body: JSON.stringify({
          tenantId: "tenant-1",
          parentId: 0
        })
      })
      .reply(200, {
        code: 0,
        msg: "success",
        data: [
          {
            id: 1,
            sourceName: "Demo",
            sourceType: "project",
            sourceId: "project-1",
            sourceShortId: "demo-1",
            parentId: 0
          }
        ]
      });

    const updatedConfig = await service.switch("project-1", {
      baseUrl: "https://lanhuapp.com/workbench/api",
      cookie: "session=secret",
      tenantId: "tenant-1",
      timeoutMs: 1_000,
      profile: "default"
    });

    expect(updatedConfig.config.context.projectId).toBe("project-1");
  });

  it("reads project detail payload from project multi_info", async () => {
    const pool = mockAgent.get("https://lanhuapp.com");

    pool
      .intercept({
        method: "GET",
        path: "/api/project/multi_info?project_id=project-1&team_id=tenant-1&img_limit=1&detach=1",
        headers: {
          cookie: "session=secret"
        }
      })
      .reply(200, {
        code: "00000",
        msg: "success",
        result: {
          project_id: "project-1",
          name: "Demo Project"
        }
      });

    const result = await service.detail({
      baseUrl: "https://lanhuapp.com/workbench/api",
      cookie: "session=secret",
      tenantId: "tenant-1",
      projectId: "project-1",
      timeoutMs: 1_000,
      profile: "default"
    });

    expect(result.detail).toEqual({
      project_id: "project-1",
      name: "Demo Project"
    });
  });
});
