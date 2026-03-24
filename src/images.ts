import { assertHasProjectId, assertHasTenantId } from "./auth.js";
import { LanhuClient } from "./client.js";
import { EXIT_CODES, LanhuError } from "./errors.js";
import { type LanhuConfig } from "./types.js";
import { unwrapProjectApiResponse } from "./project-api.js";

export interface ProjectImageItem {
  id?: string | number;
  name?: string;
  title?: string;
  imageName?: string;
  imgName?: string;
  pageName?: string;
  path?: string;
  status?: number | string;
  [key: string]: unknown;
}

export async function listProjectImages(
  config: LanhuConfig,
  options: {
    tenantId?: string;
    projectId?: string;
    position?: number;
  } = {}
): Promise<ProjectImageItem[]> {
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
    path: "https://lanhuapp.com/api/project/images",
    query: {
      project_id: effectiveConfig.projectId!,
      team_id: effectiveConfig.tenantId!,
      dds_status: "1",
      position: String(options.position ?? 1),
      show_cb_src: "1",
      comment: "1"
    }
  });

  return normalizeProjectImageList(unwrapProjectApiResponse(response.data));
}

export async function getProjectImageDetail(
  config: LanhuConfig,
  options: {
    tenantId?: string;
    projectId?: string;
    imageId: string;
  }
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
    path: "https://lanhuapp.com/api/project/image",
    query: {
      dds_status: "1",
      image_id: options.imageId,
      team_id: effectiveConfig.tenantId!,
      project_id: effectiveConfig.projectId!
    }
  });

  return unwrapProjectApiResponse(response.data);
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

export function normalizeProjectImageList(payload: unknown): ProjectImageItem[] {
  const items = extractImageCollection(payload);

  if (!Array.isArray(items)) {
    throw new LanhuError({
      code: "INVALID_RESPONSE",
      message: "Lanhu image list response did not contain an array",
      exitCode: EXIT_CODES.GENERAL,
      details: payload
    });
  }

  return items as ProjectImageItem[];
}

function extractImageCollection(payload: unknown): unknown {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!payload || typeof payload !== "object") {
    return payload;
  }

  const record = payload as Record<string, unknown>;
  const candidates = [
    "images",
    "items",
    "list",
    "docs",
    "pages",
    "projectImages",
    "project_images",
    "rows"
  ];

  for (const key of candidates) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value;
    }
  }

  for (const value of Object.values(record)) {
    if (!value || typeof value !== "object") {
      continue;
    }

    for (const key of candidates) {
      const nestedValue = (value as Record<string, unknown>)[key];
      if (Array.isArray(nestedValue)) {
        return nestedValue;
      }
    }
  }

  return payload;
}
