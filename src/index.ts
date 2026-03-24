import { buildCli } from "./cli.js";
import { EXIT_CODES, LanhuError, fromUnknownError } from "./errors.js";
import { writeError } from "./utils/output.js";

async function main(): Promise<void> {
  const program = buildCli();

  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    const normalized = fromUnknownError(error);

    if (
      normalized.code === "COMMANDER_EXIT" &&
      normalized.exitCode === EXIT_CODES.SUCCESS
    ) {
      return;
    }

    const verbose = Boolean(program.opts().verbose);
    writeError(normalized, verbose);
    process.exitCode = normalized.exitCode;
  }
}

void main();
