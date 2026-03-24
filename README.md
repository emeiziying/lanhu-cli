# lanhu-cli

蓝湖 Web API 的内部 CLI。

当前实现基于 `TypeScript + Node.js`，面向蓝湖私有 Web 接口，而不是官方 OpenAPI。

## 安装

```bash
pnpm install
pnpm build
pnpm link --global
```

开发模式也可以直接运行：

```bash
pnpm dev -- --help
```

## 使用方式

先配置会话 cookie：

```bash
lanhu auth set --cookie '<cookie>'
lanhu auth show
```

再选择团队和项目：

```bash
lanhu team list
lanhu team switch
lanhu project list
lanhu project switch
```

之后可以直接访问项目和图片资源：

```bash
lanhu project detail
lanhu image list
lanhu image detail <image-id>
lanhu image json <image-id>
```

## 命令

### `auth`

```bash
lanhu auth set --cookie '<cookie>' [--base-url <url>] [--timeout <ms>] [--profile <name>]
lanhu auth show
lanhu auth clear
```

说明：

- `auth set` 只负责 session 配置，不写入 `tenantId` 或 `projectId`
- `auth show` 会同时显示 `session` 和当前 `context`

### `team`

```bash
lanhu team list [--json]
lanhu team switch [--tenant-id <tenant-id>]
```

说明：

- `team list` 只读
- `team switch` 会更新当前 `tenantId`，并清空当前 `projectId`

### `project`

```bash
lanhu project list [--tenant-id <tenant-id>] [--parent-id <id>] [--json]
lanhu project switch [--tenant-id <tenant-id>] [--parent-id <id>] [--project-id <project-id>]
lanhu project detail [--tenant-id <tenant-id>] [--project-id <project-id>] [--img-limit <n>] [--detach <0|1>]
```

### `image`

```bash
lanhu image list [--tenant-id <tenant-id>] [--project-id <project-id>] [--position <n>] [--json]
lanhu image detail <image-id> [--tenant-id <tenant-id>] [--project-id <project-id>]
lanhu image json <image-id> [--tenant-id <tenant-id>] [--project-id <project-id>]
```

说明：

- `image detail` 调用蓝湖图片详情接口
- `image json` 会先取图片详情，再请求其中的 `json_url`

### `request`

底层调试命令，保留给开发和接口摸索：

```bash
lanhu request <method> <path> [--query key=value] [--header key=value] [--data ...]
```

### `ping`

```bash
lanhu ping
```

## 配置模型

本地配置文件按两层存储：

- `session`
  - `baseUrl`
  - `cookie`
  - `timeoutMs`
  - `profile`
- `context`
  - `tenantId`
  - `projectId`

默认 `baseUrl`：

```text
https://lanhuapp.com/workbench/api
```

环境变量覆盖支持：

```text
LANHU_BASE_URL
LANHU_COOKIE
LANHU_TIMEOUT_MS
LANHU_PROFILE
LANHU_TENANT_ID
LANHU_PROJECT_ID
```

优先级：

```text
CLI flags > env vars > local config > defaults
```

## 项目结构

```text
src/
  api/         HTTP client 和 envelope adapter
  cli/         commander 命令、交互、输出格式化
  config/      schema、loader、file store、compat
  domain/      纯领域模型和选择逻辑
  services/    应用服务层
```

## 开发

```bash
pnpm typecheck
pnpm test
pnpm build
```

## API Discovery

可以用 Playwright 抓蓝湖页面实际请求：

```bash
pnpm discover:apis
```

输出会写到：

```text
.lanhu-discovery/<timestamp>/
```

常用参数：

```bash
pnpm discover:apis -- --url https://lanhuapp.com/workbench
pnpm discover:apis -- --path-prefix /workbench/api
pnpm discover:apis -- --channel chrome
pnpm discover:apis -- --save-response-body
```

如果本机还没有 Playwright 浏览器：

```bash
pnpm exec playwright install chromium
```
