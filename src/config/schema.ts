import { z } from "zod";

import {
  DEFAULT_BASE_URL,
  DEFAULT_PROFILE,
  DEFAULT_TIMEOUT_MS
} from "../constants.js";

export const storedConfigSchema = z
  .object({
    baseUrl: z.string().url().optional(),
    cookie: z.string().min(1).optional(),
    tenantId: z.string().min(1).optional(),
    timeoutMs: z.number().int().positive().optional(),
    profile: z.string().min(1).optional()
  })
  .strict();

export const storedConfigFileSchema = z
  .object({
    baseUrl: z.string().url().optional(),
    cookie: z.string().min(1).optional(),
    tenantId: z.string().min(1).optional(),
    timeoutMs: z.number().int().positive().optional(),
    profile: z.string().min(1).optional(),
    token: z.string().min(1).optional()
  })
  .passthrough();

export const resolvedConfigSchema = z
  .object({
    baseUrl: z.string().url().default(DEFAULT_BASE_URL),
    cookie: z.string().min(1).optional(),
    tenantId: z.string().min(1).optional(),
    timeoutMs: z.number().int().positive().default(DEFAULT_TIMEOUT_MS),
    profile: z.string().min(1).default(DEFAULT_PROFILE)
  })
  .strict();

export type StoredConfig = z.infer<typeof storedConfigSchema>;
export type ResolvedConfig = z.infer<typeof resolvedConfigSchema>;
export type StoredConfigFile = z.infer<typeof storedConfigFileSchema>;
