import { Command } from "commander";
import { stdout } from "node:process";

import { TeamService } from "../../services/team-service.js";
import { writeJson } from "../../utils/output.js";
import { type CommonCommandOptions, toOverrides } from "../../utils/parse-options.js";
import { formatTeamList } from "../formatters/team.js";
import { promptTeamSelection } from "../interactive.js";

interface TeamCommandOptions extends CommonCommandOptions {
  json?: boolean;
}

export function registerTeamCommands(program: Command): void {
  const team = program.command("team").description("Team resources");
  const service = new TeamService();

  team
    .command("list")
    .description("List available teams")
    .option("--cookie <cookie>", "Override cookie")
    .option("--base-url <url>", "Override base URL")
    .option("--timeout <ms>", "Override timeout in milliseconds")
    .option("--profile <profile>", "Override profile")
    .option("--json", "Output raw JSON")
    .action(async (options: TeamCommandOptions) => {
      const { config, items } = await service.list(toOverrides(options));

      if (options.json) {
        writeJson({
          count: items.length,
          currentTenantId: config.context.tenantId,
          items
        });
        return;
      }

      stdout.write(formatTeamList(items));
    });

  team
    .command("switch")
    .description("Interactively switch the active tenant")
    .option("--tenant-id <tenantId>", "Switch directly without prompting")
    .option("--cookie <cookie>", "Override cookie")
    .option("--base-url <url>", "Override base URL")
    .option("--timeout <ms>", "Override timeout in milliseconds")
    .option("--profile <profile>", "Override profile")
    .action(async (options: TeamCommandOptions) => {
      const { items } = await service.list(toOverrides(options));
      if (!options.tenantId) {
        stdout.write(formatTeamList(items));
      }

      const selection = options.tenantId ?? await promptTeamSelection(items);
      const { selected } = await service.switch(
        selection,
        toOverrides(options),
        items
      );

      stdout.write(`Switched to ${selected.name}\n`);
    });
}
