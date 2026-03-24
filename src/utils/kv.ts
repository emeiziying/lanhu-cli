import { EXIT_CODES, LanhuError } from "../errors.js";

export function collectRepeatedOption(
  value: string,
  previous: string[]
): string[] {
  return [...previous, value];
}

export function parseHeaders(pairs: string[]): Record<string, string> {
  return Object.fromEntries(
    pairs.map((pair) => {
      const [key, value] = splitKeyValue(pair);
      return [key.toLowerCase(), value];
    })
  );
}

export function parseQuery(pairs: string[]): Record<string, string | string[]> {
  return pairs.reduce<Record<string, string | string[]>>((result, pair) => {
    const [key, value] = splitKeyValue(pair);
    const current = result[key];

    if (current === undefined) {
      result[key] = value;
      return result;
    }

    if (Array.isArray(current)) {
      result[key] = [...current, value];
      return result;
    }

    result[key] = [current, value];
    return result;
  }, {});
}

export function parseData(raw?: string): unknown {
  if (raw === undefined) {
    return undefined;
  }

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
}

function splitKeyValue(input: string): [string, string] {
  const separatorIndex = input.indexOf("=");

  if (separatorIndex <= 0) {
    throw new LanhuError({
      code: "INVALID_ARGUMENT",
      message: `Expected key=value but received "${input}"`,
      exitCode: EXIT_CODES.USAGE
    });
  }

  return [input.slice(0, separatorIndex), input.slice(separatorIndex + 1)];
}
