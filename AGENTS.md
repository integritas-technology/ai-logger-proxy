# Agent guide

## Working approach

- Carry the user's request through implementation and appropriate verification. Make reasonable routine decisions and proceed with authorized, reversible work without repeatedly asking for confirmation.
- Ask for clarification when missing information materially changes the outcome. Do not treat silence as authorization for a destructive action or a broader scope.
- Read the relevant code before changing it. Keep changes focused and preserve existing behavior outside the requested scope.
- Check `git status --short` before editing. Preserve existing user changes and untracked files; do not reset, overwrite, or discard unrelated work.
- Share concise progress updates for sustained work. Finish with what changed, what was verified, and any remaining limitation.
- Follow the environment's permission controls. Do not attempt to bypass required approvals. Permission to do routine work does not authorize deleting data or exposing secrets.

## Application and repository map

AI Logger Proxy forwards supported AI API traffic to one configured upstream provider, saves exchanges in PostgreSQL, and exposes a browser interface for configuration, testing, history, exports, and optional Integritas timestamp proofs.

The backend uses Node.js, CommonJS modules, native HTTP routing, `http-proxy`, and `pg`. The UI uses server-rendered HTML strings, plain browser JavaScript, and CSS. The Docker image currently uses Node.js 20. There is no frontend build step.

| Location | Responsibility |
| --- | --- |
| `src/server.js` | Process entry point and server listener. |
| `src/app.js` | Database initialization, service wiring, routers, health endpoint, and WebSocket upgrades. |
| `src/routes/` | Browser page routes and `/__admin/` JSON endpoints. |
| `src/services/proxy-service.js` | Supported proxy paths, forwarding, streaming, header handling, and capture. |
| `src/services/config-service.js` | Runtime configuration validation, persistence, and public configuration views. |
| `src/services/history-service.js` | History persistence, queries, and stored proof state. |
| `src/services/proof-service.js` | Integritas stamping, background status polling, and verification. |
| `src/services/models-service.js` | Provider model discovery. |
| `src/services/test-service.js` | Predefined live provider test and its history record. |
| `src/config/` | Environment settings and provider presets. |
| `src/db/index.js` | Schema creation, startup migrations, and initial configuration. |
| `src/lib/` | HTTP helpers, redaction, cryptography, and log file serialization. |
| `src/ui/pages/` | HTML page templates and shared layout. |
| `src/ui/assets/` | Browser behavior in `app.js` and styles in `styles.css`. |
| `docker-compose.yml` | Application, PostgreSQL, and persistent database volume. |

Read [README.md](README.md) for setup, [capabilities and user stories](docs/capabilities-and-user-stories.md) for the stakeholder scope draft, and [Integritas API guidance](docs/integritas-proof-api.md) for the proof integration. The API guide includes general recommendations and sample workflows beyond the current implementation; inspect the services before claiming a feature exists.

## Local workflow

Run these commands from the repository root:

```text
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 ai-proxy
```

The default browser address is `http://localhost:3334`. Pages are `/`, `/config`, `/testing`, `/setup`, and `/history`. `/healthz` checks application access to configuration in the database; it does not prove upstream provider connectivity.

For a host-based Node.js run, install dependencies with `npm install`, provide `DATABASE_URL` pointing to a reachable PostgreSQL instance, and run `npm start`. The default database URL uses the Docker service hostname `postgres`, which normally does not resolve from the host. Consult `.env.example` and `docker-compose.yml` for environment settings; do not print real environment files or credentials.

Do not remove the PostgreSQL volume, run `docker compose down -v`, or reset stored configuration or history unless the user explicitly requests the data loss. Keep `CONFIG_ENCRYPTION_KEY` stable so saved Integritas credentials remain readable.

## Implementation conventions

- Follow the surrounding file's formatting, naming, and quote style. Use CommonJS and the existing service factory pattern.
- Keep routing, business logic, persistence, and rendering in their existing layers. Avoid introducing a framework, build system, or new dependency for a small change.
- Use parameterized database queries. Make schema changes compatible with existing installations and repeated startup; preserve stored settings and logs.
- For new settings, check every affected layer: environment defaults, schema and migration, configuration validation and mapping, public response, form controls, browser state, and documentation.
- Keep secrets out of public configuration responses, HTML, error messages, fixtures, and console output. Retain sensitive-header redaction. Escape dynamic HTML values; use `textContent` for untrusted viewer content.
- Treat captured prompts, responses, and downloaded logs as potentially sensitive. Use synthetic data for verification and examples.

## Behavior to preserve

- One saved provider configuration applies to subsequent requests. Do not imply support for per-user routing or automatic failover.
- Preserve upstream request and response semantics, status codes, and streamed delivery. Do not buffer the full response before delivering it to the client merely to simplify capture.
- Default-model injection applies to eligible JSON requests without a supplied model. Do not replace an explicit model or silently convert OpenAI and Anthropic payload formats.
- Preserve provider-specific authentication and the existing handling of credentials supplied by clients. Verify both saved-key and client-key cases when changing this code.
- Database log saving is asynchronous for normal proxy responses. Do not claim guaranteed capture of every failed connection or WebSocket message.
- History currently loads the latest 50 records and filters them in the browser. Bulk verification targets selected visible rows, or eligible rows in the filtered view when none are selected. Preserve this scope unless changing it intentionally.
- Cloud storage and notarization controls are disabled placeholders. Saving their service URLs does not make those features operational.
- The application has no login or roles, and the supplied Docker configuration publishes ports without an explicit localhost-only binding. Do not describe it as enforcing access control or local-only access.

## Proof handling

- Use `src/lib/history-file.js` as the shared source of log export bytes. Proof hashing uses SHA3-256 over that serialized content, including timestamp formatting, field order, indentation, and the trailing newline.
- Treat serialization changes as proof compatibility changes. Preserve the ability to reproduce previously stamped bytes or provide an explicit compatibility strategy.
- Send the log hash to the stamping service. Keep Integritas credentials on the backend and retain encrypted storage for that key.
- Keep pending, available, and failed proof states distinct. A proof becomes available after the external status response reports `onchain: true`; a pending UID alone is insufficient.
- The current verification workflow submits stored proof payloads and opens the returned report URL. It does not recompute and compare the current log hash during verification. Do not present proof availability or report generation as a completed content-integrity check.
- Handle external HTTP errors and malformed or unexpected responses explicitly. Avoid logging secrets or creating uncontrolled retries.

## Verification and handoff

There are currently no configured test, lint, or build scripts beyond `npm start`. Do not report nonexistent checks as passing.

- For documentation-only changes, check accuracy against the implementation, review links and wording, and run `git diff --check`.
- For JavaScript changes, run `node --check <changed-file>` for each changed JavaScript file. This checks syntax, not runtime behavior.
- For Compose changes, run `docker compose config --quiet` when Docker is available.
- For behavioral changes, run focused checks appropriate to the affected workflow. Use mocks or a local stub for external services where practical. Add regression tests for meaningful logic changes; avoid tests that only repeat implementation details.
- When a running stack is available, check the relevant pages or endpoints and database effects. UI changes should cover loading, success, empty, and error states where applicable. Proxy changes should cover upstream errors and streaming as well as ordinary JSON responses.
- The Testing page makes real external inference requests, and enabling stamping makes external Integritas calls. Prefer synthetic local checks unless live calls are part of the authorized task. Never reuse real history as test input without authorization.
- State which checks ran and which could not run. Distinguish syntax checks, local integration checks, and live provider checks.
- Update the README and stakeholder capabilities document when user-visible behavior or its boundaries change. Keep planned features distinct from implemented behavior.
- Do not commit, push, publish, or deploy unless the task authorizes it.
