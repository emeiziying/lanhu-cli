import { Command } from "commander";

import { LanhuClient } from "../client.js";
import { loadConfig } from "../config/load.js";
import { writeJson } from "../utils/output.js";

interface PingCommandOptions {
  cookie?: string;
  baseUrl?: string;
  timeout?: string;
  profile?: string;
}

export function registerPingCommand(program: Command): void {
  program
    .command("ping")
    .description("Check connectivity to the Lanhu API base URL")
    .option("--cookie <cookie>", "Override cookie")
    .option("--base-url <url>", "Override base URL")
    .option("--timeout <ms>", "Override timeout in milliseconds")
    .option("--profile <profile>", "Override profile")
    .action(async (options: PingCommandOptions) => {
      const config = await loadConfig({
        cookie: options.cookie,
        baseUrl: options.baseUrl,
        timeoutMs: options.timeout ? Number(options.timeout) : undefined,
        profile: options.profile
      });
      const client = new LanhuClient(config);
      const response = await client.ping();

      writeJson({
        ok: response.status < 500,
        status: response.status,
        baseUrl: config.baseUrl,
        hasCookie: Boolean(config.cookie),
        requestId: response.requestId,
        data: response.data
      });
    });
}
