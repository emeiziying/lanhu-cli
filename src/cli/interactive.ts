import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { type ProjectSummary } from "../domain/projects.js";
import { type TeamSummary } from "../domain/teams.js";

export async function promptTeamSelection(teams: TeamSummary[]): Promise<string> {
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
  const rl = createInterface({ input, output });

  try {
    return await rl.question(
      "Select a project number, projectId, or shortId and press Enter: "
    );
  } finally {
    rl.close();
  }
}
