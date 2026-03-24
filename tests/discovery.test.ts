import { describe, expect, it } from "vitest";

import {
  createDiscoveryEvent,
  sanitizeHeaders,
  shouldTrackUrl,
  summarizeEvents
} from "../src/discovery.js";

describe("discovery helpers", () => {
  it("tracks only matching Lanhu API URLs", () => {
    expect(
      shouldTrackUrl(
        "https://lanhuapp.com/workbench/api/projects?page=1",
        "https://lanhuapp.com",
        "/workbench/api"
      )
    ).toBe(true);

    expect(
      shouldTrackUrl(
        "https://lanhuapp.com/assets/app.js",
        "https://lanhuapp.com",
        "/workbench/api"
      )
    ).toBe(false);

    expect(
      shouldTrackUrl(
        "https://example.com/workbench/api/projects",
        "https://lanhuapp.com",
        "/workbench/api"
      )
    ).toBe(false);
  });

  it("removes sensitive headers", () => {
    const headers = sanitizeHeaders({
      cookie: "session=secret",
      authorization: "Basic secret",
      accept: "application/json",
      "x-trace-id": "123"
    });

    expect(headers).toEqual({
      accept: "application/json",
      "x-trace-id": "123"
    });
  });

  it("summarizes matching responses by method and path", () => {
    const first = createDiscoveryEvent({
      method: "GET",
      url: "https://lanhuapp.com/workbench/api/project/list?page=1",
      status: 200,
      requestHeaders: {
        cookie: "session=secret",
        accept: "application/json"
      },
      responseBody: JSON.stringify({
        list: [{ id: "1", name: "Demo" }]
      }),
      options: {
        origin: "https://lanhuapp.com",
        pathPrefix: "/workbench/api",
        saveResponseBody: true
      },
      capturedAt: "2026-03-24T00:00:00.000Z"
    });

    const second = createDiscoveryEvent({
      method: "GET",
      url: "https://lanhuapp.com/workbench/api/project/list?page=2",
      status: 200,
      requestHeaders: {
        cookie: "session=secret",
        accept: "application/json"
      },
      responseBody: JSON.stringify({
        list: [{ id: "2", name: "Demo 2" }]
      }),
      options: {
        origin: "https://lanhuapp.com",
        pathPrefix: "/workbench/api",
        saveResponseBody: true
      },
      capturedAt: "2026-03-24T00:00:01.000Z"
    });

    const summary = summarizeEvents([first, second]);

    expect(summary).toEqual([
      expect.objectContaining({
        key: "GET /workbench/api/project/list",
        count: 2,
        statuses: [200],
        queryKeys: ["page"],
        requestHeaderKeys: ["accept"]
      })
    ]);
  });
});
