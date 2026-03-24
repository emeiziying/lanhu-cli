import { type ProjectSummary } from "../../domain/projects.js";

export function formatProjectList(items: ProjectSummary[]): string {
  const lines = items.map(
    (item, index) =>
      `${item.isCurrent ? "*" : " "} ${index + 1}. ${item.name}${item.type !== "project" ? ` [${item.type}]` : ""}`
  );

  return `Projects:\n${lines.join("\n")}\n`;
}
