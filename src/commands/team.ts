import { Command } from "commander";
import { stdout } from "node:process";

import { loadConfig } from "../config/load.js";
import { listTeams, switchTeam } from "../teams.js";
import { writeJson } from "../utils/output.js";

interface TeamCommandOptions {
  cookie?: string;
  baseUrl?: string;
  timeout?: string;
  profile?: string;
  tenantId?: string;
  json?: boolean;
}

export function registerTeamCommands(program: Command): void {
  const team = program.command("team").description("Team resources");

  team
    .command("list")
    .description("List available teams")
    .option("--cookie <cookie>", "Override cookie")
    .option("--base-url <url>", "Override base URL")
    .option("--timeout <ms>", "Override timeout in milliseconds")
    .option("--profile <profile>", "Override profile")
    .option("--json", "Output raw JSON")
    .action(async (options: TeamCommandOptions) => {
      const config = await loadConfig({
        cookie: options.cookie,
        baseUrl: options.baseUrl,
        timeoutMs: options.timeout ? Number(options.timeout) : undefined,
        profile: options.profile
      });
      const teams = await listTeams(config);

      const items = teams.map((teamItem) => ({
        tenantId: teamItem.tenantId,
        name: teamItem.name,
        current: teamItem.current || teamItem.tenantId === config.tenantId,
        memberCount: teamItem.memberCount,
        role: teamItem.roleDisplay ?? teamItem.roleName,
        type: teamItem.teamType
      }));

      if (options.json) {
        writeJson({
          count: items.length,
          currentTenantId: config.tenantId,
          items
        });
        return;
      }

      writeTeamList(items, config.tenantId);
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
      const config = await loadConfig({
        cookie: options.cookie,
        baseUrl: options.baseUrl,
        timeoutMs: options.timeout ? Number(options.timeout) : undefined,
        profile: options.profile
      });
      const updatedConfig = await switchTeam(config, {
        tenantId: options.tenantId
      });

      writeJson({
        switched: true,
        tenantId: updatedConfig.tenantId
      });
    });
}

function writeTeamList(
  items: Array<{
    tenantId: string;
    name: string;
    current: boolean;
    memberCount?: number;
    role?: string;
    type?: string;
  }>,
  currentTenantId?: string
): void {
  const lines = items.map(
    (item, index) => `${item.current ? "*" : " "} ${index + 1}. ${item.name}`
  );
  const header = currentTenantId ? "Teams:\n" : "Teams:\n";
  stdout.write(`${header}${lines.join("\n")}\n`);
}
