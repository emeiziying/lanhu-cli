import { Command } from "commander";

import {
  clearAuthConfig,
  maskSecret,
  setAuthConfig,
  showAuthConfig
} from "../../auth.js";
import { writeJson } from "../../utils/output.js";

interface AuthSetCommandOptions {
  cookie: string;
  baseUrl?: string;
  timeout?: string;
  profile?: string;
}

export function registerAuthCommands(program: Command): void {
  const auth = program.command("auth").description("Manage Lanhu authentication");

  auth
    .command("set")
    .description("Persist cookie and optional session settings")
    .requiredOption("--cookie <cookie>", "Lanhu session cookie")
    .option("--base-url <url>", "Override base URL")
    .option("--timeout <ms>", "Override timeout in milliseconds")
    .option("--profile <profile>", "Select profile name")
    .action(async (options: AuthSetCommandOptions) => {
      const config = await setAuthConfig({
        cookie: options.cookie,
        baseUrl: options.baseUrl,
        timeoutMs: options.timeout ? Number(options.timeout) : undefined,
        profile: options.profile
      });

      writeJson({
        saved: true,
        session: {
          profile: config.session.profile,
          baseUrl: config.session.baseUrl,
          timeoutMs: config.session.timeoutMs,
          hasCookie: Boolean(config.session.cookie),
          cookiePreview: maskSecret(config.session.cookie)
        }
      });
    });

  auth
    .command("show")
    .description("Show the resolved session and workspace config")
    .action(async () => {
      const meta = await showAuthConfig();

      writeJson({
        session: {
          profile: meta.config.session.profile,
          baseUrl: meta.config.session.baseUrl,
          timeoutMs: meta.config.session.timeoutMs,
          hasCookie: Boolean(meta.config.session.cookie),
          cookiePreview: maskSecret(meta.config.session.cookie)
        },
        context: meta.config.context,
        configPath: meta.configPath,
        sources: meta.sources
      });
    });

  auth
    .command("clear")
    .description("Remove local config")
    .action(async () => {
      await clearAuthConfig();
      writeJson({ cleared: true });
    });
}
