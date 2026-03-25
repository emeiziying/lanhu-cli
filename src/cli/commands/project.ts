import { Command } from "commander";
import { stdout } from "node:process";

import { ProjectService } from "../../services/project-service.js";
import { writeJson } from "../../utils/output.js";
import {
  type CommonCommandOptions,
  parseNonNegativeInt,
  parsePositiveInt,
  toOverrides
} from "../../utils/parse-options.js";
import { formatProjectList } from "../formatters/project.js";
import { promptProjectSelection } from "../interactive.js";

interface ProjectCommandOptions extends CommonCommandOptions {
  parentId?: string;
  imgLimit?: string;
  detach?: string;
  json?: boolean;
}

export function registerProjectCommands(program: Command): void {
  const project = program.command("project").description("Project resources");
  const service = new ProjectService();

  project
    .command("list")
    .description("List top-level projects for a tenant")
    .option("--tenant-id <tenantId>", "Override tenant ID")
    .option("--parent-id <parentId>", "Parent folder ID", "0")
    .option("--cookie <cookie>", "Override cookie")
    .option("--base-url <url>", "Override base URL")
    .option("--timeout <ms>", "Override timeout in milliseconds")
    .option("--profile <profile>", "Override profile")
    .option("--json", "Output raw JSON")
    .action(async (options: ProjectCommandOptions) => {
      const { config, items } = await service.list({
        ...toOverrides(options),
        tenantId: options.tenantId,
        parentId: parseNonNegativeInt(options.parentId, "parent-id", 0)
      });

      if (options.json) {
        writeJson({
          count: items.length,
          currentProjectId: config.context.projectId,
          tenantId: config.context.tenantId,
          items
        });
        return;
      }

      stdout.write(formatProjectList(items));
    });

  project
    .command("switch")
    .description("Interactively switch the active project")
    .option("--project-id <projectId>", "Switch directly without prompting")
    .option("--tenant-id <tenantId>", "Override tenant ID")
    .option("--parent-id <parentId>", "Parent folder ID", "0")
    .option("--cookie <cookie>", "Override cookie")
    .option("--base-url <url>", "Override base URL")
    .option("--timeout <ms>", "Override timeout in milliseconds")
    .option("--profile <profile>", "Override profile")
    .action(async (options: ProjectCommandOptions) => {
      const listResult = await service.list({
        ...toOverrides(options),
        tenantId: options.tenantId,
        parentId: parseNonNegativeInt(options.parentId, "parent-id", 0)
      });

      const selection =
        options.projectId ?? await promptProjectSelection(listResult.items);
      const { selected } = await service.switch(selection, {
        ...toOverrides(options),
        tenantId: options.tenantId,
        parentId: parseNonNegativeInt(options.parentId, "parent-id", 0)
      });

      stdout.write(`Switched to ${selected.name}\n`);
    });

  project
    .command("detail")
    .description("Fetch project detail payload")
    .option("--tenant-id <tenantId>", "Override tenant ID")
    .option("--project-id <projectId>", "Override project ID")
    .option("--img-limit <imgLimit>", "Image limit", "1")
    .option("--detach <detach>", "Detach flag", "1")
    .option("--cookie <cookie>", "Override cookie")
    .option("--base-url <url>", "Override base URL")
    .option("--timeout <ms>", "Override timeout in milliseconds")
    .option("--profile <profile>", "Override profile")
    .action(async (options: ProjectCommandOptions) => {
      const { detail } = await service.detail({
        ...toOverrides(options),
        tenantId: options.tenantId,
        projectId: options.projectId,
        imgLimit: parsePositiveInt(options.imgLimit, "img-limit", 1),
        detach: parsePositiveInt(options.detach, "detach", 1)
      });

      writeJson(detail);
    });
}

