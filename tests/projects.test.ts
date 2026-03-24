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
  getProjectDetail,
  listProjects,
  resolveProjectSelection,
  switchProject
} from "../src/projects.js";

describe("listProjects", () => {
  const originalDispatcher = getGlobalDispatcher();
  const originalEnv = { ...process.env };
  let mockAgent: MockAgent;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "lanhu-cli-projects-"));
    process.env.XDG_CONFIG_HOME = tempDir;
    mockAgent = new MockAgent();
    mockAgent.disableNetConnect();
    setGlobalDispatcher(mockAgent);
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

    const items = await listProjects({
      baseUrl: "https://lanhuapp.com/workbench/api",
      cookie: "session=secret",
      tenantId: "tenant-1",
      timeoutMs: 1_000,
      profile: "default"
    });

    expect(items).toEqual([
      expect.objectContaining({
        id: 1,
        sourceName: "Demo",
        sourceType: "project"
      })
    ]);
  });

  it("requires tenantId", async () => {
    await expect(
      listProjects({
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
        sourceName: "Demo",
        sourceType: "project",
        sourceId: "project-1",
        sourceShortId: "demo-1",
        parentId: 0
      },
      {
        id: 2,
        sourceName: "Demo 2",
        sourceType: "project",
        sourceId: "project-2",
        sourceShortId: "demo-2",
        parentId: 0
      }
    ];

    expect(resolveProjectSelection(projects, "demo-2").sourceId).toBe("project-2");
    expect(resolveProjectSelection(projects, "1").sourceId).toBe("project-1");
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

    const updatedConfig = await switchProject(
      {
        baseUrl: "https://lanhuapp.com/workbench/api",
        cookie: "session=secret",
        tenantId: "tenant-1",
        timeoutMs: 1_000,
        profile: "default"
      },
      {
        projectId: "project-1"
      }
    );

    expect(updatedConfig.projectId).toBe("project-1");
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

    const detail = await getProjectDetail({
      baseUrl: "https://lanhuapp.com/workbench/api",
      cookie: "session=secret",
      tenantId: "tenant-1",
      projectId: "project-1",
      timeoutMs: 1_000,
      profile: "default"
    });

    expect(detail).toEqual({
      project_id: "project-1",
      name: "Demo Project"
    });
  });
});
