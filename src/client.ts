import { request } from "undici";

import { assertHasToken } from "./auth.js";
import { MAX_RETRIES } from "./constants.js";
import {
  EXIT_CODES,
  LanhuError,
  exitCodeForHttpStatus,
  isLanhuError
} from "./errors.js";
import {
  type LanhuConfig,
  type LanhuRequestOptions,
  type LanhuResponse
} from "./types.js";

interface InternalRequestOptions extends LanhuRequestOptions {
  requireAuth?: boolean;
  allowHttpError?: boolean;
}

export class LanhuClient {
  constructor(private readonly config: LanhuConfig) {}

  async request<T = unknown>(
    options: InternalRequestOptions
  ): Promise<LanhuResponse<T>> {
    if (options.requireAuth !== false) {
      assertHasToken(this.config);
    }

    let lastError: unknown;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
      try {
        const response = await this.execute<T>(options);

        if (!options.allowHttpError && response.status >= 400) {
          const error = this.createHttpError(response);

          if (shouldRetryStatus(response.status) && attempt < MAX_RETRIES) {
            await delay(backoffMs(attempt));
            continue;
          }

          throw error;
        }

        return response;
      } catch (error) {
        lastError = error;

        if (isLanhuError(error)) {
          if (
            error.httpStatus !== undefined &&
            shouldRetryStatus(error.httpStatus) &&
            attempt < MAX_RETRIES
          ) {
            await delay(backoffMs(attempt));
            continue;
          }

          throw error;
        }

        const transportError = normalizeTransportError(error);

        if (attempt >= MAX_RETRIES || !isRetryableTransportError(transportError)) {
          throw transportError;
        }

        await delay(backoffMs(attempt));
      }
    }

    throw normalizeTransportError(lastError);
  }

  async ping(): Promise<LanhuResponse> {
    return this.request({
      method: "GET",
      path: "/",
      requireAuth: false,
      allowHttpError: true
    });
  }

  private async execute<T>(
    options: InternalRequestOptions
  ): Promise<LanhuResponse<T>> {
    const headers = buildRequestHeaders(this.config, options.headers);
    const body = serializeBody(options.body, headers);
    const url = buildUrl(this.config.baseUrl, options.path, options.query);
    const timeoutMs = options.timeoutMs ?? this.config.timeoutMs;

    const response = await request(url, {
      method: options.method.toUpperCase(),
      headers,
      body,
      signal: AbortSignal.timeout(timeoutMs)
    });

    const responseHeaders = normalizeHeaders(response.headers);
    const contentType = responseHeaders["content-type"];
    const requestId = responseHeaders["x-request-id"];
    const text = await response.body.text();

    return {
      status: response.statusCode,
      headers: responseHeaders,
      requestId,
      data: parseResponseBody(text, contentType) as T
    };
  }

  private createHttpError(response: LanhuResponse): LanhuError {
    const message =
      getResponseMessage(response.data) ??
      `Request failed with status ${response.status}`;

    return new LanhuError({
      code: "HTTP_ERROR",
      message,
      exitCode: exitCodeForHttpStatus(response.status),
      httpStatus: response.status,
      requestId: response.requestId,
      details: response.data
    });
  }
}

function buildUrl(
  baseUrl: string,
  path: string,
  query?: Record<string, string | string[]>
): URL {
  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  const url = new URL(normalizedPath, normalizedBaseUrl);

  for (const [key, value] of Object.entries(query ?? {})) {
    if (Array.isArray(value)) {
      for (const item of value) {
        url.searchParams.append(key, item);
      }
    } else {
      url.searchParams.append(key, value);
    }
  }

  return url;
}

function buildRequestHeaders(
  config: LanhuConfig,
  headers: Record<string, string> = {}
): Record<string, string> {
  const normalizedHeaders = Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value])
  );

  if (config.token && normalizedHeaders.authorization === undefined) {
    normalizedHeaders.authorization = `Bearer ${config.token}`;
  }

  if (normalizedHeaders.accept === undefined) {
    normalizedHeaders.accept = "application/json";
  }

  return normalizedHeaders;
}

function serializeBody(
  body: unknown,
  headers: Record<string, string>
): string | undefined {
  if (body === undefined) {
    return undefined;
  }

  if (typeof body === "string") {
    return body;
  }

  if (headers["content-type"] === undefined) {
    headers["content-type"] = "application/json";
  }

  return JSON.stringify(body);
}

function normalizeHeaders(
  headers: Record<string, string | string[] | undefined>
): Record<string, string> {
  const normalized: Record<string, string> = {};

  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined) {
      continue;
    }

    normalized[key.toLowerCase()] = Array.isArray(value)
      ? value.join(", ")
      : value;
  }

  return normalized;
}

function parseResponseBody(
  body: string,
  contentType?: string
): unknown {
  if (!body) {
    return null;
  }

  if (contentType?.includes("application/json")) {
    try {
      return JSON.parse(body) as unknown;
    } catch {
      return body;
    }
  }

  if (looksLikeJson(body)) {
    try {
      return JSON.parse(body) as unknown;
    } catch {
      return body;
    }
  }

  return body;
}

function looksLikeJson(body: string): boolean {
  const trimmed = body.trim();
  return trimmed.startsWith("{") || trimmed.startsWith("[");
}

function getResponseMessage(data: unknown): string | undefined {
  if (!data || typeof data !== "object") {
    return undefined;
  }

  const record = data as Record<string, unknown>;

  for (const key of ["message", "msg", "error", "detail"]) {
    const value = record[key];

    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return undefined;
}

function shouldRetryStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function backoffMs(attempt: number): number {
  return 250 * 2 ** attempt;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function normalizeTransportError(error: unknown): LanhuError {
  if (isLanhuError(error)) {
    return error;
  }

  if (error instanceof Error) {
    const code = getErrorCode(error);
    const isTimeout = code === "ABORT_ERR" || code === "UND_ERR_CONNECT_TIMEOUT";

    return new LanhuError({
      code: isTimeout ? "REQUEST_TIMEOUT" : "NETWORK_ERROR",
      message: isTimeout ? "Request timed out" : error.message,
      exitCode: EXIT_CODES.NETWORK,
      details: {
        name: error.name,
        code
      },
      cause: error
    });
  }

  return new LanhuError({
    code: "NETWORK_ERROR",
    message: "Request failed due to an unknown network error",
    exitCode: EXIT_CODES.NETWORK,
    details: error
  });
}

function isRetryableTransportError(error: LanhuError): boolean {
  return error.code === "REQUEST_TIMEOUT" || error.code === "NETWORK_ERROR";
}

function getErrorCode(error: Error): string | undefined {
  return (error as Error & { code?: string }).code;
}
