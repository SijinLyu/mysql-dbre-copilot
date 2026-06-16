# AI_WORKFLOW.md

## What This Project Does

MySQL DBRE Copilot is a chat-based AI assistant for MySQL databases. Users ask questions in natural language (e.g., "What were the top selling products last month?"), and the system generates SQL, performs safety analysis (EXPLAIN, risk scoring), executes safe queries, and summarizes results with visualizations. It acts as a Database Reliability Engineer copilot — not just generating SQL, but reviewing it for performance and security before execution.

## Why I Chose This Project

I wanted to demonstrate AI-native system design that combines multiple concerns: natural language understanding, database interaction, security analysis, and developer tooling. A DBRE Copilot is directly relevant to backend/infrastructure engineering — it shows how AI can augment operational workflows while maintaining safety guardrails. The project also naturally requires multi-layer architecture, which showcases system design skills.

## Tools Used During Development

- **Claude Code (Opus 4.7)** — primary development interface for all code generation, architecture design, and iterative development
- **TypeScript** — backend (Node.js + Express) and frontend (React + Vite)
- **MySQL 8.0** — target database with INFORMATION_SCHEMA for introspection
- **SQLite (better-sqlite3)** — audit log persistence
- **Recharts** — data visualization
- **Docker Compose** — full-stack deployment
- **Jest / Vitest** — testing

## How AI Tools Were Used

1. **Architecture Design**: Used Claude Code to discuss and refine the system architecture — module boundaries, data flow, safety pipeline design, and technology choices.

2. **Code Generation**: Each module was generated through conversation with Claude Code. I described the requirements and constraints, reviewed generated code, and iterated on specifics (e.g., risk scoring weights, prompt engineering for SQL generation).

3. **Test Writing**: Test cases were generated with awareness of edge cases that matter for the safety pipeline (e.g., SQL injection patterns, EXPLAIN output variations, cartesian join detection).

4. **Iterative Refinement**: The commit history reflects actual development progression — starting with infrastructure, adding core features, then layering on UI and polish. Each commit was a deliberate unit of work discussed with the AI.

5. **Prompt Engineering**: The LLM prompts for SQL generation and result summarization were developed iteratively, testing them mentally against various user question types.

## Key Architecture Decisions

- Safety pipeline is synchronous and blocking (SQL never executes without passing review)
- LLM provider is a strategy pattern (swap OpenAI/Claude via config)
- Schema cache with TTL avoids repeated INFORMATION_SCHEMA queries
- Audit uses SQLite (independent of target database)
- Frontend uses Zustand (minimal state management for focused UI)

## Diagnostics Module (v2)

The diagnostics module provides advanced DBA-oriented analysis tools accessible via both REST API and the frontend panel system. It goes beyond chat-based SQL generation to offer automated database health checks.

### REST API: `/api/diagnostics`

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/diagnostics/index-redundancy/:connId/:db` | GET | Scans INFORMATION_SCHEMA.STATISTICS to detect redundant, duplicate, and potentially unused indexes |
| `/diagnostics/slow-log` | POST | Parses MySQL slow query log text, extracts statistics, groups by fingerprint |
| `/diagnostics/pii-scan` | POST | Scans SQL and schema for personally identifiable information patterns |
| `/diagnostics/plan` | POST | Runs EXPLAIN on a query and returns the execution plan analysis |

### Frontend Panels (5-Tab Layout)

The frontend uses a top-level tab navigation (`activeView` in Zustand store) to switch between:

1. **Chat** — the original NL-to-SQL interface with follow-up suggestions and chart recommendations
2. **Audit Log** — displays all historical chat-to-SQL interactions with risk scoring, filterable by risk level, with CSV export capability
3. **Index Redundancy** — one-click analysis of the active database to find prefix-redundant indexes, exact duplicates, and potentially unused indexes with DROP statements
4. **Slow Query Analysis** — paste or upload a MySQL slow query log, see top-N slowest queries, fingerprint grouping, and user/database breakdown
5. **Saved Queries (Favorites)** — starred queries from chat sessions with copy-to-clipboard

### Prompt Usage in Diagnostics

- **Index Redundancy**: Uses pure SQL against `INFORMATION_SCHEMA.STATISTICS` — no LLM involved. Logic detects: (a) indexes where one is a prefix of another on the same table, (b) indexes with identical column lists, (c) indexes with zero cardinality suggesting disuse.
- **Slow Query Log**: Parsed with regex pattern matching against MySQL slow log format. Statistics computed in-memory: total/avg/max query time, rows examined, per-user and per-database grouping. Fingerprinting normalizes literal values to `?` for grouping.
- **PII Scan**: Pattern matching against common PII column names (email, phone, ssn, etc.) and SQL content analysis. No LLM call — purely rule-based for speed and determinism.
- **Execution Plan**: Runs `EXPLAIN` via the active MySQL connection and structures the output for frontend display.

### CSV Export (Audit Panel)

The Audit panel includes a "Export CSV" button that:
- Exports all currently loaded/filtered audit entries
- Properly escapes fields containing commas, quotes, or newlines
- Generates a date-stamped filename (`audit-log-YYYY-MM-DD.csv`)
- Uses Blob + object URL for client-side download (no server round-trip)

## Testing Strategy

- **Backend**: Jest with 16 test suites / 148 tests covering routes, services, safety pipeline, diagnostics engine, and integration
- **Frontend**: Vitest + React Testing Library with 8 test suites / 99 tests covering Zustand store logic, API service layer, CSV export utilities, and all 5 panel components
- **Total**: 24 suites / 247 tests, all passing
