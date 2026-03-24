import { Command } from "commander";

import { loadConfig } from "../config/load.js";
import { listProjects } from "../projects.js";
import { writeJson } from "../utils/output.js";

interface ProjectListCommandOptions {
  tenantId?: string;
  parentId?: string;
  baseUrl?: string;
  cookie?: string;
  timeout?: string;
  profile?: string;
}

export function registerProjectCommands(program: Command): void {
  const project = program.command("project").description("Project resources");

  project
    .command("list")
    .description("List top-level projects for a tenant")
    .option("--tenant-id <tenantId>", "Override tenant ID")
    .option("--parent-id <parentId>", "Parent folder ID", "0")
    .option("--cookie <cookie>", "Override cookie")
    .option("--base-url <url>", "Override base URL")
    .option("--timeout <ms>", "Override timeout in milliseconds")
    .option("--profile <profile>", "Override profile")
    .action(async (options: ProjectListCommandOptions) => {
      const config = await loadConfig({
        tenantId: options.tenantId,
        cookie: options.cookie,
        baseUrl: options.baseUrl,
        timeoutMs: options.timeout ? Number(options.timeout) : undefined,
        profile: options.profile
      });

      const items = await listProjects(config, {
        tenantId: options.tenantId,
        parentId: Number(options.parentId ?? "0")
      });

      writeJson({
        tenantId: options.tenantId ?? config.tenantId,
        parentId: Number(options.parentId ?? "0"),
        count: items.length,
        items: items.map((item) => ({
          id: item.id,
          name: item.sourceName,
          type: item.sourceType,
          sourceId: item.sourceId,
          shortId: item.sourceShortId,
          parentId: item.parentId,
          updatedAt: item.updateTime,
          createdAt: item.createTime,
          creator: item.creator,
          permissionType: item.permissionType
        }))
      });
    });
}
