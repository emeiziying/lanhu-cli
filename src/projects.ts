import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { updateAuthConfig } from "./auth.js";
import { assertHasProjectId, assertHasTenantId } from "./auth.js";
import { EXIT_CODES, LanhuError } from "./errors.js";
import { LanhuClient } from "./client.js";
import { type LanhuConfig } from "./types.js";
import { unwrapProjectApiResponse } from "./project-api.js";
import { unwrapWorkbenchResponse } from "./workbench.js";

export interface ProjectListItem {
  id: number;
  sourceName: string;
  sourceType: string;
  sourceId: string;
  sourceShortId?: string;
  sourceThumbnail?: string;
  sourceBg?: string;
  parentId: number;
  openTime?: number;
  updateTime?: number;
  createTime?: number;
  orderIndex?: number;
  creator?: string;
  permissionType?: number;
}

export async function listProjects(
  config: LanhuConfig,
  options?: {
    tenantId?: string;
    parentId?: number;
  }
): Promise<ProjectListItem[]> {
  const effectiveConfig: LanhuConfig = {
    ...config,
    tenantId: options?.tenantId ?? config.tenantId
  };

  assertHasTenantId(effectiveConfig);

  const client = new LanhuClient(effectiveConfig);
  const response = await client.request({
    method: "POST",
    path: "/workbench/abstractfile/list",
    body: {
      tenantId: effectiveConfig.tenantId,
      parentId: options?.parentId ?? 0
    }
  });

  return unwrapWorkbenchResponse<ProjectListItem[]>(response.data);
}

export async function switchProject(
  config: LanhuConfig,
  options: {
    projectId?: string;
    tenantId?: string;
    parentId?: number;
    prompt?: (projects: ProjectListItem[]) => Promise<ProjectListItem>;
  } = {}
): Promise<LanhuConfig> {
  const projects = await listProjects(config, {
    tenantId: options.tenantId,
    parentId: options.parentId
  });

  if (projects.length === 0) {
    throw new LanhuError({
      code: "NO_PROJECTS",
      message: "No projects were returned by Lanhu",
      exitCode: EXIT_CODES.GENERAL
    });
  }

  const selected =
    options.projectId !== undefined
      ? findProjectById(projects, options.projectId)
      : await (options.prompt ?? promptForProjectSelection)(projects);

  return updateAuthConfig({
    tenantId: options.tenantId ?? config.tenantId,
    projectId: selected.sourceId
  });
}

export async function getProjectDetail(
  config: LanhuConfig,
  options: {
    tenantId?: string;
    projectId?: string;
    imgLimit?: number;
    detach?: number;
  } = {}
): Promise<unknown> {
  const effectiveConfig: LanhuConfig = {
    ...config,
    tenantId: options.tenantId ?? config.tenantId,
    projectId: options.projectId ?? config.projectId
  };

  assertHasTenantId(effectiveConfig);
  assertHasProjectId(effectiveConfig);

  const client = new LanhuClient(effectiveConfig);
  const response = await client.request({
    method: "GET",
    path: "https://lanhuapp.com/api/project/multi_info",
    query: {
      project_id: effectiveConfig.projectId!,
      team_id: effectiveConfig.tenantId!,
      img_limit: String(options.imgLimit ?? 1),
      detach: String(options.detach ?? 1)
    }
  });

  return unwrapProjectApiResponse(response.data);
}

export function resolveProjectSelection(
  projects: ProjectListItem[],
  rawInput: string
): ProjectListItem {
  if (projects.length === 0) {
    throw new LanhuError({
      code: "NO_PROJECTS",
      message: "No projects are available for selection",
      exitCode: EXIT_CODES.GENERAL
    });
  }

  const trimmed = rawInput.trim();

  if (!trimmed) {
    return projects[0]!;
  }

  const index = Number(trimmed);

  if (Number.isInteger(index) && index >= 1 && index <= projects.length) {
    return projects[index - 1]!;
  }

  return findProjectById(projects, trimmed);
}

async function promptForProjectSelection(
  projects: ProjectListItem[]
): Promise<ProjectListItem> {
  output.write("Available projects:\n");

  projects.forEach((project, index) => {
    output.write(
      `${index + 1}. ${project.sourceName}${project.sourceType !== "project" ? ` [${project.sourceType}]` : ""}\n`
    );
  });

  const rl = createInterface({ input, output });

  try {
    const answer = await rl.question(
      "Select a project number, projectId, or shortId and press Enter: "
    );
    return resolveProjectSelection(projects, answer);
  } finally {
    rl.close();
  }
}

function findProjectById(
  projects: ProjectListItem[],
  projectId: string
): ProjectListItem {
  const project = projects.find(
    (entry) =>
      entry.sourceId === projectId ||
      entry.sourceShortId === projectId ||
      String(entry.id) === projectId
  );

  if (!project) {
    throw new LanhuError({
      code: "PROJECT_NOT_FOUND",
      message: `Unable to find project ${projectId}`,
      exitCode: EXIT_CODES.USAGE
    });
  }

  return project;
}
