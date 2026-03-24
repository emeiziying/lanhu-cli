import { z } from "zod";

import {
  DEFAULT_BASE_URL,
  DEFAULT_PROFILE,
  DEFAULT_TIMEOUT_MS
} from "../constants.js";

export const storedSessionSchema = z
  .object({
    baseUrl: z.string().url().optional(),
    cookie: z.string().min(1).optional(),
    timeoutMs: z.number().int().positive().optional(),
    profile: z.string().min(1).optional()
  })
  .strict();

export const storedContextSchema = z
  .object({
    tenantId: z.string().min(1).optional(),
    projectId: z.string().min(1).optional()
  })
  .strict();

export const storedConfigSchema = z
  .object({
    session: storedSessionSchema.default({}),
    context: storedContextSchema.default({})
  })
  .strict();

export const storedConfigFileSchema = z
  .object({
    session: storedSessionSchema.optional(),
    context: storedContextSchema.optional(),
    baseUrl: z.string().url().optional(),
    cookie: z.string().min(1).optional(),
    timeoutMs: z.number().int().positive().optional(),
    profile: z.string().min(1).optional(),
    tenantId: z.string().min(1).optional(),
    projectId: z.string().min(1).optional(),
    token: z.string().min(1).optional()
  })
  .passthrough();

export const resolvedSessionSchema = z
  .object({
    baseUrl: z.string().url().default(DEFAULT_BASE_URL),
    cookie: z.string().min(1).optional(),
    timeoutMs: z.number().int().positive().default(DEFAULT_TIMEOUT_MS),
    profile: z.string().min(1).default(DEFAULT_PROFILE)
  })
  .strict();

export const resolvedContextSchema = storedContextSchema;

export const resolvedConfigSchema = z
  .object({
    session: resolvedSessionSchema,
    context: resolvedContextSchema
  })
  .strict();

export type StoredSessionConfig = z.infer<typeof storedSessionSchema>;
export type StoredWorkspaceContext = z.infer<typeof storedContextSchema>;
export type StoredLanhuConfig = z.infer<typeof storedConfigSchema>;
export type StoredLanhuConfigFile = z.infer<typeof storedConfigFileSchema>;
export type ResolvedLanhuConfig = z.infer<typeof resolvedConfigSchema>;
