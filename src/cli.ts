import { Command } from "commander";

import { APP_NAME, CLI_VERSION } from "./constants.js";
import { LanhuError, EXIT_CODES } from "./errors.js";
import { registerAuthCommands } from "./commands/auth.js";
import { registerPingCommand } from "./commands/ping.js";
import { registerRequestCommand } from "./commands/request.js";

export function buildCli(): Command {
  const program = new Command();

  program
    .name(APP_NAME)
    .description("CLI proxy for Lanhu OpenAPI")
    .version(CLI_VERSION)
    .option("--verbose", "Include extra error details")
    .showHelpAfterError()
    .exitOverride((error) => {
      if (error.code === "commander.helpDisplayed" || error.code === "commander.version") {
        throw new LanhuError({
          code: "COMMANDER_EXIT",
          message: error.message,
          exitCode: EXIT_CODES.SUCCESS,
          details: {
            commanderCode: error.code
          }
        });
      }

      throw new LanhuError({
        code: "COMMANDER_EXIT",
        message: error.message,
        exitCode: EXIT_CODES.USAGE,
        details: {
          commanderCode: error.code
        }
      });
    });

  registerAuthCommands(program);
  registerRequestCommand(program);
  registerPingCommand(program);

  return program;
}
