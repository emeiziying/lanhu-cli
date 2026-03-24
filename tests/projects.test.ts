import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  Agent,
  MockAgent,
  getGlobalDispatcher,
  setGlobalDispatcher
} from "undici";

import { LanhuError } from "../src/errors.js";
import { listProjects } from "../src/projects.js";

describe("listProjects", () => {
  const originalDispatcher = getGlobalDispatcher();
  let mockAgent: MockAgent;

  beforeEach(() => {
    mockAgent = new MockAgent();
    mockAgent.disableNetConnect();
    setGlobalDispatcher(mockAgent);
  });

  afterEach(async () => {
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
});
