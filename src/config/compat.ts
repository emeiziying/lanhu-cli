import { resolvedConfigSchema } from "./schema.js";
import {
  type LanhuConfigInput,
  type LanhuResolvedContext,
  type LegacyLanhuConfig
} from "../types.js";

export function isResolvedConfig(
  config: LanhuConfigInput
): config is LanhuResolvedContext {
  return "session" in config && "context" in config;
}

export function normalizeConfigInput(
  config: LanhuConfigInput
): LanhuResolvedContext {
  if (isResolvedConfig(config)) {
    return resolvedConfigSchema.parse(config);
  }

  return resolvedConfigSchema.parse({
    session: {
      baseUrl: config.baseUrl,
      cookie: config.cookie,
      timeoutMs: config.timeoutMs,
      profile: config.profile
    },
    context: {
      tenantId: config.tenantId,
      projectId: config.projectId
    }
  });
}

export function flattenResolvedConfig(
  config: LanhuResolvedContext
): LegacyLanhuConfig {
  return {
    baseUrl: config.session.baseUrl,
    cookie: config.session.cookie,
    timeoutMs: config.session.timeoutMs,
    profile: config.session.profile,
    tenantId: config.context.tenantId,
    projectId: config.context.projectId
  };
}
