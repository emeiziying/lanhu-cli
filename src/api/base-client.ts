import { LanhuClient } from "../client.js";
import { normalizeConfigInput } from "../config/compat.js";
import {
  type LanhuConfigInput,
  type LanhuRequestOptions,
  type LanhuResolvedContext
} from "../types.js";

export class BaseApiClient {
  protected readonly config: LanhuResolvedContext;
  protected readonly client: LanhuClient;
  protected readonly origin: string;

  constructor(config: LanhuConfigInput) {
    this.config = normalizeConfigInput(config);
    this.client = new LanhuClient(this.config);
    this.origin = new URL(this.config.session.baseUrl).origin;
  }

  protected request<T = unknown>(
    options: LanhuRequestOptions & {
      requireAuth?: boolean;
      allowHttpError?: boolean;
    }
  ) {
    return this.client.request<T>(options);
  }

  protected absolutePath(pathname: string): string {
    return new URL(pathname, this.origin).toString();
  }
}
