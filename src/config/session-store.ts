import {
  readStoredConfigFile,
  writeStoredConfigFile
} from "./file-store.js";
import { type StoredSessionConfig } from "./schema.js";

export async function readStoredSession(): Promise<StoredSessionConfig> {
  const config = await readStoredConfigFile();
  return config.session;
}

export async function writeStoredSession(
  session: StoredSessionConfig
): Promise<void> {
  const existing = await readStoredConfigFile();

  await writeStoredConfigFile({
    ...existing,
    session: {
      ...existing.session,
      ...session
    }
  });
}
