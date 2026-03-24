import { createRequire } from "node:module";

const _require = createRequire(import.meta.url);
const { version } = _require("../package.json") as { version: string };

export const APP_NAME = "lanhu";
export const CLI_VERSION: string = version;
export const CONFIG_DIR_NAME = "lanhu-cli";
export const CONFIG_FILE_NAME = "config.json";
export const DEFAULT_BASE_URL = "https://lanhuapp.com/workbench/api";
export const DEFAULT_PROFILE = "default";
export const DEFAULT_TIMEOUT_MS = 15_000;
export const MAX_RETRIES = 2;
