import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { updateAuthConfig } from "./auth.js";
import { LanhuClient } from "./client.js";
import { EXIT_CODES, LanhuError } from "./errors.js";
import { type LanhuConfig } from "./types.js";
import { unwrapWorkbenchResponse } from "./workbench.js";

export interface TeamItem {
  tenantId: string;
  name: string;
  current: boolean;
  memberCount?: number;
  roleName?: string;
  roleDisplay?: string;
  teamType?: string;
  raw: Record<string, unknown>;
}

export async function listTeams(config: LanhuConfig): Promise<TeamItem[]> {
  const client = new LanhuClient(config);
  const accountApiUrl = new URL("/api/account/user_teams", new URL(config.baseUrl).origin);
  const response = await client.request<unknown>({
    method: "GET",
    path: accountApiUrl.toString(),
    query: {
      need_open_related: "true"
    }
  });

  return normalizeTeamList(response.data);
}

export async function switchTeam(
  config: LanhuConfig,
  options: {
    tenantId?: string;
    prompt?: (teams: TeamItem[]) => Promise<TeamItem>;
  } = {}
): Promise<LanhuConfig> {
  const teams = await listTeams(config);

  if (teams.length === 0) {
    throw new LanhuError({
      code: "NO_TEAMS",
      message: "No teams were returned by Lanhu",
      exitCode: EXIT_CODES.GENERAL
    });
  }

  const selected =
    options.tenantId !== undefined
      ? findTeamByTenantId(teams, options.tenantId)
      : await (options.prompt ?? promptForTeamSelection)(teams);

  return updateAuthConfig({
    tenantId: selected.tenantId
  });
}

export function normalizeTeamList(payload: unknown): TeamItem[] {
  const data = extractCollection(payload);

  if (!Array.isArray(data)) {
    throw new LanhuError({
      code: "INVALID_RESPONSE",
      message: "Lanhu returned an unexpected team list response",
      exitCode: EXIT_CODES.GENERAL,
      details: payload
    });
  }

  return data.map((entry) => normalizeTeam(entry));
}

export function resolveTeamSelection(
  teams: TeamItem[],
  rawInput: string
): TeamItem {
  if (teams.length === 0) {
    throw new LanhuError({
      code: "NO_TEAMS",
      message: "No teams are available for selection",
      exitCode: EXIT_CODES.GENERAL
    });
  }

  const trimmed = rawInput.trim();

  if (!trimmed) {
    return teams.find((team) => team.current) ?? teams[0]!;
  }

  const index = Number(trimmed);

  if (Number.isInteger(index) && index >= 1 && index <= teams.length) {
    return teams[index - 1]!;
  }

  return findTeamByTenantId(teams, trimmed);
}

async function promptForTeamSelection(teams: TeamItem[]): Promise<TeamItem> {
  output.write("Available teams:\n");

  teams.forEach((team, index) => {
    output.write(`${index + 1}. ${team.name}${team.current ? " [current]" : ""}\n`);
  });

  const rl = createInterface({ input, output });

  try {
    const answer = await rl.question(
      "Select a team number or tenantId and press Enter: "
    );
    return resolveTeamSelection(teams, answer);
  } finally {
    rl.close();
  }
}

function findTeamByTenantId(teams: TeamItem[], tenantId: string): TeamItem {
  const team = teams.find((entry) => entry.tenantId === tenantId);

  if (!team) {
    throw new LanhuError({
      code: "TEAM_NOT_FOUND",
      message: `Unable to find team ${tenantId}`,
      exitCode: EXIT_CODES.USAGE
    });
  }

  return team;
}

function extractCollection(payload: unknown): unknown {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!payload || typeof payload !== "object") {
    return payload;
  }

  const record = payload as Record<string, unknown>;

  if ("code" in record && "msg" in record && "data" in record) {
    return unwrapWorkbenchResponse(record);
  }

  const candidates = [
    "data",
    "result",
    "teams",
    "list",
    "items",
    "userTeams",
    "user_teams",
    "tenantList"
  ];

  for (const key of candidates) {
    const value = record[key];

    if (Array.isArray(value)) {
      return value;
    }

    if (value && typeof value === "object") {
      for (const nestedKey of candidates) {
        const nestedValue = (value as Record<string, unknown>)[nestedKey];
        if (Array.isArray(nestedValue)) {
          return nestedValue;
        }
      }
    }
  }

  return payload;
}

function normalizeTeam(entry: unknown): TeamItem {
  if (!entry || typeof entry !== "object") {
    throw new LanhuError({
      code: "INVALID_RESPONSE",
      message: "Lanhu returned an unexpected team entry",
      exitCode: EXIT_CODES.GENERAL,
      details: entry
    });
  }

  const record = entry as Record<string, unknown>;
  const tenantId = pickString(record, [
    "tenantId",
    "tenant_id",
    "id",
    "teamId",
    "team_id"
  ]);

  if (!tenantId) {
    throw new LanhuError({
      code: "INVALID_RESPONSE",
      message: "Lanhu team entry is missing tenantId",
      exitCode: EXIT_CODES.GENERAL,
      details: entry
    });
  }

  return {
    tenantId,
    name:
      pickString(record, ["tenantName", "teamName", "name", "title", "nickName"]) ??
      tenantId,
    current: pickBoolean(record, ["current", "isCurrent", "selected", "checked"]),
    memberCount: pickNumber(record, ["member_num", "memberNum"]),
    roleName: pickStringFromObject(record.role, ["name", "code"]),
    roleDisplay: pickStringFromObject(record.role, ["display"]),
    teamType: pickString(record, ["type"]),
    raw: record
  };
}

function pickString(
  record: Record<string, unknown>,
  keys: string[]
): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return undefined;
}

function pickBoolean(record: Record<string, unknown>, keys: string[]): boolean {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "number") {
      return value === 1;
    }
  }

  return false;
}

function pickNumber(
  record: Record<string, unknown>,
  keys: string[]
): number | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }

  return undefined;
}

function pickStringFromObject(
  value: unknown,
  keys: string[]
): string | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  return pickString(value as Record<string, unknown>, keys);
}
