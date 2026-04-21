# AI Logger Proxy

A local reverse proxy with request/response logging, a multi-page admin UI, and PostgreSQL-backed storage for both runtime config and AI traffic history.

It accepts HTTP requests on `localhost`, forwards them to the configured upstream API, and streams the upstream response back unchanged. Provider selection and API keys are managed through a local web interface instead of only through environment variables.

## What it does

- Receives requests from a client such as Codex or any OpenAI-compatible caller.
- Forwards those requests to the currently configured upstream base URL.
- Lets you switch between `OpenAI`, `Anthropic Claude`, and `OpenRouter` from a local web app.
- Stores the selected provider, base URL, API key, Anthropic version, and default model in PostgreSQL.
- Redacts sensitive headers in logs while keeping request and response bodies visible.
- Saves AI communication history to PostgreSQL with timestamp, LLM, full request blob, full response blob, and a `proof` field.
- Returns the upstream response directly to the caller.

## Structure

- `src/server.js`: startup entry point.
- `src/app.js`: app bootstrap.
- `src/routes/`: page routes and admin API routes.
- `src/services/`: config, proxy, test, and history services.
- `src/db/`: PostgreSQL initialization.
- `src/ui/`: frontend pages and static assets.
- `Dockerfile`: container image definition.
- `docker-compose.yml`: local Docker runtime.
- `.env.example`: required environment variables.

## Providers

Built-in presets:

- `openai` -> `https://api.openai.com`
- `anthropic` -> `https://api.anthropic.com`
- `openrouter` -> `https://openrouter.ai/api`

Behavior:

- `OpenAI` and `OpenRouter` use bearer auth and work with OpenAI-style endpoints such as `/v1/responses`.
- `Anthropic` uses `x-api-key` and `anthropic-version` headers.
- This proxy does not translate OpenAI request formats into Anthropic Messages API payloads. Anthropic support here is for forwarding Anthropic-style requests through the same proxy.

## Configure

Create a local `.env` file:

```env
PORT=3333
UPSTREAM_PROVIDER=openai
UPSTREAM_BASE_URL=https://api.openai.com
UPSTREAM_API_KEY=your_api_key_here
ANTHROPIC_VERSION=2023-06-01
UPSTREAM_DEFAULT_MODEL=
POSTGRES_DB=ai_logger_proxy
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_PORT=5432
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/ai_logger_proxy
```

The upstream environment variables above only provide startup defaults for the initial database seed. After the server is running, the active config is controlled through the UI and saved in PostgreSQL.

## Logging

The proxy logs to stdout and also stores AI communication in PostgreSQL.

Stored row shape:

- `timestamp`
- `llm`
- `request_json`
- `response_json`
- `proof`

Console logging includes:

- incoming client requests
- outgoing upstream requests
- incoming upstream responses
- proxy and upstream response errors

Request and response bodies are logged in full.
Sensitive headers are redacted in logs, including `Authorization`, `x-api-key`, cookies, account identifiers, forwarded IPs, and selected request metadata such as `User-Agent`.

Example log fixtures are available under `fixtures/logs/` for each emitted event type:

- `incoming_request`
- `outgoing_request`
- `incoming_response`
- `incoming_response_error`

## Run

```bash
cp .env.example .env
docker compose up --build
```

The proxy listens on:

```text
http://localhost:3333
```

Admin UI:

```text
http://localhost:3333/
```

Health check:

```bash
curl http://localhost:3333/healthz
```

The health response includes the active provider and config file path.

## Example request

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

## Web App

Pages:

- `Home`: overview of available sections.
- `Config`: change provider settings stored in PostgreSQL.
- `Setup`: explains how the app works and how to point tools at it.
- `Testing`: run a live provider test from the browser.
- `History`: inspect saved AI communication rows.

Changes apply immediately to new requests. No restart is required.

If `default model` is set, the proxy injects it only for JSON requests whose body does not already include `model`.

## Using it with Codex

If your Codex build supports `chatgpt_base_url`, point it at the proxy:

```toml
chatgpt_base_url = "http://localhost:3333"
```

Then restart Codex.

## Notes

- This is a transparent forwarding proxy, not a custom LLM server.
- It does not transform the request body or response body.
- It logs requests and responses to stdout.
- The saved runtime config and history are stored in PostgreSQL.
