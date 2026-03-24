import { Command } from "commander";

import { LanhuClient } from "../client.js";
import { loadConfig } from "../config/load.js";
import {
  collectRepeatedOption,
  parseData,
  parseHeaders,
  parseQuery
} from "../utils/kv.js";
import { writeJson } from "../utils/output.js";

interface RequestCommandOptions {
  query: string[];
  header: string[];
  data?: string;
  cookie?: string;
  baseUrl?: string;
  timeout?: string;
  profile?: string;
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
    .action(async (method: string, path: string, options: RequestCommandOptions) => {
      const config = await loadConfig({
        cookie: options.cookie,
        baseUrl: options.baseUrl,
        timeoutMs: options.timeout ? Number(options.timeout) : undefined,
        profile: options.profile
      });
      const client = new LanhuClient(config);
      const query = parseQuery(options.query);
      const headers = parseHeaders(options.header);
      const body = parseData(options.data);

      const response = await client.request({
        method,
        path,
        query,
        headers,
        body
      });

      writeJson({
        status: response.status,
        requestId: response.requestId,
        data: response.data
      });
    });
}
