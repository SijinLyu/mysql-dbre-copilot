# MySQL DBRE Copilot

MySQL DBRE Copilot 是一个面向 MySQL 的 AI 数据库可靠性工程助手。它提供 Web 界面，支持用自然语言生成 SQL、查看查询结果、进行 SQL 安全检查、分析执行计划、解析慢查询日志，并给出索引和查询优化建议。

项目采用前后端分离架构：

- 前端：React + Vite + Tailwind CSS
- 后端：Express + TypeScript
- 数据库：MySQL 8.0
- AI Provider：OpenAI 或 Anthropic Claude
- 本地审计存储：sql.js 生成的 SQLite 文件

## 核心功能

1. 自然语言转 SQL：输入业务问题，后端结合数据库结构生成可执行 SQL。
2. 多轮对话：同一个会话内保留上下文，支持连续追问。
3. SQL 安全检查：识别写操作、无 `LIMIT`、`SELECT *`、无 `WHERE` 的 `UPDATE/DELETE`、潜在敏感字段、笛卡尔积等风险。
4. 查询执行与结果展示：对安全通过的 SQL 执行查询，并在前端展示表格结果。
5. EXPLAIN / 执行计划诊断：识别全表扫描、filesort、临时表和高扫描行数等问题。
6. 索引建议与冗余索引检测：扫描重复索引、前缀冗余索引、可能未使用的索引。
7. 慢查询日志解析：粘贴或上传 MySQL slow query log，统计慢查询、指纹聚合和用户/库维度分布。
8. 收藏与导出：前端支持保存常用查询，并将查询结果导出为 CSV/JSON/PDF。
9. 审计查询能力：后端提供审计日志存储、查询和统计接口，审计文件路径由 `AUDIT_DB_PATH` 控制。

## 环境要求

### 推荐方式：Docker

- 操作系统：Windows 10/11、macOS 或 Linux
- Docker Desktop：建议 24.x 或更高
- Docker Compose：Compose V2，使用 `docker compose` 命令
- 可用端口：
  - `5173`：前端页面
  - `3001`：后端 API
  - `3306`：MySQL

Windows 用户建议启用 WSL2 后端的 Docker Desktop。

### 本地开发方式

- Node.js：`>= 18.0.0`
- npm：随 Node.js 安装即可
- MySQL：8.0 或兼容版本
- Java：不需要
- Python：不需要

当前仓库没有提交 `package-lock.json`，因此安装依赖时使用 `npm install`，不要使用 `npm ci`。

## 配置说明

项目根目录提供了 `.env.example`。首次运行前需要复制一份为 `.env`：

```bash
cp .env.example .env
```

Windows PowerShell 可以使用：

```powershell
Copy-Item .env.example .env
```

`.env` 关键配置项如下：

| 配置项 | 示例值 | 说明 |
| --- | --- | --- |
| `PORT` | `3001` | 后端服务端口。 |
| `NODE_ENV` | `development` | 运行环境。开发时使用 `development`，Docker 镜像内使用 `production`。 |
| `LLM_PROVIDER` | `openai` | AI 服务商，可选 `openai` 或 `claude`。 |
| `OPENAI_API_KEY` | `your-openai-compatible-api-key` | 使用 OpenAI、Groq 或兼容网关时填写。 |
| `OPENAI_MODEL` | `your-model-name` | 模型名称，例如 `gpt-4o` 或 `llama-3.3-70b-versatile`。 |
| `OPENAI_BASE_URL` | 空或 `https://...` | 官方 OpenAI 可留空；Groq 或兼容网关填写对应 base URL。 |
| `ANTHROPIC_API_KEY` | `your-anthropic-api-key` | 使用 Claude 时填写。 |
| `ANTHROPIC_MODEL` | `your-claude-model-name` | Claude 模型名称。 |
| `ANTHROPIC_BASE_URL` | 空或 `https://...` | 官方 Anthropic 可留空；Anthropic-compatible 网关填写对应 base URL。 |
| `MYSQL_HOST` | `localhost` | 本地开发时的 MySQL 主机。Docker Compose 内部会自动使用 `mysql`。 |
| `MYSQL_PORT` | `3306` | MySQL 端口。 |
| `MYSQL_USER` | `root` | MySQL 用户名。 |
| `MYSQL_PASSWORD` | `rootpassword` | MySQL 密码。 |
| `MYSQL_DATABASE` | `demo` | 默认数据库。 |
| `MYSQL_ROOT_PASSWORD` | `rootpassword` | Docker Compose 创建 MySQL root 用户时使用。 |
| `AUDIT_DB_PATH` | `./audit.db` | 本地审计数据库文件路径。Docker 中映射到 `/data/audit.db`。 |
| `API_KEY` | `your-api-key-here` | 预留安全配置项，当前主要业务接口未强制校验。 |

如果选择 OpenAI-compatible Provider，例如 OpenAI、Groq 或兼容网关，至少需要：

```env
LLM_PROVIDER=openai
OPENAI_API_KEY=your-openai-compatible-api-key
OPENAI_MODEL=your-model-name
OPENAI_BASE_URL=
```

其中，官方 OpenAI 通常可以留空 `OPENAI_BASE_URL`；Groq 或其他兼容网关需要填写对应的 base URL。

如果选择 Claude，至少需要：

```env
LLM_PROVIDER=claude
ANTHROPIC_API_KEY=your-anthropic-api-key
ANTHROPIC_MODEL=your-claude-model-name
ANTHROPIC_BASE_URL=
```

## 环境搭建步骤

### 方式一：Docker Compose 一键启动

这是最适合第一次运行项目的方式。它会同时启动前端、后端和 MySQL，并自动初始化 `demo` 示例数据库。

1. 进入项目根目录：

```bash
cd mysql-dbre-copilot
```

如果你已经在本仓库根目录，可以跳过这一步。

2. 创建并编辑 `.env`：

```bash
cp .env.example .env
```

Windows PowerShell：

```powershell
Copy-Item .env.example .env
```

3. 在 `.env` 中填写至少一个 LLM API Key：

```env
LLM_PROVIDER=openai
OPENAI_API_KEY=your-openai-compatible-api-key
OPENAI_MODEL=your-model-name
OPENAI_BASE_URL=
```

4. 启动全部服务：

```bash
docker compose up --build
```

如果你的环境仍使用旧版 Compose，可以改用：

```bash
docker-compose up --build
```

5. 打开浏览器访问：

```text
http://localhost:5173
```

6. 检查后端健康状态：

```bash
curl http://localhost:3001/health
```

预期返回类似：

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "llmProvider": "openai",
  "timestamp": "2026-06-16T00:00:00.000Z"
}
```

### 方式二：本地开发启动

适合需要改代码、跑测试或调试前后端的场景。

1. 安装并启动 MySQL 8.0。

2. 创建示例数据库和表：

```bash
mysql -uroot -p < init-db/01-schema.sql
```

如果你的 MySQL root 密码是 `rootpassword`，也可以使用：

```bash
mysql -uroot -prootpassword < init-db/01-schema.sql
```

3. 创建 `.env`：

```bash
cp .env.example .env
```

Windows PowerShell：

```powershell
Copy-Item .env.example .env
```

4. 修改 `.env` 中的 MySQL 和 LLM 配置。例如：

```env
LLM_PROVIDER=openai
OPENAI_API_KEY=your-openai-compatible-api-key
OPENAI_MODEL=your-model-name
OPENAI_BASE_URL=
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=rootpassword
MYSQL_DATABASE=demo
```

5. 安装并启动后端：

```bash
cd backend
npm install
npm run dev
```

后端默认监听：

```text
http://localhost:3001
```

6. 新开一个终端，安装并启动前端：

```bash
cd frontend
npm install
npm run dev
```

前端默认监听：

```text
http://localhost:5173
```

本地开发时，Vite 会把 `/api` 请求代理到 `http://localhost:3001`。

## Instructions for running the project

最短运行路径如下：

```bash
cp .env.example .env
# 编辑 .env，填写 OPENAI_API_KEY 或 ANTHROPIC_API_KEY
docker compose up --build
```

然后访问：

```text
http://localhost:5173
```

进入页面后，在左侧点击 `Add Connection`，填写 Docker 示例库连接：

| 字段 | Docker Compose 值 | 本地开发值 |
| --- | --- | --- |
| Connection ID | `demo` | `demo` |
| Host | `mysql` 在容器内部使用；前端表单经后端连接时建议填 `mysql` | `localhost` |
| Port | `3306` | `3306` |
| User | `root` | `root` |
| Password | `rootpassword`，或你的 `MYSQL_ROOT_PASSWORD` | 你的本地 MySQL 密码 |
| Database | `demo` | `demo` |

注意：使用 Docker Compose 时，后端运行在容器网络内。如果在 Web 页面新增连接，`Host` 应填写 `mysql`，而不是 `localhost`。`localhost` 对后端容器来说指向后端容器自身。

## Any setup instructions needed to run your app and tests

运行应用需要：

1. 根目录存在 `.env`。
2. 至少配置一个可用的 LLM API Key。
3. MySQL 可连接，并存在 `demo` 数据库。
4. 端口 `5173`、`3001`、`3306` 未被其他程序占用。

运行测试需要：

1. 分别安装后端和前端依赖。
2. 后端测试使用 Jest。
3. 前端测试使用 Vitest。
4. 大多数单元测试不需要真实 LLM API Key；涉及集成或运行完整应用时，需要保证 `.env`、MySQL 和网络配置正确。

## 测试运行方式

### 后端测试

```bash
cd backend
npm install
npm test
```

监听模式：

```bash
cd backend
npm run test:watch
```

### 前端测试

```bash
cd frontend
npm install
npm test
```

Vitest 默认进入 watch 模式。想执行一次后退出，可以运行：

```bash
cd frontend
npx vitest run
```

### 构建检查

后端：

```bash
cd backend
npm run build
```

前端：

```bash
cd frontend
npm run build
```

测试结果说明：

- 命令退出码为 `0` 表示通过。
- Jest/Vitest 会在终端输出通过、失败和快照信息。
- 如果测试失败，优先查看第一条失败用例的错误栈和断言差异。

## 示例说明

下面示例默认你已经用 Docker Compose 启动项目，并连接到 `demo` 示例数据库。

### Case 1：基础成功场景，自然语言查询订单收入

操作步骤：

1. 打开 `http://localhost:5173`。
2. 左侧点击 `Add Connection`。
3. 填写：
   - `Connection ID`：`demo`
   - `Host`：`mysql`
   - `Port`：`3306`
   - `User`：`root`
   - `Password`：`rootpassword`
   - `Database`：`demo`
4. 点击 `Connect`。
5. 在底部输入框输入：

```text
按订单状态统计订单数量和总金额
```

6. 发送问题。

预期结果：

- 页面展示 AI 生成的 SQL，通常会查询 `orders` 表并按 `status` 分组。
- 安全报告风险等级应为 `LOW` 或 `MEDIUM`，具体取决于生成 SQL 是否包含 `LIMIT` 等控制。
- 查询结果表格中可以看到 `pending`、`shipped`、`delivered`、`returned` 等状态及对应统计。
- 如果返回图表推荐，页面会展示适合当前结果的图表。

### Case 2：边界场景，未连接数据库直接提问

操作步骤：

1. 打开页面后不要添加数据库连接。
2. 直接输入：

```text
展示最近 10 个订单
```

预期结果：

- 页面不会向数据库发起查询。
- 聊天区域提示：

```text
Please connect to a database first using the sidebar.
```

处理方式：

- 先在左侧添加 MySQL 连接，再重新发送问题。

### Case 3：异常场景，数据库连接参数错误

操作步骤：

1. 点击 `Add Connection`。
2. 填写错误密码，例如：
   - `Connection ID`：`wrong-demo`
   - `Host`：`mysql`
   - `Port`：`3306`
   - `User`：`root`
   - `Password`：`wrong-password`
   - `Database`：`demo`
3. 点击 `Connect`。

预期结果：

- 连接不会被加入 `Active` 列表。
- 表单下方显示类似错误：

```text
Connection failed: Access denied for user ...
```

处理方式：

- 检查 `.env` 中 `MYSQL_ROOT_PASSWORD`。
- Docker 默认密码是 `rootpassword`，除非你在 `.env` 中改过。

### Case 4：风险拦截场景，尝试生成危险 SQL

操作步骤：

1. 确保已经连接 `demo` 数据库。
2. 输入：

```text
删除所有订单
```

预期结果：

- AI 可能生成 `DELETE` 类 SQL。
- 安全检查会识别写操作或无 `WHERE` 的危险操作。
- 高风险或严重风险 SQL 会被拒绝执行。
- 页面会展示风险评分、失败检查项和改写建议。

处理方式：

- 将需求改写为只读查询，例如：

```text
统计各订单状态的订单数量，不要修改数据
```

### Case 5：慢查询日志分析

操作步骤：

1. 在顶部或侧边导航切换到 `Slow Query Analysis` 页面。
2. 点击 `Use sample`。
3. 点击 `Analyze`。

预期结果：

- 页面显示慢查询总数、平均耗时、最大耗时和扫描行数。
- `Top Slow` 标签页展示耗时最高的 SQL。
- `Fingerprints` 标签页按 SQL 指纹聚合相似查询。
- `Breakdown` 标签页按用户和数据库统计。

### Case 6：索引冗余检测

操作步骤：

1. 确保已经连接 `demo` 数据库。
2. 切换到 `Index Redundancy` 页面。
3. 点击 `Run Analysis`。

预期结果：

- 页面显示扫描表数量和发现的问题数量。
- 对当前示例库，可能显示 `No issues detected.`，也可能列出潜在未使用索引提示。
- 如果发现冗余索引，会显示原因和建议的 `DROP INDEX ... ON ...;` 语句。

注意：不要直接在生产库执行自动生成的 `DROP INDEX`，应结合真实业务 SQL、慢日志和监控确认。

## 常见问题排查

### 1. 前端打不开 `http://localhost:5173`

可能原因：

- 前端容器或 Vite 服务没有启动。
- 端口 `5173` 被占用。

排查命令：

```bash
docker compose ps
```

本地开发时检查前端终端是否仍在运行：

```bash
cd frontend
npm run dev
```

如果端口被占用，可以先停止占用程序，或修改 `frontend/vite.config.ts` 中的端口。

### 2. 后端健康检查失败

检查：

```bash
curl http://localhost:3001/health
```

如果无法访问：

- 确认后端容器或 `npm run dev` 已启动。
- 确认端口 `3001` 没有被占用。
- 查看后端日志。

Docker 日志：

```bash
docker compose logs backend
```

### 3. MySQL 连接失败

常见原因：

- Docker 模式下表单里的 `Host` 填了 `localhost`，应改为 `mysql`。
- 密码与 `.env` 中的 `MYSQL_ROOT_PASSWORD` 不一致。
- MySQL 容器还没有完成初始化。
- 本地开发模式下 MySQL 没有启动。

查看 MySQL 容器状态：

```bash
docker compose ps mysql
```

查看 MySQL 日志：

```bash
docker compose logs mysql
```

### 4. 修改 `init-db/01-schema.sql` 后数据没有变化

MySQL 官方镜像只会在首次创建数据目录时执行 `/docker-entrypoint-initdb.d` 下的初始化 SQL。已有 volume 时不会重复执行。

如果你确认要重建本地演示库，可以执行：

```bash
docker compose down -v
docker compose up --build
```

注意：`down -v` 会删除 Docker volume 中的 MySQL 数据和审计数据，只适合本地演示环境。

### 5. LLM API Key 缺失或不可用

表现：

- 后端能启动，但聊天请求返回模型鉴权错误。
- 页面显示 `Error: ... API key ...` 或 provider 相关错误。

处理：

1. 检查 `.env` 中 `LLM_PROVIDER` 是否为 `openai` 或 `claude`。
2. 如果使用 OpenAI，确认 `OPENAI_API_KEY` 和 `OPENAI_MODEL` 正确。
3. 如果使用 Claude，确认 `ANTHROPIC_API_KEY` 和 `ANTHROPIC_MODEL` 正确。
4. 如果使用 OpenAI-compatible 代理或网关，补充 `OPENAI_BASE_URL`。
5. 如果使用 Anthropic-compatible 代理或网关，补充 `ANTHROPIC_BASE_URL`。
6. 修改 `.env` 后重启后端或重新执行 `docker compose up --build`。

### 6. 依赖安装失败

处理建议：

```bash
node -v
npm -v
```

确认 Node.js 版本至少为 18。

清理后重新安装：

```bash
cd backend
rm -rf node_modules
npm install
```

Windows PowerShell：

```powershell
cd backend
Remove-Item -Recurse -Force node_modules
npm install
```

前端同理：

```bash
cd frontend
rm -rf node_modules
npm install
```

Windows PowerShell：

```powershell
cd frontend
Remove-Item -Recurse -Force node_modules
npm install
```

### 7. Docker 构建很慢或失败

可以先分别查看日志：

```bash
docker compose logs backend
docker compose logs frontend
docker compose logs mysql
```

如果是 npm 下载失败，通常是网络或 registry 问题。可以在本机配置 npm registry 后再本地开发运行，或配置 Docker 构建环境的网络代理。

### 8. 测试命令找不到依赖

先安装对应目录依赖：

```bash
cd backend
npm install
npm test
```

```bash
cd frontend
npm install
npm test
```

不要只在项目根目录执行 `npm install`，因为前后端是两个独立的 `package.json`。

## 项目结构

```text
mysql-dbre-copilot/
├── backend/
│   ├── src/
│   │   ├── api/             # REST API 路由、校验和中间件
│   │   ├── audit/           # sql.js 审计日志存储
│   │   ├── chat/            # 自然语言到 SQL 的编排逻辑
│   │   ├── diagnostics/     # 慢查询、执行计划、索引冗余诊断
│   │   ├── llm/             # OpenAI / Claude Provider 适配
│   │   ├── mcp/             # MCP 相关服务和工具
│   │   ├── optimization/    # 索引建议和查询改写
│   │   ├── safety/          # SQL 分类、静态分析、风险评分
│   │   ├── schema/          # MySQL schema introspection 与缓存
│   │   └── utils/           # 日志和通用工具
│   ├── tests/               # Jest 单元测试和集成测试
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # React 页面和组件
│   │   ├── services/        # 前端 API client
│   │   ├── store/           # Zustand 状态管理
│   │   └── types/           # TypeScript 类型
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── init-db/
│   └── 01-schema.sql        # demo 数据库初始化脚本
├── docker-compose.yml       # 一键启动前端、后端、MySQL
├── .env.example             # 环境变量示例
├── AI_WORKFLOW.md           # AI 开发流程说明
└── README.md
```

## 常用 API

后端默认地址：

```text
http://localhost:3001
```

常用接口：

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/health` | 健康检查。 |
| `POST` | `/api/connections` | 新增并测试 MySQL 连接。 |
| `GET` | `/api/connections` | 查看当前后端进程内维护的连接列表。 |
| `DELETE` | `/api/connections/:id` | 移除连接。 |
| `POST` | `/api/chat` | 发送自然语言问题，生成 SQL 并查询。 |
| `GET` | `/api/chat/history/:sessionId` | 查看会话历史。 |
| `DELETE` | `/api/chat/history/:sessionId` | 清空会话历史。 |
| `GET` | `/api/schema/:connectionId?database=demo` | 获取数据库 schema。 |
| `GET` | `/api/diagnostics/index-redundancy/:connectionId/:database` | 索引冗余诊断。 |
| `POST` | `/api/diagnostics/slow-log` | 解析慢查询日志。 |
| `POST` | `/api/diagnostics/pii-scan` | 扫描 SQL 中的潜在敏感信息。 |
| `POST` | `/api/diagnostics/plan` | 对 SQL 执行 `EXPLAIN` 并诊断执行计划。 |
| `GET` | `/api/audit` | 查询审计日志。 |
| `GET` | `/api/audit/stats` | 获取审计统计。 |

示例：新增连接。本地开发模式下，后端在宿主机运行，`host` 可以使用 `localhost`。

```bash
curl -X POST http://localhost:3001/api/connections \
  -H "Content-Type: application/json" \
  -d '{
    "id": "demo",
    "host": "localhost",
    "port": 3306,
    "user": "root",
    "password": "rootpassword",
    "database": "demo"
  }'
```

Docker Compose 中，如果从前端页面或后端容器内连 MySQL，`host` 使用 `mysql`。

示例：解析慢查询日志。

```bash
curl -X POST http://localhost:3001/api/diagnostics/slow-log \
  -H "Content-Type: application/json" \
  -d '{
    "content": "# Time: 2026-06-15T10:30:00.123456Z\n# User@Host: app[app] @ localhost []  Id: 42\n# Query_time: 5.123456  Lock_time: 0.000123 Rows_sent: 1  Rows_examined: 100000\nuse demo;\nSELECT * FROM orders;"
  }'
```

预期返回包含：

```json
{
  "entryCount": 1,
  "stats": {
    "totalQueries": 1
  },
  "fingerprints": [
    {
      "count": 1,
      "sample": "SELECT * FROM orders;"
    }
  ]
}
```

## 生产使用注意事项

1. 不要把生产数据库 root 账号配置给应用，建议使用只读账号。
2. 对 AI 生成的 SQL 应保留人工确认流程，尤其是写操作、DDL 和索引变更。
3. 不要在公开环境暴露未加鉴权的后端 API。
4. `DROP INDEX`、`ALTER TABLE` 等建议语句必须经过慢日志、监控和回滚方案验证。
5. `.env` 不应提交到 Git 仓库。

## License

MIT
