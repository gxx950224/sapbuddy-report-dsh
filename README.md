# SAP 报表插件（@gxx-labs/sap-reports-dsh）

> **已发布到 npm：`@gxx-labs/sap-reports-dsh@0.0.1`**　源码：<https://github.com/gxx950224/sapbuddy-report-dsh>（本地开发目录包名为 `@local/sap-reports`）。

DeepSeek Harness（DSH）插件：在左侧增加 **SAP 报表** 入口，经 SAP HTTPS 接口加载当前用户有权限的报表事务码，动态展示选择条件并查询 ALV 数据；同时向 Agent 提供 `sap_reports` 工具。插件本身不创建或修改任何 SAP 对象，也不自带 ABAP 代码。

## 安装

```sh
dsh plugin --profile desktop add @gxx-labs/sap-reports-dsh@0.0.1
```

也可通过 Harness 插件管理器安装。包无第三方依赖、无安装脚本，使用 Harness 自带 React。

## 连接页面（「SAP 报表」）

| 字段 | 说明 |
| --- | --- |
| HTTPS 地址 | SAP 接口节点的最终 HTTPS 地址，如 `https://<host>:<port>/sap/bc/<node>?sap-client=<client>`；不得含 URL 凭据、`#` 片段、`intfid`，或含 pass/token/secret 等的查询参数 |
| SAP 账号 / 密码 | 终端用户本人账号（Basic 认证） |
| SAP Client | 可选，三位数字，会替换 URL 中的 `sap-client` |
| 允许不受信证书 | 可选，默认关闭；开启后**该连接跳过 TLS 证书校验**（仅限测试系统） |

点击 **连接并加载报表** 后，首个目录请求即为连接校验，成功后才出现在 `status` 中。界面仅暴露 `intfid` 模式；旧的 `action` / `paths` 模式仍被服务接受，仅为兼容，已弃用。

报表连接与其他插件（例如 SapBuddy 的 ABAP 开发连接）**完全独立**，互不读取、互不替代。

## Agent 工具 `sap_reports`

返回统一为 `{ok:true, data}` 或 `{ok:false, error:{code, message}}`。工具**不接受任何凭据**；连接/断开只能在页面完成。除 `status` 外均需显式 `connectionId`。

| action | 参数 | data |
| --- | --- | --- |
| `status` | 无（不访问 SAP） | `{connections:[{connectionId, username, endpoint, tlsVerified}]}` |
| `list` | `connectionId` | `{tcodes:[{tcode, text, report, group?}]}` |
| `meta` | `connectionId`, `tcode`, 可选 `variant` | `{report, selection[], fields[], variants?}` |
| `run` | `connectionId`, `tcode`, 可选 `variant`, `selection[]`, `max_rows` | `{rows, fields, rowCount, truncated, message?}` |

- `endpoint` 返回时只保留 `sap-client` 查询参数。
- `meta` / `run` 前都会刷新授权目录并检查 tcode 归属，报表程序名只取自目录（meta 2 次 SAP 请求，run 3 次）。
- 工具总超时 190 秒。

## 选择条件规则与格式

每行 `{selname, kind, sign, option, low, high}`：

- 所有值为字符串；日期 `YYYYMMDD`，时间 `HHMMSS`；保留前导零和小数精度。
- `kind`：`P` 参数 / `S` 选择范围，须与 meta 一致；`selname` 必须来自 meta。
- `sign`：`I` 包含 / `E` 排除；`option`：`EQ NE GT GE LT LE BT NB CP NP`。
- `BT` / `NB` 需 `low`、`high` 且 low ≤ high（类数字按数值比较）；其他 option 的 `high` 必须为空。
- `P` 参数只能有一行 `I` / `EQ`、`high` 为空；复选框为 `"X"` / `""`。
- 必填字段需至少一行非空 `I` 值；显式传入的行优先于默认/变式值；省略的字段由 SAP 端按其报告的默认/变式处理。
- meta 声明 `options` 时，非空 `low` 只能取其中的值。
- tcode 自动转大写（≤ 20），variant ≤ 30，selname ≤ 30，最多 500 行，low/high ≤ 1024 字符。

## 限额

| 项 | 值 |
| --- | --- |
| 单次 SAP 请求超时（含读取响应） | 60 秒 |
| 报表行数 `max_rows` | 默认 5000，上限 10000 |
| 插件请求 / 发往 SAP 的请求 | 256 KiB |
| SAP 响应 | 8 MiB |
| 同时存在的连接 | 8 |
| 连接空闲过期 | 30 分钟（status 轮询不续期） |

不自动重试；取消/超时不能保证 SAP 端已停止正在执行的报表。

## `truncated` 语义

满足任一条件即为 `true`：SAP 标记截断、返回行数超过 `max_rows`、或 SAP 声明的总行数大于实际返回行数。`rowCount` 为**本次返回**的行数。截断时只能说明“看到了前 N 行”，不能据此对全量数据下结论；需提高 `max_rows`（≤ 10000）或收窄条件后重新运行。

## 错误码

| code | 含义 |
| --- | --- |
| `INVALID_INPUT` / `INVALID_JSON` / `INVALID_ACTION` | 请求不合法 |
| `INVALID_SELECTION` / `REQUIRED_SELECTION` | 选择条件不合法 / 必填为空 |
| `TCODE_FORBIDDEN` | 不在当前用户授权报表目录 |
| `INVALID_ENDPOINT` | 连接地址不合法 |
| `CONNECTION_NOT_FOUND` / `CONNECTION_EXPIRED` | 连接不存在 / 已过期，需在页面重连 |
| `SAP_AUTH` / `SAP_FORBIDDEN` | HTTP 401 / 403 |
| `SAP_ERROR` | SAP 业务错误（含 `STATUS`=E/A/X 的 `MSGTXT`、非 OK 的 `EV_MSG`） |
| `SAP_ASYNC_RESPONSE` | HTTP 202：接口未配置为同步 |
| `SAP_RESPONSE` / `SAP_RESPONSE_TOO_LARGE` | 响应不符合约定 / 超过 8 MiB |
| `SAP_HTTP` / `SAP_REDIRECT` / `SAP_NETWORK` / `SAP_TIMEOUT` | 其他 HTTP / 重定向 / 网络或证书 / 超时 |
| `REQUEST_TOO_LARGE` / `CANCELLED` / `SERVICE_UNAVAILABLE` | 请求过大 / 已取消 / 插件已卸载 |

SAP 消息最长 1000 字符，会去除控制字符并脱敏密码与 Basic 凭据。

## SAP 端接口要求（intfid 模式）

同一 HTTPS 节点，插件固定追加三个 `intfid`（不可自定义）：

| 操作 | intfid | JSON body |
| --- | --- | --- |
| 授权报表目录 | `AI_RPT_CATALOG` | `{"catalogOnly": true}` |
| 选择屏幕/字段元数据 | `AI_RPT_META` | `{"tcode": "<TCODE>", "variant": ""}` |
| 执行报表 | `AI_RPT_RUN` | `{"tcode": "<TCODE>", "variant": "", "selection": [], "maxRows": 5000}` |

- 三条接口配置必须为 **`INTFMD='SYN'`（同步）**；HTTP 202 永远不算成功。
- 成功必须返回 `EV_MSG='OK'`（忽略大小写和首尾空白）；空目录 `ET_LIST:[]`、空报表 `EV_JSON:"[]"`。
- 以终端用户身份认证（`sy-uname`），禁止换用高权限技术账号；目录 = 报表白名单 ∩ 用户 `S_TCODE`；元数据和执行接口须再次检查白名单、事务码、程序与业务权限。
- 只纳入逐个验收过的 ALV/SALV 报表——**有 ALV 输出不代表无副作用**；拒绝对话型、纯 WRITE 列表或需 GUI 交互的事务。
- 建议关闭会记录完整报文并 `COMMIT WORK` 的原始日志，仅审计用户、事务码、时间、结果和行数。
- 完整契约见 [API.md](./API.md)。

## 安全说明（与当前实现一致）

- **连接设置含密码以明文保存**在插件目录的 `connection.json`（文件权限 0600），用于下次预填/重连；插件目录不可写时静默跳过。请勿把该文件提交到版本库或打包分发（`.gitignore` / `.npmignore` 已忽略，`package.json` 的 `files` 不包含它）；在共享电脑上使用后请删除该文件。
- 运行中的连接凭据保存在 Host 进程内存，断开、过期、卸载或重启后失效（重启后需重新连接）。
- 默认使用标准 TLS 证书校验，并拒绝一切重定向。连接页提供 **「允许不受信证书」** 选项：开启后该连接跳过证书校验，Basic 凭据经未经验证的 TLS 通道传输；`status` 与连接结果会返回 `tlsVerified:false`，界面会显示警告。仅用于测试系统，正式环境请改为信任签发 CA（`NODE_EXTRA_CA_CERTS`）。
- 工具参数、会话记录和浏览器存储中不包含密码；返回的 SAP 消息会脱敏。
- 界面查询结果只在当前页面内存；CSV 仅在用户点击导出时下载（对可能被当作公式的值加前导单引号）。

## 开发与验证

```sh
node --check client.js && node --check index.js && node --check service.js
node --test test/*.test.js
```

测试使用依据设计契约编写的模拟 SAP 返回，不连接真实 SAP；真实连通性、DDIC 字段映射与具体报表行为需在开发系统联调确认。

---

## English summary

**Published on npm as `@gxx-labs/sap-reports-dsh@0.0.1`** — install with `dsh plugin --profile desktop add @gxx-labs/sap-reports-dsh@0.0.1`. Source: https://github.com/gxx950224/sapbuddy-report-dsh

A DeepSeek Harness plugin that adds an **SAP Reports** sidebar page and the `sap_reports` agent tool (`status`, `list`, `meta`, `run`) for browsing the user's authorized SAP report catalog, reading selection metadata and fetching ALV rows through the `intfid` interface (`AI_RPT_CATALOG` / `AI_RPT_META` / `AI_RPT_RUN`, configured as `INTFMD='SYN'`). Values are strings (`YYYYMMDD`, `HHMMSS`, leading zeros kept); `max_rows` defaults to 5000, max 10000; `truncated:true` means only the returned rows were seen.

Security, as implemented:

- Connection settings **including the password are stored in plaintext** in `connection.json` inside the plugin directory (mode 0600). Never commit or ship that file.
- An **"Allow untrusted certificate"** option disables TLS verification for that connection; `status` reports `tlsVerified:false`. Use it only for test systems and prefer `NODE_EXTRA_CA_CERTS`.
- Redirects are rejected, the tool never accepts credentials, and SAP messages are redacted.
