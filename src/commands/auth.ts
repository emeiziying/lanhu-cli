import { Command } from "commander";

import {
  clearAuthConfig,
  maskToken,
  setAuthConfig,
  showAuthConfig
} from "../auth.js";
import { writeJson } from "../utils/output.js";

interface AuthSetCommandOptions {
  token: string;
  baseUrl?: string;
  profile?: string;
}

export function registerAuthCommands(program: Command): void {
  const auth = program.command("auth").description("Manage Lanhu authentication");

  auth
    .command("set")
    .description("Persist token and optional base URL")
    .requiredOption("--token <token>", "Lanhu API token")
    .option("--base-url <url>", "Override base URL")
    .option("--profile <profile>", "Select profile name")
    .action(async (options: AuthSetCommandOptions) => {
      const config = await setAuthConfig(options);

      writeJson({
        saved: true,
        profile: config.profile,
        baseUrl: config.baseUrl,
        timeoutMs: config.timeoutMs,
        hasToken: Boolean(config.token),
        tokenPreview: maskToken(config.token)
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
        timeoutMs: meta.config.timeoutMs,
        hasToken: Boolean(meta.config.token),
        tokenPreview: maskToken(meta.config.token),
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
