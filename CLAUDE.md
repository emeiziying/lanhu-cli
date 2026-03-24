# CLAUDE.md — lanhu-cli

This file provides guidance for AI assistants working with this codebase.

## Project Overview

`lanhu-cli` is an internal CLI for the 蓝湖 (Lanhu) web API. It targets Lanhu's private web interfaces (not an official OpenAPI). Built with TypeScript + Node.js, it provides commands for authentication, team/project management, and image access.

**Node requirement:** >=20
**Package manager:** pnpm
**Module system:** ESM only (`"type": "module"`)

## Development Workflow

```bash
# Install dependencies
pnpm install

# Run without building (development)
pnpm dev -- <args>

# Type-check only
pnpm typecheck

# Run tests
pnpm test
pnpm test:watch   # watch mode

# Build to dist/
pnpm build

# Install globally after build
pnpm link --global
```

**Run order for quality checks:** `pnpm typecheck && pnpm test`

## Project Structure

```
src/
  api/           HTTP client and API-envelope adapters
    base-client.ts       Base undici HTTP client with retry/timeout
    workbench-client.ts  Workbench API adapter
    project-client.ts    Project API adapter
    account-client.ts    Account/team API adapter
    envelopes.ts         Response envelope unwrapping logic
  cli/           Commander.js command definitions and output
    commands/    Command registrations (auth, team, project, image, request, ping)
    formatters/  Human-readable output formatters (team, project, image)
    interactive.ts  Interactive selection prompts
  config/        Configuration management
    schema.ts      Zod schemas for config validation
    loader.ts      Config loading with source tracking
    session-store.ts  Session persistence (baseUrl, cookie, timeoutMs, profile)
    context-store.ts  Context persistence (tenantId, projectId)
    file-store.ts     File I/O with secure permissions (0o600)
    compat.ts         Legacy config format migration
  domain/        Pure domain logic (no I/O)
    teams.ts     Team list normalization and selection
    projects.ts  Project list normalization and selection
    images.ts    Image normalization and selection
  services/      Application service layer (orchestrates api + domain)
    team-service.ts
    project-service.ts
    image-service.ts
  auth.ts        Cookie assertion helper
  cli.ts         Commander program builder
  client.ts      Main LanhuClient class (re-exports or wraps base-client)
  constants.ts   APP_NAME, CLI_VERSION, MAX_RETRIES, DEFAULT_BASE_URL
  discovery.ts   API discovery utilities
  errors.ts      LanhuError class, EXIT_CODES, error normalization
  index.ts       CLI entry point
  types.ts       Core TypeScript interfaces

tests/           Vitest test files (mirrors src/ structure)
scripts/
  discover-apis.ts  Playwright-based API request capture tool
```

## Architecture

The code follows a clean layered architecture:

```
CLI Commands (cli/commands/)
    ↓
Services (services/)
    ↓
API Clients (api/) ←→ Domain Logic (domain/)
    ↓
Config (config/)
```

- **CLI layer** parses arguments, calls services, formats output
- **Service layer** orchestrates API calls and domain transformations
- **API layer** makes HTTP requests and unwraps envelopes
- **Domain layer** contains pure functions for normalization and selection
- **Config layer** handles persistence and resolution (flags > env > file > default)

## Key Conventions

### TypeScript

- Strict mode enabled including `noUncheckedIndexedAccess`
- ESM imports must include `.js` extension (even for `.ts` source files)
- `isolatedModules: true` — no const enums, no namespace merging
- Target: ES2022, module resolution: NodeNext

### Error Handling

Always throw `LanhuError` (from `src/errors.ts`), never plain `Error`:

```typescript
import { LanhuError, EXIT_CODES } from "../errors.js";

throw new LanhuError({
  code: "SOME_CODE",          // SCREAMING_SNAKE_CASE string
  message: "Human message",
  exitCode: EXIT_CODES.GENERAL, // optional, defaults to GENERAL (1)
  httpStatus: 404,            // optional
  details: { ... }            // optional, included in --verbose output
});
```

Exit codes:
- `SUCCESS` (0) — normal exit
- `GENERAL` (1) — unexpected errors
- `USAGE` (2) — bad CLI usage
- `AUTH` (3) — auth/permission errors (401, 403)
- `NETWORK` (4) — network/timeout/5xx errors

Use `fromUnknownError(error)` to normalize caught errors before rethrowing.

### Configuration

Config is split into two layers stored in `$XDG_CONFIG_HOME/lanhu-cli/config.json` (or `~/.config/lanhu-cli/config.json`):

- **session**: `baseUrl`, `cookie`, `timeoutMs`, `profile`
- **context**: `tenantId`, `projectId`

Resolution priority (highest to lowest):
1. CLI flags
2. Environment variables (`LANHU_BASE_URL`, `LANHU_COOKIE`, `LANHU_TIMEOUT_MS`, `LANHU_PROFILE`, `LANHU_TENANT_ID`, `LANHU_PROJECT_ID`)
3. Config file
4. Defaults

Use `LanhuConfigMeta.sources` to report where each value came from.

### HTTP Client

`LanhuClient` (wraps undici) handles:
- Automatic retry: up to `MAX_RETRIES` (2) for 429 and 5xx status codes
- Backoff: `250ms * 2^attempt` (exponential)
- Timeout: `AbortSignal.timeout(timeoutMs)`
- Cookie injection from config
- Auto JSON serialization/parsing (content-type detection + heuristic)
- Header normalization (all lowercase)

### API Response Envelopes

Lanhu APIs return business responses wrapped in envelopes. Two unwrappers in `src/api/envelopes.ts`:

- `unwrapWorkbenchEnvelope` — checks `code` field (0 or 200 = success)
- `unwrapProjectEnvelope` — flexible code validation (0, 200, undefined, string codes)

Both extract the actual payload from varying field names (`data`, `result`, `list`, `items`).

### Domain Models

Domain normalization functions handle API field name variations:

```typescript
// Always tries multiple field name candidates
normalizeTeamList(raw)    // → Team[]
normalizeProjectList(raw) // → Project[]
normalizeImageList(raw)   // → Image[]
```

Fields are tried in both camelCase and snake_case variants to handle API inconsistencies.

### CLI Output

- Use `--json` flag for machine-readable output where applicable
- Human output goes through formatters in `src/cli/formatters/`
- Output utilities are in `src/utils/output.ts`
- Interactive selections use `src/cli/interactive.ts`

### Testing

Tests are in `tests/` using Vitest:

- **Unit tests**: Pure functions, no I/O
- **Integration tests**: Use `execa` to spawn the CLI process with isolated temp configs
- `restoreMocks: true` in vitest config — mocks are auto-restored between tests

Run a single test file: `pnpm test -- tests/cli.test.ts`

## Adding a New Command

1. Create `src/cli/commands/<name>.ts` with a `register<Name>Commands(program)` export
2. Add formatter in `src/cli/formatters/<name>.ts` if needed
3. Add domain logic in `src/domain/<name>.ts` (pure functions)
4. Add service in `src/services/<name>-service.ts`
5. Add API client methods in the appropriate `src/api/*-client.ts`
6. Register in `src/cli.ts` by calling the register function
7. Add tests in `tests/<name>.test.ts`

## API Discovery Tool

Use the Playwright-based discovery tool to capture real API requests from the Lanhu web app:

```bash
pnpm discover:apis -- --url https://lanhuapp.com/workbench
pnpm discover:apis -- --path-prefix /workbench/api
pnpm discover:apis -- --channel chrome
pnpm discover:apis -- --save-response-body
```

Install Playwright browsers first if needed:
```bash
pnpm exec playwright install chromium
```

Output is written to `.lanhu-discovery/<timestamp>/`.

## Build System

- **tsup** bundles `src/index.ts` to a single `dist/index.js`
- Output format: ESM only
- Adds `#!/usr/bin/env node` shebang automatically
- Sourcemaps included

The `dist/` directory is gitignored. Always run `pnpm build` before testing the installed CLI.
