import {
  assertHasCookie,
  assertHasProjectId,
  assertHasTenantId,
  updateWorkspaceContext
} from "../auth.js";
import { loadResolvedConfig } from "../config/loader.js";
import {
  type ProjectSummary,
  normalizeProjectList,
  resolveProjectSelection
} from "../domain/projects.js";
import { ProjectClient } from "../api/project-client.js";
import { WorkbenchClient } from "../api/workbench-client.js";
import { type LanhuConfigOverrides } from "../types.js";

export interface ProjectListOptions extends LanhuConfigOverrides {
  parentId?: number;
}

export interface ProjectDetailOptions extends LanhuConfigOverrides {
  imgLimit?: number;
  detach?: number;
}

export class ProjectService {
  async list(options: ProjectListOptions = {}) {
    const config = await loadResolvedConfig(options);
    assertHasCookie(config);
    assertHasTenantId(config);

    const client = new WorkbenchClient(config);
    const payload = await client.listAbstractFiles({
      tenantId: config.context.tenantId!,
      parentId: options.parentId ?? 0
    });

    return {
      config,
      items: normalizeProjectList(payload, config.context.projectId)
    };
  }

  async switch(
    selection: string,
    options: ProjectListOptions = {},
    items?: ProjectSummary[]
  ) {
    const config = await loadResolvedConfig(options);
    const availableItems = items ?? (await this.list(options)).items;
    const selected = resolveProjectSelection(availableItems, selection);
    const updatedConfig = await updateWorkspaceContext({
      tenantId: config.context.tenantId,
      projectId: selected.projectId
    });

    return {
      config: updatedConfig,
      items: availableItems,
      selected
    };
  }

  async detail(options: ProjectDetailOptions = {}) {
    const config = await loadResolvedConfig(options);
    assertHasCookie(config);
    assertHasTenantId(config);
    assertHasProjectId(config);

    const client = new ProjectClient(config);
    const detail = await client.getProjectDetail({
      tenantId: config.context.tenantId!,
      projectId: config.context.projectId!,
      imgLimit: options.imgLimit ?? 1,
      detach: options.detach ?? 1
    });

    return {
      config,
      detail
    };
  }
}
