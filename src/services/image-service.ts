import {
  assertHasCookie,
  assertHasProjectId,
  assertHasTenantId
} from "../auth.js";
import { loadResolvedConfig } from "../config/loader.js";
import {
  normalizeImageDetail,
  normalizeImageList
} from "../domain/images.js";
import { ProjectClient } from "../api/project-client.js";
import { type LanhuConfigOverrides } from "../types.js";

export interface ImageListOptions extends LanhuConfigOverrides {
  position?: number;
}

export class ImageService {
  async list(options: ImageListOptions = {}) {
    const config = await loadResolvedConfig(options);
    assertHasCookie(config);
    assertHasTenantId(config);
    assertHasProjectId(config);

    const client = new ProjectClient(config);
    const payload = await client.listImages({
      tenantId: config.context.tenantId!,
      projectId: config.context.projectId!,
      position: options.position ?? 1
    });

    return {
      config,
      items: normalizeImageList(payload)
    };
  }

  async detail(imageId: string, overrides: LanhuConfigOverrides = {}) {
    const config = await loadResolvedConfig(overrides);
    assertHasCookie(config);
    assertHasTenantId(config);
    assertHasProjectId(config);

    const client = new ProjectClient(config);
    const raw = await client.getImageDetail({
      tenantId: config.context.tenantId!,
      projectId: config.context.projectId!,
      imageId
    });

    return {
      config,
      detail: normalizeImageDetail(raw)
    };
  }

  async json(imageId: string, overrides: LanhuConfigOverrides = {}) {
    const config = await loadResolvedConfig(overrides);
    assertHasCookie(config);
    assertHasTenantId(config);
    assertHasProjectId(config);

    const client = new ProjectClient(config);
    const data = await client.getImageJson({
      tenantId: config.context.tenantId!,
      projectId: config.context.projectId!,
      imageId
    });

    return {
      config,
      data
    };
  }
}
