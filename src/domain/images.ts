import { extractCollection } from "../api/envelopes.js";
import { EXIT_CODES, LanhuError } from "../errors.js";

export interface ImageSummary {
  imageId: string;
  name: string;
  raw: Record<string, unknown>;
}

export interface ImageDetail {
  jsonUrl?: string;
  raw: unknown;
}

export function normalizeImageList(payload: unknown): ImageSummary[] {
  const items = extractCollection(payload, [
    "images",
    "items",
    "list",
    "docs",
    "pages",
    "projectImages",
    "project_images",
    "rows"
  ]);

  if (!items) {
    throw new LanhuError({
      code: "INVALID_RESPONSE",
      message: "Lanhu image list response did not contain an array",
      exitCode: EXIT_CODES.GENERAL,
      details: payload
    });
  }

  return items.map((entry) => normalizeImage(entry));
}

export function normalizeImageDetail(payload: unknown): ImageDetail {
  return {
    jsonUrl: extractImageJsonUrl(payload),
    raw: payload
  };
}

export function extractImageJsonUrl(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }

  const record = payload as Record<string, unknown>;
  for (const key of ["json_url", "jsonUrl", "json", "source_json_url"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  for (const value of Object.values(record)) {
    const nested = extractImageJsonUrl(value);
    if (nested) {
      return nested;
    }
  }

  return undefined;
}

export function getImageName(record: Record<string, unknown>): string {
  for (const key of ["name", "title", "imageName", "imgName", "pageName"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return String(record.id ?? record.image_id ?? "<unnamed>");
}

function normalizeImage(payload: unknown): ImageSummary {
  if (!payload || typeof payload !== "object") {
    throw new LanhuError({
      code: "INVALID_RESPONSE",
      message: "Lanhu returned an unexpected image entry",
      exitCode: EXIT_CODES.GENERAL,
      details: payload
    });
  }

  const record = payload as Record<string, unknown>;

  return {
    imageId: getImageId(record),
    name: getImageName(record),
    raw: record
  };
}

function getImageId(record: Record<string, unknown>): string {
  for (const key of ["id", "image_id", "imageId", "doc_id", "docId"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  throw new LanhuError({
    code: "INVALID_RESPONSE",
    message: "Lanhu image entry is missing id",
    exitCode: EXIT_CODES.GENERAL,
    details: record
  });
}
