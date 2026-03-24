export interface LanhuConfig {
  baseUrl: string;
  cookie?: string;
  tenantId?: string;
  timeoutMs: number;
  profile: string;
}

export interface LanhuRequestOptions {
  method: string;
  path: string;
  query?: Record<string, string | string[]>;
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
}

export interface LanhuResponse<T = unknown> {
  status: number;
  headers: Record<string, string>;
  data: T;
  requestId?: string;
}

export type ConfigSource = "flag" | "env" | "config" | "default" | "unset";

export interface LanhuConfigMeta {
  config: LanhuConfig;
  configPath: string;
  sources: Record<keyof LanhuConfig, ConfigSource>;
}
