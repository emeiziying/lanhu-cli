# lanhu-cli

CLI proxy for Lanhu OpenAPI.

## Development

```bash
pnpm install
pnpm build
pnpm test
```

## Commands

```bash
lanhu auth set --token <token> [--base-url <url>]
lanhu auth show
lanhu auth clear
lanhu request <method> <path> [--query key=value] [--header key=value] [--data ...]
lanhu ping
```
