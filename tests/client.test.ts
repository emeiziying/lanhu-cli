import { createRequire } from "node:module";

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  Agent,
  MockAgent,
  getGlobalDispatcher,
  setGlobalDispatcher
} from "undici";

import { LanhuClient } from "../src/client.js";
import { LanhuError } from "../src/errors.js";

const require = createRequire(import.meta.url);
const { Readable: BodyReadable } = require("undici/lib/api/readable") as {
  Readable: {
    prototype: {
      text: () => Promise<string>;
    };
  };
};

describe("LanhuClient", () => {
  const originalDispatcher = getGlobalDispatcher();
  let mockAgent: MockAgent;

  beforeEach(() => {
    mockAgent = new MockAgent();
    mockAgent.disableNetConnect();
    setGlobalDispatcher(mockAgent);
  });

  afterEach(async () => {
    await mockAgent.close();
    setGlobalDispatcher(originalDispatcher as Agent);
  });

  it("sends query, headers, body and parses JSON response", async () => {
    const pool = mockAgent.get("https://api.example.com");

    pool
      .intercept({
        method: "POST",
        path: "/v1/projects?foo=bar&foo=baz",
        headers: {
          cookie: "session=secret",
          "x-test": "1"
        },
        body: JSON.stringify({ name: "demo" })
      })
      .reply(
        200,
        {
          ok: true
        },
        {
          headers: {
            "content-type": "application/json",
            "x-request-id": "req-123"
          }
        }
      );

    const client = new LanhuClient({
      baseUrl: "https://api.example.com",
      cookie: "session=secret",
      timeoutMs: 1_000,
      profile: "default"
    });

    const response = await client.request({
      method: "POST",
      path: "/v1/projects",
      query: {
        foo: ["bar", "baz"]
      },
      headers: {
        "x-test": "1"
      },
      body: {
        name: "demo"
      }
    });

    expect(response.status).toBe(200);
    expect(response.requestId).toBe("req-123");
    expect(response.data).toEqual({ ok: true });
  });

  it("retries retryable upstream errors", async () => {
    const pool = mockAgent.get("https://api.example.com");

    pool.intercept({ method: "GET", path: "/retry" }).reply(500, {
      message: "retry me"
    });
    pool.intercept({ method: "GET", path: "/retry" }).reply(200, {
      ok: true
    });

    const client = new LanhuClient({
      baseUrl: "https://api.example.com",
      cookie: "session=secret",
      timeoutMs: 1_000,
      profile: "default"
    });

    const response = await client.request({
      method: "GET",
      path: "/retry"
    });

    expect(response.status).toBe(200);
    expect(response.data).toEqual({ ok: true });
  });

  it("maps 401 to auth exit code", async () => {
    const pool = mockAgent.get("https://api.example.com");

    pool.intercept({ method: "GET", path: "/unauthorized" }).reply(401, {
      message: "unauthorized"
    });

    const client = new LanhuClient({
      baseUrl: "https://api.example.com",
      cookie: "session=secret",
      timeoutMs: 1_000,
      profile: "default"
    });

    await expect(
      client.request({
        method: "GET",
        path: "/unauthorized"
      })
    ).rejects.toMatchObject({
      code: "HTTP_ERROR",
      exitCode: 3,
      httpStatus: 401
    } satisfies Partial<LanhuError>);
  });

  it("throws AUTH_REQUIRED when no cookie is configured", async () => {
    const client = new LanhuClient({
      baseUrl: "https://api.example.com",
      timeoutMs: 1_000,
      profile: "default"
    });

    await expect(
      client.request({ method: "GET", path: "/needs-auth" })
    ).rejects.toMatchObject({
      code: "AUTH_REQUIRED",
      exitCode: 3
    } satisfies Partial<LanhuError>);
  });

  it("maps 429 to network exit code after exhausting retries", async () => {
    const pool = mockAgent.get("https://api.example.com");

    pool.intercept({ method: "GET", path: "/rate-limit" }).reply(429, { message: "rate limited" });
    pool.intercept({ method: "GET", path: "/rate-limit" }).reply(429, { message: "rate limited" });
    pool.intercept({ method: "GET", path: "/rate-limit" }).reply(429, { message: "rate limited" });

    const client = new LanhuClient({
      baseUrl: "https://api.example.com",
      cookie: "session=secret",
      timeoutMs: 1_000,
      profile: "default"
    });

    await expect(
      client.request({ method: "GET", path: "/rate-limit" })
    ).rejects.toMatchObject({
      code: "HTTP_ERROR",
      exitCode: 4,
      httpStatus: 429
    } satisfies Partial<LanhuError>);
  });

  it("maps 403 to auth exit code", async () => {
    const pool = mockAgent.get("https://api.example.com");

    pool.intercept({ method: "GET", path: "/forbidden" }).reply(403, {
      message: "forbidden"
    });

    const client = new LanhuClient({
      baseUrl: "https://api.example.com",
      cookie: "session=secret",
      timeoutMs: 1_000,
      profile: "default"
    });

    await expect(
      client.request({ method: "GET", path: "/forbidden" })
    ).rejects.toMatchObject({
      code: "HTTP_ERROR",
      exitCode: 3,
      httpStatus: 403
    } satisfies Partial<LanhuError>);
  });

  it("returns non-JSON response as text", async () => {
    const pool = mockAgent.get("https://api.example.com");

    pool
      .intercept({ method: "GET", path: "/text" })
      .reply(200, "plain text response", {
        headers: { "content-type": "text/plain" }
      });

    const client = new LanhuClient({
      baseUrl: "https://api.example.com",
      cookie: "session=secret",
      timeoutMs: 1_000,
      profile: "default"
    });

    const response = await client.request({ method: "GET", path: "/text" });
    expect(response.status).toBe(200);
    expect(response.data).toBe("plain text response");
  });

  it("falls back to heuristic JSON parsing without content-type header", async () => {
    const pool = mockAgent.get("https://api.example.com");

    pool
      .intercept({ method: "GET", path: "/no-ct" })
      .reply(200, JSON.stringify({ heuristic: true }));

    const client = new LanhuClient({
      baseUrl: "https://api.example.com",
      cookie: "session=secret",
      timeoutMs: 1_000,
      profile: "default"
    });

    const response = await client.request({ method: "GET", path: "/no-ct" });
    expect(response.data).toEqual({ heuristic: true });
  });

  it("extracts error message from response body", async () => {
    const pool = mockAgent.get("https://api.example.com");

    pool.intercept({ method: "GET", path: "/err" }).reply(
      400,
      { msg: "bad request details" },
      { headers: { "content-type": "application/json" } }
    );

    const client = new LanhuClient({
      baseUrl: "https://api.example.com",
      cookie: "session=secret",
      timeoutMs: 1_000,
      profile: "default"
    });

    await expect(
      client.request({ method: "GET", path: "/err" })
    ).rejects.toMatchObject({
      message: "bad request details",
      httpStatus: 400
    } satisfies Partial<LanhuError>);
  });

  it("rejects oversized responses without calling body.text()", async () => {
    const pool = mockAgent.get("https://api.example.com");
    const originalText = BodyReadable.prototype.text;

    BodyReadable.prototype.text = () => {
      throw new Error("body.text() should not be used for oversized responses");
    };

    pool
      .intercept({ method: "GET", path: "/huge" })
      .reply(200, "x".repeat(51 * 1024 * 1024), {
        headers: { "content-type": "text/plain" }
      });

    const client = new LanhuClient({
      baseUrl: "https://api.example.com",
      cookie: "session=secret",
      timeoutMs: 10_000,
      profile: "default"
    });

    try {
      await expect(
        client.request({
          method: "GET",
          path: "/huge"
        })
      ).rejects.toMatchObject({
        code: "RESPONSE_TOO_LARGE",
        exitCode: 1,
        details: expect.objectContaining({
          limitBytes: 50 * 1024 * 1024
        })
      } satisfies Partial<LanhuError>);
    } finally {
      BodyReadable.prototype.text = originalText;
    }
  });
});
