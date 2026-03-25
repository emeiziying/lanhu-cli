import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { type ProjectSummary } from "../domain/projects.js";
import { EXIT_CODES, LanhuError } from "../errors.js";
import { type TeamSummary } from "../domain/teams.js";

function assertInteractive(): void {
  if (!input.isTTY) {
    throw new LanhuError({
      code: "NOT_INTERACTIVE",
      message:
        "Interactive selection requires a TTY. " +
        "Use --tenant-id or --project-id to specify a selection directly.",
      exitCode: EXIT_CODES.USAGE,
    });
  }
}

export async function promptTeamSelection(teams: TeamSummary[]): Promise<string> {
  assertInteractive();
  const rl = createInterface({ input, output });

  try {
    return await rl.question("Select a team number or tenantId and press Enter: ");
  } finally {
    rl.close();
  }
}

export async function promptProjectSelection(
  projects: ProjectSummary[]
): Promise<string> {
  assertInteractive();
  const rl = createInterface({ input, output });

  try {
    return await rl.question(
      "Select a project number, projectId, or shortId and press Enter: "
    );
  } finally {
    rl.close();
  }
}
