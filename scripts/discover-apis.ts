import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { chromium } from "playwright";

import {
  createDiscoveryEvent,
  shouldTrackUrl,
  summarizeEvents,
  type DiscoveryEvent,
  type DiscoveryOptions
} from "./discovery.js";

interface ScriptOptions extends DiscoveryOptions {
  url: string;
  userDataDir: string;
  outputDir: string;
  channel?: string;
  headless: boolean;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const runDir = join(options.outputDir, timestamp());
  const events: DiscoveryEvent[] = [];

  await mkdir(options.userDataDir, { recursive: true });
  await mkdir(runDir, { recursive: true });

  const context = await launchContext(options);
  const page = context.pages()[0] ?? (await context.newPage());

  context.on("response", async (response) => {
    const url = response.url();

    if (!shouldTrackUrl(url, options.origin, options.pathPrefix)) {
      return;
    }

    const request = response.request();

    if (request.method().toUpperCase() === "OPTIONS") {
      return;
    }

    try {
      const event = createDiscoveryEvent({
        method: request.method(),
        url,
        status: response.status(),
        requestHeaders: await request.allHeaders(),
        requestBody: request.postData(),
        responseBody: await safeReadResponseText(response),
        options
      });

      events.push(event);

      output.write(
        `[capture] ${event.method} ${event.pathname} ${event.status} (${events.length})\n`
      );
    } catch (error) {
      output.write(`[warn] Failed to record ${request.method()} ${url}: ${formatError(error)}\n`);
    }
  });

  output.write(`Launching browser with profile: ${options.userDataDir}\n`);
  output.write(`Writing discovery output to: ${runDir}\n`);
  output.write(`Tracking: ${options.origin}${options.pathPrefix}*\n`);
  output.write("Log in to Lanhu and navigate through the UI. Press Enter to stop capture.\n");

  await page.goto(options.url, { waitUntil: "domcontentloaded" });
  await waitForStopSignal();

  await context.close();

  const summary = summarizeEvents(events);
  await writeFile(
    join(runDir, "events.json"),
    `${JSON.stringify(events, null, 2)}\n`,
    "utf8"
  );
  await writeFile(
    join(runDir, "summary.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
    "utf8"
  );

  output.write(`Captured ${events.length} matching responses.\n`);
  output.write(`Summary file: ${join(runDir, "summary.json")}\n`);
  output.write(`Raw events file: ${join(runDir, "events.json")}\n`);
}

async function launchContext(options: ScriptOptions) {
  try {
    return await chromium.launchPersistentContext(options.userDataDir, {
      channel: options.channel,
      headless: options.headless,
      viewport: null
    });
  } catch (error) {
    throw new Error(
      [
        `Unable to launch browser${options.channel ? ` with channel "${options.channel}"` : ""}.`,
        `Original error: ${formatError(error)}`,
        "If Chrome is unavailable, run `pnpm exec playwright install chromium` and retry with `--channel chromium`."
      ].join(" ")
    );
  }
}

async function safeReadResponseText(
  response: { text(): Promise<string> }
): Promise<string | null> {
  try {
    return await response.text();
  } catch {
    return null;
  }
}

async function waitForStopSignal(): Promise<void> {
  const rl = createInterface({ input, output });

  try {
    await Promise.race([
      rl.question(""),
      new Promise<void>((resolve) => {
        process.once("SIGINT", () => resolve());
      })
    ]);
  } finally {
    rl.close();
  }
}

function parseArgs(argv: string[]): ScriptOptions {
  const defaults: ScriptOptions = {
    url: "https://lanhuapp.com/workbench",
    origin: "https://lanhuapp.com",
    pathPrefix: "/workbench/api",
    saveResponseBody: false,
    userDataDir: resolve(".lanhu-discovery/profile"),
    outputDir: resolve(".lanhu-discovery"),
    channel: "chrome",
    headless: false
  };

  const options = { ...defaults };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    switch (arg) {
      case "--url":
        options.url = requireValue(arg, next);
        index += 1;
        break;
      case "--origin":
        options.origin = requireValue(arg, next);
        index += 1;
        break;
      case "--path-prefix":
        options.pathPrefix = requireValue(arg, next);
        index += 1;
        break;
      case "--user-data-dir":
        options.userDataDir = resolve(requireValue(arg, next));
        index += 1;
        break;
      case "--output-dir":
        options.outputDir = resolve(requireValue(arg, next));
        index += 1;
        break;
      case "--channel":
        options.channel = requireValue(arg, next);
        index += 1;
        break;
      case "--save-response-body":
        options.saveResponseBody = true;
        break;
      case "--headless":
        options.headless = true;
        break;
      case "--help":
        printHelp();
        process.exit(0);
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function requireValue(flag: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing value for ${flag}`);
  }

  return value;
}

function timestamp(): string {
  return new Date().toISOString().replaceAll(":", "-");
}

function printHelp(): void {
  output.write(
    [
      "Usage: pnpm discover:apis -- [options]",
      "",
      "Options:",
      "  --url <url>               Start page to open",
      "  --origin <origin>         Only capture requests from this origin",
      "  --path-prefix <prefix>    Only capture request paths with this prefix",
      "  --user-data-dir <dir>     Persistent browser profile directory",
      "  --output-dir <dir>        Directory for capture artifacts",
      "  --channel <name>          Browser channel to launch (default: chrome)",
      "  --save-response-body      Save a truncated response body preview",
      "  --headless                Run without a visible browser window",
      "  --help                    Show this message"
    ].join("\n")
  );
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

void main().catch((error) => {
  process.stderr.write(`${formatError(error)}\n`);
  process.exitCode = 1;
});
