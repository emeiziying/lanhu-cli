const SENSITIVE_HEADERS = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "x-csrf-token"
]);

const MAX_TEXT_PREVIEW = 500;
const MAX_ARRAY_ITEMS = 5;
const MAX_OBJECT_KEYS = 20;
const MAX_DEPTH = 4;

export interface DiscoveryOptions {
  origin: string;
  pathPrefix: string;
  saveResponseBody: boolean;
}

export interface DiscoveryEvent {
  key: string;
  method: string;
  url: string;
  pathname: string;
  query: Record<string, string[]>;
  status: number;
  requestHeaders: Record<string, string>;
  requestBodyPreview?: string;
  requestBodyShape?: unknown;
  responseBodyPreview?: string;
  responseBodyShape?: unknown;
  capturedAt: string;
}

export interface DiscoverySummary {
  key: string;
  method: string;
  pathname: string;
  count: number;
  statuses: number[];
  sampleUrls: string[];
  queryKeys: string[];
  requestHeaderKeys: string[];
  requestBodyShape?: unknown;
  responseBodyShape?: unknown;
  latestResponsePreview?: string;
}

export function shouldTrackUrl(
  rawUrl: string,
  origin: string,
  pathPrefix: string
): boolean {
  try {
    const url = new URL(rawUrl);
    return url.origin === origin && url.pathname.startsWith(pathPrefix);
  } catch {
    return false;
  }
}

export function buildDiscoveryKey(method: string, pathname: string): string {
  return `${method.toUpperCase()} ${pathname}`;
}

export function sanitizeHeaders(
  headers: Record<string, string | undefined>
): Record<string, string> {
  const sanitized: Record<string, string> = {};

  for (const [key, value] of Object.entries(headers)) {
    if (!value) {
      continue;
    }

    const normalizedKey = key.toLowerCase();

    if (SENSITIVE_HEADERS.has(normalizedKey)) {
      continue;
    }

    sanitized[normalizedKey] = truncateText(value, 200);
  }

  return sanitized;
}

export function parseQuery(rawUrl: string): Record<string, string[]> {
  const url = new URL(rawUrl);
  const query: Record<string, string[]> = {};

  for (const [key, value] of url.searchParams.entries()) {
    query[key] ??= [];
    query[key].push(value);
  }

  return query;
}

export function summarizeBody(
  rawBody: string | null | undefined,
  includePreview: boolean
): { preview?: string; shape?: unknown } {
  if (!rawBody) {
    return {};
  }

  const preview = includePreview ? truncateText(rawBody, MAX_TEXT_PREVIEW) : undefined;
  const parsed = tryParseJson(rawBody);

  return {
    preview,
    shape: inferShape(parsed ?? rawBody)
  };
}

export function createDiscoveryEvent(input: {
  method: string;
  url: string;
  status: number;
  requestHeaders: Record<string, string | undefined>;
  requestBody?: string | null;
  responseBody?: string | null;
  options: DiscoveryOptions;
  capturedAt?: string;
}): DiscoveryEvent {
  const url = new URL(input.url);
  const requestBody = summarizeBody(input.requestBody, true);
  const responseBody = summarizeBody(
    input.responseBody,
    input.options.saveResponseBody
  );

  return {
    key: buildDiscoveryKey(input.method, url.pathname),
    method: input.method.toUpperCase(),
    url: input.url,
    pathname: url.pathname,
    query: parseQuery(input.url),
    status: input.status,
    requestHeaders: sanitizeHeaders(input.requestHeaders),
    requestBodyPreview: requestBody.preview,
    requestBodyShape: requestBody.shape,
    responseBodyPreview: responseBody.preview,
    responseBodyShape: responseBody.shape,
    capturedAt: input.capturedAt ?? new Date().toISOString()
  };
}

export function summarizeEvents(events: DiscoveryEvent[]): DiscoverySummary[] {
  const map = new Map<string, DiscoverySummary>();

  for (const event of events) {
    const existing = map.get(event.key);

    if (!existing) {
      map.set(event.key, {
        key: event.key,
        method: event.method,
        pathname: event.pathname,
        count: 1,
        statuses: [event.status],
        sampleUrls: [event.url],
        queryKeys: Object.keys(event.query).sort(),
        requestHeaderKeys: Object.keys(event.requestHeaders).sort(),
        requestBodyShape: event.requestBodyShape,
        responseBodyShape: event.responseBodyShape,
        latestResponsePreview: event.responseBodyPreview
      });
      continue;
    }

    existing.count += 1;
    if (!existing.statuses.includes(event.status)) {
      existing.statuses.push(event.status);
      existing.statuses.sort((left, right) => left - right);
    }

    if (existing.sampleUrls.length < 3 && !existing.sampleUrls.includes(event.url)) {
      existing.sampleUrls.push(event.url);
    }

    existing.queryKeys = uniqueSorted([...existing.queryKeys, ...Object.keys(event.query)]);
    existing.requestHeaderKeys = uniqueSorted([
      ...existing.requestHeaderKeys,
      ...Object.keys(event.requestHeaders)
    ]);
    existing.requestBodyShape ??= event.requestBodyShape;
    existing.responseBodyShape ??= event.responseBodyShape;
    existing.latestResponsePreview = event.responseBodyPreview ?? existing.latestResponsePreview;
  }

  return [...map.values()].sort((left, right) =>
    left.pathname.localeCompare(right.pathname) ||
    left.method.localeCompare(right.method)
  );
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort();
}

function tryParseJson(raw: string): unknown | undefined {
  const trimmed = raw.trim();

  if (!trimmed) {
    return undefined;
  }

  if (
    !trimmed.startsWith("{") &&
    !trimmed.startsWith("[") &&
    !trimmed.startsWith("\"") &&
    !trimmed.startsWith("true") &&
    !trimmed.startsWith("false") &&
    !trimmed.startsWith("null") &&
    Number.isNaN(Number(trimmed))
  ) {
    return undefined;
  }

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
}

function inferShape(value: unknown, depth = 0): unknown {
  if (depth >= MAX_DEPTH) {
    return "...";
  }

  if (value === null) {
    return "null";
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return [];
    }

    return value.slice(0, MAX_ARRAY_ITEMS).map((entry) => inferShape(entry, depth + 1));
  }

  switch (typeof value) {
    case "string":
      return "string";
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "undefined":
      return "undefined";
    case "object": {
      const entries = Object.entries(value as Record<string, unknown>).slice(
        0,
        MAX_OBJECT_KEYS
      );

      return Object.fromEntries(
        entries.map(([key, entryValue]) => [key, inferShape(entryValue, depth + 1)])
      );
    }
    default:
      return typeof value;
  }
}

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}...`;
}
