import { Command } from "commander";

import { APP_NAME, CLI_VERSION } from "./constants.js";
import { LanhuError, EXIT_CODES } from "./errors.js";
import { registerAuthCommands } from "./commands/auth.js";
import { registerPingCommand } from "./commands/ping.js";
import { registerProjectCommands } from "./commands/project.js";
import { registerRequestCommand } from "./commands/request.js";
import { registerTeamCommands } from "./commands/team.js";

export function buildCli(): Command {
  const program = new Command();

  program
    .name(APP_NAME)
    .description("CLI for Lanhu web APIs")
    .version(CLI_VERSION)
    .option("--verbose", "Include extra error details")
    .showHelpAfterError()
    .exitOverride((error) => {
      if (
        error.code === "commander.helpDisplayed" ||
        error.code === "commander.help" ||
        error.code === "commander.version"
      ) {
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
  registerProjectCommands(program);
  registerTeamCommands(program);
  registerRequestCommand(program);
  registerPingCommand(program);

  return program;
}
