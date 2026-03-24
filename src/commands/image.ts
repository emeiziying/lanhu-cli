import { Command } from "commander";
import { stdout } from "node:process";

import { loadConfig } from "../config/load.js";
import { getProjectImageDetail, listProjectImages } from "../images.js";
import { writeJson } from "../utils/output.js";

interface ImageCommandOptions {
  tenantId?: string;
  projectId?: string;
  baseUrl?: string;
  cookie?: string;
  timeout?: string;
  profile?: string;
  position?: string;
  imgLimit?: string;
  detach?: string;
  json?: boolean;
}

export function registerImageCommands(program: Command): void {
  const image = program.command("image").description("Project image resources");

  image
    .command("list")
    .description("List images for the current project")
    .option("--tenant-id <tenantId>", "Override tenant ID")
    .option("--project-id <projectId>", "Override project ID")
    .option("--position <position>", "Pagination position", "1")
    .option("--cookie <cookie>", "Override cookie")
    .option("--base-url <url>", "Override base URL")
    .option("--timeout <ms>", "Override timeout in milliseconds")
    .option("--profile <profile>", "Override profile")
    .option("--json", "Output raw JSON")
    .action(async (options: ImageCommandOptions) => {
      const config = await loadConfig({
        tenantId: options.tenantId,
        projectId: options.projectId,
        cookie: options.cookie,
        baseUrl: options.baseUrl,
        timeoutMs: options.timeout ? Number(options.timeout) : undefined,
        profile: options.profile
      });

      const items = await listProjectImages(config, {
        tenantId: options.tenantId,
        projectId: options.projectId,
        position: Number(options.position ?? "1")
      });

      const normalizedItems = items.map((item, index) => ({
        index: index + 1,
        id: item.id,
        name: getImageName(item),
        raw: item
      }));

      if (options.json) {
        writeJson({
          tenantId: config.tenantId,
          projectId: config.projectId,
          count: normalizedItems.length,
          items: normalizedItems
        });
        return;
      }

      writeImageList(normalizedItems);
    });

  image
    .command("detail")
    .description("Fetch single image detail payload")
    .argument("<imageId>", "Image ID")
    .option("--tenant-id <tenantId>", "Override tenant ID")
    .option("--project-id <projectId>", "Override project ID")
    .option("--cookie <cookie>", "Override cookie")
    .option("--base-url <url>", "Override base URL")
    .option("--timeout <ms>", "Override timeout in milliseconds")
    .option("--profile <profile>", "Override profile")
    .action(async (imageId: string, options: ImageCommandOptions) => {
      const config = await loadConfig({
        tenantId: options.tenantId,
        projectId: options.projectId,
        cookie: options.cookie,
        baseUrl: options.baseUrl,
        timeoutMs: options.timeout ? Number(options.timeout) : undefined,
        profile: options.profile
      });

      const detail = await getProjectImageDetail(config, {
        tenantId: options.tenantId,
        projectId: options.projectId,
        imageId
      });

      writeJson(detail);
    });
}

function getImageName(item: Record<string, unknown>): string {
  for (const key of ["name", "title", "imageName", "imgName", "pageName"]) {
    const value = item[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return String(item.id ?? "<unnamed>");
}

function writeImageList(
  items: Array<{
    index: number;
    name: string;
    id: string | number | undefined;
  }>
): void {
  const lines = items.map(
    (item) => `  ${item.index}. ${item.name}${item.id !== undefined ? ` (${item.id})` : ""}`
  );
  stdout.write(`Images:\n${lines.join("\n")}\n`);
}
