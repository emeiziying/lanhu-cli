export const EXIT_CODES = {
  SUCCESS: 0,
  GENERAL: 1,
  USAGE: 2,
  AUTH: 3,
  NETWORK: 4
} as const;

export interface LanhuErrorOptions {
  code: string;
  message: string;
  exitCode?: number;
  httpStatus?: number;
  requestId?: string;
  details?: unknown;
  cause?: unknown;
}

export class LanhuError extends Error {
  readonly code: string;
  readonly exitCode: number;
  readonly httpStatus?: number;
  readonly requestId?: string;
  readonly details?: unknown;

  constructor(options: LanhuErrorOptions) {
    super(options.message, options.cause ? { cause: options.cause } : undefined);
    this.name = "LanhuError";
    this.code = options.code;
    this.exitCode = options.exitCode ?? EXIT_CODES.GENERAL;
    this.httpStatus = options.httpStatus;
    this.requestId = options.requestId;
    this.details = options.details;
  }
}

export function isLanhuError(value: unknown): value is LanhuError {
  return value instanceof LanhuError;
}

export function exitCodeForHttpStatus(status: number): number {
  if (status === 401 || status === 403) {
    return EXIT_CODES.AUTH;
  }

  if (status === 429 || status >= 500) {
    return EXIT_CODES.NETWORK;
  }

  return EXIT_CODES.GENERAL;
}

export function fromUnknownError(error: unknown): LanhuError {
  if (isLanhuError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new LanhuError({
      code: "UNEXPECTED_ERROR",
      message: error.message,
      details: {
        name: error.name
      },
      cause: error
    });
  }

  return new LanhuError({
    code: "UNEXPECTED_ERROR",
    message: "An unknown error occurred",
    details: error
  });
}
