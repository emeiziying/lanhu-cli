import { EXIT_CODES, LanhuError } from "../errors.js";

export interface ProjectSummary {
  id: number;
  name: string;
  type: string;
  projectId: string;
  shortId?: string;
  parentId: number;
  isCurrent: boolean;
  raw: Record<string, unknown>;
}

export function normalizeProjectList(
  payload: unknown,
  currentProjectId?: string
): ProjectSummary[] {
  if (!Array.isArray(payload)) {
    throw new LanhuError({
      code: "INVALID_RESPONSE",
      message: "Lanhu returned an unexpected project list response",
      exitCode: EXIT_CODES.GENERAL,
      details: payload
    });
  }

  return payload.map((entry) => normalizeProject(entry, currentProjectId));
}

export function resolveProjectSelection(
  projects: ProjectSummary[],
  rawInput: string
): ProjectSummary {
  if (projects.length === 0) {
    throw new LanhuError({
      code: "NO_PROJECTS",
      message: "No projects are available for selection",
      exitCode: EXIT_CODES.GENERAL
    });
  }

  const trimmed = rawInput.trim();
  if (!trimmed) {
    return projects.find((project) => project.isCurrent) ?? projects[0]!;
  }

  const index = Number(trimmed);
  if (Number.isInteger(index) && index >= 1 && index <= projects.length) {
    return projects[index - 1]!;
  }

  const project = projects.find(
    (entry) =>
      entry.projectId === trimmed ||
      entry.shortId === trimmed ||
      String(entry.id) === trimmed
  );

  if (!project) {
    throw new LanhuError({
      code: "PROJECT_NOT_FOUND",
      message: `Unable to find project ${trimmed}`,
      exitCode: EXIT_CODES.USAGE
    });
  }

  return project;
}

function normalizeProject(
  payload: unknown,
  currentProjectId?: string
): ProjectSummary {
  if (!payload || typeof payload !== "object") {
    throw new LanhuError({
      code: "INVALID_RESPONSE",
      message: "Lanhu returned an unexpected project entry",
      exitCode: EXIT_CODES.GENERAL,
      details: payload
    });
  }

  const record = payload as Record<string, unknown>;
  const projectId = getRequiredString(record, ["sourceId"]);
  const id = getRequiredNumber(record, ["id"]);

  return {
    id,
    name: getOptionalString(record, ["sourceName"]) ?? projectId,
    type: getOptionalString(record, ["sourceType"]) ?? "project",
    projectId,
    shortId: getOptionalString(record, ["sourceShortId"]),
    parentId: getRequiredNumber(record, ["parentId"]),
    isCurrent: projectId === currentProjectId,
    raw: record
  };
}

function getOptionalString(
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

function getRequiredString(
  record: Record<string, unknown>,
  keys: string[]
): string {
  const value = getOptionalString(record, keys);
  if (!value) {
    throw new LanhuError({
      code: "INVALID_RESPONSE",
      message: `Lanhu project entry is missing ${keys[0]}`,
      exitCode: EXIT_CODES.GENERAL,
      details: record
    });
  }
  return value;
}

function getRequiredNumber(
  record: Record<string, unknown>,
  keys: string[]
): number {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }

  throw new LanhuError({
    code: "INVALID_RESPONSE",
    message: `Lanhu project entry is missing ${keys[0]}`,
    exitCode: EXIT_CODES.GENERAL,
    details: record
  });
}
