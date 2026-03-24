import { type ImageSummary } from "../../domain/images.js";

export function formatImageList(items: ImageSummary[]): string {
  const lines = items.map(
    (item, index) => `  ${index + 1}. ${item.name} (${item.imageId})`
  );

  return `Images:\n${lines.join("\n")}\n`;
}
