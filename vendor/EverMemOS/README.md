# EverMemOS sidecar (M0)

my_brain uses [EverOS / EverCore](https://github.com/EverMind-AI/EverOS) as the optional long-term memory sidecar. Data stays on your machine.

## Prerequisites

- Docker 20.10+ and Docker Compose 2.0+
- Python 3.12+ and [uv](https://docs.astral.sh/uv/) (for the API server process)
- LLM + embedding API keys required by EverMemOS (see upstream `env.template`)

## Quick start

```bash
git clone https://github.com/EverMind-AI/EverOS.git vendor/EverOS
cd vendor/EverOS/methods/EverCore

docker compose up -d
uv sync
cp env.template .env
# Edit .env: LLM_API_KEY, VECTORIZE_API_KEY

uv run python src/run.py
curl http://localhost:1995/health
# Expected: {"status":"healthy", ...}
```

## Wire my_brain

In `.env` (see `.env.example`):

```env
VITE_MEMORY_PROVIDER=evermemos
VITE_EVERMEMOS_BASE_URL=http://localhost:1995
VITE_EVERMEMOS_USER_ID=my_brain_local
```

M0 does **not** call `remember`/`recall` from product flows yet — that lands in M1. When the sidecar is down, the app keeps working; the adapter logs and degrades (`recall → []`, `remember` queued).

## REST contract (confirmed 2026-06-02, EverOS README)

| Operation | Method | Path | Body |
|---|---|---|---|
| Health | GET | `/health` | — |
| Store memory | POST | `/api/v1/memories` | `{ message_id, create_time, sender, content, ... }` |
| Search | GET | `/api/v1/memories/search` | `{ query, user_id, retrieve_method: "hybrid", memory_types, top_k }` |

Search response: `{ result: { memories: [...] } }`.
