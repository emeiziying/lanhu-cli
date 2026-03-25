# lanhu-cli 技术方案评审报告

> 评审日期：2026-03-24

## 一、总体评价

lanhu-cli 是一个面向蓝湖私有 Web API 的内部 CLI 工具，整体技术方案成熟度较高，采用清晰的分层架构和现代化技术栈。

**整体评级：B+ / A-**

---

## 二、架构设计 ✅ 优秀

```
CLI Commands → Services → API Clients / Domain Logic → Config
```

- **分层清晰**：表现层（CLI）、编排层（Services）、数据层（API）、纯逻辑层（Domain）职责划分明确
- **依赖方向正确**：上层依赖下层，Domain 层是纯函数、无 I/O，可独立测试
- **配置独立**：Config 层单独管理，支持多来源优先级解析（flags > env > file > default），附带来源追踪

---

## 三、关键优势

### 1. 错误处理体系 ✅

- 自定义 `LanhuError` 类，含 code / exitCode / httpStatus / requestId / details
- 明确的退出码语义：SUCCESS(0) / GENERAL(1) / USAGE(2) / AUTH(3) / NETWORK(4)
- `fromUnknownError()` 统一归一化，防止未知异常泄露

### 2. HTTP 客户端韧性 ✅

- 自动重试：429 和 5xx，最多 2 次，指数退避（250ms × 2^n）
- 超时处理：`AbortSignal.timeout()`（Node 20+ 原生 API）
- 响应体大小限制 50MB，防内存耗尽
- JSON 自动检测（Content-Type 优先 + 启发式兜底）

### 3. 配置管理 ✅

- Zod Schema 校验所有输入
- 文件权限 0o600，符合安全实践
- 遵循 XDG 标准
- 兼容旧配置格式自动迁移

### 4. API 信封解包 ✅

- 两套解包器应对不同 API 风格（Workbench 严格模式 / Project 宽松模式）
- 支持多种数据字段名（data / result / list / items）
- 业务错误码校验完善

### 5. 技术栈选型 ✅

| 维度 | 选型 | 评价 |
|------|------|------|
| 运行时 | Node.js ≥20 (ESM) | 现代化，原生 ESM |
| HTTP | undici | 轻量、高性能、可 mock |
| CLI 框架 | Commander.js | 成熟稳定 |
| 校验 | Zod | 类型安全 |
| 构建 | tsup | 零配置、单文件输出 |
| 测试 | Vitest | 快速、ESM 友好 |
| 依赖数 | 3 个生产依赖 | 极简，控制力强 |

---

## 四、待改进项

### 1. ⚠️ 重复代码 — 命令选项解析

`toOverrides()` 函数在 `team.ts`、`project.ts`、`image.ts` 中重复出现，`Number(options.timeout)` 缺乏统一校验。

**建议**：提取为 `src/utils/parse-options.ts` 中的共享函数，加入 NaN 校验。

**涉及文件**：
- `src/cli/commands/team.ts`
- `src/cli/commands/project.ts`
- `src/cli/commands/image.ts`

### 2. ⚠️ 类型覆盖不足

Domain 层大量使用 `Record<string, unknown>`，API 返回值类型为 `unknown`。虽然有运行时校验，但编译期类型安全性不够。

**建议**：为核心 API 响应定义具体 interface 或 Zod schema，利用 `z.infer<>` 推导类型。

**涉及文件**：
- `src/domain/teams.ts`
- `src/domain/projects.ts`
- `src/domain/images.ts`
- `src/api/workbench-client.ts`
- `src/api/project-client.ts`
- `src/api/account-client.ts`

### 3. ⚠️ 测试覆盖盲区

- 缺少错误场景测试（超时、畸形响应、网络断开）
- `image detail/json`、`request` 命令未覆盖
- 无 retry 中断场景测试

**建议**：补充 negative test cases，尤其是 HTTP client 的边界场景。

### 4. ⚠️ 交互式提示无 CI 适配

`interactive.ts` 每次创建/关闭 readline，且未检测 TTY 环境。

**建议**：增加 `process.stdin.isTTY` 检测，非 TTY 环境下自动跳过或报错。

**涉及文件**：`src/cli/interactive.ts`

### 5. ⚠️ JSON 启发式解析脆弱

`looksLikeJson()` 仅检查首字符是否为 `{` 或 `[`，对前导空白字符会误判。

**建议**：先 `.trimStart()` 再判断，或统一依赖 Content-Type header。

**涉及文件**：`src/client.ts`

### 6. ⚠️ Cookie 在 verbose 输出中可能泄露

`maskSecret()` 仅在 formatter 层使用，错误详情中的 cookie 未脱敏。

**建议**：在 `writeError()` 中对已知敏感字段统一脱敏。

**涉及文件**：
- `src/utils/output.ts`
- `src/cli/formatters/`

---

## 五、安全性评估

- ✅ 配置文件权限 0o600（仅所有者可读写）
- ✅ URL 参数通过 URL API 编码，无命令注入风险
- ✅ 响应大小限制防 DoS
- ⚠️ Cookie 静态存储无加密（CLI 工具可接受，但应在文档中说明风险）

---

## 六、结论

lanhu-cli 的技术方案在架构设计、错误处理、网络韧性、配置管理等方面展现了较高的工程水平。主要改进方向集中在：

1. **消除重复代码**（选项解析提取）
2. **加强类型安全**（API 响应类型定义）
3. **补充测试覆盖**（错误场景、边界条件）
4. **CI/CD 友好性**（非交互模式支持）

这些改进项属于增量优化，不影响当前方案的可行性和稳定性。**方案可以落地推进。**
