import { Command } from "commander";

import {
  clearAuthConfig,
  maskSecret,
  setAuthConfig,
  showAuthConfig
} from "../auth.js";
import { writeJson } from "../utils/output.js";

interface AuthSetCommandOptions {
  cookie: string;
  baseUrl?: string;
  tenantId?: string;
  profile?: string;
}

export function registerAuthCommands(program: Command): void {
  const auth = program.command("auth").description("Manage Lanhu authentication");

  auth
    .command("set")
    .description("Persist cookie and optional base URL")
    .requiredOption("--cookie <cookie>", "Lanhu session cookie")
    .option("--base-url <url>", "Override base URL")
    .option("--tenant-id <tenantId>", "Default tenant ID")
    .option("--profile <profile>", "Select profile name")
    .action(async (options: AuthSetCommandOptions) => {
      const config = await setAuthConfig(options);

      writeJson({
        saved: true,
        profile: config.profile,
        baseUrl: config.baseUrl,
        tenantId: config.tenantId,
        projectId: config.projectId,
        timeoutMs: config.timeoutMs,
        hasCookie: Boolean(config.cookie),
        cookiePreview: maskSecret(config.cookie)
      });
    });

  auth
    .command("show")
    .description("Show the resolved authentication config")
    .action(async () => {
      const meta = await showAuthConfig();

      writeJson({
        profile: meta.config.profile,
        baseUrl: meta.config.baseUrl,
        tenantId: meta.config.tenantId,
        projectId: meta.config.projectId,
        timeoutMs: meta.config.timeoutMs,
        hasCookie: Boolean(meta.config.cookie),
        cookiePreview: maskSecret(meta.config.cookie),
        configPath: meta.configPath,
        sources: meta.sources
      });
    });

  auth
    .command("clear")
    .description("Remove local config")
    .action(async () => {
      await clearAuthConfig();

      writeJson({
        cleared: true
      });
    });
}
