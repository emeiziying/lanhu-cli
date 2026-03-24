import { type TeamSummary } from "../../domain/teams.js";

export function formatTeamList(items: TeamSummary[]): string {
  const lines = items.map(
    (item, index) => `${item.isCurrent ? "*" : " "} ${index + 1}. ${item.name}`
  );

  return `Teams:\n${lines.join("\n")}\n`;
}
