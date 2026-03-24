import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  Agent,
  MockAgent,
  getGlobalDispatcher,
  setGlobalDispatcher
} from "undici";

import { LanhuError } from "../src/errors.js";
import {
  getProjectImageDetail,
  listProjectImages,
  normalizeProjectImageList
} from "../src/images.js";

describe("images", () => {
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

  it("lists images from the project images API", async () => {
    const pool = mockAgent.get("https://lanhuapp.com");

    pool
      .intercept({
        method: "GET",
        path: "/api/project/images?project_id=project-1&team_id=tenant-1&dds_status=1&position=1&show_cb_src=1&comment=1",
        headers: {
          cookie: "session=secret"
        }
      })
      .reply(200, {
        code: "00000",
        msg: "success",
        result: [
          {
            id: "image-1",
            name: "Home"
          }
        ]
      });

    const items = await listProjectImages({
      baseUrl: "https://lanhuapp.com/workbench/api",
      cookie: "session=secret",
      tenantId: "tenant-1",
      projectId: "project-1",
      timeoutMs: 1_000,
      profile: "default"
    });

    expect(items).toEqual([
      expect.objectContaining({
        id: "image-1",
        name: "Home"
      })
    ]);
  });

  it("reads image detail payload from project image API", async () => {
    const pool = mockAgent.get("https://lanhuapp.com");

    pool
      .intercept({
        method: "GET",
        path: "/api/project/image?dds_status=1&image_id=image-1&team_id=tenant-1&project_id=project-1",
        headers: {
          cookie: "session=secret"
        }
      })
      .reply(200, {
        code: "00000",
        msg: "success",
        result: {
          id: "image-1",
          json_url: "https://static.example.com/image-1.json"
        }
      });

      const detail = await getProjectImageDetail({
        baseUrl: "https://lanhuapp.com/workbench/api",
        cookie: "session=secret",
        tenantId: "tenant-1",
        projectId: "project-1",
        timeoutMs: 1_000,
        profile: "default"
      }, {
        imageId: "image-1"
      });

    expect(detail).toEqual({
      id: "image-1",
      json_url: "https://static.example.com/image-1.json"
    });
  });

  it("requires projectId", async () => {
    await expect(
      listProjectImages({
        baseUrl: "https://lanhuapp.com/workbench/api",
        cookie: "session=secret",
        tenantId: "tenant-1",
        timeoutMs: 1_000,
        profile: "default"
      })
    ).rejects.toMatchObject({
      code: "PROJECT_REQUIRED"
    } satisfies Partial<LanhuError>);
  });

  it("extracts nested image arrays from object payloads", () => {
    const items = normalizeProjectImageList({
      images: {
        docs: [
          {
            id: "image-1",
            title: "Home"
          }
        ]
      }
    });

    expect(items).toEqual([
      expect.objectContaining({
        id: "image-1",
        title: "Home"
      })
    ]);
  });
});
