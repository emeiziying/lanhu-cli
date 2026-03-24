import { EXIT_CODES, LanhuError } from "../errors.js";
import { extractImageJsonUrl } from "../domain/images.js";
import { unwrapProjectEnvelope } from "./envelopes.js";
import { BaseApiClient } from "./base-client.js";

export class ProjectClient extends BaseApiClient {
  async listImages(options: {
    tenantId: string;
    projectId: string;
    position: number;
  }): Promise<unknown> {
    const response = await this.request({
      method: "GET",
      path: this.absolutePath("/api/project/images"),
      query: {
        project_id: options.projectId,
        team_id: options.tenantId,
        dds_status: "1",
        position: String(options.position),
        show_cb_src: "1",
        comment: "1"
      }
    });

    return unwrapProjectEnvelope(response.data);
  }

  async getImageDetail(options: {
    tenantId: string;
    projectId: string;
    imageId: string;
  }): Promise<unknown> {
    const response = await this.request({
      method: "GET",
      path: this.absolutePath("/api/project/image"),
      query: {
        dds_status: "1",
        image_id: options.imageId,
        team_id: options.tenantId,
        project_id: options.projectId
      }
    });

    return unwrapProjectEnvelope(response.data);
  }

  async getProjectDetail(options: {
    tenantId: string;
    projectId: string;
    imgLimit: number;
    detach: number;
  }): Promise<unknown> {
    const response = await this.request({
      method: "GET",
      path: this.absolutePath("/api/project/multi_info"),
      query: {
        project_id: options.projectId,
        team_id: options.tenantId,
        img_limit: String(options.imgLimit),
        detach: String(options.detach)
      }
    });

    return unwrapProjectEnvelope(response.data);
  }

  async getImageJson(options: {
    tenantId: string;
    projectId: string;
    imageId: string;
  }): Promise<unknown> {
    const detail = await this.getImageDetail(options);
    const jsonUrl = extractImageJsonUrl(detail);

    if (!jsonUrl) {
      throw new LanhuError({
        code: "IMAGE_JSON_URL_MISSING",
        message: "Lanhu image detail did not include a json_url",
        exitCode: EXIT_CODES.GENERAL,
        details: detail
      });
    }

    const response = await this.request({
      method: "GET",
      path: jsonUrl,
      requireAuth: false,
      headers: {
        cookie: ""
      }
    });

    return response.data;
  }
}
