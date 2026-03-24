import { Command } from "commander";
import { stdout } from "node:process";

import { ImageService } from "../../services/image-service.js";
import { writeJson } from "../../utils/output.js";
import { formatImageList } from "../formatters/image.js";

interface ImageCommandOptions {
  tenantId?: string;
  projectId?: string;
  baseUrl?: string;
  cookie?: string;
  timeout?: string;
  profile?: string;
  position?: string;
  json?: boolean;
}

export function registerImageCommands(program: Command): void {
  const image = program.command("image").description("Project image resources");
  const service = new ImageService();

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
      const { config, items } = await service.list({
        ...toOverrides(options),
        position: Number(options.position ?? "1")
      });

      if (options.json) {
        writeJson({
          tenantId: config.context.tenantId,
          projectId: config.context.projectId,
          count: items.length,
          items
        });
        return;
      }

      stdout.write(formatImageList(items));
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
      const { detail } = await service.detail(imageId, toOverrides(options));
      writeJson(detail.raw);
    });

  image
    .command("json")
    .description("Fetch image JSON payload from the image detail json_url")
    .argument("<imageId>", "Image ID")
    .option("--tenant-id <tenantId>", "Override tenant ID")
    .option("--project-id <projectId>", "Override project ID")
    .option("--cookie <cookie>", "Override cookie")
    .option("--base-url <url>", "Override base URL")
    .option("--timeout <ms>", "Override timeout in milliseconds")
    .option("--profile <profile>", "Override profile")
    .action(async (imageId: string, options: ImageCommandOptions) => {
      const { data } = await service.json(imageId, toOverrides(options));
      writeJson(data);
    });
}

function toOverrides(options: ImageCommandOptions) {
  return {
    tenantId: options.tenantId,
    projectId: options.projectId,
    cookie: options.cookie,
    baseUrl: options.baseUrl,
    timeoutMs: options.timeout ? Number(options.timeout) : undefined,
    profile: options.profile
  };
}
