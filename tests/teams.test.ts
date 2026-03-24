import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  Agent,
  MockAgent,
  getGlobalDispatcher,
  setGlobalDispatcher
} from "undici";

import { LanhuError } from "../src/errors.js";
import {
  listTeams,
  normalizeTeamList,
  resolveTeamSelection
} from "../src/teams.js";

describe("teams", () => {
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

    const teams = await listTeams({
      baseUrl: "https://lanhuapp.com/workbench/api",
      cookie: "session=secret",
      timeoutMs: 1_000,
      profile: "default"
    });

    expect(teams).toEqual([
      expect.objectContaining({
        tenantId: "tenant-1",
        name: "Team One",
        current: true,
        memberCount: undefined
      }),
      expect.objectContaining({
        tenantId: "tenant-2",
        name: "Team Two",
        current: false
      })
    ]);
  });

  it("selects the current team on empty input", () => {
    const selected = resolveTeamSelection(
      [
        { tenantId: "t1", name: "A", current: false, raw: {} },
        { tenantId: "t2", name: "B", current: true, raw: {} }
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
        current: true
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
        [{ tenantId: "t1", name: "A", current: false, raw: {} }],
        "t2"
      )
    ).toThrowError(LanhuError);
  });
});
