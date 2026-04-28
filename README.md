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

1. Clone the repo locally:

```bash
git clone https://github.com/integritas-technology/ai-logger-proxy
```

2. Start the stack:

```bash
docker compose up -d --build
```

3. Open the app:

```text
http://localhost:3333/
```

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

### Supported tools

- Codex
- OpenCode Desktop
- Claude Code and Other OpenAI-Compatible Clients

## Notes

- This is a transparent forwarding proxy, not a custom LLM server.
- Requests and responses are not transformed except for optional default-model injection.
- Runtime config and history are stored in PostgreSQL.

`CONFIG_ENCRYPTION_KEY` is used to encrypt the saved Integritas API key in the database. Keep it stable across restarts if you want previously saved encrypted values to remain readable.

`DEBUG_MODE=true` enables extra error detail in server logs, including underlying proof creation fetch errors.
