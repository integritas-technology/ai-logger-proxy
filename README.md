# AI Logger Proxy

A local reverse proxy for LLM traffic with a browser admin UI and PostgreSQL-backed storage for runtime config and request history.

It listens on `localhost`, forwards supported API requests to the currently selected upstream provider, and stores config plus AI communication history in PostgreSQL.

## What It Does

- Proxies supported LLM API traffic through one local base URL.
- Lets you switch between `OpenAI`, `Anthropic Claude`, and `OpenRouter` in the web UI.
- Stores provider config in PostgreSQL instead of a local config file.
- Saves AI communication history with request and response payloads plus a placeholder `proof` field.
- Provides a testing page for live upstream checks.
- Redacts sensitive headers in console logs.

## Install

### Prerequisites

- Docker
- Docker Compose

### Local Install

1. Copy the example environment file:

```bash
cp .env.example .env
```

2. Update `.env` if you want different defaults:

```env
PORT=3333
CONFIG_ENCRYPTION_KEY=change-this-secret
POSTGRES_DB=ai_logger_proxy
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_PORT=5432
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/ai_logger_proxy
```

3. Start the stack:

```bash
docker compose up --build
```

4. Open the app:

```text
http://localhost:3333/
```

Provider config is no longer taken from environment variables. After startup, active provider settings are configured in the web UI and stored in PostgreSQL.

`CONFIG_ENCRYPTION_KEY` is used to encrypt the saved Integritas API key in the database. Keep it stable across restarts if you want previously saved encrypted values to remain readable.

## First-Time Use

1. Open `http://localhost:3333/config`
2. Select a provider
3. Enter the provider API key
4. Refresh/select a model if needed
5. Save config
6. Run a live test in `http://localhost:3333/testing`

## Client Setup

Once the proxy is running, point your tools at:

```text
http://localhost:3333
```

### Codex

If your Codex build supports `chatgpt_base_url`:

```toml
chatgpt_base_url = "http://localhost:3333"
```

### Claude Code and Other OpenAI-Compatible Clients

Use:

- Base URL: `http://localhost:3333`
- Example route: `/v1/chat/completions`

Note: this proxy does not translate OpenAI payloads into Anthropic Messages API payloads. Anthropic support here is for forwarding Anthropic-style requests through the same proxy.

## Supported Providers

- `openai` -> `https://api.openai.com`
- `anthropic` -> `https://api.anthropic.com`
- `openrouter` -> `https://openrouter.ai/api`

Behavior:

- `OpenAI` and `OpenRouter` use bearer auth and OpenAI-style routes.
- `Anthropic` uses `x-api-key` and `anthropic-version`.

## API Endpoints

Admin endpoints:

- `GET /__admin/config`
- `POST /__admin/config`
- `POST /__admin/models`
- `POST /__admin/test`
- `GET /__admin/history?limit=50`
- `GET /healthz`

Proxy routes are intentionally guarded. Supported API traffic is proxied only for allowed prefixes such as `/v1/...`.

## Example Proxy Request

```bash
curl http://localhost:3333/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [
      {"role": "user", "content": "Say hello"}
    ]
  }'
```

## Logging and History

Console logs include lifecycle and proxy events such as:

- incoming client requests
- outgoing upstream requests
- incoming upstream responses
- model refresh start/success/error
- AI request start/success/error

Sensitive headers such as `Authorization` and `x-api-key` are redacted.

Stored history rows contain:

- `timestamp`
- `llm`
- `request_json`
- `response_json`
- `proof`

## Project Structure

- `src/server.js`: startup entry point
- `src/app.js`: app bootstrap
- `src/routes/`: page and admin API routes
- `src/services/`: config, models, proxy, test, and history services
- `src/db/`: PostgreSQL initialization
- `src/ui/`: frontend pages and shared assets
- `docker-compose.yml`: local runtime with Postgres
- `Dockerfile`: app image

## Notes

- This is a transparent forwarding proxy, not a custom LLM server.
- Requests and responses are not transformed except for optional default-model injection.
- Runtime config and history are stored in PostgreSQL.
