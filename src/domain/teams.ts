import { extractCollection, getString } from "../api/envelopes.js";
import { EXIT_CODES, LanhuError } from "../errors.js";

export interface TeamSummary {
  tenantId: string;
  name: string;
  isCurrent: boolean;
  memberCount?: number;
  roleName?: string;
  roleDisplay?: string;
  teamType?: string;
  raw: Record<string, unknown>;
}

export function normalizeTeamList(
  payload: unknown,
  currentTenantId?: string
): TeamSummary[] {
  const items = extractCollection(payload, [
    "data",
    "result",
    "teams",
    "list",
    "items",
    "userTeams",
    "user_teams",
    "tenantList"
  ]);

  if (!items) {
    throw new LanhuError({
      code: "INVALID_RESPONSE",
      message: "Lanhu returned an unexpected team list response",
      exitCode: EXIT_CODES.GENERAL,
      details: payload
    });
  }

  return items.map((entry) => normalizeTeam(entry, currentTenantId));
}

export function resolveTeamSelection(
  teams: TeamSummary[],
  rawInput: string
): TeamSummary {
  if (teams.length === 0) {
    throw new LanhuError({
      code: "NO_TEAMS",
      message: "No teams are available for selection",
      exitCode: EXIT_CODES.GENERAL
    });
  }

  const trimmed = rawInput.trim();

  if (!trimmed) {
    return teams.find((team) => team.isCurrent) ?? teams[0]!;
  }

  const index = Number(trimmed);
  if (Number.isInteger(index) && index >= 1 && index <= teams.length) {
    return teams[index - 1]!;
  }

  const team = teams.find((entry) => entry.tenantId === trimmed);
  if (!team) {
    throw new LanhuError({
      code: "TEAM_NOT_FOUND",
      message: `Unable to find team ${trimmed}`,
      exitCode: EXIT_CODES.USAGE
    });
  }

  return team;
}

function normalizeTeam(
  entry: unknown,
  currentTenantId?: string
): TeamSummary {
  if (!entry || typeof entry !== "object") {
    throw new LanhuError({
      code: "INVALID_RESPONSE",
      message: "Lanhu returned an unexpected team entry",
      exitCode: EXIT_CODES.GENERAL,
      details: entry
    });
  }

  const record = entry as Record<string, unknown>;
  const tenantId = getString(record, [
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

  const selected = pickBoolean(record, ["current", "isCurrent", "selected", "checked"]);

  return {
    tenantId,
    name:
      getString(record, ["tenantName", "teamName", "name", "title", "nickName"]) ??
      tenantId,
    isCurrent: selected || tenantId === currentTenantId,
    memberCount: pickNumber(record, ["member_num", "memberNum"]),
    roleName: getStringFromObject(record.role, ["name", "code"]),
    roleDisplay: getStringFromObject(record.role, ["display"]),
    teamType: getString(record, ["type"]),
    raw: record
  };
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

function getStringFromObject(
  value: unknown,
  keys: string[]
): string | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  return getString(value as Record<string, unknown>, keys);
}
