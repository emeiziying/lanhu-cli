# lanhu-cli

CLI for Lanhu web APIs.

## Development

```bash
pnpm install
pnpm build
pnpm test
```

## API Discovery

Use Playwright to capture Lanhu web API traffic while you browse normally:

```bash
pnpm discover:apis
```

The script opens a persistent browser profile, records `/workbench/api` responses, and writes sanitized output into `.lanhu-discovery/<timestamp>/`.

Useful flags:

```bash
pnpm discover:apis -- --url https://lanhuapp.com/workbench
pnpm discover:apis -- --path-prefix /workbench/api
pnpm discover:apis -- --channel chrome
pnpm discover:apis -- --save-response-body
```

If Playwright cannot launch a local browser, install one with:

```bash
pnpm exec playwright install chromium
```

## Commands

```bash
lanhu auth set --cookie '<cookie>' --tenant-id '<tenant-id>' [--base-url <url>]
lanhu auth show
lanhu auth clear
lanhu project list
lanhu team list
lanhu team switch
lanhu request <method> <path> [--query key=value] [--header key=value] [--data ...]
lanhu ping
```
