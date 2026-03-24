import {
  readStoredConfigFile,
  writeStoredConfigFile
} from "./file-store.js";
import { type StoredWorkspaceContext } from "./schema.js";

export async function readStoredContext(): Promise<StoredWorkspaceContext> {
  const config = await readStoredConfigFile();
  return config.context;
}

export async function writeStoredContext(
  context: StoredWorkspaceContext
): Promise<void> {
  const existing = await readStoredConfigFile();

  await writeStoredConfigFile({
    ...existing,
    context: {
      ...existing.context,
      ...context
    }
  });
}

export async function replaceStoredContext(
  context: StoredWorkspaceContext
): Promise<void> {
  const existing = await readStoredConfigFile();

  await writeStoredConfigFile({
    ...existing,
    context
  });
}
