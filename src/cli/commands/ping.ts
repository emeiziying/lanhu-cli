import { Command } from "commander";

import { LanhuClient } from "../../client.js";
import { loadResolvedConfig } from "../../config/loader.js";
import { writeJson } from "../../utils/output.js";
import { type CommonCommandOptions, toOverrides } from "../../utils/parse-options.js";

type PingCommandOptions = CommonCommandOptions;

export function registerPingCommand(program: Command): void {
  program
    .command("ping")
    .description("Check connectivity to the Lanhu API base URL")
    .option("--cookie <cookie>", "Override cookie")
    .option("--base-url <url>", "Override base URL")
    .option("--timeout <ms>", "Override timeout in milliseconds")
    .option("--profile <profile>", "Override profile")
    .action(async (options: PingCommandOptions) => {
      const config = await loadResolvedConfig(toOverrides(options));
      const client = new LanhuClient(config);
      const response = await client.ping();

      writeJson({
        ok: response.status < 500,
        status: response.status,
        baseUrl: config.session.baseUrl,
        hasCookie: Boolean(config.session.cookie),
        requestId: response.requestId,
        data: response.data
      });
    });
}
