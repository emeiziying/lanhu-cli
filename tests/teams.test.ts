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
  normalizeTeamList,
  resolveTeamSelection
} from "../src/domain/teams.js";
import { TeamService } from "../src/services/team-service.js";

describe("teams", () => {
  const originalDispatcher = getGlobalDispatcher();
  const originalEnv = { ...process.env };
  let mockAgent: MockAgent;
  let tempDir: string;
  let service: TeamService;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "lanhu-cli-teams-"));
    process.env.XDG_CONFIG_HOME = tempDir;
    mockAgent = new MockAgent();
    mockAgent.disableNetConnect();
    setGlobalDispatcher(mockAgent);
    service = new TeamService();
  });

  afterEach(async () => {
    process.env = { ...originalEnv };
    await rm(tempDir, { recursive: true, force: true });
    await mockAgent.close();
    setGlobalDispatcher(originalDispatcher as Agent);
  });

  it("lists teams from the account API", async () => {
    const pool = mockAgent.get("https://lanhuapp.com");

    pool
      .intercept({
        method: "GET",
        path: "/api/account/user_teams?need_open_related=true",
        headers: {
          cookie: "session=secret"
        }
      })
      .reply(200, {
        code: 0,
        msg: "success",
        data: [
          {
            tenantId: "tenant-1",
            tenantName: "Team One",
            current: true
          },
          {
            tenantId: "tenant-2",
            tenantName: "Team Two"
          }
        ]
      });

    const result = await service.list({
      baseUrl: "https://lanhuapp.com/workbench/api",
      cookie: "session=secret",
      timeoutMs: 1_000,
      profile: "default"
    });

    expect(result.items).toEqual([
      expect.objectContaining({
        tenantId: "tenant-1",
        name: "Team One",
        isCurrent: true,
        memberCount: undefined
      }),
      expect.objectContaining({
        tenantId: "tenant-2",
        name: "Team Two",
        isCurrent: false
      })
    ]);
  });

  it("selects the current team on empty input", () => {
    const selected = resolveTeamSelection(
      [
        { tenantId: "t1", name: "A", isCurrent: false, raw: {} },
        { tenantId: "t2", name: "B", isCurrent: true, raw: {} }
      ],
      ""
    );

    expect(selected.tenantId).toBe("t2");
  });

  it("normalizes nested list payloads", () => {
    const teams = normalizeTeamList({
      data: {
        list: [
          {
            tenant_id: "tenant-1",
            name: "Team One",
            selected: 1
          }
        ]
      }
    });

    expect(teams).toEqual([
      expect.objectContaining({
        tenantId: "tenant-1",
        name: "Team One",
        isCurrent: true
      })
    ]);
  });

  it("normalizes result payloads from account API", () => {
    const teams = normalizeTeamList({
      code: "00000",
      msg: "success",
      result: [
        {
          id: "tenant-1",
          name: "Team One",
          member_num: 7,
          type: "normal",
          role: {
            display: "成员",
            name: "member"
          }
        }
      ]
    });

    expect(teams).toEqual([
      expect.objectContaining({
        tenantId: "tenant-1",
        name: "Team One",
        memberCount: 7,
        roleDisplay: "成员",
        roleName: "member",
        teamType: "normal"
      })
    ]);
  });

  it("fails when a team cannot be matched", () => {
    expect(() =>
      resolveTeamSelection(
        [{ tenantId: "t1", name: "A", isCurrent: false, raw: {} }],
        "t2"
      )
    ).toThrowError(LanhuError);
  });

  it("clears current project when switching teams", async () => {
    const pool = mockAgent.get("https://lanhuapp.com");

    pool
      .intercept({
        method: "GET",
        path: "/api/account/user_teams?need_open_related=true",
        headers: {
          cookie: "session=secret"
        }
      })
      .reply(200, {
        code: 0,
        msg: "success",
        data: [
          {
            tenantId: "tenant-2",
            tenantName: "Team Two"
          }
        ]
      });

    const updatedConfig = await service.switch("tenant-2", {
      baseUrl: "https://lanhuapp.com/workbench/api",
      cookie: "session=secret",
      tenantId: "tenant-1",
      projectId: "project-1",
      timeoutMs: 1_000,
      profile: "default"
    });

    expect(updatedConfig.config.context.tenantId).toBe("tenant-2");
    expect(updatedConfig.config.context.projectId).toBeUndefined();
  });

  it("reuses the caller-provided team snapshot when switching by index", async () => {
    const pool = mockAgent.get("https://lanhuapp.com");

    pool
      .intercept({
        method: "GET",
        path: "/api/account/user_teams?need_open_related=true",
        headers: {
          cookie: "session=secret"
        }
      })
      .reply(200, {
        code: 0,
        msg: "success",
        data: [
          {
            tenantId: "tenant-1",
            tenantName: "Team One"
          },
          {
            tenantId: "tenant-2",
            tenantName: "Team Two"
          }
        ]
      });

    const listResult = await service.list({
      baseUrl: "https://lanhuapp.com/workbench/api",
      cookie: "session=secret",
      timeoutMs: 1_000,
      profile: "default"
    });

    const updatedConfig = await service.switch(
      "2",
      {
        baseUrl: "https://lanhuapp.com/workbench/api",
        cookie: "session=secret",
        timeoutMs: 1_000,
        profile: "default"
      },
      listResult.items
    );

    expect(updatedConfig.selected.tenantId).toBe("tenant-2");
    expect(updatedConfig.config.context.tenantId).toBe("tenant-2");
  });
});
