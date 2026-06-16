# MySQL DBRE Copilot

Chat-based MySQL AI DBRE Copilot — natural language database querying with SQL safety review, EXPLAIN analysis, and query optimization suggestions.

## Features

- **Natural Language to SQL**: Ask questions in plain language, get accurate SQL
- **Multi-turn Conversation**: Context-aware follow-up questions
- **DBRE Safety Review**: SQL risk analysis before execution (read-only checks, PII detection, LIMIT enforcement)
- **EXPLAIN Analysis**: Automatic execution plan review (full table scans, missing indexes, filesort)
- **Query Optimization**: Index recommendations and query rewrite suggestions
- **Data Visualization**: AI-recommended charts (bar, line, pie) for query results
- **Query Favorites & History**: Save and reuse frequent queries
- **Export**: Download results as CSV/JSON, reports as PDF
- **Audit Logging**: Complete query audit trail with risk scores
- **Multi-LLM Support**: Switch between OpenAI GPT-4 and Claude

## Quick Start

### Prerequisites

- Docker & Docker Compose
- An API key for OpenAI or Anthropic

### Run with Docker Compose

```bash
# Clone the repository
git clone https://github.com/SijinLyu/mysql-dbre-copilot.git
cd mysql-dbre-copilot

# Configure environment
cp .env.example .env
# Edit .env with your API keys

# Start all services
docker-compose up

# Open the UI
# http://localhost:5173
```

### Development Setup

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend (in another terminal)
cd frontend
npm install
npm run dev
```

## Architecture

```
Frontend (React + Vite + Tailwind)
        │
        │ REST API
        ▼
Backend (Express + TypeScript)
  ├── Chat Service (orchestration)
  ├── LLM Providers (OpenAI / Claude)
  ├── Schema Introspector (INFORMATION_SCHEMA)
  ├── Safety Pipeline (classify → analyze → EXPLAIN → risk score)
  ├── Query Optimizer (index advisor, rewriter)
  ├── Audit Logger (SQLite)
  └── MCP Server (backward-compatible)
```

## Testing

```bash
cd backend && npm test
cd frontend && npm test
```

## Project Structure

```
mysql-dbre-copilot/
├── backend/
│   ├── src/
│   │   ├── api/          # REST API routes and middleware
│   │   ├── audit/        # SQLite audit logging
│   │   ├── chat/         # Chat orchestration (NL→SQL→execute→summarize)
│   │   ├── llm/          # Multi-provider LLM abstraction
│   │   ├── mcp/          # MCP server (backward-compatible)
│   │   ├── optimization/ # Index advisor, query rewriter
│   │   ├── safety/       # SQL safety pipeline
│   │   ├── schema/       # Schema introspection + cache
│   │   └── utils/        # Logger, shared utilities
│   └── tests/            # Jest unit and integration tests
├── frontend/
│   └── src/
│       ├── components/   # React UI components
│       ├── services/     # API client
│       ├── store/        # Zustand state
│       └── types/        # TypeScript interfaces
├── init-db/              # Demo database seed SQL
├── docker-compose.yml    # Full-stack deployment
└── AI_WORKFLOW.md        # AI development process documentation
```

## License

MIT
