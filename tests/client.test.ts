import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  Agent,
  MockAgent,
  getGlobalDispatcher,
  setGlobalDispatcher
} from "undici";

import { LanhuClient } from "../src/client.js";
import { LanhuError } from "../src/errors.js";

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
          authorization: "Bearer secret",
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
      token: "secret",
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
      token: "secret",
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
      token: "secret",
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
});
