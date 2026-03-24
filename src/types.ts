export interface LanhuSessionConfig {
  baseUrl: string;
  cookie?: string;
  timeoutMs: number;
  profile: string;
}

export interface LanhuWorkspaceContext {
  tenantId?: string;
  projectId?: string;
}

export interface LanhuResolvedContext {
  session: LanhuSessionConfig;
  context: LanhuWorkspaceContext;
}

export type LanhuConfig = LanhuResolvedContext;

export interface LegacyLanhuConfig {
  baseUrl: string;
  cookie?: string;
  timeoutMs: number;
  profile: string;
  tenantId?: string;
  projectId?: string;
}

export type LanhuConfigInput = LanhuResolvedContext | LegacyLanhuConfig;

export interface LanhuConfigOverrides {
  baseUrl?: string;
  cookie?: string;
  timeoutMs?: number;
  profile?: string;
  tenantId?: string;
  projectId?: string;
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

export type LanhuConfigKey =
  | "baseUrl"
  | "cookie"
  | "timeoutMs"
  | "profile"
  | "tenantId"
  | "projectId";

export interface LanhuConfigMeta {
  config: LanhuResolvedContext;
  configPath: string;
  sources: Record<LanhuConfigKey, ConfigSource>;
}
