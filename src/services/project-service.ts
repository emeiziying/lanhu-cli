import {
  assertHasCookie,
  assertHasProjectId,
  assertHasTenantId,
  updateWorkspaceContext
} from "../auth.js";
import { loadResolvedConfig } from "../config/loader.js";
import {
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

  async switch(selection: string, options: ProjectListOptions = {}) {
    const { config, items } = await this.list(options);
    const selected = resolveProjectSelection(items, selection);
    const updatedConfig = await updateWorkspaceContext({
      tenantId: config.context.tenantId,
      projectId: selected.projectId
    });

    return {
      config: updatedConfig,
      items,
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
