import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  Agent,
  MockAgent,
  getGlobalDispatcher,
  setGlobalDispatcher
} from "undici";

import { LanhuError } from "../src/errors.js";
import {
  extractImageJsonUrl,
  normalizeImageList
} from "../src/domain/images.js";
import { ImageService } from "../src/services/image-service.js";

describe("images", () => {
  const originalDispatcher = getGlobalDispatcher();
  const originalEnv = { ...process.env };
  let mockAgent: MockAgent;
  let service: ImageService;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "lanhu-cli-images-"));
    process.env.XDG_CONFIG_HOME = tempDir;
    delete process.env.LANHU_BASE_URL;
    delete process.env.LANHU_COOKIE;
    delete process.env.LANHU_TENANT_ID;
    delete process.env.LANHU_PROJECT_ID;
    delete process.env.LANHU_TIMEOUT_MS;
    delete process.env.LANHU_PROFILE;
    mockAgent = new MockAgent();
    mockAgent.disableNetConnect();
    setGlobalDispatcher(mockAgent);
    service = new ImageService();
  });

  afterEach(async () => {
    process.env = { ...originalEnv };
    await rm(tempDir, { recursive: true, force: true });
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

    const result = await service.list({
      baseUrl: "https://lanhuapp.com/workbench/api",
      cookie: "session=secret",
      tenantId: "tenant-1",
      projectId: "project-1",
      timeoutMs: 1_000,
      profile: "default"
    });

    expect(result.items).toEqual([
      expect.objectContaining({
        imageId: "image-1",
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

    const result = await service.detail("image-1", {
      baseUrl: "https://lanhuapp.com/workbench/api",
      cookie: "session=secret",
      tenantId: "tenant-1",
      projectId: "project-1",
      timeoutMs: 1_000,
      profile: "default"
    });

    expect(result.detail.raw).toEqual({
      id: "image-1",
      json_url: "https://static.example.com/image-1.json"
    });
    expect(result.detail.jsonUrl).toBe("https://static.example.com/image-1.json");
  });

  it("requires projectId", async () => {
    await expect(
      service.list({
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
    const items = normalizeImageList({
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
        imageId: "image-1",
        name: "Home"
      })
    ]);
  });

  it("extracts image json url from nested payloads", () => {
    expect(
      extractImageJsonUrl({
        image: {
          meta: {
            json_url: "https://static.example.com/image-1.json"
          }
        }
      })
    ).toBe("https://static.example.com/image-1.json");
  });
});
