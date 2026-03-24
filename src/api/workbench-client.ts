import { unwrapWorkbenchEnvelope } from "./envelopes.js";
import { BaseApiClient } from "./base-client.js";

export class WorkbenchClient extends BaseApiClient {
  async listAbstractFiles(options: {
    tenantId: string;
    parentId: number;
  }): Promise<unknown> {
    const response = await this.request({
      method: "POST",
      path: "/workbench/abstractfile/list",
      body: {
        tenantId: options.tenantId,
        parentId: options.parentId
      }
    });

    return unwrapWorkbenchEnvelope(response.data);
  }
}
