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
