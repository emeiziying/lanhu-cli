import { assertHasTenantId } from "./auth.js";
import { LanhuClient } from "./client.js";
import { type LanhuConfig } from "./types.js";
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
