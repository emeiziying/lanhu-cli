import { Command } from "commander";
import { stdout } from "node:process";

import { loadConfig } from "../config/load.js";
import { getProjectDetail, listProjects, switchProject } from "../projects.js";
import { writeJson } from "../utils/output.js";

interface ProjectListCommandOptions {
  tenantId?: string;
  parentId?: string;
  projectId?: string;
  baseUrl?: string;
  cookie?: string;
  timeout?: string;
  profile?: string;
  imgLimit?: string;
  detach?: string;
  json?: boolean;
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
    .option("--json", "Output raw JSON")
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

      const normalizedItems = items.map((item) => ({
        id: item.id,
        name: item.sourceName,
        type: item.sourceType,
        sourceId: item.sourceId,
        shortId: item.sourceShortId,
        current: item.sourceId === config.projectId,
        parentId: item.parentId,
        updatedAt: item.updateTime,
        createdAt: item.createTime,
        creator: item.creator,
        permissionType: item.permissionType
      }));

      if (options.json) {
        writeJson({
          tenantId: options.tenantId ?? config.tenantId,
          parentId: Number(options.parentId ?? "0"),
          currentProjectId: config.projectId,
          count: normalizedItems.length,
          items: normalizedItems
        });
        return;
      }

      writeProjectList(normalizedItems);
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
    .action(async (options: ProjectListCommandOptions) => {
      const config = await loadConfig({
        tenantId: options.tenantId,
        projectId: options.projectId,
        cookie: options.cookie,
        baseUrl: options.baseUrl,
        timeoutMs: options.timeout ? Number(options.timeout) : undefined,
        profile: options.profile
      });

      const updatedConfig = await switchProject(config, {
        projectId: options.projectId,
        tenantId: options.tenantId,
        parentId: Number(options.parentId ?? "0")
      });

      writeJson({
        switched: true,
        tenantId: updatedConfig.tenantId,
        projectId: updatedConfig.projectId
      });
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
    .action(async (options: ProjectListCommandOptions) => {
      const config = await loadConfig({
        tenantId: options.tenantId,
        projectId: options.projectId,
        cookie: options.cookie,
        baseUrl: options.baseUrl,
        timeoutMs: options.timeout ? Number(options.timeout) : undefined,
        profile: options.profile
      });

      const detail = await getProjectDetail(config, {
        tenantId: options.tenantId,
        projectId: options.projectId,
        imgLimit: Number(options.imgLimit ?? "1"),
        detach: Number(options.detach ?? "1")
      });

      writeJson(detail);
    });
}

function writeProjectList(
  items: Array<{
    name: string;
    type: string;
    current: boolean;
  }>
): void {
  const lines = items.map(
    (item, index) =>
      `${item.current ? "*" : " "} ${index + 1}. ${item.name}${item.type !== "project" ? ` [${item.type}]` : ""}`
  );

  stdout.write(`Projects:\n${lines.join("\n")}\n`);
}
