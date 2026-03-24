import { Command } from "commander";

import { LanhuClient } from "../../client.js";
import { loadResolvedConfig } from "../../config/loader.js";
import {
  collectRepeatedOption,
  parseData,
  parseHeaders,
  parseQuery
} from "../../utils/kv.js";
import { writeJson } from "../../utils/output.js";

interface RequestCommandOptions {
  query: string[];
  header: string[];
  data?: string;
  cookie?: string;
  baseUrl?: string;
  timeout?: string;
  profile?: string;
  tenantId?: string;
  projectId?: string;
}

export function registerRequestCommand(program: Command): void {
  program
    .command("request")
    .description("Send a request to the Lanhu API")
    .argument("<method>", "HTTP method")
    .argument("<path>", "Request path")
    .option("--query <key=value>", "Append query parameter", collectRepeatedOption, [])
    .option("--header <key=value>", "Append header", collectRepeatedOption, [])
    .option("--data <value>", "Request body as JSON or raw text")
    .option("--cookie <cookie>", "Override cookie for this request")
    .option("--base-url <url>", "Override base URL for this request")
    .option("--timeout <ms>", "Override timeout in milliseconds")
    .option("--profile <profile>", "Override profile")
    .option("--tenant-id <tenantId>", "Override tenant ID")
    .option("--project-id <projectId>", "Override project ID")
    .action(async (method: string, path: string, options: RequestCommandOptions) => {
      const config = await loadResolvedConfig({
        cookie: options.cookie,
        baseUrl: options.baseUrl,
        timeoutMs: options.timeout ? Number(options.timeout) : undefined,
        profile: options.profile,
        tenantId: options.tenantId,
        projectId: options.projectId
      });
      const client = new LanhuClient(config);
      const response = await client.request({
        method,
        path,
        query: parseQuery(options.query),
        headers: parseHeaders(options.header),
        body: parseData(options.data)
      });

      writeJson({
        status: response.status,
        requestId: response.requestId,
        data: response.data
      });
    });
}
