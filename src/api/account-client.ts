import { unwrapProjectEnvelope } from "./envelopes.js";
import { BaseApiClient } from "./base-client.js";

export class AccountClient extends BaseApiClient {
  async listUserTeams(): Promise<unknown> {
    const response = await this.request({
      method: "GET",
      path: this.absolutePath("/api/account/user_teams"),
      query: {
        need_open_related: "true"
      }
    });

    return unwrapProjectEnvelope(response.data);
  }
}
